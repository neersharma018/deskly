# DESKLY — Product Requirements Document (PRD)

**Project Name:** DESKLY  
**Product Type:** Full-Stack AI-Powered E-Commerce Web Application  
**Product Version:** 1.0.0  
**Document Version:** 1.1  
**Document Status:** Approved Planning Baseline  
**Market:** India  
**Currency:** INR (₹)  
**Business Model:** Single-Vendor B2C E-Commerce  
**Platform:** Responsive Web Application  
**Development Goal:** Production-Style MVP+  

---

# 1. EXECUTIVE SUMMARY

## 1.1 Product Overview

DESKLY is a modern, premium e-commerce platform specializing in desk setup accessories, workspace essentials, and productivity equipment.

The platform allows customers to discover, compare, customize, and purchase products such as:

- Mechanical keyboards
- Wireless mice
- Desk mats
- Monitor stands
- Desk lamps
- Cable management accessories
- Laptop stands
- USB hubs
- Charging accessories
- Desk organizers
- Productivity accessories

Unlike a traditional e-commerce website, DESKLY offers an **AI-Powered Desk Setup Builder**.

This feature allows customers to generate a personalized shopping bundle based on their available budget, workspace purpose, preferred aesthetic, existing equipment, and physical desk constraints.

Customers can modify the recommended products, save their setups, and add an entire setup to the cart.

DESKLY must operate as a real e-commerce application with working authentication, persistent data, payment integration, inventory tracking, order management, and administrative tools.

It must not be a static demonstration, fake storefront, or purely frontend project.

## 1.2 Product Vision

**Your desk. Your rules.**

Make creating a personalized workspace as simple as describing what you need, discovering compatible products, and purchasing them through a single unified experience.

## 1.3 Mission

Build an intelligent, convenient, trustworthy e-commerce experience that combines premium design, personalized product discovery, and reliable shopping functionality.

## 1.4 Core Differentiators

1. AI-powered workspace setup recommendations.
2. Budget-aware product bundle generation.
3. Compatibility-aware product selection.
4. Aesthetic-based shopping experience.
5. Editable, purchasable desk setups.
6. Premium, responsive storefront.
7. Complete admin and inventory operations.

---

# 2. PROBLEM STATEMENT

## 2.1 Customer Problems

Customers building desk setups frequently experience the following difficulties:

### Problem A: Fragmented Product Discovery

Customers browse different stores and categories to find compatible products.

### Problem B: Budget Planning

Customers struggle to decide how much of their budget should be allocated to different accessories.

### Problem C: Visual Consistency

Customers want products that match a particular desk aesthetic but cannot easily identify coordinated combinations.

### Problem D: Compatibility

Products may not fit existing desks, equipment, device connectivity, or user requirements.

### Problem E: Too Many Choices

Large product catalogues make selecting the correct combination difficult.

## 2.2 Proposed Solution

DESKLY solves these problems through two connected shopping experiences.

**Traditional Shopping:** Customers browse individual products, filter options, add items to the cart, and complete purchases.

**AI-Assisted Shopping:** Customers describe their requirements and receive suitable, inventory-backed product recommendations that can be edited and purchased.

---

# 3. PRODUCT GOALS

## 3.1 Primary Goals

**G-01:** Build a fully functional e-commerce application with real database persistence.

**G-02:** Support product browsing, searching, filtering, sorting, and product variants.

**G-03:** Implement secure customer authentication and account management.

**G-04:** Support persistent carts and end-to-end order placement.

**G-05:** Integrate a working payment gateway in sandbox mode.

**G-06:** Provide a complete administrative dashboard.

**G-07:** Implement accurate inventory management.

**G-08:** Deliver an AI-powered desk setup recommendation system.

**G-09:** Support saving, customizing, and purchasing recommended setups.

**G-10:** Deliver comprehensive technical documentation, automated tests, and reproducible deployment.

## 3.2 Success Metrics

The following are internal release targets, not claims about expected business performance.

| Metric | Target |
|---|---|
| Core customer journeys | 100% passing E2E tests |
| Payment verification | Server-side verified |
| Inventory overselling | Zero in concurrency tests |
| AI budget constraint accuracy | 100% in automated fixtures |
| AI catalogue validity | 100% in automated fixtures |
| Mobile Lighthouse accessibility | 90+ on sampled pages |
| Search API latency | p95 under 500 ms at specified seed-catalog load |
| Critical security vulnerabilities | Zero open at release |
| Admin authorization | Enforced server-side |
| Duplicate webhook processing | No duplicated payment finalization |

---

# 4. TARGET USERS

## 4.1 Students

**Age Group:** Approximately 18–25

**Needs:**
- Affordable desk equipment
- Compact workspace accessories
- Budget-friendly product bundles
- Simple product comparison

**Typical Budget:** ₹3,000–₹10,000

## 4.2 Developers and Programmers

**Needs:**
- Mechanical keyboards
- Ergonomic accessories
- Monitor risers
- Desk organization
- Productivity-focused setups

**Typical Budget:** ₹8,000–₹30,000

## 4.3 Gamers

**Needs:**
- Gaming peripherals
- Coordinated aesthetic
- Appropriate connectivity
- RGB or dark-theme accessories

**Typical Budget:** ₹10,000–₹50,000

## 4.4 Remote Workers

**Needs:**
- Comfortable workspace
- Practical accessories
- Lighting
- Cable organization
- Ergonomic desk arrangements

## 4.5 Store Administrators

**Needs:**
- Product management
- Inventory monitoring
- Order fulfillment
- Customer and sales visibility
- Coupon management
- Basic analytics

