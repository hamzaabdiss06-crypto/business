# Production security review status

## Current state
This branch is a production hardening workspace. `main` remains the stable application branch.

## Verified controls
- Server-side order validation and total calculation exist.
- Firebase ID token verification exists for protected order/GPS endpoints.
- Driver GPS updates include driver identity checks.
- Firestore has explicit tenant/role rules.
- Production and demo concerns are documented.
- Environment and credential files are ignored by Git.
- Automated type-check/test commands are configured.

## Remaining release blockers
- Replace demo proxy endpoints with authenticated, tenant-scoped API handlers.
- Protect demo claim/seed/update endpoints from production exposure.
- Replace simulated M-Pesa success with provider-verified payment state.
- Add request rate limiting and security headers.
- Add structured audit logging for authentication, payment, and tenant-access events.
- Run the complete test suite against a staging Firebase project before release.

## Rule
Do not treat this branch as payment-production-ready until the remaining blockers are closed and staging verification passes.
