# OmniTrack Security Threat Model

## Assets

- Customer identity and contact information
- Delivery addresses and GPS locations
- Orders and order totals
- M-Pesa payment state and provider references
- Tenant configuration
- Driver/staff accounts
- Audit history

## Trust boundaries

1. Browser/mobile client -> Express API
2. Browser/mobile client -> Firebase/Firestore
3. Express API -> Firebase Admin SDK
4. Express API -> M-Pesa/SMS/Gemini providers
5. One tenant -> another tenant

## Required controls

### Authentication

Production APIs must authenticate requests using verified Firebase ID tokens or another server-verifiable session mechanism. Client-provided role or tenant headers must never be treated as proof of identity.

### Authorization

Every tenant-scoped operation must establish the authenticated user's tenant and role on the server. A request must not be allowed to access another tenant by changing a URL/body tenant ID.

### Payments

A client request that says `paid` is not proof of payment. Payment status must be established from the payment provider's verified response/callback and matched to the expected order and amount.

### GPS

Location writes must be limited to the authenticated driver/device responsible for that driver record. Location history should be append-only and access should be restricted by tenant and role.

### Secrets

Provider credentials belong in server-side secret storage/environment configuration. They must never be bundled into frontend code, committed demo data, logs, or client-readable Firestore documents.

### Abuse controls

Public endpoints need request-size limits, rate limiting, input validation, safe error responses, and appropriate CORS restrictions.

## High-risk scenarios

- Forged demo-role/header authentication
- Cross-tenant order access
- Client-side manipulation of payment status or order totals
- Leaked M-Pesa/SMS credentials
- Unauthorized GPS writes
- Replay/duplicate payment callbacks
- Excessive API polling or automated abuse

## Review rule

Security fixes should be implemented in small, testable commits. Preserve working business behavior and do not remove core features merely to simplify the codebase.
