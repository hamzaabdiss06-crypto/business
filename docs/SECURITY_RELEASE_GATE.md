# Security release gate

A production deployment must not be considered ready until all of the following are true:

- [ ] All tenant-data API routes require verified Firebase identity.
- [ ] Tenant IDs come from authenticated claims or a server-side membership lookup, never from an untrusted request body/path alone.
- [ ] Demo claim/seed/update endpoints are unavailable in production.
- [ ] M-Pesa callbacks are verified against the provider transaction and mapped to the correct tenant/order.
- [ ] Payment amount and order ownership are checked server-side before marking an order paid.
- [ ] Driver GPS writes validate tenant, driver identity, coordinate ranges, and assigned delivery ownership.
- [ ] Rate limiting is enabled for authentication, payment, GPS, AI, and public tracking endpoints.
- [ ] Security headers and an explicit CORS allowlist are configured.
- [ ] Secrets are supplied by the deployment secret manager and are absent from tracked source.
- [ ] Firestore rules are deployed and tested against cross-tenant reads/writes.
- [ ] CI passes type-check, tests, and production build.
- [ ] Staging has been tested with a dedicated Firebase project and payment sandbox.

Do not remove a gate simply to make a deployment pass. If a feature is still demo/simulated, label it as such in the product and keep it out of production payment state.