---

# 5. PRODUCT SCOPE

## 5.1 MVP Scope — P0

The minimum required fully functioning e-commerce system includes:

- User authentication
- Homepage
- Product catalogue
- Categories
- Product detail pages
- Product variants
- Search and filtering
- Shopping cart
- Shipping addresses
- Checkout
- Razorpay sandbox integration
- Order management
- Customer account
- Admin dashboard
- Product CRUD
- Inventory tracking
- Basic order fulfillment
- Responsive design
- Server-side validation
- Automated core-flow tests

## 5.2 MVP+ Scope — P1

The advanced version additionally includes:

- AI Desk Setup Builder
- Setup customization
- Saved desk setups
- One-click setup-to-cart
- Product wishlists
- Discount coupons
- Transactional emails
- Inventory alerts
- Admin analytics
- Customer order cancellation for eligible orders
- Product recommendations
- Product compatibility metadata
- Administrative audit logs

## 5.3 Out of Scope — P2

The following features are explicitly excluded from version 1:

- Multi-vendor marketplace
- Seller onboarding
- Mobile applications
- Augmented reality
- Real-time 3D desk builder
- Image-based room analysis
- Automated refunds
- International shipping
- Multi-currency support
- Subscription billing
- Loyalty points
- Product auctions
- Real-time customer support chat
- Complex warehouse management
- Supplier procurement workflows

These features may be considered after the MVP+ is stable.

---

# 6. CUSTOMER-FACING FUNCTIONAL REQUIREMENTS

## 6.1 Homepage

**Requirement ID: HOME-001**

The homepage must provide a premium introductory experience and direct access to shopping functionality.

### Required Sections

1. Navigation bar
2. Hero section
3. Shop by category
4. Featured products
5. Shop by setup type
6. AI Setup Builder promotional section
7. Curated desk setups
8. Value proposition section
9. Footer

### Navigation

The primary navigation includes:

- Home
- Shop
- Categories
- Setup Builder
- Account
- Wishlist
- Cart

### Acceptance Criteria

- Homepage loads successfully on desktop and mobile.
- Navigation links are functional.
- Products displayed on the homepage come from the backend.
- Out-of-stock products are handled appropriately.
- Category links direct customers to filtered product listings.
- AI Setup Builder CTA opens the actual configurator.

---

## 6.2 Product Catalogue

**Requirement ID: CAT-001**

Customers must be able to browse all active products.

### Required Features

- Paginated product listing
- Category filtering
- Price filtering
- Brand filtering
- Color filtering
- Availability filtering
- Search
- Sorting
- Responsive product grid

### Sorting Options

- Featured
- Price: Low to High
- Price: High to Low
- Newest
- Name: A to Z

### Product Card Fields

Each product card displays:

- Primary image
- Product name
- Starting price or applicable price
- Category or brand
- Availability indicator
- Wishlist action
- Product detail link

### Acceptance Criteria

- Only published products appear.
- Search returns relevant catalogue results.
- Filtering occurs using backend-supported queries.
- Multiple filters work simultaneously.
- Pagination retains active filters.
- Product images load with suitable fallbacks.
- Empty results show a useful empty state.
- Product prices match backend data.

---

## 6.3 Product Detail Page

**Requirement ID: PDP-001**

Each product must have a dedicated product page.

### Required Information

- Product name
- Image gallery
- Brand
- Category
- Description
- Product specifications
- Price
- Variant options
- Stock availability
- Quantity selector
- Add to Cart
- Add to Wishlist
- Shipping information
- Related products

### Variant Support

Products may have variants based on:

- Color
- Size
- Connectivity
- Material
- Configuration

For example:

Product: Mechanical Keyboard

Variants:
- Black / Wired
- White / Wired
- Black / Wireless
- White / Wireless

Each variant has its own SKU, price, and inventory.

### Acceptance Criteria

- Changing a variant updates displayed price and availability.
- Customers cannot add inactive variants.
- Customers cannot request invalid quantities.
- Product specifications are backed by stored data.
- Adding a product updates the cart.
- Invalid product slugs return a proper 404 page.

---

# 7. AUTHENTICATION AND USER ACCOUNTS

## 7.1 Registration

**Requirement ID: AUTH-001**

Users can register using:

- Full name
- Email address
- Password
- Password confirmation

### Validation

- Valid email required.
- Email must be unique.
- Password must meet configured security requirements.
- Password must be securely hashed.
- Duplicate registration must be rejected.

## 7.2 Login

**Requirement ID: AUTH-002**

Users log in using email and password.

The application must support secure session management.

Sessions must not expose credentials or sensitive authentication data to frontend JavaScript.

## 7.3 Logout

**Requirement ID: AUTH-003**

Logging out invalidates the current authenticated session.

## 7.4 Password Reset

**Requirement ID: AUTH-004**

Users can request a password reset through a time-limited email token.

Tokens must be single-use.

## 7.5 Customer Dashboard

**Requirement ID: ACCOUNT-001**

Customers can access:

- Profile
- Saved addresses
- Order history
- Wishlist
- Saved desk setups
- Account settings

## 7.6 Authorization

The application supports two primary roles:

- CUSTOMER
- ADMIN

Admin access must be checked in the backend for every protected operation.

Hiding admin buttons in the frontend is not sufficient authorization.

---

# 8. SHOPPING CART

**Requirement ID: CART-001**

## 8.1 Required Features

- Add product variant
- Remove product
- Update quantity
- View line-item subtotal
- View estimated total
- Persistent cart
- Guest shopping
- Cart merge after login

