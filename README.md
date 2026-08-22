# auth-service
## Subscriptions (Paymob)

The application has two plans: `FREE` (local, no payment) and `PREMIUM` (a recurring monthly Paymob subscription).

1. Copy `.env.example` to `.env` and provide the Paymob keys and integration IDs from **one** dashboard mode (all test or all live).
2. Make `PAYMOB_WEBHOOK_URL` a reachable HTTPS URL. It must contain the same random `PAYMOB_WEBHOOK_TOKEN` configured in `.env`.
3. Apply the migration with `npx prisma migrate deploy`.
4. Open `/subscription`, enter a phone number, and select Premium. The first request creates (or reuses) the 30-day Paymob plan, then redirects to Paymob checkout.

After Paymob returns a successful callback, `POST /api/paymob/webhook?token=...` activates Premium. For production, configure Paymob's official callback signature validation in addition to the secret URL token if it is enabled for the merchant account.
