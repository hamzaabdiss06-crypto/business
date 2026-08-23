# OmniTrack production environment

## Rule
Never commit real credentials, payment secrets, API keys, service-account JSON, or customer data to Git.

## Required server-side secrets
- Firebase Admin credentials / workload identity
- M-Pesa consumer key and secret
- M-Pesa passkey
- SMS provider credentials
- Gemini API key (if enabled)
- Session/authentication secrets used by the API

## Frontend configuration
Only public Firebase client configuration belongs in the browser. Payment credentials and provider secrets must remain server-side.

## Deployment separation
Use separate Firebase projects and payment credentials for development, staging, and production. Never reuse sandbox credentials in production.

## Release gate
Before production deployment:
1. Verify no secret appears in tracked files or build output.
2. Confirm demo authentication is disabled in production.
3. Confirm payment callbacks are authenticated and server-verified.
4. Confirm every tenant-scoped API checks authenticated identity and tenant membership.
5. Confirm Firestore rules are deployed and tested.
6. Confirm backups, logging, monitoring, and incident contacts exist.