## 8.2 Cart Behavior

When adding an existing product variant, the application should increase its quantity instead of creating duplicate line items.

The cart must use backend-calculated prices.

## 8.3 Guest Cart

Guest carts should use an opaque session identifier stored in a secure cookie.

A guest cart must survive page refreshes.

On login, the guest cart must merge safely with the customer's existing cart.

## 8.4 Stock Validation

At cart display and checkout, stock availability must be checked again.

The system must clearly report when an item has become unavailable.

## 8.5 Acceptance Criteria

- Cart changes persist across refreshes.
- Invalid quantities are rejected.
- Customers cannot purchase inactive variants.
- Cart totals are computed by the backend.
- Cart merge does not duplicate items incorrectly.
- Empty cart has a useful empty state.

---

# 9. CHECKOUT SYSTEM

**Requirement ID: CHECK-001**

The checkout must be a complete server-backed process.

## 9.1 Checkout Information

Customers must provide:

- Full name
- Email
- Phone number
- Address line 1
- Address line 2 (optional)
- City
- State
- Postal code
- Country

For version 1, country is restricted to India.

## 9.2 Checkout Summary

Display:

- Products
- Variants
- Quantities
- Subtotal
- Discount
- Shipping charges
- Applicable taxes
- Final payable amount

## 9.3 Pricing Rules

All monetary values must use integer paise.

The frontend must never be trusted as the source of prices, discounts, shipping fees, or taxes.

The backend recalculates all totals from persisted product and promotion data.

The applicable tax treatment and invoice configuration must be configurable and reviewed for the intended selling entity before live launch.

## 9.4 Order Creation

The backend must create an order with a unique order number.

An order contains immutable line-item snapshots.

Order creation must be idempotent to prevent duplicate orders caused by repeated requests.

## 9.5 Inventory Reservation

During checkout:

1. Validate stock.
2. Reserve the required quantity transactionally.
3. Create a pending order.
4. Initialize the payment.
5. Release reservations if payment expires or fails.
6. Finalize stock movement after confirmed payment.

The implementation must prevent overselling under concurrent purchases.

---

# 10. PAYMENT INTEGRATION

**Requirement ID: PAY-001**

## 10.1 Payment Gateway

Use Razorpay.

Development and automated testing must use sandbox/test credentials.

Never commit secret keys.

## 10.2 Payment Flow

1. Customer confirms checkout.
2. Backend validates the cart and available stock.
3. Backend creates a pending order and payment initialization record.
4. Backend creates a corresponding Razorpay order.
5. Frontend opens Razorpay Checkout.
6. Customer completes or cancels payment.
7. Backend verifies the payment response signature.
8. Backend verifies payment status and capture using trusted gateway data.
9. A verified webhook or reconciliation process finalizes payment.
10. Customer receives order confirmation after successful finalization.

## 10.3 Webhook Requirements

- Validate webhook authenticity.
- Handle duplicate webhook events.
- Support out-of-order event delivery.
- Persist processed event identifiers.
- Never process invalid signatures.
- Never finalize an order twice.
- Reconcile delayed or ambiguous payment results.

## 10.4 Payment Statuses

- CREATED
- PENDING
- AUTHORIZED
- CAPTURED
- FAILED
- REFUNDED

Refund status support may be recorded even though automated refund processing is excluded from MVP+.

## 10.5 Acceptance Criteria

- Successful sandbox payment creates a confirmed paid order.
- Failed payment does not create a paid order.
- Invalid signatures are rejected.
- Duplicate webhooks do not duplicate fulfillment or inventory deductions.
- The payment amount matches the backend order amount.
- Payment failures show understandable messages.

## 10.6 Optional Cash on Delivery

Cash on delivery can be enabled per environment to support order placement without an online charge. Razorpay remains the online payment gateway.

- An eligible cash order records `PLACED` and `DUE` and deducts stock in the order transaction.
- Customers can review the order. Signed-in customers can cancel it before processing, which restores stock.
- Staff can process and ship the order. Delivery requires explicit confirmation of collection before it contributes to paid revenue.
- The local catalogue labels sample orders as development orders.

---

# 11. ORDER MANAGEMENT

**Requirement ID: ORDER-001**

## 11.1 Customer Features

Customers can:

- View order history
- View order details
- View order status
- View payment status
- View shipment tracking information
- Request cancellation when eligible

## 11.2 Order Statuses

- PENDING_PAYMENT
- PAID
- PROCESSING
- SHIPPED
- DELIVERED
- CANCELLED
- PAYMENT_FAILED

## 11.3 Order Data

Each order records:

- Order identifier
- Customer reference
- Customer contact snapshot
- Shipping address snapshot
- Ordered product snapshots
- Product quantities
- Unit prices
- Discounts
- Shipping cost
- Taxes
- Total amount
- Payment records
- Order status
- Timestamps

## 11.4 Business Rules

- A paid order cannot be silently deleted.
- Customers may only view their own orders.
- Cancellation requires an eligible order state.
- Shipment updates must follow permitted state transitions.
- Order items preserve historical prices even when the catalogue changes.

---

# 12. AI DESK SETUP BUILDER

**Requirement ID: AI-001**

This is DESKLY's primary differentiating feature.

## 12.1 Objective

Generate useful desk setups based on customer preferences and available catalogue items.

The AI Builder must produce recommendations that are:

- Relevant
- Within the selected product budget
- Available for purchase
- Compatible with stated constraints
- Explainable
- Editable

## 12.2 User Input

The builder collects:

