# REST API

The API is served at `/api/v1`. FastAPI publishes the full machine-readable contract at [OpenAPI JSON](http://127.0.0.1:8000/openapi.json) and the [interactive explorer](http://127.0.0.1:8000/docs).

| Area | Paths |
| --- | --- |
| Identity | `/auth/{register,login,logout,forgot-password,reset-password}`, `/me`, `/me/addresses` |
| Storefront | `/store`, `/categories`, `/products`, `/products/featured`, `/products/{slug}`, `/products/{slug}/related` |
| Cart | `/cart`, `/cart/items`, `/cart/items/{id}` |
| Checkout | `/checkout/quote`, `/checkout/orders`, `/checkout/pending`, `/checkout/orders/{id}`, `/checkout/orders/{id}/resume`, `/coupons/validate` |
| Payments | `/payments/razorpay/verify`, `/webhooks/razorpay` |
| Account | `/me/orders`, `/me/orders/{id}`, `/me/orders/{id}/cancel`, `/me/wishlist`, `/me/setups` |
| Builder | `/builder/recommend`, `/builder/selection`, `/builder/add-to-cart` |
| Administration | `/admin/dashboard`, `/admin/products`, `/admin/categories`, `/admin/variants/{id}`, `/admin/inventory`, `/admin/orders`, `/admin/coupons`, `/admin/analytics/summary`, `/admin/media` |

Supply the configured application origin on browser mutations and preserve the session cookies. Checkout order creation requires an `Idempotency-Key` header. Retry with the same body and key. Use the quote total as the expected amount. The backend calculates the authoritative amount and rejects mismatches. Razorpay sends signed webhooks independently of the browser. The raw request body and event ID are used for verification and deduplication.

Errors include an HTTP status, a user-facing `detail` and `X-Request-ID`. Validation errors include field-level messages. Treat 409 as an instruction to refresh state before retrying and 429 as an instruction to wait.

## Core contracts

| Method and path | Request | Success and state change |
| --- | --- | --- |
| `GET /products` | Optional `q`, `category`, `available`, `sort`, `page` and `limit` | Published catalogue records with price, stock and pagination |
| `POST /cart/items` | Variant UUID and quantity | Current cart. Stock is checked before a line is added or incremented |
| `POST /checkout/quote` | Optional coupon code | Integer paise for subtotal, discount, shipping, tax and total. `payments_available` indicates Razorpay and `cash_on_delivery` indicates offline payment |
| `POST /checkout/orders` | Shipping address, quote total, optional coupon, payment method and idempotency header | 201 with order ID, number, pricing and payment state. Razorpay includes gateway checkout fields. Cash on delivery returns `PLACED` and `DUE` |
| `GET /checkout/orders/{id}` | Order UUID and matching customer or guest cookie | Persisted item and price snapshots, payment state, address and shipment |
| `PATCH /admin/orders/{id}/fulfillment` | Next status, carrier and tracking on shipment, cash collection confirmation on cash delivery | Updated order. Requires admin role and an allowed transition |
| `POST /builder/recommend` | Budget, use case, aesthetic and optional constraints | Validated products and alternatives from the current catalogue with a setup explanation |

Use `RAZORPAY` or `CASH_ON_DELIVERY` as `payment_method` at checkout. Omitted methods default to Razorpay for existing clients. A changed price, unavailable variant, reused key with a different body or invalid state transition yields a conflict. Unconfigured payment methods return 503. A 404 protects order details from callers outside the order’s scope.

Cash orders transition from `PLACED` through `PROCESSING`, `SHIPPED` and `DELIVERED`. The final request must include `cash_collected: true` to record `COLLECTED`. A customer may cancel their own cash order while it is placed. Cancelling records `VOID` and restores stock.
