from typing import Literal

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import exists, func, select

from .config import settings
from .models import Category, Event, Inventory, Product, Variant
from .security import DB

router = APIRouter(tags=["Catalogue"])
Sort = Literal["featured", "price-asc", "price-desc", "newest", "name"]


def category_view(category):
    return {key: getattr(category, key) for key in ("id", "slug", "name", "description", "image")}


def variant_view(variant):
    return {"id": variant.id, "sku": variant.sku, "name": variant.name, "color": variant.color,
            "price": variant.price, "active": variant.active, "compatibility": variant.compatibility,
            "available": variant.stock.available if variant.stock else 0}


def product_view(product, *, admin=False, minimum=None):
    variants = [variant_view(v) for v in product.variants if admin or v.active]
    images = [{"url": image.url, "alt": image.alt} for image in product.images]
    return {
        "id": product.id, "slug": product.slug, "name": product.name, "brand": product.brand,
        "category": category_view(product.category), "description": product.description, "specs": product.specs,
        "aesthetics": product.aesthetics, "purposes": product.purposes, "published": product.published,
        "featured": product.featured, "variants": variants, "images": images,
        "image": images[0]["url"] if images else product.category.image,
        "price": minimum if minimum is not None else min((v["price"] for v in variants if v["active"]), default=None),
        "available": product.published and any(v["available"] > 0 and v["active"] for v in variants),
    }


@router.get("/store")
def store_info():
    s = settings()
    return {"sample_catalogue": s.sample_catalogue, "free_shipping": s.free_shipping_paise,
            "sandbox": s.razorpay_key_id.startswith("rzp_test_"),
            "cash_on_delivery": s.cash_on_delivery, "demo_checkout": s.demo_checkout,
            "payments_available": bool(s.razorpay_key_id and s.razorpay_key_secret)}


@router.get("/categories")
def categories(db: DB):
    return [category_view(c) for c in db.scalars(select(Category).order_by(Category.created_at, Category.slug))]


@router.get("/products")
def products(db: DB, q: str = Query("", max_length=100), category: str = Query("", max_length=80),
             brand: str = Query("", max_length=80), color: str = Query("", max_length=40),
             min_price: int = Query(0, ge=0), max_price: int | None = Query(None, ge=0),
             available: bool = False, sort: Sort = "featured", page: int = Query(1, ge=1, le=10000),
             limit: int = Query(12, ge=1, le=48)):
    variant_query = select(Variant.product_id, func.min(Variant.price).label("price")).join(Inventory).where(
        Variant.active, Variant.price >= min_price)
    if max_price is not None:
        variant_query = variant_query.where(Variant.price <= max_price)
    if color:
        variant_query = variant_query.where(func.lower(Variant.color) == color.lower())
    if available:
        variant_query = variant_query.where(Inventory.on_hand > Inventory.reserved)
    matches = variant_query.group_by(Variant.product_id).subquery()
    query = select(Product, matches.c.price).join(matches, matches.c.product_id == Product.id).where(Product.published)
    if q.strip():
        term = q.strip()
        query = query.where(Product.name.icontains(term, autoescape=True) |
                            Product.brand.icontains(term, autoescape=True) |
                            Product.description.icontains(term, autoescape=True))
    if category:
        query = query.where(Product.category.has(Category.slug == category))
    if brand:
        query = query.where(func.lower(Product.brand) == brand.lower())
    total = db.scalar(select(func.count()).select_from(query.order_by(None).subquery()))
    ordering = {"featured": Product.featured.desc(), "price-asc": matches.c.price.asc(),
                "price-desc": matches.c.price.desc(), "newest": Product.created_at.desc(), "name": Product.name.asc()}
    rows = db.execute(query.order_by(ordering[sort], Product.slug).offset((page - 1) * limit).limit(limit))
    return {"items": [product_view(p, minimum=price) for p, price in rows], "total": total, "page": page, "limit": limit}


@router.get("/products/featured")
def featured(db: DB, limit: int = Query(4, ge=1, le=12)):
    query = select(Product).where(Product.published, Product.featured, Product.variants.any(Variant.active))
    return [product_view(p) for p in db.scalars(query.order_by(Product.created_at, Product.slug).limit(limit))]


def get_product(db, slug):
    product = db.scalar(select(Product).where(Product.slug == slug, Product.published, Product.variants.any(Variant.active)))
    if not product:
        raise HTTPException(404, "This product could not be found.")
    return product


@router.get("/products/{slug}")
def detail(slug: str, db: DB):
    product = get_product(db, slug)
    db.add(Event(name="product_viewed", entity_id=product.id))
    db.commit()
    return product_view(product)


@router.get("/products/{slug}/related")
def related(slug: str, db: DB):
    product = get_product(db, slug)
    query = select(Product).where(Product.category_id == product.category_id, Product.id != product.id,
                                  Product.published, Product.variants.any(Variant.active)).order_by(Product.featured.desc(), Product.slug)
    return [product_view(p) for p in db.scalars(query.limit(4))]
