from datetime import timedelta
from hmac import compare_digest, new as hmac_digest
from typing import Annotated, Literal
import json

import httpx
from fastapi import APIRouter, Header, HTTPException, Query, Request, Response
from pydantic import Field, UUID4
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert

from .accounts import Input, Shipping, enqueue, owned
from .cart import cart_items, find_cart
from .config import settings
from .models import Cart, CartItem, Coupon, Event, Inventory, Movement, Order, OrderItem, Payment, Redemption, Reservation, User, Webhook, now
from .security import CurrentUser, DB, OptionalUser, digest

router = APIRouter(tags=["Checkout and orders"])
PAID_STATES = {"PAID", "PROCESSING", "SHIPPED", "DELIVERED"}


class Quote(Input):
    coupon: str = Field("", max_length=32)


class Checkout(Quote):
    address: Shipping
    expected_total: int = Field(gt=0)
    payment_method: Literal["RAZORPAY", "CASH_ON_DELIVERY", "DEMO"] = "RAZORPAY"


class Verify(Input):
    order_id: UUID4
    razorpay_order_id: str = Field(min_length=1, max_length=80, pattern=r"^order_[A-Za-z0-9]+$")
    razorpay_payment_id: str = Field(min_length=1, max_length=80, pattern=r"^pay_[A-Za-z0-9]+$")
    razorpay_signature: str = Field(pattern=r"^[0-9a-f]{64}$")


def locked_stock(db, ids):
    rows = db.scalars(select(Inventory).where(Inventory.variant_id.in_(ids)).order_by(Inventory.variant_id)
                      .with_for_update().execution_options(populate_existing=True))
    return {row.variant_id: row for row in rows}


def coupon_discount(coupon, subtotal):
    discount = subtotal * coupon.value // 100 if coupon.kind == "PERCENT" else coupon.value
    return min(subtotal, discount, coupon.maximum if coupon.maximum is not None else subtotal)


def pricing(subtotal, discount, s):
    discounted = subtotal - discount
    shipping = 0 if not subtotal or subtotal >= s.free_shipping_paise else s.shipping_paise
    tax = ((discounted + shipping) * s.tax_bps + 5000) // 10000
    return {"subtotal": subtotal, "discount": discount, "shipping": shipping, "tax": tax,
            "total": discounted + shipping + tax}


def get_coupon(db, code, subtotal, customer_key, *, lock=False):
    if not code.strip():
        return None
    query = select(Coupon).where(Coupon.code == code.strip().upper())
    coupon = db.scalar(query.with_for_update() if lock else query)
    at = now()
    if not coupon or not coupon.active or (coupon.starts_at and coupon.starts_at > at) or (
            coupon.expires_at and coupon.expires_at <= at):
        raise HTTPException(422, "This coupon is invalid or expired.")
    if subtotal < coupon.minimum:
        raise HTTPException(422, "Your bag does not meet this coupon's minimum.")
    base = select(func.count()).select_from(Redemption).where(Redemption.coupon_id == coupon.id, ~Redemption.released)
    if coupon.usage_limit is not None and db.scalar(base) >= coupon.usage_limit:
        raise HTTPException(409, "This coupon has reached its usage limit.")
    if coupon.user_limit is not None:
        if not customer_key:
            raise HTTPException(422, "Sign in to use this coupon.")
        if db.scalar(base.where(Redemption.customer_key == customer_key)) >= coupon.user_limit:
            raise HTTPException(409, "You have reached this coupon's usage limit.")
    return coupon


def checked_items(db, cart, *, lock=False):
    items = cart_items(db, cart) if cart else []
    if not items:
        raise HTTPException(409, "Your bag is empty.")
    stock = locked_stock(db, [item.variant_id for item in items]) if lock else {
        item.variant_id: item.variant.stock for item in items}
    if lock:
        # Admin publication and variant changes acquire the same inventory locks.
        from .models import Product, Variant
        products = {item.variant.product_id for item in items}
        for cls, ids in ((Variant, list(stock)), (Product, list(products))):
            list(db.scalars(select(cls).where(cls.id.in_(ids)).execution_options(populate_existing=True)))
    for item in items:
        v = item.variant
        row = stock.get(v.id)
        if not v.active or not v.product.published or not row or row.available < item.quantity:
            raise HTTPException(409, f"{v.product.name} is unavailable in the selected quantity.")
    return items, stock


