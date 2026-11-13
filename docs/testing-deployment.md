# Testing and deployment

## Automated checks

Point `DESKLY_TEST_DATABASE_URL` to a disposable PostgreSQL database where the test user can create schemas. From `backend`, run `python -m pytest -q`. API tests use isolated schemas and replace the gateway network boundary with test responses. They exercise stock contention, idempotency, HMAC validation, webhook replay, access controls, setup constraints, cash-order placement, stock restoration and collection on delivery.

From `frontend`, run `npm run test`, `npm run build`, and `npx playwright install chromium`. Start the API and storefront with `DEMO_CHECKOUT=true` and the sample catalogue, then run `npm run test:e2e`. For installed Edge on Windows, set `PLAYWRIGHT_CHANNEL=msedge`. Set `PLAYWRIGHT_BASE_URL` for a dedicated test storefront. The suite runs desktop and mobile projects and covers lookbook selection, catalogue, cart, Setup Builder, authentication and demo orders. Set `PLAYWRIGHT_ADMIN_EMAIL` and `PLAYWRIGHT_ADMIN_PASSWORD` to exercise the admin workflow on a disposable catalogue. CI also checks migration drift and dependency advisories.

The local search test used 200 requests from eight concurrent clients against the 30-product sample catalogue. The query searched for “desk”, filtered to in-stock variants, and sorted by price. It measured 139 ms p95 on localhost.

Current submission results are recorded in the [final report](../FINAL_SUBMISSION_REPORT.md).

## Staging

1. Provision PostgreSQL and Redis. Configure the backend from `.env.example` using the deployment secret store. Use an HTTPS `APP_ORIGIN` matching the storefront and set `ENVIRONMENT=production`, `DEMO_CHECKOUT=false` and `SAMPLE_CATALOGUE=false`. Use Razorpay test keys. Enable cash on delivery only where you can reconcile collection.
2. Build the backend Docker image, run `alembic upgrade head` as a migration job, and deploy the API and worker from the same image. The API health endpoint is `/health`. Keep provider credentials on the backend.
3. Deploy the `frontend` directory to Vercel as a Next.js project. Set its server-only `API_URL` to the HTTPS backend. Configure the reverse proxy to pass trusted client IPs for per-client rate limiting. Use an exact frontend origin on the API. Browser writes use the frontend API proxy.
4. Configure Razorpay automatic capture and the signed HTTPS webhook. In test mode, run a standard purchase and a setup purchase. Verify the captured amount, inventory movement, order history and admin shipment transition. Replay the signed webhook and check that stock moves once.
5. Test an SMTP reset link and order email, S3 photo upload, and hosted explanation generation. Test with the explanation provider unavailable to confirm fallback. For reservations released before a late capture, inspect the flagged order and reconcile any refund manually.
6. Measure mobile accessibility and search latency against the expected staging catalogue and load. Record results before release. Verify shipment, tax and invoicing settings for the selling entity and use the actual product catalogue before live operation.

The Compose configuration supplies development database credentials and sample data. For staging, provision records through authenticated administration or load authorized catalogue data through a controlled migration. The development seed is intentionally disabled in production. To provision the first production admin, create the account through registration and run an operator-controlled database migration that changes that account's role after verifying its identity.
