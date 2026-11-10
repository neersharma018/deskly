from collections import Counter
from datetime import timedelta, datetime
from io import BytesIO
from typing import Annotated, Literal

import boto3
from fastapi import APIRouter, HTTPException, Query, UploadFile
from PIL import Image, ImageOps, UnidentifiedImageError
from pydantic import AwareDatetime, Field, UUID4, field_validator, model_validator
from sqlalchemy import func, select

from .accounts import Input, enqueue
from .catalogue import category_view, product_view, variant_view
from .commerce import PAID_STATES, lock_order, locked_stock, order_view
from .config import settings
from .models import Audit, Category, Coupon, Inventory, Movement, Order, Product, ProductImage, Redemption, Shipment, Variant, identifier, now
from .security import Admin, DB

router = APIRouter(prefix="/admin", tags=["Administration"])


class CategoryData(Input):
    name: str = Field(min_length=2, max_length=100)
    slug: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=80)
    description: str = Field("", max_length=1200)
    image: str = Field("/media/fallback.svg", max_length=500)

    @field_validator("image")
    @classmethod
    def media_url(cls, value):
        if value.startswith("/media/") or value.startswith("https://"):
            return value
        raise ValueError("Use an HTTPS media URL or a local /media/ asset.")


class ProductData(CategoryData):
    category_id: UUID4
    brand: str = Field(min_length=1, max_length=80)
    specs: dict[str, str] = Field(default_factory=dict, max_length=40)
    aesthetics: list[str] = Field(default_factory=list, max_length=8)
    purposes: list[str] = Field(default_factory=list, max_length=8)
    featured: bool = False
    published: bool = False
    gallery: list[Annotated[str, Field(max_length=500)]] = Field(default_factory=list, max_length=8)

    @field_validator("gallery")
    @classmethod
    def gallery_urls(cls, urls):
        return [cls.media_url(url) for url in urls]


class Compatibility(Input):
    equipment: str = Field("", max_length=40)
    width_cm: int | None = Field(None, ge=1, le=300)
    depth_cm: int | None = Field(None, ge=1, le=200)
    wireless: bool = False
    quiet: bool = False
    requires: list[str] = Field(default_factory=list, max_length=12)


class VariantData(Input):
    sku: str = Field(min_length=2, max_length=80)
    name: str = Field(min_length=2, max_length=100)
    color: str = Field(min_length=2, max_length=40)
    price: int = Field(ge=100, le=100000000)
    active: bool = True
    compatibility: Compatibility = Field(default_factory=Compatibility)


class Adjustment(Input):
    variant_id: UUID4
    delta: int = Field(ge=-100000, le=100000)
    reason: str = Field(min_length=3, max_length=200)


class Fulfillment(Input):
    status: Literal["PROCESSING", "SHIPPED", "DELIVERED"]
    carrier: str = Field("", max_length=100)
    tracking: str = Field("", max_length=120)
    cash_collected: bool = False


class CouponData(Input):
    code: str = Field(pattern=r"^[A-Za-z0-9_-]{3,32}$")
    kind: Literal["PERCENT", "FIXED"]
    value: int = Field(ge=1, le=100000000)
    minimum: int = Field(0, ge=0, le=100000000)
    maximum: int | None = Field(None, ge=1, le=100000000)
    starts_at: AwareDatetime | None = None
    expires_at: AwareDatetime | None = None
    usage_limit: int | None = Field(None, ge=1)
    user_limit: int | None = Field(None, ge=1)
    active: bool = True

    @model_validator(mode="after")
    def valid_terms(self):
        if self.kind == "PERCENT" and self.value > 100:
            raise ValueError("Percentage discounts cannot exceed 100.")
        if self.starts_at and self.expires_at and self.starts_at >= self.expires_at:
            raise ValueError("The coupon must expire after it starts.")
        return self


def audit(db, admin, action, target, detail=None):
    db.add(Audit(actor_id=admin.id, action=action, target=target, detail=detail or {}))


def get_row(db, model, row_id, *, lock=False):
    query = select(model).where(model.id == str(row_id))
    row = db.scalar(query.with_for_update(of=model) if lock else query)
    if not row:
        raise HTTPException(404, "Record not found.")
    return row