### A. Budget

A selected maximum product budget.

Suggested range:

₹3,000–₹50,000.

### B. Primary Purpose

- Coding
- Gaming
- Studying
- Remote Work
- Content Creation
- General Productivity

### C. Preferred Aesthetic

- Minimal
- Dark
- Warm
- RGB
- Modern
- Natural Wood

### D. Preferred Colors

Optional color preferences.

### E. Required Categories

Examples:

- Keyboard
- Mouse
- Desk Mat
- Desk Lamp
- Monitor Stand
- Cable Organizer

### F. Existing Equipment

Customers indicate equipment they already own.

For example:

- Monitor
- Keyboard
- Mouse
- Laptop stand

### G. Desk Space

Optional:

- Desk width
- Desk depth

### H. Additional Preferences

Optional user-supplied needs such as:

- Wireless devices preferred
- Compact products
- Quiet keyboard
- Minimal cable clutter

Free-text input must be length-limited and treated as untrusted user input.

## 12.3 Recommendation Workflow

### Step 1 — Input Validation

Validate the budget, preferences and constraints using Pydantic schemas.

### Step 2 — Catalogue Retrieval

Retrieve active product variants from PostgreSQL.

Include:

- Product ID
- Variant ID
- Price
- Category
- Color
- Specifications
- Compatibility properties
- Inventory availability

### Step 3 — Hard Constraint Filtering

Remove products that:

- Are inactive
- Are out of stock
- Exceed relevant budget constraints
- Do not satisfy required compatibility conditions
- Conflict with explicitly excluded product types

### Step 4 — Bundle Optimization

Use deterministic logic to generate suitable combinations.

Optimization factors include:

- Total budget
- Category coverage
- Product utility
- Aesthetic consistency
- Customer purpose
- Compatibility
- Available inventory

Hard constraints must never be relaxed silently.

### Step 5 — AI Explanation

Use an LLM to produce:

- Setup name
- Setup description
- Explanation of selections
- Benefits
- Optional alternatives

The model must receive only eligible catalogue candidates and structured constraints.

### Step 6 — Structured Validation

Validate the model output.

Check that:

- Every recommended variant exists.
- Every variant is eligible.
- Quantities are valid.
- Product prices are calculated from database data.
- Combined product cost does not exceed budget.
- Required compatibility rules are satisfied.

### Step 7 — Fallback

If the model fails, times out, or produces invalid output, return the deterministic recommendation without AI-generated explanation.

The recommendation functionality must not become completely unavailable because of an LLM provider failure.

## 12.4 Recommendation Output

A generated setup must include:

- Setup identifier
- Setup title
- Short description
- Recommended items
- Product images
- Variant information
- Individual prices
- Total product price
- Remaining product budget
- Reasons for recommendations
- Warnings, if relevant
- Optional alternatives

Shipping and tax estimates must be shown separately when they are not included in the selected product budget.

## 12.5 Setup Editing

Customers must be able to:

- Remove a recommended item
- Replace a recommended item
- Change a selected variant
- Recalculate the total
- Regenerate suggestions

Replacement candidates must comply with relevant compatibility and inventory rules.

## 12.6 Save Setup

Authenticated customers can save setups.

Persist:

- Customer ID
- Setup name
- Preferences
- Selected product variants
- Selected quantities
- Generated explanation
- Creation timestamp
- Update timestamp

Guest users can use the builder without saving permanently.

## 12.7 Add Entire Setup to Cart

Customers can add the selected setup to their cart.

Before adding:

1. Reload current variant data.
2. Check active status.
3. Check stock.
4. Recalculate prices.
5. Report changes clearly.
6. Require confirmation if selections or totals changed.

Cart insertion should be atomic.

## 12.8 AI Safety and Reliability

The AI system must not:

- Invent product IDs.
- Invent prices.
- Recommend inactive variants.
- Ignore stock constraints.
- Exceed the selected product budget.
- Bypass compatibility requirements.
- Execute instructions embedded in product descriptions or user input.
- Reveal internal prompts, credentials, or unrelated customer information.

The backend remains the authoritative source for product and pricing information.

## 12.9 AI Acceptance Criteria

- An ₹8,000 product budget never generates a bundle costing more than ₹8,000.
- Only existing active variants can be returned.
- Unavailable variants cannot be selected.
- Required categories are included where feasible.
- When constraints cannot be satisfied, the response explains why.
- Saving a setup persists its selected variants.
- Reloading a setup retrieves its stored configuration.
- Checkout always uses current catalogue prices.
- An LLM outage does not prevent deterministic setup recommendations.

---

# 13. WISHLIST

**Requirement ID: WISH-001**

Authenticated customers can:

- Add products to a wishlist.
- Remove products from a wishlist.
- View saved products.
- Navigate from wishlist to product details.

Wishlist entries refer to existing products and must not duplicate the same product for one customer.

An unavailable product may remain in a wishlist but must display its correct availability.

---

# 14. COUPON AND DISCOUNT SYSTEM

**Requirement ID: COUPON-001**

Admins can create promotional coupons.

## Supported Coupon Types

- Percentage discount
- Fixed amount discount

## Coupon Attributes

- Coupon code
- Discount type
- Discount value
- Minimum order amount
- Maximum discount amount
- Start date
- Expiration date
- Total usage limit
- Per-customer usage limit
- Active status

## Rules

- Expired coupons cannot be redeemed.
- Inactive coupons cannot be redeemed.
- Usage limits must be enforced transactionally.
- Discounts are calculated server-side.
- Negative order totals are prohibited.
- The same coupon cannot be redeemed multiple times for one order.

