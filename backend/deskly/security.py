from datetime import timedelta
from hashlib import sha256
from secrets import token_urlsafe
from typing import Annotated

from fastapi import Depends, HTTPException, Request, Response
from pwdlib import PasswordHash
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from .db import get_db
from .models import User, UserSession, now

DB = Annotated[Session, Depends(get_db)]
PASSWORD = PasswordHash.recommended()
DUMMY_HASH = PASSWORD.hash("deskly-unused-login-hash")
SESSION = "deskly_session"
GUEST = "deskly_cart"


def digest(value: str):
    return sha256(value.encode()).hexdigest()


def cookie(response: Response, key: str, value: str, days: int):
    response.set_cookie(key, value, max_age=days * 86400, httponly=True,
                        secure=settings().environment == "production", samesite="lax")


def active_session(request: Request, db: DB):
    token = request.cookies.get(SESSION, "")
    if not token or len(token) > 100:
        return None
    return db.scalar(select(UserSession).where(UserSession.digest == digest(token), UserSession.expires_at > now()))


def optional_user(session: Annotated[UserSession | None, Depends(active_session)]):
    return session.user if session else None


OptionalUser = Annotated[User | None, Depends(optional_user)]


def require_user(user: OptionalUser):
    if not user:
        raise HTTPException(401, "Sign in to continue.")
    return user


CurrentUser = Annotated[User, Depends(require_user)]


def require_admin(user: CurrentUser):
    if user.role != "ADMIN":
        raise HTTPException(403, "Administrator access is required.")
    return user


Admin = Annotated[User, Depends(require_admin)]


def new_session(db: Session, user: User, response: Response):
    token = token_urlsafe(32)
    db.add(UserSession(user_id=user.id, digest=digest(token), expires_at=now() + timedelta(days=14)))
    cookie(response, SESSION, token, 14)


def user_view(user: User):
    return {"id": user.id, "name": user.name, "email": user.email, "role": user.role}
