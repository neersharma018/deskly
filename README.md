# DESKLY

DESKLY is a desk accessories store for India. Browse the shoppable editorial lookbook, generate a workspace setup, or go straight to the catalogue. The Next.js storefront and admin panel call a FastAPI API backed by PostgreSQL. The development seed contains 6 collections, 30 sample products and 60 variants. All prices are stored in paise.

## Run with Docker Compose

1. Copy `.env.example` to `.env`. Set `SEED_ADMIN_EMAIL` and a unique `SEED_ADMIN_PASSWORD` of at least 10 characters to enable the development administrator. Set `CASH_ON_DELIVERY=true` for local order placement without gateway credentials.
2. Run `docker compose up --build`. Compose runs the migration and seed once before starting the API, worker and storefront.
3. Open [the storefront](http://localhost:3000) or [the OpenAPI explorer](http://127.0.0.1:8000/docs). Use [the login page](http://localhost:3000/login) to enter the admin panel with the seeded credentials.

## Run without Docker

Use Node 24, Python 3.12, and a running PostgreSQL instance. Copy `.env.example` to `.env` for a fresh checkout. Create a development database and configure `DATABASE_URL`. Set `REDIS_URL=` if Redis is unavailable. Set `CASH_ON_DELIVERY=true` to place sample orders locally. Run the following in PowerShell from the project root.

If this workspace has the machine-local `.local/postgres.mjs` helper, run `node .local/postgres.mjs` in a separate terminal to restart its preview database.

```powershell
py -3.12 -m venv .venv
& ./.venv/Scripts/python.exe -m pip install -r backend/requirements.lock
& ./.venv/Scripts/python.exe -m alembic -c backend/alembic.ini upgrade head
Push-Location backend
& ../.venv/Scripts/python.exe -m deskly.seed
& ../.venv/Scripts/python.exe -m uvicorn deskly.main:app --port 8000 --no-access-log
```

Start the worker from `backend` in a second terminal with `& ../.venv/Scripts/python.exe -m deskly.worker`. In a third terminal, run `npm.cmd ci --prefix frontend` and `npm.cmd run dev --prefix frontend`. Keep `APP_ORIGIN` at `http://localhost:3000` for the local browser, or change it to the exact origin you use. Set `API_URL` in the frontend process environment if the API is hosted elsewhere.

After the initial setup, restart the Windows preview from the project root with `./scripts/start-local.ps1`. It starts the machine-local PostgreSQL helper if present and needed, applies migrations before starting the API, and checks the API before starting the storefront. With a separate PostgreSQL installation, start that database first. Background logs are in `.local/logs`.

## Verify the workflows

1. Open the storefront, explore a numbered lookbook item, choose a variant, and add it to the bag.
2. Continue to checkout with development shipping details and choose cash on delivery. Confirm the order status shows payment due.
3. Sign in as the development admin, open **Orders**, and find the order. Move it to processing, add shipment details, and confirm collection when marking it delivered. Use only sample records for this check.
4. Open Setup Builder, enter a budget and purpose, generate a setup, then edit, save, or add it to the bag. Sign in to save it.
5. Run the automated checks in the [testing guide](docs/testing-deployment.md).

## Deploy to staging

1. Provision PostgreSQL and Redis. Configure backend settings in your secret store and set `APP_ORIGIN` to the HTTPS storefront origin.
2. Build the backend Docker image, run `alembic upgrade head` once, then deploy the API and worker separately from the same image.
3. Deploy `frontend` to Vercel as a Next.js application. Set the server-side `API_URL` to the HTTPS backend.
4. Enable Razorpay test mode and configure the signed webhook. Verify online payment, stock movement and fulfillment against a test order. Configure the other provider integrations used by the deployment. [Detailed staging checklist](docs/testing-deployment.md#staging)

## Providers

| Service | Configuration |
| --- | --- |
| Razorpay | Set test key ID, key secret and webhook secret. Enable automatic capture and subscribe to `payment.captured` for the HTTPS webhook at `/api/v1/webhooks/razorpay` on the API. Checkout reports when payments are unavailable. |
| Cash on delivery | Set `CASH_ON_DELIVERY=true` where the store can handle collection and reconciliation. Orders start with payment due. The admin records collection at delivery. |
| Hosted explanations | Set `OPENAI_API_KEY` and optionally `OPENAI_MODEL`. Catalogue matching and deterministic explanations run without an API key. |
| Transactional email | Set the SMTP host, port, sender and credentials. The worker drains the PostgreSQL outbox. |
| Product uploads | Set the S3 bucket, region and HTTPS media base URL. Use restricted credentials with write access to `products/`. Optionally set an S3-compatible endpoint. |
| Rate limiting | Set `REDIS_URL` for distributed limits. The API has an in-memory limiter for local development. |

[Razorpay Standard Checkout](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/) · [Razorpay webhook validation](https://razorpay.com/docs/webhooks/validate-test/) · [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)

## Project documents

- [PRD with personas, scope and acceptance criteria](prd.md)
- [Design document with UI flows and components](docs/design.md)
- [Architecture document with system diagrams and data model](docs/architecture.md)
- [REST API contracts](docs/api.md)
- [Testing and deployment](docs/testing-deployment.md)