For MVP+, one coupon may be applied per order.

---

# 15. ADMIN DASHBOARD

**Requirement ID: ADMIN-001**

The admin panel must be functional and connected to the backend.

## 15.1 Dashboard Overview

Display:

- Total paid revenue
- Total orders
- Recent orders
- Average order value
- Top-selling products
- Low-stock variants
- Recent sales trends

Financial metrics must have defined date ranges and exclude failed or unpaid orders from paid-revenue totals.

## 15.2 Product Management

Admins can:

- Create products
- Edit products
- Publish products
- Archive products
- Assign categories
- Manage descriptions
- Manage specifications
- Upload product images
- Manage variants
- Assign prices
- Define compatibility attributes

Products should use soft deletion or archiving to preserve order history.

## 15.3 Inventory Management

Admins can:

- View inventory quantities
- Add stock
- Reduce stock
- Record adjustment reasons
- Identify low-stock variants
- View stock movement history

Inventory adjustments must be auditable.

The system must distinguish physical on-hand stock from quantities reserved for pending orders.

## 15.4 Order Management

Admins can:

- View orders
- Filter orders
- Inspect customer shipping information
- Review payment status
- Update fulfillment status
- Assign carrier details
- Add tracking numbers
- Export basic order data

Admins must not manually mark unpaid orders as successfully paid without a verified payment reconciliation process.

## 15.5 Coupon Management

Admins can:

- Create coupons
- Update coupon configuration
- Disable coupons
- Review redemption counts

## 15.6 Basic Analytics

Display:

- Paid sales by day
- Orders by status
- Revenue by category
- Bestselling products
- Average order value
- Low-stock products

Analytics must be derived from actual persisted transaction data, not hardcoded demo numbers.

---

# 16. DATABASE REQUIREMENTS

**Requirement ID: DB-001**

Use PostgreSQL as the primary relational database.

Use SQLAlchemy as ORM and Alembic for schema migrations.

## Required Tables

### Identity

- users
- user_sessions
- addresses

### Catalogue

- categories
- products
- product_variants
- product_images

### Inventory

- inventory
- inventory_movements
- inventory_reservations

### Shopping

- carts
- cart_items
- wishlists
- coupons
- coupon_redemptions

### Orders and Payments

- orders
- order_items
- payments
- payment_webhook_events
- shipments

### AI Builder

- saved_setups
- saved_setup_items
- ai_builder_runs

### Administration

- admin_audit_logs

## Database Rules

- Use UUIDs for primary identifiers where practical.
- Use unique constraints for emails, SKUs, order numbers and coupon codes.
- Use integer paise for monetary values.
- Create foreign keys for relational integrity.
- Include created_at and updated_at where relevant.
- Use indexes for frequently filtered fields.
- Preserve historical order snapshots.
- Avoid destructive cascades that would remove financial records.
- Use transactions for checkout, inventory and payment state changes.
- Never allow available stock to become negative.

---

# 17. API REQUIREMENTS

**Requirement ID: API-001**

The backend must expose REST APIs under:

`/api/v1`

Use FastAPI and Pydantic.

## 17.1 Authentication APIs

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /me`
- `PATCH /me`

## 17.2 Catalogue APIs

- `GET /categories`
- `GET /products`
- `GET /products/{slug}`
- `GET /products/featured`
- `GET /products/{slug}/related`

## 17.3 Cart APIs

- `GET /cart`
- `POST /cart/items`
- `PATCH /cart/items/{item_id}`
- `DELETE /cart/items/{item_id}`
- `DELETE /cart`

## 17.4 Address APIs

- `GET /me/addresses`
- `POST /me/addresses`
- `PATCH /me/addresses/{id}`
- `DELETE /me/addresses/{id}`

## 17.5 Checkout APIs

- `POST /checkout/quote`
- `POST /checkout/orders`

## 17.6 Payment APIs

- `POST /payments/razorpay/verify`
- `POST /webhooks/razorpay`

## 17.7 Order APIs

- `GET /me/orders`
- `GET /me/orders/{id}`
- `POST /me/orders/{id}/cancel`

## 17.8 AI Builder APIs

- `POST /builder/recommend`
- `GET /me/setups`
- `POST /me/setups`
- `GET /me/setups/{id}`
- `PATCH /me/setups/{id}`
- `DELETE /me/setups/{id}`
- `POST /builder/add-to-cart`

## 17.9 Wishlist APIs

- `GET /me/wishlist`
- `POST /me/wishlist`
- `DELETE /me/wishlist/{product_id}`

## 17.10 Coupon APIs

- `POST /coupons/validate`

## 17.11 Admin APIs

- `GET /admin/dashboard`
- `GET /admin/products`
- `POST /admin/products`
- `PATCH /admin/products/{id}`
- `POST /admin/products/{id}/archive`
- `POST /admin/products/{id}/variants`
- `PATCH /admin/variants/{id}`
- `GET /admin/inventory`
- `POST /admin/inventory/adjustments`
- `GET /admin/orders`
- `GET /admin/orders/{id}`
- `PATCH /admin/orders/{id}/fulfillment`
- `GET /admin/coupons`
- `POST /admin/coupons`
- `PATCH /admin/coupons/{id}`
- `GET /admin/analytics/summary`

## API Standards

- JSON request and response bodies.
- Schema validation for all inputs.
- Consistent error responses.
- Correct HTTP status codes.
- Pagination for collection endpoints.
- Server-side authorization.
- Request correlation IDs.
- Rate limiting on sensitive endpoints.
- OpenAPI documentation.
- Appropriate idempotency protection for payment and order creation.
- No secrets or sensitive internal fields in public responses.

---

# 18. USER INTERFACE REQUIREMENTS

**Requirement ID: UI-001**

DESKLY must have a premium, modern, responsive e-commerce interface.

## 18.1 Design Direction

Style:

- Minimal
- Professional
- Editorial
- Premium
- Clean
- Product-focused

Avoid:

- Excessive gradients
- Fake glassmorphism
- Unnecessary glowing elements
- Heavy animations
- Overcrowded layouts
- Generic dashboard templates
- Decorative UI without functionality

## 18.2 Brand Colors

Primary Ink: `#171A1B`

