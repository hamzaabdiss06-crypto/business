# OmniTrack — Product Roadmap

This document is the production plan for turning the existing OmniTrack delivery platform into a launch-ready SaaS product.

## Safety rule

- `main` remains the protected baseline.
- Product work happens on `production-foundation` until reviewed.
- Preserve existing order, tenant, driver, GPS, Firebase, M-Pesa, SMS, and dashboard functionality unless a change is explicitly required for production safety.
- Prefer additive changes and small, reversible commits.

## Phase 1 — Production foundation

- [ ] Separate demo/development authentication from production authentication.
- [ ] Audit every Express endpoint for authentication, tenant isolation, and role authorization.
- [ ] Audit Firestore rules with emulator tests.
- [ ] Confirm all secrets are environment-only and never committed.
- [ ] Add production-safe CORS configuration.
- [ ] Add request validation and consistent API error responses.
- [ ] Add rate limiting to public/auth/payment endpoints.
- [ ] Add structured server logging without exposing customer/payment secrets.
- [ ] Add health/readiness endpoints.
- [ ] Add CI build and type-check checks.

## Phase 2 — Real business operations

- [ ] Business signup and onboarding.
- [ ] Business profile and branding.
- [ ] Staff invitations and role management.
- [ ] Driver onboarding.
- [ ] Customer management.
- [ ] Order lifecycle and audit history.
- [ ] Delivery zones and pricing rules.
- [ ] Operational reports.

## Phase 3 — Real payments and notifications

- [ ] Replace simulated payment confirmation with verified M-Pesa server callbacks.
- [ ] Idempotent payment handling.
- [ ] Payment reconciliation and transaction history.
- [ ] Production SMS provider configuration.
- [ ] Delivery status notifications.
- [ ] Failed-payment and failed-notification handling.

## Phase 4 — SaaS commercial layer

- [ ] Subscription/account status model.
- [ ] Plan limits.
- [ ] Trial period support.
- [ ] Billing/admin controls.
- [ ] Usage metrics.
- [ ] Upgrade/downgrade flows.

## Phase 5 — Launch quality

- [ ] End-to-end tests for signup → order → payment → dispatch → tracking → delivery.
- [ ] Security review.
- [ ] Performance/load review.
- [ ] Backup and recovery procedure.
- [ ] Privacy policy and terms placeholders.
- [ ] Production deployment documentation.
- [ ] Customer support/admin workflow.

## Product principle

The current application is the product foundation. Do not rewrite working functionality merely for style. Every production change should have a clear business, security, reliability, or maintainability reason.
