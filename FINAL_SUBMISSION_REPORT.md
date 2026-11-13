# DESKLY final submission report

The complete evaluator workflow runs locally against PostgreSQL. The [public Vercel site](https://deskly-ecommerce.vercel.app/) serves the storefront preview. The public API is currently disconnected.

## Implemented features and evaluation coverage

| Criterion | Evidence |
| --- | --- |
| Completeness · 40% | Products, filters, variant availability and cart come from the API. The customer can sign in or register, place a Demo order, reopen it from the account and cancel it while placed. Administrators can add and edit products, set available stock and manage orders. |
| Documentation · 30% | The [PRD](docs/PRD.md), [design document](docs/DESIGN_DOCUMENT.md), [architecture and API document](docs/ARCHITECTURE.md) and [README](README.md) describe actual routes, contracts, setup and scope. The [submission checklist](SUBMISSION_CHECKLIST.md) maps all 20 storefront items to fixes, checks or dependencies. |
| Code quality · 20% | FastAPI validates data, checks origin and role, and owns prices and transactional inventory. Order creation is idempotent. The UI shows loading, success, validation and outage states. Provider secrets are configured outside the repo. |
| AI integration · 10% | Setup Builder uses available catalogue variants, checks constraints and stays within the product budget. Customers can edit and add the result to the bag. The verified evaluation used rule-based recommendations. An optional model can explain a selection but cannot supply products or prices. |

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Next.js build and type check | PASS | Production build completed, including the favicon route. |
| Frontend unit tests | PASS | 2 tests passed. |
| FastAPI startup and PostgreSQL migration | PASS | Fresh evaluation database migrated and seeded. Alembic reported no schema drift. |
| API smoke and authorization | PASS | Health, store, categories, products and cart returned 200. Anonymous order history and admin APIs returned 401. |
| PostgreSQL integration suite | PASS | 12 tests passed, including demo order persistence and fulfillment, stock contention, payment verification logic with a simulated gateway, authorization and deterministic recommendations. |
| Desktop and mobile browser suite | PASS | 12 tests passed against the standalone production build. The suite exercised product search, variant selection, bag persistence, demo checkout, confirmation and order history, registration/sign-in/sign-out, protected routes, admin product and stock changes, and building and saving a setup. Earlier development runs exposed intermittent navigation failures that were corrected before the production run. |
| Demo order database check | PASS | The evaluation database contained persisted `DEMO` orders with no paid timestamps or gateway order references. |
| Responsive layout and links | PASS | 14 public routes passed at 320, 390, 768 and 1440 px. 15 authenticated account/admin views passed at 320 and 1440 px. Checked 27 homepage links, the favicon, 404 fallback, mobile menu, clickable contact formats and cart quantity/removal feedback. |
| Windows launcher | PASS | Alternate ports started DESKLY and confirmed demo checkout. Port 3000 belonged to another app on the evaluation machine. |
| Live hosted backend, Razorpay sandbox payment, hosted model, SMTP and S3 | NOT TESTED | These require deployment access or provider credentials. Payment behavior was tested with simulated provider responses. |

## Run the demo

Copy `.env.example` to `.env` and set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` to evaluator credentials you control. Keep `DEMO_CHECKOUT=true` and `SAMPLE_CATALOGUE=true`. From the repo root:

```sh
docker compose up --build
```

Compose starts PostgreSQL and Redis, applies Alembic migrations and seeds the sample catalogue, then starts the API, worker and frontend. Open [localhost:3000](http://localhost:3000/). For separate process commands, including database and frontend ports, see the [README](README.md#run-without-docker). On the existing Windows workspace, `./scripts/start-local.ps1 -WebPort 3012 -ApiPort 8012 -DemoCheckout` starts the [alternate preview](http://localhost:3012/).

## Four-minute evaluator walkthrough

1. **0:00–0:30.** Open Home and use the navbar to show the hero, keyboard assembly and Our Story section.
2. **0:30–1:15.** Choose Shop, search for a task lamp and open its product page. Select a variant, add it to the bag and change its quantity.
3. **1:15–2:15.** Create a sample account or sign in. Open checkout, enter sample shipping data, choose **Demo checkout** and place the order. Show the order number and the no-payment confirmation. Open it again through **Account → Orders**.
4. **2:15–3:05.** In a separate session, sign in as the development admin. Open Products and Inventory to demonstrate a stock update. Open Orders and move the saved demo order to Processing.
5. **3:05–4:00.** Open Setup Builder, enter a budget, choose Coding and Minimal, then generate a setup. Show item availability, subtotal and the explanation source. Add the setup to the bag.

## Remaining dependencies

Demo checkout is for local sample data. Production startup rejects it. Live commerce needs an HTTPS FastAPI host, worker, PostgreSQL, Redis, the correct Vercel `API_URL` and backend `APP_ORIGIN`, and real inventory. Razorpay, SMTP, S3 and optional OpenAI explanations each require their own credentials. Configure `STORE_SUPPORT_EMAIL` and `STORE_SUPPORT_PHONE` using official public store contact details before displaying those links. The evaluation used test contact values only.
