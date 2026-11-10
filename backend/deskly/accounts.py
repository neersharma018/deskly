from datetime import timedelta
from secrets import token_urlsafe
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict, EmailStr, Field, UUID4, model_validator
from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import IntegrityError

from .cart import merge_guest
from .catalogue import product_view
from .config import settings
from .models import Address, EmailJob, Product, ResetToken, User, UserSession, Wishlist, now
from .security import DB, SESSION, PASSWORD, DUMMY_HASH, CurrentUser, active_session, digest, new_session, user_view

router = APIRouter(tags=["Accounts"])


class Input(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")


class Email(Input):
    email: EmailStr


class Credentials(Email):
    password: str = Field(min_length=1, max_length=128)


class NewPassword(BaseModel):
    model_config = ConfigDict(extra="forbid")
    password: str = Field(min_length=10, max_length=128)
    password_confirmation: str = Field(max_length=128)

    @model_validator(mode="after")
    def matching_passwords(self):
        if self.password != self.password_confirmation:
            raise ValueError("Passwords must match.")
        if not self.password.strip():
            raise ValueError("Choose a password with at least one non-space character.")
        return self


class Profile(Input):
    name: str = Field(min_length=2, max_length=100)


class Register(NewPassword, Email, Profile):
    pass


class Reset(NewPassword):
    token: str = Field(min_length=32, max_length=128)


class Shipping(Input):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    phone: str = Field(pattern=r"^(?:\+91[- ]?)?[6-9][0-9]{9}$")
    line1: str = Field(min_length=5, max_length=160)
    line2: str = Field("", max_length=160)
    city: str = Field(min_length=2, max_length=80)
    state: str = Field(min_length=2, max_length=80)
    postal_code: str = Field(pattern=r"^[1-9][0-9]{5}$")
    country: Literal["India"] = "India"


class Wish(Input):
    product_id: UUID4


def enqueue(db, recipient, subject, body):
    db.add(EmailJob(recipient=recipient, subject=subject, body=body))


def start_session(db, request, response, user):
    previous = active_session(request, db)
    if previous:
        db.delete(previous)
    new_session(db, user, response)
    adjusted = merge_guest(db, request, response, user)
    db.commit()
    return {**user_view(user), "cart_adjusted": adjusted}


@router.post("/auth/register", status_code=201)
def register(data: Register, request: Request, response: Response, db: DB):
    user = User(name=data.name.strip(), email=data.email.lower(), password_hash=PASSWORD.hash(data.password))
    db.add(user)
    try:
        db.flush()
    except IntegrityError:
        raise HTTPException(409, "An account with that email already exists.") from None
    enqueue(db, user.email, "Welcome to Deskly", "Your Deskly account is ready. Make room for better work.")
    return start_session(db, request, response, user)


@router.post("/auth/login")
def login(data: Credentials, request: Request, response: Response, db: DB):
    user = db.scalar(select(User).where(User.email == data.email.lower()).with_for_update(key_share=True))
    if not PASSWORD.verify(data.password, user.password_hash if user else DUMMY_HASH) or not user:
        raise HTTPException(401, "The email or password is incorrect.")
    return start_session(db, request, response, user)


@router.post("/auth/logout")
def logout(response: Response, db: DB, session: Annotated[UserSession | None, Depends(active_session)]):
    if session:
        db.delete(session)
        db.commit()
    response.delete_cookie(SESSION)
    return {"ok": True}


@router.post("/auth/forgot-password")
def forgot(data: Email, db: DB):
    s = settings()
    if not s.smtp_host or not s.smtp_from:
        raise HTTPException(503, "Password reset email is unavailable in this environment.")
    user = db.scalar(select(User).where(User.email == data.email.lower()).with_for_update(key_share=True))
    if user:
        token = token_urlsafe(32)
        db.execute(delete(ResetToken).where(ResetToken.user_id == user.id))
        db.add(ResetToken(user_id=user.id, digest=digest(token), expires_at=now() + timedelta(minutes=30)))
        enqueue(db, user.email, "Reset your Deskly password",
                f"Use this link within 30 minutes: {s.app_origin}/reset-password?token={token}")
        db.commit()
    return {"ok": True}


@router.post("/auth/reset-password")
def reset(data: Reset, db: DB):
    token_hash = digest(data.token)
    user_id = db.scalar(select(ResetToken.user_id).where(ResetToken.digest == token_hash))
    user = db.get(User, user_id, with_for_update={"key_share": True}) if user_id else None
    token = db.scalar(select(ResetToken).where(ResetToken.digest == token_hash, ResetToken.expires_at > now()))
    if not token or not user:
        raise HTTPException(400, "This reset link is invalid or expired.")
    user.password_hash = PASSWORD.hash(data.password)
    db.execute(delete(ResetToken).where(ResetToken.user_id == user.id))
    db.execute(delete(UserSession).where(UserSession.user_id == user.id))
    db.commit()
    return {"ok": True}


@router.get("/me")
def me(user: CurrentUser):
    return user_view(user)


@router.patch("/me")
def profile(data: Profile, db: DB, user: CurrentUser):
    user.name = data.name
    db.commit()
    return user_view(user)


@router.get("/me/addresses")
def addresses(db: DB, user: CurrentUser):
    rows = db.scalars(select(Address).where(Address.user_id == user.id).order_by(Address.created_at).limit(100))
    return [{"id": a.id, **a.data} for a in rows]


def owned(db, model, row_id, user):
    row = db.get(model, str(row_id))
    if not row or row.user_id != user.id:
        raise HTTPException(404, "This record could not be found.")
    return row


@router.post("/me/addresses", status_code=201)
def create_address(data: Shipping, db: DB, user: CurrentUser):
    row = Address(user_id=user.id, data=data.model_dump())
    db.add(row)
    db.commit()
    return {"id": row.id, **row.data}


@router.patch("/me/addresses/{row_id}")
def update_address(row_id: UUID4, data: Shipping, db: DB, user: CurrentUser):
    row = owned(db, Address, row_id, user)
    row.data = data.model_dump()
    db.commit()
    return {"id": row.id, **row.data}


@router.delete("/me/addresses/{row_id}")
def delete_address(row_id: UUID4, db: DB, user: CurrentUser):
    db.delete(owned(db, Address, row_id, user))
    db.commit()
    return {"ok": True}


@router.get("/me/wishlist")
def wishlist(db: DB, user: CurrentUser):
    query = select(Product).join(Wishlist).where(Wishlist.user_id == user.id).order_by(Wishlist.created_at.desc()).limit(200)
    return [product_view(p) for p in db.scalars(query)]


@router.post("/me/wishlist")
def add_wish(data: Wish, db: DB, user: CurrentUser):
    p = db.get(Product, str(data.product_id))
    if not p or not p.published:
        raise HTTPException(404, "Product not found.")
    db.execute(insert(Wishlist).values(user_id=user.id, product_id=p.id).on_conflict_do_nothing())
    db.commit()
    return {"ok": True}


@router.delete("/me/wishlist/{product_id}")
def remove_wish(product_id: UUID4, db: DB, user: CurrentUser):
    db.execute(delete(Wishlist).where(Wishlist.user_id == user.id, Wishlist.product_id == str(product_id)))
    db.commit()
    return {"ok": True}