Sage Accent: `#49665C`

Canvas Background: `#F6F5F1`

Border Gray: `#D9DDDA`

White: `#FFFFFF`

## 18.3 Typography

Headings: Manrope

Body and UI: Inter

## 18.4 Design System

Create reusable components:

- Button
- Input
- Select
- Checkbox
- Radio
- Slider
- Modal
- Drawer
- Toast
- Dropdown
- Product Card
- Category Card
- Price Display
- Variant Selector
- Quantity Selector
- Cart Item
- Order Status Badge
- Data Table
- Pagination
- Empty State
- Loading Skeleton
- Error State

## 18.5 Responsive Breakpoints

Design layouts for:

- Mobile
- Tablet
- Desktop
- Large desktop

All primary customer journeys must work on mobile.

## 18.6 Accessibility

- Keyboard navigable controls
- Accessible labels
- Visible focus states
- Sufficient color contrast
- Semantic HTML
- Appropriate alt text
- Dialog focus handling
- Clear validation errors

---

# 19. APPLICATION ROUTES

## Public Routes

- `/`
- `/shop`
- `/categories/[slug]`
- `/products/[slug]`
- `/setup-builder`
- `/cart`
- `/checkout`
- `/login`
- `/register`
- `/forgot-password`

## Customer Routes

- `/account`
- `/account/orders`
- `/account/orders/[id]`
- `/account/addresses`
- `/account/wishlist`
- `/account/setups`
- `/account/setups/[id]`
- `/account/settings`

## Admin Routes

- `/admin`
- `/admin/products`
- `/admin/products/new`
- `/admin/products/[id]`
- `/admin/categories`
- `/admin/inventory`
- `/admin/orders`
- `/admin/orders/[id]`
- `/admin/coupons`
- `/admin/analytics`
- `/admin/settings`

Protected routes must enforce session and role checks.

---

# 20. TECHNOLOGY STACK

## Frontend

- Next.js with App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide Icons
- Motion for selected interactions

## Backend

- Python
- FastAPI
- Pydantic
- SQLAlchemy
- Alembic

## Database

- PostgreSQL

## Background Processing

- Redis
- Python worker process

## AI Integration

- Hosted LLM API
- Structured JSON output
- Backend catalogue retrieval
- Deterministic recommendation optimization
- Output validation

## Payments

- Razorpay

## File Storage

- S3-compatible storage for product media

## Testing

- Pytest
- Vitest
- Playwright

## Deployment

- Vercel for frontend
- Dockerized backend
- Managed PostgreSQL
- Managed Redis
- Separate background worker

---

# 21. SYSTEM ARCHITECTURE REQUIREMENTS

**Requirement ID: ARCH-001**

Use a modular monolith architecture.

## Frontend Responsibilities

- UI rendering
- User interactions
- Form submission
- Client state
- Navigation
- Authenticated API consumption
- Accessible loading and error states

## Backend Responsibilities

- Business logic
- Input validation
- Authentication
- Authorization
- Catalogue queries
- Cart management
- Pricing
- Checkout
- Inventory reservations
- Payment verification
- Order state management
- AI recommendation orchestration
- Administration

## Database Responsibilities

- Persistent structured storage
- Referential integrity
- Transactional stock control
- Order and payment records
- Audit logs

## Worker Responsibilities

- Transactional email delivery
- Expired reservation cleanup
- Payment reconciliation jobs
- Retryable non-interactive tasks

## Core Modules

1. Identity
2. Catalogue
3. Inventory
4. Cart
5. Checkout
6. Payments
7. Orders
8. AI Builder
9. Promotions
10. Admin
11. Notifications

Each module must have clear service boundaries.

Avoid placing all business logic in API route handlers.

---

# 22. SECURITY REQUIREMENTS

**Requirement ID: SEC-001**

The application must implement:

- Secure password hashing
- HTTPS in deployed environments
- HttpOnly, Secure and SameSite cookie policies
- CSRF protection where cookie-authenticated state changes require it
- Server-side RBAC
- Ownership checks
- Input validation
- Appropriate CORS configuration
- Rate limiting
- Safe secret management
- Payment signature verification
- Webhook deduplication
- Secure file-upload validation
- Minimal logging of personal information
- Dependency vulnerability scanning
- Protection against common injection attacks

## Sensitive Data

Never store:

- Plaintext passwords
- Payment card numbers
- CVV values
- Private gateway credentials in frontend bundles
- API secrets in source control

Admin privileges must not be assignable through public registration or client-supplied role fields.

---

# 23. PERFORMANCE REQUIREMENTS

**Requirement ID: PERF-001**

## Frontend

- Optimize product images.
- Use responsive image sizes.
- Lazy-load below-the-fold images.
- Minimize unnecessary client-side JavaScript.
- Render catalogue content efficiently.
- Provide loading skeletons.
- Avoid unnecessary layout shift.

