from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column as col, relationship


def now():
    return datetime.now(timezone.utc)


def identifier():
    return str(uuid4())


class Base(DeclarativeBase):
    pass


class Record:
    id: Mapped[str] = col(String(36), primary_key=True, default=identifier)
    created_at: Mapped[datetime] = col(DateTime(timezone=True), default=now, index=True)
    updated_at: Mapped[datetime] = col(DateTime(timezone=True), default=now, onupdate=now)


class User(Record, Base):
    __tablename__ = "users"
    name: Mapped[str] = col(String(100))
    email: Mapped[str] = col(String(254), unique=True)
    password_hash: Mapped[str] = col(String(255))
    role: Mapped[str] = col(String(10), default="CUSTOMER")


class UserSession(Record, Base):
    __tablename__ = "user_sessions"
    user_id: Mapped[str] = col(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    digest: Mapped[str] = col(String(64), unique=True)
    expires_at: Mapped[datetime] = col(DateTime(timezone=True), index=True)
    user: Mapped[User] = relationship()


class ResetToken(Record, Base):
    __tablename__ = "password_reset_tokens"
    user_id: Mapped[str] = col(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    digest: Mapped[str] = col(String(64), unique=True)
    expires_at: Mapped[datetime] = col(DateTime(timezone=True))


class Address(Record, Base):
    __tablename__ = "addresses"
    user_id: Mapped[str] = col(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    data: Mapped[dict] = col(JSON)


class Category(Record, Base):
    __tablename__ = "categories"
    slug: Mapped[str] = col(String(80), unique=True)
    name: Mapped[str] = col(String(100))
    description: Mapped[str] = col(Text, default="")
    image: Mapped[str] = col(String(500), default="/media/fallback.svg")


class Product(Record, Base):
    __tablename__ = "products"
    category_id: Mapped[str] = col(ForeignKey("categories.id"), index=True)
    slug: Mapped[str] = col(String(100), unique=True)
    name: Mapped[str] = col(String(120))
    brand: Mapped[str] = col(String(80), index=True)
    description: Mapped[str] = col(Text)
    specs: Mapped[dict] = col(JSON, default=dict)
    aesthetics: Mapped[list] = col(JSON, default=list)
    purposes: Mapped[list] = col(JSON, default=list)
    published: Mapped[bool] = col(Boolean, default=False, index=True)
    featured: Mapped[bool] = col(Boolean, default=False)
    category: Mapped[Category] = relationship(lazy="joined")
    variants: Mapped[list["Variant"]] = relationship(lazy="selectin", order_by="Variant.price")
    images: Mapped[list["ProductImage"]] = relationship(lazy="selectin", order_by="ProductImage.position")


class ProductImage(Record, Base):
    __tablename__ = "product_images"
    product_id: Mapped[str] = col(ForeignKey("products.id"), index=True)
    url: Mapped[str] = col(String(500))
    alt: Mapped[str] = col(String(160), default="")
    position: Mapped[int] = col(Integer, default=0)


class Variant(Record, Base):
    __tablename__ = "product_variants"
    __table_args__ = (CheckConstraint("price > 0"),)
    product_id: Mapped[str] = col(ForeignKey("products.id"), index=True)
    sku: Mapped[str] = col(String(80), unique=True)
    name: Mapped[str] = col(String(100))
    color: Mapped[str] = col(String(40), index=True)
    price: Mapped[int] = col(Integer, index=True)
    active: Mapped[bool] = col(Boolean, default=True)
    compatibility: Mapped[dict] = col(JSON, default=dict)
    product: Mapped[Product] = relationship(back_populates="variants", overlaps="variants")
    stock: Mapped["Inventory"] = relationship(lazy="joined", back_populates="variant")


class Inventory(Base):
    __tablename__ = "inventory"
    __table_args__ = (CheckConstraint("on_hand >= reserved AND reserved >= 0"),)
    variant_id: Mapped[str] = col(ForeignKey("product_variants.id"), primary_key=True)
    on_hand: Mapped[int] = col(Integer, default=0)
    reserved: Mapped[int] = col(Integer, default=0)
    variant: Mapped[Variant] = relationship(back_populates="stock")

    @property
    def available(self):
        return self.on_hand - self.reserved


class Movement(Record, Base):
    __tablename__ = "inventory_movements"
    variant_id: Mapped[str] = col(ForeignKey("inventory.variant_id"), index=True)
    delta: Mapped[int] = col(Integer)
    reason: Mapped[str] = col(String(200))
    order_id: Mapped[str | None] = col(ForeignKey("orders.id"))
    actor_id: Mapped[str | None] = col(ForeignKey("users.id"))


class Reservation(Record, Base):
    __tablename__ = "inventory_reservations"
    __table_args__ = (UniqueConstraint("order_id", "variant_id"), CheckConstraint("quantity > 0"))
    order_id: Mapped[str] = col(ForeignKey("orders.id"), index=True)
    variant_id: Mapped[str] = col(ForeignKey("inventory.variant_id"))
    quantity: Mapped[int] = col(Integer)
    state: Mapped[str] = col(String(20), default="HELD")


class Cart(Record, Base):
    __tablename__ = "carts"
    user_id: Mapped[str | None] = col(ForeignKey("users.id"), unique=True)
    guest_digest: Mapped[str | None] = col(String(64), unique=True)


class CartItem(Record, Base):
    __tablename__ = "cart_items"
    __table_args__ = (UniqueConstraint("cart_id", "variant_id"), CheckConstraint("quantity BETWEEN 1 AND 99"))
    cart_id: Mapped[str] = col(ForeignKey("carts.id"), index=True)
    variant_id: Mapped[str] = col(ForeignKey("product_variants.id"))
    quantity: Mapped[int] = col(Integer)
    variant: Mapped[Variant] = relationship(lazy="joined")


class Wishlist(Record, Base):
    __tablename__ = "wishlists"
    __table_args__ = (UniqueConstraint("user_id", "product_id"),)
    user_id: Mapped[str] = col(ForeignKey("users.id"), index=True)
    product_id: Mapped[str] = col(ForeignKey("products.id"))


class Coupon(Record, Base):
    __tablename__ = "coupons"
    code: Mapped[str] = col(String(32), unique=True)
    kind: Mapped[str] = col(String(12))
    value: Mapped[int] = col(Integer)
    minimum: Mapped[int] = col(Integer, default=0)
    maximum: Mapped[int | None] = col(Integer)
    starts_at: Mapped[datetime | None] = col(DateTime(timezone=True))
    expires_at: Mapped[datetime | None] = col(DateTime(timezone=True))
    usage_limit: Mapped[int | None] = col(Integer)
    user_limit: Mapped[int | None] = col(Integer)
    active: Mapped[bool] = col(Boolean, default=True)


class Redemption(Record, Base):
    __tablename__ = "coupon_redemptions"
    coupon_id: Mapped[str] = col(ForeignKey("coupons.id"), index=True)
    order_id: Mapped[str] = col(ForeignKey("orders.id"), unique=True)
    customer_key: Mapped[str] = col(String(64))
    released: Mapped[bool] = col(Boolean, default=False)


class Order(Record, Base):
    __tablename__ = "orders"
    __table_args__ = (UniqueConstraint("scope", "idempotency_key"),)
    number: Mapped[str] = col(String(40), unique=True)
    user_id: Mapped[str | None] = col(ForeignKey("users.id"), index=True)
    cart_id: Mapped[str] = col(ForeignKey("carts.id"))
    scope: Mapped[str] = col(String(64))
    idempotency_key: Mapped[str] = col(String(80))
    fingerprint: Mapped[str] = col(String(64))
    address: Mapped[dict] = col(JSON)
    pricing: Mapped[dict] = col(JSON)
    status: Mapped[str] = col(String(24), default="PENDING_PAYMENT", index=True)
    expires_at: Mapped[datetime] = col(DateTime(timezone=True), index=True)
    paid_at: Mapped[datetime | None] = col(DateTime(timezone=True), index=True)
    items: Mapped[list["OrderItem"]] = relationship(lazy="selectin")
    payment: Mapped["Payment"] = relationship(lazy="selectin")
    shipment: Mapped["Shipment | None"] = relationship(lazy="selectin")


class OrderItem(Record, Base):
    __tablename__ = "order_items"
    order_id: Mapped[str] = col(ForeignKey("orders.id"), index=True)
    variant_id: Mapped[str] = col(ForeignKey("product_variants.id"))
    snapshot: Mapped[dict] = col(JSON)
    quantity: Mapped[int] = col(Integer)
    unit_price: Mapped[int] = col(Integer)


class Payment(Record, Base):
    __tablename__ = "payments"
    order_id: Mapped[str] = col(ForeignKey("orders.id"), unique=True)
    method: Mapped[str] = col(String(16), default="RAZORPAY", server_default="RAZORPAY")
    gateway_order_id: Mapped[str | None] = col(String(80), unique=True)
    gateway_payment_id: Mapped[str | None] = col(String(80), unique=True)
    status: Mapped[str] = col(String(16), default="CREATED")


class Webhook(Record, Base):
    __tablename__ = "payment_webhook_events"
    event_id: Mapped[str] = col(String(120), unique=True)
    kind: Mapped[str] = col(String(80))


class Shipment(Record, Base):
    __tablename__ = "shipments"
    order_id: Mapped[str] = col(ForeignKey("orders.id"), unique=True)
    carrier: Mapped[str] = col(String(100))
    tracking: Mapped[str] = col(String(120))


class SavedSetup(Record, Base):
    __tablename__ = "saved_setups"
    user_id: Mapped[str] = col(ForeignKey("users.id"), index=True)
    name: Mapped[str] = col(String(100))
    preferences: Mapped[dict] = col(JSON)
    explanation: Mapped[dict] = col(JSON, default=dict)
    items: Mapped[list["SetupItem"]] = relationship(lazy="selectin", cascade="all, delete-orphan")


class SetupItem(Record, Base):
    __tablename__ = "saved_setup_items"
    __table_args__ = (UniqueConstraint("setup_id", "variant_id"),)
    setup_id: Mapped[str] = col(ForeignKey("saved_setups.id", ondelete="CASCADE"), index=True)
    variant_id: Mapped[str] = col(ForeignKey("product_variants.id"))
    quantity: Mapped[int] = col(Integer, default=1)


class BuilderRun(Record, Base):
    __tablename__ = "ai_builder_runs"
    user_id: Mapped[str | None] = col(ForeignKey("users.id"))
    preferences: Mapped[dict] = col(JSON)
    result: Mapped[dict] = col(JSON)


class Audit(Record, Base):
    __tablename__ = "admin_audit_logs"
    actor_id: Mapped[str] = col(ForeignKey("users.id"), index=True)
    action: Mapped[str] = col(String(60))
    target: Mapped[str] = col(String(80))
    detail: Mapped[dict] = col(JSON, default=dict)


class EmailJob(Record, Base):
    __tablename__ = "email_jobs"
    recipient: Mapped[str] = col(String(254))
    subject: Mapped[str] = col(String(160))
    body: Mapped[str] = col(Text)
    attempts: Mapped[int] = col(Integer, default=0)
    next_at: Mapped[datetime] = col(DateTime(timezone=True), default=now, index=True)
    sent_at: Mapped[datetime | None] = col(DateTime(timezone=True))


class Event(Record, Base):
    __tablename__ = "business_events"
    name: Mapped[str] = col(String(60), index=True)
    entity_id: Mapped[str | None] = col(String(36))