def order_view(order, *, full=False):
    result = {"id": order.id, "number": order.number, "status": order.status, "created_at": order.created_at,
              "pricing": order.pricing, "payment": order.payment.status, "payment_method": order.payment.method,
              "expires_at": order.expires_at}
    if full:
        result.update(address=order.address, shipment={"carrier": order.shipment.carrier, "tracking": order.shipment.tracking}
                      if order.shipment else None,
                      items=[{**i.snapshot, "quantity": i.quantity, "unit_price": i.unit_price} for i in order.items])
    return result


def razorpay(method, path, payload=None):
    s = settings()
    if not s.razorpay_key_id or not s.razorpay_key_secret:
        raise HTTPException(503, "Razorpay payments are unavailable in this environment.")
    try:
        r = httpx.request(method, f"https://api.razorpay.com/v1/{path}", json=payload,
                          auth=(s.razorpay_key_id, s.razorpay_key_secret), timeout=6)
        r.raise_for_status()
        return r.json()
    except (httpx.HTTPError, ValueError):
        raise HTTPException(502, "Razorpay could not be reached. Please try again.") from None


def verify_hmac(message, signature, secret):
    return bool(secret and compare_digest(hmac_digest(secret.encode(), message, "sha256").hexdigest().encode(),
                                          signature.encode()))


def initialize(db, order_id):
    order = lock_order(db, order_id)
    if order.status != "PENDING_PAYMENT" or order.expires_at <= now():
        return order_view(order)
    payment = order.payment
    if not payment.gateway_order_id:
        # Look up by stable receipt before a retry after an ambiguous network failure.
        existing = razorpay("GET", f"orders?receipt={order.number}&count=10").get("items", [])
        remote = next((r for r in existing if r.get("receipt") == order.number), None)
        if remote is None:
            remote = razorpay("POST", "orders", {"amount": order.pricing["total"], "currency": "INR",
                                               "receipt": order.number})
        if remote.get("amount") != order.pricing["total"] or remote.get("currency") != "INR" or not remote.get("id"):
            raise HTTPException(502, "Razorpay returned inconsistent order details.")
        payment.gateway_order_id = remote["id"]
        payment.status = "PENDING"
    result = {**order_view(order), "gateway_order_id": payment.gateway_order_id, "key": settings().razorpay_key_id}
    db.commit()
    return result


@router.post("/checkout/quote")
@router.post("/coupons/validate")
def quote(data: Quote, request: Request, response: Response, db: DB, user: OptionalUser):
    cart = find_cart(db, request, response, user, create=False)
    items, _ = checked_items(db, cart)
    subtotal = sum(i.variant.price * i.quantity for i in items)
    coupon = get_coupon(db, data.coupon, subtotal, digest(user.id) if user else None)
    s = settings()
    return {**pricing(subtotal, coupon_discount(coupon, subtotal) if coupon else 0, s),
            "payments_available": bool(s.razorpay_key_id and s.razorpay_key_secret),
            "cash_on_delivery": s.cash_on_delivery, "demo_checkout": s.demo_checkout}


