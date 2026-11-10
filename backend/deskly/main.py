from collections import defaultdict, deque
from threading import Lock
from time import monotonic
from uuid import uuid4
import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from redis import Redis
from redis.exceptions import RedisError
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from . import accounts, admin, builder, cart, catalogue, commerce
from .config import settings
from .db import SessionLocal

app = FastAPI(title="DESKLY API", version="1.0.0")
logger = logging.getLogger("uvicorn.error")
s = settings()
redis = Redis.from_url(s.redis_url, socket_timeout=2) if s.redis_url else None
memory_windows = defaultdict(deque)
window_lock = Lock()
SENSITIVE = {"/auth/login": 12, "/auth/register": 8, "/auth/forgot-password": 6, "/auth/reset-password": 8,
             "/builder/start": 30, "/builder/recommend": 24, "/checkout/orders": 20, "/payments/razorpay/verify": 30}


def limit_hit(path, client, maximum):
    key = f"deskly:rate:{path}:{client}"
    if redis:
        with redis.pipeline(transaction=True) as pipe:
            count, _ = pipe.incr(key).expire(key, 60, nx=True).execute()
        return count > maximum
    with window_lock:
        at = monotonic()
        if len(memory_windows) > 4000:
            for stale in [k for k, v in memory_windows.items() if v[-1] <= at - 60]:
                del memory_windows[stale]
        entries = memory_windows[key]
        while entries and entries[0] <= at - 60:
            entries.popleft()
        if len(entries) >= maximum:
            return True
        entries.append(at)
        return False


def fail(status, message):
    return JSONResponse({"detail": message}, status_code=status)


@app.middleware("http")
async def protect(request: Request, call_next):
    at = monotonic()
    request_id = str(uuid4())
    path = request.url.path.removeprefix("/api/v1")
    write = request.method not in {"GET", "HEAD", "OPTIONS"}
    if write and path != "/webhooks/razorpay" and request.headers.get("origin") != s.app_origin:
        response = fail(403, "Request origin is not allowed.")
    else:
        try:
            from starlette.concurrency import run_in_threadpool
            maximum = SENSITIVE.get(path) if write else None
            client = request.client.host if request.client else "unknown"
            if maximum and await run_in_threadpool(limit_hit, path, client, maximum):
                response = fail(429, "Too many attempts. Wait a minute and try again.")
                response.headers["Retry-After"] = "60"
            else:
                response = await call_next(request)
        except RedisError:
            response = fail(503, "The service is temporarily unavailable.")
        except Exception:
            logger.error("unhandled_request request_id=%s", request_id)
            response = fail(500, "Something went wrong. Try again shortly.")
    response.headers["X-Request-ID"] = request_id
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    logger.info("request_id=%s method=%s route=%s status=%s duration_ms=%d", request_id, request.method,
                request.scope["route"].path if "route" in request.scope else "unmatched", response.status_code,
                (monotonic() - at) * 1000)
    return response


@app.exception_handler(RequestValidationError)
def validation_error(request, exc):
    details = [{"field": ".".join(str(i) for i in e["loc"][1:]), "message": e["msg"]} for e in exc.errors()]
    return JSONResponse({"detail": "Check the form fields and try again.", "errors": details}, status_code=422)


@app.exception_handler(IntegrityError)
def integrity_error(request, exc):
    return fail(409, "This operation conflicts with an existing record.")


@app.exception_handler(SQLAlchemyError)
def database_error(request, exc):
    logger.error("database_failure type=%s", type(exc).__name__)
    return fail(503, "The data service could not complete the request.")


@app.get("/health")
def health():
    with SessionLocal() as db:
        db.execute(text("SELECT 1"))
    return {"status": "ok"}


for module in (catalogue, accounts, cart, commerce, builder, admin):
    app.include_router(module.router, prefix="/api/v1")
