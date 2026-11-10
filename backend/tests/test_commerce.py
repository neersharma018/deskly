import hashlib
import hmac
import json
import os
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select, text
from sqlalchemy.orm import sessionmaker

from deskly import commerce
from deskly.config import Settings, settings
from deskly.db import get_db
from deskly.main import app, memory_windows
from deskly.models import Base, Inventory, Movement, Order, User, now
from deskly.security import PASSWORD
from deskly.seed import seed

SHIPPING = {"name": "Test Customer", "email": "buyer@example.com", "phone": "9876543210",
            "line1": "10 Sample Road", "line2": "", "city": "Pune", "state": "Maharashtra",
            "postal_code": "411001", "country": "India"}
ORIGIN = settings().app_origin
HEADERS = {"Origin": ORIGIN}
PASSWORD_TEXT = "dedicated-test-password"


@pytest.fixture(scope="module")
def db_factory():
    url = os.getenv("DESKLY_TEST_DATABASE_URL")
    if not url:
        pytest.skip("Set DESKLY_TEST_DATABASE_URL to run PostgreSQL integration tests.")
    schema = "test_deskly_" + uuid4().hex
    root = create_engine(url)
    with root.begin() as conn:
        conn.execute(text(f"CREATE SCHEMA {schema}"))
    engine = create_engine(url, connect_args={"options": f"-c search_path={schema}"})
    Base.metadata.create_all(engine)
    factory = sessionmaker(engine, expire_on_commit=False)
    with factory() as db:
        seed(db)
        db.add(User(name="Test Admin", email="admin@example.com", role="ADMIN", password_hash=PASSWORD.hash(PASSWORD_TEXT)))
        db.commit()

    def override_db():
        with factory() as db:
            yield db

    app.dependency_overrides[get_db] = override_db
    yield factory
    app.dependency_overrides.pop(get_db, None)
    engine.dispose()
    with root.begin() as conn:
        conn.execute(text(f"DROP SCHEMA {schema} CASCADE"))
    root.dispose()


@pytest.fixture
def client(db_factory):
    memory_windows.clear()
    with TestClient(app, headers=HEADERS) as test:
        yield test


def register(client):
    payload = {"name": "Test Customer", "email": f"{uuid4().hex}@example.com", "password": PASSWORD_TEXT,
               "password_confirmation": PASSWORD_TEXT}
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201, response.text
    return payload


def admin(client):
    response = client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": PASSWORD_TEXT})
    assert response.status_code == 200, response.text


def product(client, slug="slate-75-mechanical-keyboard"):
    response = client.get("/api/v1/products/" + slug)
    assert response.status_code == 200, response.text
    return response.json()


def add(client, variant_id, quantity=1):
    response = client.post("/api/v1/cart/items", json={"variant_id": variant_id, "quantity": quantity})
    assert response.status_code == 200, response.text
    return response.json()


def test_pricing():
    s = Settings(tax_bps=500, shipping_paise=9900, free_shipping_paise=500000)
    assert commerce.pricing(100000, 20000, s) == {
        "subtotal": 100000, "discount": 20000, "shipping": 9900, "tax": 4495, "total": 94395}
    assert commerce.pricing(500000, 0, s)["shipping"] == 0
    from deskly.models import Coupon
    assert commerce.coupon_discount(Coupon(kind="PERCENT", value=10, maximum=1000), 20000) == 1000
    assert commerce.coupon_discount(Coupon(kind="FIXED", value=30000), 20000) == 20000