@router.post("/checkout/orders", status_code=201)
def checkout(data: Checkout, request: Request, response: Response, db: DB, user: OptionalUser,
             idempotency_key: Annotated[str, Header(min_length=16, max_length=80)]):
    s = settings()
    cash = data.payment_method == "CASH_ON_DELIVERY"
    demo = data.payment_method == "DEMO"
    offline = cash or demo
    if user:
        db.scalar(select(User.id).where(User.id == user.id).with_for_update(key_share=True))
    cart = find_cart(db, request, response, user, create=False, lock=True)
    if not cart:
        raise HTTPException(409, "Your bag is empty.")
    scope = digest(user.id) if user else cart.guest_digest
    # Existing Razorpay orders were fingerprinted before the payment method field existed.
    fingerprint = digest(data.model_dump_json(exclude={"payment_method"} if not offline else None))
    existing = db.scalar(select(Order).where(Order.scope == scope, Order.idempotency_key == idempotency_key))
    if existing:
        if existing.fingerprint != fingerprint:
            raise HTTPException(409, "This checkout key was already used with different details.")
        if offline:
            return order_view(existing, full=True)
        return initialize(db, existing.id)
    if cash and not s.cash_on_delivery:
        raise HTTPException(503, "Cash on delivery is unavailable.")
    if demo and not s.demo_checkout:
        raise HTTPException(503, "Demo checkout is unavailable.")
    if not offline and (not s.razorpay_key_id or not s.razorpay_key_secret):
        raise HTTPException(503, "Razorpay payments are unavailable in this environment.")
    owner = Order.user_id == user.id if user else Order.cart_id == cart.id
    pending = db.scalar(select(Order.id).where(owner, Order.status == "PENDING_PAYMENT").limit(1))
    if pending:
        raise HTTPException(409, "An earlier checkout is awaiting payment. Resume it from the checkout page.")
    items, stock = checked_items(db, cart, lock=True)
    subtotal = sum(i.variant.price * i.quantity for i in items)
    coupon = get_coupon(db, data.coupon, subtotal, digest(user.id) if user else None, lock=True)
    totals = pricing(subtotal, coupon_discount(coupon, subtotal) if coupon else 0, s)
    if totals["total"] != data.expected_total or totals["total"] <= 0:
        raise HTTPException(409, "Your total changed or is below the payable minimum. Request a new quote.")
    from .models import identifier
    order = Order(number="DSK-" + identifier().replace("-", "").upper(), user_id=user.id if user else None,
                  cart_id=cart.id, scope=scope, idempotency_key=idempotency_key, fingerprint=fingerprint,
                  address=data.address.model_dump(), pricing=totals, expires_at=now() + timedelta(minutes=20))
    db.add(order)
    db.flush()
    for i in items:
        v = i.variant
        stock[v.id].reserved += i.quantity
        db.add(Reservation(order_id=order.id, variant_id=v.id, quantity=i.quantity))
        db.add(OrderItem(order_id=order.id, variant_id=v.id, quantity=i.quantity, unit_price=v.price,
                         snapshot={"name": v.product.name, "slug": v.product.slug, "variant": v.name,
                                   "sku": v.sku, "category": v.product.category.name}))
    if coupon:
        db.add(Redemption(order_id=order.id, coupon_id=coupon.id, customer_key=scope))
    payment_status = "NOT_REQUIRED" if demo else "DUE" if cash else "CREATED"
    db.add(Payment(order_id=order.id, method=data.payment_method, status=payment_status))
    db.add(Event(name="checkout_started", entity_id=order.id))
    if offline:
        db.flush()
        move_reservations(db, order, capture=True, reason="Demo order" if demo else "Cash on delivery order")
        clear_ordered_cart(db, order)
        order.status = "PLACED"
        db.add(Event(name="order_placed", entity_id=order.id))
        if cash:
            enqueue(db, order.address["email"], f"Deskly order {order.number}",
                    f"Order {order.number} was placed. Payment is due on delivery.")
        db.commit()
        return order_view(order, full=True)
    db.commit()
    return initialize(db, order.id)


def lock_order(db, order_id):
    return db.scalar(select(Order).where(Order.id == order_id).with_for_update().execution_options(populate_existing=True))


def order_cart_scope(db, order, request, response, user):
    if not order:
        return False
    if order.user_id:
        return user and order.user_id == user.id
    cart = find_cart(db, request, response, None, create=False)
    return cart and cart.id == order.cart_id