def update(row, data):
    for key, value in data.items():
        setattr(row, key, value)


@router.post("/media", status_code=201)
def media(file: UploadFile, db: DB, admin: Admin):
    s = settings()
    if not s.s3_bucket or not s.s3_public_url:
        raise HTTPException(503, "S3 media storage is unavailable in this environment.")
    raw = file.file.read(4_000_001)
    if len(raw) > 4_000_000:
        raise HTTPException(413, "Upload a photo smaller than 4 MB.")
    try:
        with Image.open(BytesIO(raw), formats=["JPEG", "PNG", "WEBP"]) as source:
            if source.width * source.height > 16_000_000:
                raise ValueError
            img = ImageOps.exif_transpose(source).convert("RGB")
            img.thumbnail((1600, 1600))
            output = BytesIO()
            img.save(output, "WEBP", quality=86)
    except (OSError, ValueError, UnidentifiedImageError, Image.DecompressionBombError):
        raise HTTPException(422, "Upload a valid JPEG, PNG or WebP image up to 16 megapixels.") from None
    key = f"products/{identifier()}.webp"
    from botocore.exceptions import BotoCoreError, ClientError
    try:
        client = boto3.client("s3", endpoint_url=s.s3_endpoint or None, region_name=s.s3_region,
                              aws_access_key_id=s.aws_access_key_id or None,
                              aws_secret_access_key=s.aws_secret_access_key or None,
                              aws_session_token=s.aws_session_token or None)
        client.put_object(Bucket=s.s3_bucket, Key=key, Body=output.getvalue(), ContentType="image/webp")
    except (BotoCoreError, ClientError):
        raise HTTPException(502, "Product media storage is temporarily unavailable.") from None
    audit(db, admin, "media_uploaded", key)
    db.commit()
    return {"url": f"{s.s3_public_url.rstrip('/')}/{key}"}


@router.get("/categories")
def admin_categories(db: DB, admin: Admin):
    return [category_view(c) for c in db.scalars(select(Category).order_by(Category.name).limit(200))]


@router.post("/categories", status_code=201)
def create_category(data: CategoryData, db: DB, admin: Admin):
    c = Category(**data.model_dump())
    db.add(c)
    db.flush()
    audit(db, admin, "category_created", c.id)
    db.commit()
    return category_view(c)


@router.patch("/categories/{row_id}")
def edit_category(row_id: UUID4, data: CategoryData, db: DB, admin: Admin):
    c = get_row(db, Category, row_id, lock=True)
    update(c, data.model_dump())
    audit(db, admin, "category_updated", c.id)
    db.commit()
    return category_view(c)


@router.get("/products")
def admin_products(db: DB, admin: Admin, page: int = Query(1, ge=1, le=10000)):
    rows = db.scalars(select(Product).order_by(Product.created_at.desc()).offset((page - 1) * 25).limit(25))
    return [product_view(p, admin=True) for p in rows]


@router.get("/products/{row_id}")
def admin_product(row_id: UUID4, db: DB, admin: Admin):
    return product_view(get_row(db, Product, row_id), admin=True)


def write_product(db, admin, p, data, action):
    fields = data.model_dump(exclude={"image", "gallery", "category_id"})
    with db.no_autoflush:
        fields["category_id"] = get_row(db, Category, data.category_id).id
    update(p, fields)
    db.flush()
    urls = list(dict.fromkeys([data.image, *data.gallery]))
    for position, url in enumerate(urls):
        alt = data.name if position == 0 else f"{data.name}, view {position + 1}"
        if position < len(p.images):
            update(p.images[position], {"url": url, "alt": alt})
        else:
            p.images.append(ProductImage(url=url, alt=alt, position=position))
    for image in p.images[len(urls):]:
        db.delete(image)
    audit(db, admin, action, p.id)
    db.commit()
    db.refresh(p)
    return product_view(p, admin=True)


@router.get("/settings")
def store_settings(admin: Admin):
    s = settings()
    return {"environment": s.environment, "sample_catalogue": s.sample_catalogue,
            "shipping_paise": s.shipping_paise, "free_shipping_paise": s.free_shipping_paise, "tax_bps": s.tax_bps,
            "payments": bool(s.razorpay_key_id and s.razorpay_key_secret), "cash_on_delivery": s.cash_on_delivery,
            "webhooks": bool(s.razorpay_webhook_secret),
            "llm": bool(s.openai_api_key), "smtp": bool(s.smtp_host and s.smtp_from),
            "media": bool(s.s3_bucket and s.s3_public_url), "redis": bool(s.redis_url)}


