# OmniTrack Production Checklist

This document is the release gate for the production-foundation branch. Existing application behavior should be preserved unless a change is explicitly required for security or correctness.

## Release blockers

- [ ] Replace development/demo authentication paths with verified Firebase ID-token authentication in production.
- [ ] Require authenticated, tenant-authorized access for every tenant data API endpoint.
- [ ] Keep tenant IDs server-derived from verified claims/session context; never trust a client-supplied tenant ID for authorization.
- [ ] Move all M-Pesa consumer credentials, passkeys, webhook secrets, and SMS credentials to server-side secrets/environment configuration.
- [ ] Replace generated/demo M-Pesa transaction IDs with real Daraja STK Push initiation and callback/status verification before marking an order paid.
- [ ] Validate M-Pesa callback amounts, merchant/account identifiers, checkout request IDs, and order ownership before recording payment.
- [ ] Add rate limiting and request-size limits to public API routes.
- [ ] Add structured production logging without logging tokens, payment secrets, or sensitive customer data.
- [ ] Configure HTTPS-only production deployment and secure CORS origins.
- [ ] Run TypeScript checks, production build, unit tests, and Firestore rules tests in CI.

## Data protection

- [ ] Review customer phone numbers, addresses, GPS locations, and payment records as sensitive data.
- [ ] Define retention/deletion rules for GPS history, audit logs, and customer records.
- [ ] Ensure drivers can only read/update their own operational data where appropriate.
- [ ] Keep audit logs append-only.
- [ ] Verify Firestore rules with emulator tests for each role and tenant boundary.

## Business readiness

- [ ] Add business onboarding and account suspension flows.
- [ ] Add subscription/billing state to tenants without coupling it to payment-provider credentials.
- [ ] Add usage limits and plan enforcement.
- [ ] Add support/contact workflow.
- [ ] Add privacy policy, terms, and customer-facing data handling information.
- [ ] Add backups and a documented recovery procedure.

## Launch process

1. Create a release candidate branch from production-foundation.
2. Run CI and security review.
3. Test tenant isolation with at least two businesses.
4. Test driver/customer/admin flows end-to-end.
5. Test failed, duplicate, delayed, and mismatched M-Pesa callbacks.
6. Deploy to staging.
7. Run a controlled pilot with non-sensitive test data.
8. Only then merge to `main` and deploy production.