def move_reservations(db, order, *, capture, reason="Verified payment"):
    holds = list(db.scalars(select(Reservation).where(Reservation.order_id == order.id, Reservation.state == "HELD")))
    stock = locked_stock(db, [r.variant_id for r in holds])
    for hold in holds:
        row = stock[hold.variant_id]
        row.reserved -= hold.quantity
        hold.state = "CONSUMED" if capture else "RELEASED"
        if capture:
            row.on_hand -= hold.quantity
            db.add(Movement(variant_id=hold.variant_id, delta=-hold.quantity, reason=reason, order_id=order.id))


def apply_capture(db, order, remote):
    payment = order.payment
    if (remote.get("order_id") != payment.gateway_order_id or remote.get("amount") != order.pricing["total"]
            or remote.get("currency") != "INR" or remote.get("status") != "captured" or not remote.get("id")):
        raise HTTPException(400, "Payment does not match the order.")
    if payment.status == "CAPTURED":
        if payment.gateway_payment_id != remote["id"]:
            raise HTTPException(409, "A different payment was already captured for this order.")
        return
    payment.status = "CAPTURED"
    payment.gateway_payment_id = remote["id"]
    if order.status != "PENDING_PAYMENT":
        # Late capture after stock release requires operator review and manual refund.
        db.add(Event(name="payment_captured_after_release", entity_id=order.id))
        return
    move_reservations(db, order, capture=True)
    order.paid_at = now()
    order.status = "PAID"
    clear_ordered_cart(db, order)
    db.add(Event(name="order_paid", entity_id=order.id))
    enqueue(db, order.address["email"], f"Deskly order {order.number}", f"Payment verified for order {order.number}.")


def clear_ordered_cart(db, order):
    # Clear the quantities covered by this order, preserving items added while paying.
    for line in order.items:
        item = db.scalar(select(CartItem).where(CartItem.cart_id == order.cart_id, CartItem.variant_id == line.variant_id)
                         .with_for_update(of=CartItem))
        if item and item.quantity > line.quantity:
            item.quantity -= line.quantity
        elif item:
            db.delete(item)


def apply_gateway(db, order_id, remote):
    candidate = db.get(Order, order_id)
    # Always acquire cart before order, matching checkout and guest merge.
    db.scalar(select(Cart).where(Cart.id == candidate.cart_id).with_for_update())
    order = lock_order(db, order_id)
    apply_capture(db, order, remote)
    return order


def release_order(db, order, status):
    move_reservations(db, order, capture=False)
    order.status = status
    order.payment.status = "FAILED"
    release_redemption(db, order)


def release_redemption(db, order):
    redeemed = db.scalar(select(Redemption).where(Redemption.order_id == order.id))
    if redeemed:
        redeemed.released = True


@router.post("/payments/razorpay/verify")
def verify(data: Verify, request: Request, response: Response, db: DB, user: OptionalUser):
    order = db.get(Order, str(data.order_id))
    if not order_cart_scope(db, order, request, response, user):
        raise HTTPException(404, "Order not found.")
    gateway_id = order.payment.gateway_order_id
    signature_data = f"{gateway_id}|{data.razorpay_payment_id}".encode()
    if data.razorpay_order_id != gateway_id or not verify_hmac(signature_data, data.razorpay_signature, settings().razorpay_key_secret):
        raise HTTPException(400, "Payment signature could not be verified.")
    remote = razorpay("GET", f"payments/{data.razorpay_payment_id}")
    if remote.get("status") == "captured":
        order = apply_gateway(db, order.id, remote)
        db.commit()
    return order_view(order, full=True)


