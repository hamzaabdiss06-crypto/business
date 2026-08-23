# Security Policy

OmniTrack handles business, customer, delivery, location, and payment-related information. Production security is a release requirement.

## Reporting a vulnerability

Please do not publish credentials, customer data, payment information, or exploit details in a public issue.

Report suspected vulnerabilities privately to the project owner and include:

- affected endpoint or feature
- steps to reproduce
- expected versus actual behavior
- security impact

## Production rules

- Never commit M-Pesa consumer secrets, passkeys, service-account credentials, or API secrets.
- Demo authentication and demo mutation endpoints must not be exposed in production.
- Every tenant-scoped API request must verify authentication and tenant membership server-side.
- Payment callbacks must be verified and handled idempotently before marking an order paid.
- GPS telemetry must be authorized to the authenticated driver and tenant.
- Production logs must not contain payment secrets, authentication tokens, or unnecessary customer data.
- Firestore rules must be tested before production deployment.

## Release gate

A production release should not proceed while a known critical authentication, tenant-isolation, payment-verification, or secret-exposure issue remains unresolved.