def test_catalogue_filters_and_cart_merge(client):
    listing = client.get("/api/v1/products", params={"q": "mat", "category": "desk-mats", "max_price": 200000,
                                                      "color": "Sage", "available": True, "limit": 2}).json()
    assert listing["total"] >= 2
    assert all(p["price"] <= 200000 and p["category"]["slug"] == "desk-mats" for p in listing["items"])
    first = product(client)["variants"][0]
    add(client, first["id"], 2)
    assert client.get("/api/v1/cart").json()["count"] == 2
    credentials = register(client)
    assert client.get("/api/v1/cart").json()["count"] == 2
    assert client.get("/api/v1/admin/products").status_code == 403
    assert client.post("/api/v1/cart/items", headers={"Origin": "https://example.com"},
                       json={"variant_id": first["id"], "quantity": 1}).status_code == 403
    client.post("/api/v1/auth/logout")
    add(client, first["id"])
    assert client.post("/api/v1/auth/login", json={k: credentials[k] for k in ("email", "password")}).status_code == 200
    bag = client.get("/api/v1/cart").json()
    assert bag["count"] == 3 and len(bag["items"]) == 1
    assert client.post("/api/v1/cart/items", json={"variant_id": first["id"], "quantity": 99}).status_code == 409


def test_admin_publishes_and_adjusts_stock(client):
    admin(client)
    category = client.post("/api/v1/admin/categories", json={"name": "Test Collection", "slug": "qa-collection"})
    assert category.status_code == 201, category.text
    body = {"name": "Test Desk Accessory", "slug": "qa-desk-accessory", "brand": "QA",
            "category_id": category.json()["id"], "published": False, "specs": {"Material": "Steel"}}
    response = client.post("/api/v1/admin/products", json=body)
    assert response.status_code == 201, response.text
    key = response.json()["id"]
    variant = client.post(f"/api/v1/admin/products/{key}/variants",
                          json={"name": "Black", "color": "Black", "sku": "QA-001", "price": 159900})
    assert variant.status_code == 201, variant.text
    variant_id = variant.json()["id"]
    adjustment = client.post("/api/v1/admin/inventory/adjustments",
                             json={"variant_id": variant_id, "delta": 6, "reason": "Test receiving"})
    assert adjustment.json()["available"] == 6, adjustment.text
    assert client.get("/api/v1/products/qa-desk-accessory").status_code == 404
    published = client.patch(f"/api/v1/admin/products/{key}", json={**body, "published": True})
    assert published.status_code == 200, published.text
    assert product(client, "qa-desk-accessory")["available"]
    assert client.post(f"/api/v1/admin/products/{key}/archive").status_code == 200
    assert client.get("/api/v1/products/qa-desk-accessory").status_code == 404


def test_setup_budget_compatibility_save_and_cart(client):
    register(client)
    preferences = {"budget": 800000, "purpose": "Coding", "aesthetic": "Minimal",
                   "required": ["lighting", "desk-mats"], "existing": ["keyboard", "monitor"], "width_cm": 75,
                   "depth_cm": 40, "wireless": True}
    response = client.post("/api/v1/builder/recommend", json=preferences)
    assert response.status_code == 200, response.text
    setup = response.json()
    assert setup["source"] == "deterministic"
    assert setup["subtotal"] <= 800000
    assert {"lighting", "desk-mats"}.issubset({i["category"] for i in setup["items"]})
    assert all(i["available"] and i["compatibility"]["equipment"] != "keyboard" for i in setup["items"])
    ids = [i["id"] for i in setup["items"]]
    selection = {"variant_ids": ids, "preferences": preferences}
    saved = client.post("/api/v1/me/setups", json={**selection, "name": "QA desk", "run_id": setup["id"]})
    assert saved.status_code == 201, saved.text
    read = client.get("/api/v1/me/setups/" + saved.json()["id"])
    assert set(read.json()["variant_ids"]) == set(ids)
    changed = client.post("/api/v1/builder/add-to-cart", json={**selection, "expected_total": setup["subtotal"] + 1})
    assert changed.status_code == 409
    assert client.get("/api/v1/cart").json()["count"] == 0
    added = client.post("/api/v1/builder/add-to-cart", json={**selection, "expected_total": setup["subtotal"]})
    assert added.status_code == 200, added.text
    assert added.json()["count"] == len(ids)