@router.post("/webhooks/razorpay")
async def webhook(request: Request, db: DB, x_razorpay_signature: Annotated[str, Header()] = "",
                  x_razorpay_event_id: Annotated[str, Header(max_length=120)] = ""):
    body = await request.body()
    if len(body) > 100_000 or not x_razorpay_event_id or not verify_hmac(body, x_razorpay_signature, settings().razorpay_webhook_secret):
        raise HTTPException(400, "Invalid webhook.")
    try:
        event = json.loads(body)
        kind = event["event"]
        remote = event.get("payload", {}).get("payment", {}).get("entity", {})
    except (TypeError, KeyError, AttributeError, ValueError):
        raise HTTPException(400, "Malformed webhook.") from None
    from starlette.concurrency import run_in_threadpool
    return await run_in_threadpool(process_webhook, db, x_razorpay_event_id, kind, remote)


def process_webhook(db, event_id, kind, remote):
    key = db.scalar(insert(Webhook).values(event_id=event_id, kind=kind).on_conflict_do_nothing().returning(Webhook.id))
    if key and kind in {"payment.captured", "order.paid"}:
        order_id = db.scalar(select(Payment.order_id).where(Payment.gateway_order_id == remote.get("order_id"))) if remote.get("order_id") else None
        if not order_id:
            raise HTTPException(409, "Gateway order has not been linked yet.")
        apply_gateway(db, order_id, remote)
    db.commit()
    return {"ok": True}


@router.get("/checkout/pending")
def pending_order(request: Request, response: Response, db: DB, user: OptionalUser):
    cart = find_cart(db, request, response, user, create=False)
    if not cart and not user:
        return None
    owner = Order.user_id == user.id if user else Order.cart_id == cart.id
    order = db.scalar(select(Order).where(owner, Order.status == "PENDING_PAYMENT").order_by(Order.created_at.desc()).limit(1))
    return order_view(order) if order else None


@router.post("/checkout/orders/{order_id}/resume")
def resume(order_id: UUID4, request: Request, response: Response, db: DB, user: OptionalUser):
    order = db.get(Order, str(order_id))
    if not order_cart_scope(db, order, request, response, user):
        raise HTTPException(404, "Order not found.")
    return initialize(db, order.id)


@router.get("/checkout/orders/{order_id}")
def checkout_status(order_id: UUID4, request: Request, response: Response, db: DB, user: OptionalUser):
    order = db.get(Order, str(order_id))
    if not order_cart_scope(db, order, request, response, user):
        raise HTTPException(404, "Order not found.")
    return order_view(order, full=True)


@router.get("/me/orders")
def my_orders(db: DB, user: CurrentUser, page: int = Query(1, ge=1, le=10000)):
    rows = db.scalars(select(Order).where(Order.user_id == user.id).order_by(Order.created_at.desc()).offset((page - 1) * 20).limit(20))
    return [order_view(o) for o in rows]


@router.get("/me/orders/{order_id}")
def my_order(order_id: UUID4, db: DB, user: CurrentUser):
    return order_view(owned(db, Order, order_id, user), full=True)


@router.post("/me/orders/{order_id}/cancel")
def cancel_order(order_id: UUID4, db: DB, user: CurrentUser):
    order = lock_order(db, str(order_id))
    if not order or order.user_id != user.id:
        raise HTTPException(404, "Order not found.")
    if order.status == "PLACED" and order.payment.method in {"CASH_ON_DELIVERY", "DEMO"}:
        reservations = list(db.scalars(select(Reservation).where(Reservation.order_id == order.id, Reservation.state == "CONSUMED")))
        stock = locked_stock(db, [reservation.variant_id for reservation in reservations])
        for reservation in reservations:
            stock[reservation.variant_id].on_hand += reservation.quantity
            reservation.state = "RELEASED"
            db.add(Movement(variant_id=reservation.variant_id, delta=reservation.quantity,
                            reason="Demo order cancellation" if order.payment.method == "DEMO" else "Cash on delivery cancellation",
                            order_id=order.id))
        order.status = "CANCELLED"
        order.payment.status = "VOID"
        release_redemption(db, order)
    elif order.status != "PENDING_PAYMENT" or order.payment.gateway_order_id:
        raise HTTPException(409, "This order is ineligible for self-service cancellation.")
    else:
        release_order(db, order, "CANCELLED")
    db.commit()
    return order_view(order, full=True)
