# Production operations

## Minimum operating controls

- Use separate development, staging, and production Firebase projects.
- Keep production credentials in a secret manager; never in Git.
- Enable application error monitoring and server logs with sensitive fields redacted.
- Back up Firestore data according to the business recovery target.
- Test restore procedures before onboarding paying businesses.
- Keep an audit trail for authentication changes, tenant membership changes, payment events, refunds, and delivery-state overrides.
- Monitor payment callback failures and duplicate callbacks.
- Monitor GPS ingestion volume and reject malformed/out-of-range telemetry.
- Define an incident owner and escalation process before launch.

## Data protection

Customer phone numbers, addresses, order history, driver locations, and payment references are sensitive business data. Restrict access by role and tenant, minimize retention, and avoid putting customer data in logs or analytics payloads.

## Deployment rule

Deploy from a known Git commit after CI passes. Never deploy directly from an unreviewed working tree. Keep `main` as the stable branch and use a separate branch for production hardening until staging verification is complete.