def test_invalid_hosted_explanation_uses_catalogue_fallback(client, monkeypatch):
    from deskly import builder
    import httpx

    monkeypatch.setattr(settings(), "openai_api_key", "test-only")
    invalid = {"choices": [{"message": {"content": '{"title": 12, "description": "Invalid title"}'}}]}
    monkeypatch.setattr(builder.httpx, "post", lambda *args, **kwargs:
                        httpx.Response(200, request=httpx.Request("POST", "https://example.com"), json=invalid))
    response = client.post("/api/v1/builder/recommend",
                           json={"budget": 300000, "purpose": "Studying", "aesthetic": "Minimal"})
    assert response.status_code == 200, response.text
    setup = response.json()
    assert setup["source"] == "deterministic" and 0 < setup["subtotal"] <= 300000


@pytest.fixture
def gateway(monkeypatch):
    s = settings()
    monkeypatch.setattr(s, "razorpay_key_id", "rzp_test_automated")
    monkeypatch.setattr(s, "razorpay_key_secret", "automated-gateway-secret")
    monkeypatch.setattr(s, "razorpay_webhook_secret", "automated-webhook-secret")
    orders = {}
    payments = {}

    def request(method, path, payload=None):
        if method == "GET" and path.startswith("orders?"):
            return {"items": list(orders.values())}
        if method == "POST" and path == "orders":
            item = {**payload, "id": "order_" + uuid4().hex}
            orders[item["id"]] = item
            return item
        if path.startswith("payments/"):
            return payments[path.split("/")[-1]]
        if path.endswith("/payments"):
            return {"items": [p for p in payments.values() if p["order_id"] == path.split("/")[1]]}
        raise AssertionError((method, path))
    monkeypatch.setattr(commerce, "razorpay", request)
    from deskly import worker
    monkeypatch.setattr(worker, "razorpay", request)
    return payments


def checkout_data(client):
    quote = client.post("/api/v1/checkout/quote", json={})
    assert quote.status_code == 200, quote.text
    return {"expected_total": quote.json()["total"], "address": SHIPPING}


def create_order(client, data, key):
    return client.post("/api/v1/checkout/orders", json=data, headers={"Idempotency-Key": key})


