from secrets import token_urlsafe

from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, Field, UUID4
from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert

from .models import Cart, CartItem, Event, Order, Variant
from .security import DB, GUEST, OptionalUser, cookie, digest

router = APIRouter(prefix="/cart", tags=["Cart"])


class Quantity(BaseModel):
    quantity: int = Field(ge=1, le=99)


class AddItem(Quantity):
    variant_id: UUID4


def find_cart(db, request, response, user, *, create=True, lock=False):
    if user:
        key = {"user_id": user.id}
    else:
        token = request.cookies.get(GUEST)
        if not token or len(token) > 100:
            if not create:
                return None
            token = token_urlsafe(32)
            cookie(response, GUEST, token, 30)
        key = {"guest_digest": digest(token)}
    if create:
        db.execute(insert(Cart).values(**key).on_conflict_do_nothing())
    query = select(Cart).filter_by(**key)
    return db.scalar(query.with_for_update() if lock else query)


def cart_items(db, cart):
    return list(db.scalars(select(CartItem).where(CartItem.cart_id == cart.id).order_by(CartItem.created_at)))


def valid(variant, quantity):
    return variant and variant.active and variant.product.published and variant.stock and variant.stock.available >= quantity


def add_items(db, cart, quantities):
    existing = {item.variant_id: item for item in cart_items(db, cart)}
    variants = {v.id: v for v in db.scalars(select(Variant).where(Variant.id.in_(quantities)))}
    for variant_id, quantity in quantities.items():
        item = existing.get(variant_id)
        total = quantity + (item.quantity if item else 0)
        if total > 99 or not valid(variants.get(variant_id), total):
            raise HTTPException(409, "An item is unavailable in the requested quantity.")
        if item:
            item.quantity = total
        else:
            db.add(CartItem(cart_id=cart.id, variant_id=variant_id, quantity=total))
    db.flush()


def merge_guest(db, request, response, user):
    guest = find_cart(db, request, response, None, create=False, lock=True)
    if not guest:
        return []
    cart = find_cart(db, request, response, user, lock=True)
    guest_orders = list(db.scalars(select(Order).where(Order.cart_id == guest.id, Order.user_id.is_(None))
                                  .order_by(Order.id).with_for_update(of=Order)))
    held = {line.variant_id: line.quantity for order in guest_orders if order.status == "PENDING_PAYMENT"
            for line in order.items}
    for order in guest_orders:
        order.user_id = user.id
    existing = {item.variant_id: item for item in cart_items(db, cart)}
    adjusted = []
    for item in cart_items(db, guest):
        target = existing.get(item.variant_id)
        old = target.quantity if target else 0
        stock = item.variant.stock.available if valid(item.variant, 1) else 0
        kept = min(item.quantity, held.get(item.variant_id, 0))
        remaining = item.quantity - kept
        quantity = max(0, min(remaining, stock - old, 99 - old))
        if quantity < remaining:
            adjusted.append(item.variant.product.name)
        if quantity and target:
            target.quantity += quantity
        if quantity and not target:
            db.add(CartItem(cart_id=cart.id, variant_id=item.variant_id, quantity=quantity))
        if kept:
            item.quantity = kept
        else:
            db.delete(item)
    response.delete_cookie(GUEST)
    return adjusted


def item_view(item):
    v = item.variant
    p = v.product
    return {"id": item.id, "variant_id": v.id, "name": p.name, "slug": p.slug, "variant": v.name,
            "image": p.images[0].url if p.images else p.category.image, "price": v.price,
            "quantity": item.quantity, "subtotal": v.price * item.quantity, "valid": bool(valid(v, item.quantity)),
            "available": v.stock.available if valid(v, 1) else 0}


def cart_view(db, cart):
    items = [item_view(item) for item in cart_items(db, cart)] if cart else []
    return {"items": items, "subtotal": sum(i["subtotal"] for i in items), "count": sum(i["quantity"] for i in items)}


@router.get("")
def read_cart(request: Request, response: Response, db: DB, user: OptionalUser):
    return cart_view(db, find_cart(db, request, response, user, create=False))


@router.post("/items")
def add_item(data: AddItem, request: Request, response: Response, db: DB, user: OptionalUser):
    cart = find_cart(db, request, response, user, lock=True)
    add_items(db, cart, {str(data.variant_id): data.quantity})
    db.add(Event(name="add_to_cart", entity_id=str(data.variant_id)))
    result = cart_view(db, cart)
    db.commit()
    return result


def get_item(db, cart, item_id):
    item = db.get(CartItem, str(item_id)) if cart else None
    if not item or item.cart_id != cart.id:
        raise HTTPException(404, "Cart item not found.")
    return item


@router.patch("/items/{item_id}")
def change_item(item_id: UUID4, data: Quantity, request: Request, response: Response, db: DB, user: OptionalUser):
    cart = find_cart(db, request, response, user, create=False, lock=True)
    item = get_item(db, cart, item_id)
    if not valid(item.variant, data.quantity):
        raise HTTPException(409, "That quantity is unavailable.")
    item.quantity = data.quantity
    db.flush()
    result = cart_view(db, cart)
    db.commit()
    return result


@router.delete("/items/{item_id}")
def remove_item(item_id: UUID4, request: Request, response: Response, db: DB, user: OptionalUser):
    cart = find_cart(db, request, response, user, create=False, lock=True)
    db.delete(get_item(db, cart, item_id))
    db.flush()
    result = cart_view(db, cart)
    db.commit()
    return result


@router.delete("")
def clear_cart(request: Request, response: Response, db: DB, user: OptionalUser):
    cart = find_cart(db, request, response, user, create=False, lock=True)
    if cart:
        db.execute(delete(CartItem).where(CartItem.cart_id == cart.id))
        db.commit()
    return cart_view(db, None)