@router.post("/products", status_code=201)
def create_product(data: ProductData, db: DB, admin: Admin):
    p = Product()
    db.add(p)
    return write_product(db, admin, p, data, "product_created")


@router.patch("/products/{row_id}")
def edit_product(row_id: UUID4, data: ProductData, db: DB, admin: Admin):
    p = get_row(db, Product, row_id, lock=True)
    locked_stock(db, [v.id for v in p.variants])
    return write_product(db, admin, p, data, "product_updated")


@router.post("/products/{row_id}/archive")
def archive_product(row_id: UUID4, db: DB, admin: Admin):
    p = get_row(db, Product, row_id, lock=True)
    locked_stock(db, [v.id for v in p.variants])
    p.published = False
    audit(db, admin, "product_archived", p.id)
    db.commit()
    return product_view(p, admin=True)


@router.post("/products/{row_id}/variants", status_code=201)
def create_variant(row_id: UUID4, data: VariantData, db: DB, admin: Admin):
    p = get_row(db, Product, row_id, lock=True)
    v = Variant(product_id=p.id, stock=Inventory(), **data.model_dump())
    db.add(v)
    db.flush()
    audit(db, admin, "variant_created", v.id)
    db.commit()
    return variant_view(v)


@router.patch("/variants/{row_id}")
def edit_variant(row_id: UUID4, data: VariantData, db: DB, admin: Admin):
    locked_stock(db, [str(row_id)])
    v = get_row(db, Variant, row_id, lock=True)
    update(v, data.model_dump())
    audit(db, admin, "variant_updated", v.id)
    db.commit()
    return variant_view(v)


@router.get("/inventory")
def inventory(db: DB, admin: Admin, low: bool = False, page: int = Query(1, ge=1, le=10000)):
    query = select(Inventory).join(Variant).order_by(Variant.sku)
    if low:
        query = query.where(Inventory.on_hand - Inventory.reserved <= 5, Variant.active, Variant.product.has(Product.published))
    rows = db.scalars(query.offset((page - 1) * 30).limit(30))
    return [{"variant_id": r.variant_id, "sku": r.variant.sku, "variant": r.variant.name,
             "product": r.variant.product.name, "on_hand": r.on_hand, "reserved": r.reserved, "available": r.available} for r in rows]


@router.get("/inventory/movements")
def movements(db: DB, admin: Admin, page: int = Query(1, ge=1, le=10000)):
    rows = db.scalars(select(Movement).order_by(Movement.created_at.desc()).offset((page - 1) * 30).limit(30))
    return [{key: getattr(r, key) for key in ("id", "variant_id", "delta", "reason", "created_at")} for r in rows]


@router.post("/inventory/adjustments")
def adjust(data: Adjustment, db: DB, admin: Admin):
    key = str(data.variant_id)
    row = locked_stock(db, [key]).get(key)
    if not row:
        raise HTTPException(404, "Inventory record not found.")
    if not data.delta or row.available + data.delta < 0:
        raise HTTPException(409, "Adjustment is zero or would reduce stock below held inventory.")
    row.on_hand += data.delta
    db.add(Movement(variant_id=key, delta=data.delta, reason=data.reason, actor_id=admin.id))
    audit(db, admin, "stock_adjusted", key, {"delta": data.delta})
    db.commit()
    return {"on_hand": row.on_hand, "reserved": row.reserved, "available": row.available}


@router.get("/orders")
def orders(db: DB, admin: Admin, status: str = Query("", max_length=24), page: int = Query(1, ge=1, le=10000)):
    query = select(Order).order_by(Order.created_at.desc())
    if status:
        query = query.where(Order.status == status)
    return [order_view(o) for o in db.scalars(query.offset((page - 1) * 25).limit(25))]


@router.get("/orders/{row_id}")
def order_detail(row_id: UUID4, db: DB, admin: Admin):
    return order_view(get_row(db, Order, row_id), full=True)