def test_capture_webhook_replay_ownership_and_fulfillment(client, gateway, db_factory):
    register(client)
    variant = product(client)["variants"][0]
    add(client, variant["id"], 2)
    with db_factory() as db:
        initial = db.get(Inventory, variant["id"]).on_hand
    data, key = checkout_data(client), str(uuid4())
    assert create_order(client, {**data, "expected_total": 100}, str(uuid4())).status_code == 409
    created = create_order(client, data, key)
    assert created.status_code == 201, created.text
    order = created.json()
    assert create_order(client, data, key).json()["id"] == order["id"]
    with db_factory() as db:
        stock = db.get(Inventory, variant["id"])
        assert stock.reserved == 2 and stock.on_hand == initial
    payment_id = "pay_" + uuid4().hex
    payment = {"id": payment_id, "order_id": order["gateway_order_id"], "status": "captured",
               "amount": order["pricing"]["total"], "currency": "INR"}
    gateway[payment_id] = payment
    verify = {"order_id": order["id"], "razorpay_order_id": payment["order_id"],
              "razorpay_payment_id": payment_id, "razorpay_signature": "0" * 64}
    assert client.post("/api/v1/payments/razorpay/verify", json=verify).status_code == 400
    body = json.dumps({"event": "payment.captured", "payload": {"payment": {"entity": payment}}}).encode()
    signature = hmac.new(settings().razorpay_webhook_secret.encode(), body, hashlib.sha256).hexdigest()
    headers = {"X-Razorpay-Signature": signature, "X-Razorpay-Event-Id": "event_" + uuid4().hex}
    assert client.post("/api/v1/webhooks/razorpay", content=body, headers={**headers, "X-Razorpay-Signature": "bad"}).status_code == 400
    for _ in range(2):
        response = client.post("/api/v1/webhooks/razorpay", content=body, headers=headers)
        assert response.status_code == 200, response.text
    verify["razorpay_signature"] = hmac.new(settings().razorpay_key_secret.encode(),
                                           f"{payment['order_id']}|{payment_id}".encode(), hashlib.sha256).hexdigest()
    verified = client.post("/api/v1/payments/razorpay/verify", json=verify)
    assert verified.status_code == 200 and verified.json()["status"] == "PAID", verified.text
    assert client.get("/api/v1/cart").json()["count"] == 0
    with db_factory() as db:
        stock = db.get(Inventory, variant["id"])
        assert stock.on_hand == initial - 2 and stock.reserved == 0
        assert db.scalar(select(func.count()).select_from(Movement).where(Movement.order_id == order["id"])) == 1
    with TestClient(app, headers=HEADERS) as stranger:
        register(stranger)
        assert stranger.get("/api/v1/me/orders/" + order["id"]).status_code == 404
        assert stranger.get("/api/v1/checkout/orders/" + order["id"]).status_code == 404
        admin(stranger)
        url = "/api/v1/admin/orders/" + order["id"] + "/fulfillment"
        assert stranger.patch(url, json={"status": "SHIPPED"}).status_code == 409
        assert stranger.patch(url, json={"status": "PROCESSING"}).status_code == 200
        shipped = stranger.patch(url, json={"status": "SHIPPED", "carrier": "Test Carrier", "tracking": "123ABC"})
        assert shipped.status_code == 200, shipped.text
    assert client.get("/api/v1/me/orders/" + order["id"]).json()["shipment"]["tracking"] == "123ABC"


def test_concurrent_checkout_reserves_once_and_releases_expired(client, gateway, db_factory, monkeypatch):
    from deskly import worker

    monkeypatch.setattr(worker, "SessionLocal", db_factory)

    variant_id = product(client, "field-desk-mat")["variants"][0]["id"]
    with db_factory() as db:
        stock = db.get(Inventory, variant_id)
        stock.on_hand = 1
        db.commit()
    with TestClient(app, headers=HEADERS) as rival:
        add(client, variant_id)
        add(rival, variant_id)
        inputs = [(client, checkout_data(client)), (rival, checkout_data(rival))]
        with ThreadPoolExecutor(max_workers=2) as pool:
            responses = list(pool.map(lambda pair: create_order(*pair, str(uuid4())), inputs))
    assert sorted(r.status_code for r in responses) == [201, 409], [r.text for r in responses]
    order_id = next(r.json()["id"] for r in responses if r.status_code == 201)
    with db_factory() as db:
        order = db.get(Order, order_id)
        order.expires_at = now() - timedelta(seconds=1)
        db.commit()
    worker.reconcile(order_id)
    with db_factory() as db:
        assert db.get(Order, order_id).status == "PAYMENT_FAILED"
        assert db.get(Inventory, variant_id).reserved == 0
        assert db.get(Inventory, variant_id).on_hand == 1


def test_guest_order_stays_accessible_after_registration(client, gateway):
    variant = product(client, "beam-task-lamp")["variants"][0]
    add(client, variant["id"])
    order = create_order(client, checkout_data(client), str(uuid4()))
    assert order.status_code == 201, order.text
    order_id = order.json()["id"]
    register(client)
    assert client.get("/api/v1/cart").json()["count"] == 0
    assert client.get("/api/v1/checkout/pending").json()["id"] == order_id
    assert client.get("/api/v1/me/orders/" + order_id).status_code == 200
    assert client.post(f"/api/v1/checkout/orders/{order_id}/resume").json()["gateway_order_id"] == order.json()["gateway_order_id"]


