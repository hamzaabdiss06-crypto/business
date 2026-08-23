# OmniTrack product scope

## Core product
OmniTrack is a multi-tenant delivery and order-management platform for businesses that need orders, drivers, customer tracking, GPS visibility, notifications, and payments in one system.

## Product surfaces
- Business owner/admin dashboard
- Staff order operations
- Driver delivery workflow
- Customer tracking experience
- Platform administration

## Production principles
- Existing delivery, GPS, tenant, Firebase, notification, and payment functionality should be preserved unless a change is required for security or correctness.
- Server-side systems are authoritative for identity, tenant ownership, order totals, payment state, and delivery state.
- Demo/simulation behavior must be explicitly separated from production behavior.
- Payment success must only be recorded after provider verification.
- GPS writes must be authenticated and scoped to the owning driver/tenant.
- Customer and business data must never cross tenant boundaries.

## Launch sequence
1. Secure authentication and API authorization.
2. Separate demo and production payment paths.
3. Add production observability and automated tests.
4. Validate onboarding and core delivery workflow with pilot businesses.
5. Add subscriptions/billing after the core workflow is reliable.
