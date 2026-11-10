from datetime import timedelta
from email.message import EmailMessage
import logging
import smtplib
import ssl
import time

from fastapi import HTTPException
from sqlalchemy import delete, select

from .accounts import enqueue
from .commerce import apply_gateway, lock_order, razorpay, release_order
from .config import settings
from .db import SessionLocal
from .models import EmailJob, Order, ResetToken, UserSession, now

log = logging.getLogger("deskly.worker")


def reconcile(order_id):
    with SessionLocal() as db:
        order = db.get(Order, order_id)
        if order.status not in {"PENDING_PAYMENT", "PAYMENT_FAILED", "CANCELLED"} or order.payment.status == "CAPTURED":
            return
        remote_id = order.payment.gateway_order_id
        payments = razorpay("GET", f"orders/{remote_id}/payments").get("items", []) if remote_id else []
        captured = next((p for p in payments if p.get("status") == "captured"), None)
        if captured:
            apply_gateway(db, order.id, captured)
        else:
            order = lock_order(db, order.id)
            if order.status != "PENDING_PAYMENT":
                return
            if any(p.get("status") == "authorized" for p in payments):
                order.payment.status = "AUTHORIZED"
                if order.expires_at <= now():
                    log.warning("authorization_waiting_for_capture order_id=%s", order.id)
            elif order.expires_at <= now() and order.payment.gateway_order_id == remote_id:
                release_order(db, order, "PAYMENT_FAILED")
                enqueue(db, order.address["email"], "Deskly checkout expired", f"Checkout for {order.number} expired.")
        db.commit()


def send_one():
    s = settings()
    if not s.smtp_host or not s.smtp_from:
        return False
    with SessionLocal() as db:
        job = db.scalar(select(EmailJob).where(EmailJob.sent_at.is_(None), EmailJob.next_at <= now(),
                                              EmailJob.attempts < 8).order_by(EmailJob.next_at)
                        .limit(1).with_for_update(skip_locked=True))
        if not job:
            return False
        try:
            message = EmailMessage()
            message["From"], message["To"], message["Subject"] = s.smtp_from, job.recipient, job.subject
            message.set_content(job.body)
            with smtplib.SMTP(s.smtp_host, s.smtp_port, timeout=8) as smtp:
                if s.smtp_starttls:
                    smtp.starttls(context=ssl.create_default_context())
                if s.smtp_user:
                    smtp.login(s.smtp_user, s.smtp_password)
                smtp.send_message(message)
            job.sent_at = now()
            job.body = ""
        except (OSError, ValueError):
            job.attempts += 1
            job.next_at = now() + timedelta(seconds=30 * 2 ** job.attempts)
            log.warning("email_retry job_id=%s attempts=%s", job.id, job.attempts)
        db.commit()
        return True


def tick():
    with SessionLocal() as db:
        from sqlalchemy import or_
        from .models import Payment
        ids = list(db.scalars(select(Order.id).join(Payment).where(or_(
            Order.status == "PENDING_PAYMENT",
            (Order.status == "PAYMENT_FAILED") & (Order.updated_at >= now() - timedelta(days=1)) &
            Payment.gateway_order_id.is_not(None) & (Payment.status != "CAPTURED")
        )).order_by((Order.status == "PENDING_PAYMENT").desc(), Order.updated_at).limit(60)))
        db.execute(delete(UserSession).where(UserSession.expires_at <= now()))
        db.execute(delete(ResetToken).where(ResetToken.expires_at <= now()))
        db.commit()
    for order_id in ids:
        try:
            reconcile(order_id)
        except HTTPException:
            log.warning("payment_reconciliation_retry order_id=%s", order_id)
    for _ in range(20):
        if not send_one():
            break


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    from redis import Redis
    redis_url = settings().redis_url
    redis = Redis.from_url(redis_url, socket_timeout=2) if redis_url else None
    while True:
        try:
            if not redis:
                tick()
            else:
                lease = redis.lock("deskly:worker:reconcile", timeout=600, blocking=False)
                if lease.acquire():
                    try:
                        tick()
                    finally:
                        lease.release()
        except Exception as exc:
            log.error("worker_failure type=%s", type(exc).__name__)
        time.sleep(20)