## Backend

- Paginate collection queries.
- Add database indexes.
- Avoid N+1 queries.
- Implement query timeouts where applicable.
- Use caching selectively.
- Bound AI execution time and token usage.
- Avoid blocking request handlers with lengthy background jobs.

## Targets

- Search/filter API p95 below 500 ms under a documented small-catalogue test load.
- Mobile accessibility Lighthouse score at least 90 on sampled pages.
- No unacceptable performance regressions in core shopping flows.
- AI recommendations return within an explicitly configured timeout or use fallback behavior.

These targets must be measured during QA.

---

# 24. EMAIL AND NOTIFICATION REQUIREMENTS

**Requirement ID: NOTIF-001**

The application should send:

- Welcome email
- Password reset email
- Order confirmation
- Payment failure notification
- Shipment update
- Delivery status update where supported

Notifications should be triggered by confirmed backend events.

Use background jobs for retryable email delivery.

Failed emails must not reverse successfully completed payments.

---

# 25. ERROR HANDLING

**Requirement ID: ERR-001**

All major workflows must provide clear error feedback.

## Example Error Scenarios

- Invalid login
- Session expired
- Product unavailable
- Insufficient stock
- Coupon expired
- Payment failed
- Payment status pending
- Invalid shipping address
- AI recommendation unavailable
- Network failure
- Internal server error

## Requirements

- Return correct status codes.
- Avoid exposing stack traces to users.
- Log internal failures with correlation IDs.
- Show understandable UI messages.
- Allow safe retries where applicable.
- Never create duplicate orders during retries.
- Use error boundaries and fallback UI.

---

# 26. ANALYTICS AND OBSERVABILITY

**Requirement ID: OBS-001**

## Business Events

Track:

- Product viewed
- Add to cart
- Checkout started
- Order paid
- Setup Builder started
- Setup generated
- Setup saved
- Setup added to cart

Do not store unnecessary personal data in analytics events.

## Operational Monitoring

Track:

- API error rates
- Request latency
- Payment verification failures
- Webhook processing failures
- Background job failures
- AI provider failures
- Inventory reservation failures

Use structured application logs and request identifiers.

---

# 27. TESTING REQUIREMENTS

**Requirement ID: TEST-001**

## 27.1 Unit Tests

Test:

- Pricing calculations
- Discount calculations
- Shipping calculations
- Inventory rules
- AI constraints
- Authorization logic
- Order state transitions

## 27.2 Integration Tests

Test:

- API and database interactions
- Cart persistence
- Product creation and updates
- Inventory reservations
- Order creation
- Payment verification logic
- Webhook deduplication
- Saved setups

## 27.3 End-to-End Tests

Test:

### Journey A: Standard Purchase

1. Open homepage.
2. Navigate to catalogue.
3. Filter products.
4. Open product.
5. Select variant.
6. Add to cart.
7. Open checkout.
8. Enter shipping information.
9. Complete sandbox payment.
10. Verify paid order.
11. Confirm order in account.
12. Confirm order in admin.

### Journey B: AI Setup Purchase

1. Open Setup Builder.
2. Enter preferences.
3. Generate setup.
4. Verify product constraints.
5. Replace one recommended item.
6. Save setup.
7. Add setup to cart.
8. Complete checkout.
9. Verify persisted order items.

### Journey C: Admin Operations

1. Login as admin.
2. Create category.
3. Create product.
4. Add variants.
5. Add stock.
6. Publish product.
7. Verify storefront visibility.
8. Receive sandbox order.
9. Update fulfillment status.
10. Verify customer-facing order status.

### Journey D: Security

1. Attempt admin access as customer.
2. Attempt access to another customer's order.
3. Submit invalid checkout price.
4. Replay payment webhook.
5. Attempt purchase beyond stock quantity.
6. Verify all unauthorized or invalid operations fail safely.

---

# 28. SEED DATA REQUIREMENTS

**Requirement ID: SEED-001**

Development must include realistic seed catalogue data.

## Minimum Seed Catalogue

At least:

- 6 categories
- 30 products
- 50 product variants
- 1 development admin account
- Multiple product price ranges
- In-stock and out-of-stock variants
- Different aesthetic tags
- Different compatibility properties

## Sample Categories

1. Keyboards & Mice
2. Desk Mats
3. Lighting
4. Monitor & Laptop Stands
5. Cable Management
6. Tech Accessories

## Important Rules

- Seed products must have plausible specifications.
- Product data must not depend on the AI generating imaginary inventory.
- Seed data must be reproducible.
- Development credentials must be configurable and never reused as production defaults.
- The demo environment must clearly identify simulated or sample products.

---

# 29. DEVELOPMENT PHASES

## Phase 1 — Foundation

Deliver:

- Repository structure
- Next.js application
- FastAPI service
- PostgreSQL connection
- Docker Compose
- Environment configuration
- Database migrations
- Health checks
- Initial CI

### Completion Gate

Frontend, API, and database run together.

## Phase 2 — Catalogue and Authentication

Deliver:

- Account registration and login
- Customer and admin authorization
- Product and category models
- Product CRUD
- Product listing
- Product details
- Filtering and searching
- Seed data

### Completion Gate

An admin can create a product and a customer can view it in the storefront.

## Phase 3 — Cart and Checkout

Deliver:

- Persistent cart
- Shipping address
- Checkout quotes
- Inventory reservation
- Order creation
- Razorpay sandbox
- Payment verification
- Webhook processing
- Order history

### Completion Gate