def test_coupon_usage_limit_reserves_transactionally(client, gateway):
    code = "QA" + uuid4().hex[:8]
    with TestClient(app, headers=HEADERS) as operations:
        admin(operations)
        response = operations.post("/api/v1/admin/coupons",
                                   json={"code": code, "kind": "PERCENT", "value": 10, "usage_limit": 1})
        assert response.status_code == 201, response.text
    item = product(client, "rise-walnut-monitor-stand")["variants"][0]
    with TestClient(app, headers=HEADERS) as rival:
        requests = []
        for buyer in (client, rival):
            add(buyer, item["id"])
            response = buyer.post("/api/v1/checkout/quote", json={"coupon": code})
            assert response.json()["discount"] == item["price"] // 10, response.text
            requests.append((buyer, {"address": SHIPPING, "coupon": code, "expected_total": response.json()["total"]}))
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(lambda pair: create_order(*pair, str(uuid4())), requests))
    assert sorted(r.status_code for r in results) == [201, 409], [r.text for r in results]


def test_cash_order_idempotency_stock_and_collection(client, db_factory, monkeypatch):
    monkeypatch.setattr(settings(), "cash_on_delivery", True)
    register(client)
    item = product(client, "beam-task-lamp")["variants"][0]
    add(client, item["id"])
    before = item["available"]
    body = {**checkout_data(client), "payment_method": "CASH_ON_DELIVERY"}
    key = str(uuid4())
    created = create_order(client, body, key)
    assert created.status_code == 201, created.text
    order = created.json()
    assert (order["status"], order["payment"], order["payment_method"]) == ("PLACED", "DUE", "CASH_ON_DELIVERY")
    assert create_order(client, body, key).json()["id"] == order["id"]
    assert create_order(client, {**body, "payment_method": "RAZORPAY"}, key).status_code == 409
    assert product(client, "beam-task-lamp")["variants"][0]["available"] == before - 1
    assert client.get("/api/v1/cart").json()["count"] == 0

    with db_factory() as db:
        persisted = db.get(Order, order["id"])
        assert persisted.paid_at is None and persisted.payment.gateway_order_id is None

    with TestClient(app, headers=HEADERS) as operations:
        admin(operations)
        url = "/api/v1/admin/orders/" + order["id"] + "/fulfillment"
        assert operations.patch(url, json={"status": "PROCESSING"}).status_code == 200
        assert operations.patch(url, json={"status": "SHIPPED", "carrier": "QA carrier", "tracking": "QA-001"}).status_code == 200
        assert operations.patch(url, json={"status": "DELIVERED"}).status_code == 422
        delivered = operations.patch(url, json={"status": "DELIVERED", "cash_collected": True})
        assert delivered.status_code == 200, delivered.text
        assert delivered.json()["payment"] == "COLLECTED"
    assert client.get("/api/v1/me/orders/" + order["id"]).json()["status"] == "DELIVERED"


def test_cash_order_requires_opt_in_and_cancellation_restocks(client, monkeypatch):
    monkeypatch.setattr(settings(), "cash_on_delivery", False)
    register(client)
    variant = product(client, "beam-task-lamp")["variants"][0]
    add(client, variant["id"])
    body = {**checkout_data(client), "payment_method": "CASH_ON_DELIVERY"}
    assert create_order(client, body, str(uuid4())).status_code == 503
    monkeypatch.setattr(settings(), "cash_on_delivery", True)
    order = create_order(client, body, str(uuid4()))
    assert order.status_code == 201, order.text
    url = "/api/v1/me/orders/" + order.json()["id"] + "/cancel"
    cancelled = client.post(url)
    assert cancelled.status_code == 200, cancelled.text
    assert (cancelled.json()["status"], cancelled.json()["payment"]) == ("CANCELLED", "VOID")
    assert client.post(url).status_code == 409
    assert product(client, "beam-task-lamp")["variants"][0]["available"] == variant["available"]