@router.patch("/orders/{row_id}/fulfillment")
def fulfill(row_id: UUID4, data: Fulfillment, db: DB, admin: Admin):
    order = lock_order(db, str(row_id))
    transitions = {"PLACED": "PROCESSING", "PAID": "PROCESSING", "PROCESSING": "SHIPPED", "SHIPPED": "DELIVERED"}
    if not order:
        raise HTTPException(404, "Order not found.")
    cash_due = order.payment.method == "CASH_ON_DELIVERY" and order.payment.status == "DUE"
    if not (cash_due or order.payment.status == "CAPTURED") or transitions.get(order.status) != data.status:
        raise HTTPException(409, "That fulfillment transition is unavailable.")
    if cash_due and data.status == "DELIVERED":
        if not data.cash_collected:
            raise HTTPException(422, "Confirm that payment was collected before marking the order delivered.")
        order.payment.status = "COLLECTED"
        order.paid_at = now()
        audit(db, admin, "cash_collected", order.id, {"amount": order.pricing["total"]})
    if data.status == "SHIPPED":
        if not data.carrier or not data.tracking:
            raise HTTPException(422, "A carrier and tracking number are required.")
        order.shipment = Shipment(carrier=data.carrier, tracking=data.tracking)
    order.status = data.status
    audit(db, admin, "fulfillment_updated", order.id, {"status": data.status})
    enqueue(db, order.address["email"], f"Deskly order {order.number}",
            f"Order {order.number} is {data.status.lower()}." +
            (f" Tracking: {order.shipment.carrier} / {order.shipment.tracking}" if order.shipment else ""))
    db.commit()
    return order_view(order, full=True)


def coupon_view(db, c):
    count = db.scalar(select(func.count()).select_from(Redemption).where(Redemption.coupon_id == c.id, ~Redemption.released))
    return {**{key: getattr(c, key) for key in CouponData.model_fields}, "id": c.id, "uses": count}


@router.get("/coupons")
def coupons(db: DB, admin: Admin, page: int = Query(1, ge=1, le=10000)):
    return [coupon_view(db, c) for c in db.scalars(select(Coupon).order_by(Coupon.code).offset((page-1)*25).limit(25))]


def write_coupon(db, admin, c, data, action):
    update(c, {**data.model_dump(), "code": data.code.upper()})
    db.flush()
    audit(db, admin, action, c.id)
    db.commit()
    return coupon_view(db, c)


@router.post("/coupons", status_code=201)
def create_coupon(data: CouponData, db: DB, admin: Admin):
    c = Coupon()
    db.add(c)
    return write_coupon(db, admin, c, data, "coupon_created")


@router.patch("/coupons/{row_id}")
def update_coupon(row_id: UUID4, data: CouponData, db: DB, admin: Admin):
    return write_coupon(db, admin, get_row(db, Coupon, row_id, lock=True), data, "coupon_updated")


@router.get("/dashboard")
@router.get("/analytics/summary")
def summary(db: DB, admin: Admin, days: int = Query(30, ge=1, le=90)):
    end = now()
    start = end - timedelta(days=days)
    paid = list(db.scalars(select(Order).where(Order.paid_at >= start, Order.paid_at <= end, Order.status.in_(PAID_STATES))))
    counts = dict(db.execute(select(Order.status, func.count()).where(Order.created_at >= start).group_by(Order.status)).all())
    recent = db.scalars(select(Order).order_by(Order.created_at.desc()).limit(6))
    daily, categories, best = Counter(), Counter(), Counter()
    for order in paid:
        daily[order.paid_at.date().isoformat()] += order.pricing["total"]
        for line in order.items:
            categories[line.snapshot["category"]] += line.unit_price * line.quantity
            best[line.snapshot["name"]] += line.quantity
    revenue = sum(daily.values())
    return {"start": start, "end": end, "orders": sum(counts.values()), "revenue": revenue,
            "average": revenue // len(paid) if paid else 0, "statuses": counts, "daily": dict(sorted(daily.items())),
            "category_sales": dict(categories), "bestsellers": dict(best.most_common(10)),
            "recent": [order_view(o) for o in recent], "low_stock": inventory(db, admin, low=True, page=1)}