A customer can successfully complete a sandbox purchase, with verified payment and consistent stock.

## Phase 4 — AI Setup Builder

Deliver:

- Configuration wizard
- Candidate retrieval
- Bundle optimization
- Structured LLM explanations
- Output validation
- Deterministic fallback
- Editable recommendations
- Saved setups
- Setup-to-cart

### Completion Gate

A customer can generate, customize, save and purchase a valid desk setup.

## Phase 5 — Admin Operations

Deliver:

- Admin dashboard
- Inventory adjustments
- Low-stock alerts
- Order fulfillment
- Coupon management
- Analytics
- Audit logs

### Completion Gate

An admin can operate the primary commerce workflows without modifying the database manually.

## Phase 6 — QA and Deployment

Deliver:

- Unit tests
- Integration tests
- E2E tests
- Security checks
- Responsive QA
- Accessibility testing
- Docker production configuration
- Deployment documentation
- README
- API documentation
- Final environment template

### Completion Gate

The system can be deployed reproducibly and its core customer/admin flows pass automated tests.

---

# 30. DEFINITION OF DONE

DESKLY MVP+ is considered complete only when all the following conditions are met.

## Customer Experience

- [ ] Homepage works.
- [ ] Catalogue loads real products.
- [ ] Search and filters work.
- [ ] Product variants work.
- [ ] Cart persists.
- [ ] Checkout works.
- [ ] Sandbox payment works.
- [ ] Server verifies payment.
- [ ] Orders persist in database.
- [ ] Customers can view their orders.
- [ ] Wishlist works.
- [ ] Saved setups work.
- [ ] Mobile shopping flows work.

## AI Builder

- [ ] Preferences are validated.
- [ ] Recommendations reference real products.
- [ ] Stock is checked.
- [ ] Budget is enforced.
- [ ] Compatibility is checked.
- [ ] Invalid model output is rejected.
- [ ] Deterministic fallback works.
- [ ] Users can edit their setups.
- [ ] Users can save their setups.
- [ ] Users can add setups to cart.

## Admin

- [ ] Admin authentication works.
- [ ] Admin authorization works.
- [ ] Product CRUD works.
- [ ] Category management works.
- [ ] Variant management works.
- [ ] Inventory adjustments work.
- [ ] Order management works.
- [ ] Shipment updates work.
- [ ] Coupon management works.
- [ ] Dashboard analytics use real data.

## Engineering

- [ ] PostgreSQL migrations work.
- [ ] Docker development setup works.
- [ ] Environment configuration is documented.
- [ ] Secrets are excluded from source control.
- [ ] Unit tests pass.
- [ ] Integration tests pass.
- [ ] E2E core scenarios pass.
- [ ] Concurrent checkout does not oversell.
- [ ] Webhook replay is handled safely.
- [ ] Security checks pass.
- [ ] Staging deployment works.
- [ ] README is complete.
- [ ] OpenAPI specification is accessible.
- [ ] No critical release-blocking bugs remain.

---

# 31. PROJECT DELIVERABLES

The completed project should contain:

1. Frontend application source code.
2. Backend application source code.
3. PostgreSQL models and migrations.
4. AI recommendation module.
5. Customer-facing storefront.
6. Admin dashboard.
7. Payment gateway integration.
8. Inventory management.
9. Automated test suite.
10. Docker configuration.
11. Seed data scripts.
12. Environment variable template.
13. README.
14. Product Requirements Document.
15. UI/UX Design Specification.
16. System Architecture Document.
17. Database Schema Documentation.
18. REST API Specification.
19. Testing and Deployment Guide.

---

# 32. RISKS AND MITIGATIONS

## Risk 1: Invalid AI Recommendations

**Mitigation:** Deterministic candidate filtering, structured output validation, and fallback recommendations.

## Risk 2: Inventory Overselling

**Mitigation:** Transactional reservation logic, concurrency tests, and stock reconciliation.

## Risk 3: Payment Inconsistency

**Mitigation:** Server-side verification, webhook deduplication, durable payment records, and reconciliation jobs.

## Risk 4: Excessive MVP Scope

**Mitigation:** Implement features in P0/P1 order with explicit completion gates.

## Risk 5: Poor Mobile Experience

**Mitigation:** Mobile-first responsive implementation and device-level E2E testing.

## Risk 6: Unreliable External Services

**Mitigation:** Retry policies, error handling, timeouts, and provider-independent core business logic.

## Risk 7: Incorrect Tax or Shipping Rules

**Mitigation:** Configurable calculation rules, explicit test cases, and validation before live business operation.

## Risk 8: Customer Data Exposure

**Mitigation:** Authentication, authorization, ownership checks, encryption in transit, restricted logs, and security reviews.

---

# 33. FINAL PRODUCT REQUIREMENT

DESKLY must feel like a real premium e-commerce business.

The project must not rely on:

- Hardcoded product listings as the only source of data
- Fake authentication
- Non-functional checkout buttons
- Mock payment success presented as verified payment
- Static admin dashboards
- AI-generated nonexistent products
- Frontend-only inventory tracking
- Artificial order confirmations
- Placeholder functionality represented as complete

Every feature claimed to be implemented must be functional, connected to the appropriate backend service, supported by persistent data where necessary, and testable.

**Final Product Goal:**

Build a visually premium, technically robust, AI-powered desk accessories e-commerce platform that demonstrates professional full-stack engineering, real transactional workflows, an intelligent recommendation experience, and a deployment-ready architecture.

**END OF PRODUCT REQUIREMENTS DOCUMENT — DESKLY v1.1**
