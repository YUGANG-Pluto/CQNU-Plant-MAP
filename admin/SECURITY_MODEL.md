# Management Security Model

## Trust Boundaries

1. The hosting provider's owner gate authenticates the only currently permitted operator.
2. The identity adapter accepts only assertions already verified by a maintained provider adapter and maps the configured provider subject to the owner principal.
3. Server-side sessions store token and CSRF digests, role, issue/rotation/activity times, idle and absolute expiry, authentication method, and revocation state. Raw tokens are returned only at issue or rotation.
4. Every protected route checks an explicit capability and denies access by default.
5. Every state-changing route requires an exact allowed Origin and a session-bound CSRF token.
6. Audit events accept only allowlisted action metadata after credential-shaped values and local paths are redacted.

## Data Exclusion Boundary

The management system does not receive or store plant points, zones, coordinates, images, browser directory handles, desktop paths, SQLite project databases, JSON project files, or third-party species tokens. The browser workspace keeps those values on the user's device.

## Required Controls Before Production Identity

- Replace the in-memory session and audit fixtures with durable, atomic, revocable server-side stores.
- OIDC or WebAuthn through a maintained identity provider; no home-grown password hashing flow.
- Provider-specific signature, issuer, audience, nonce, replay, and callback-state validation before the identity adapter is called.
- Request and authentication rate limits.
- Step-up authentication for publication, release, and member changes.
- Immutable, redacted audit events with request correlation identifiers.
- Secret injection from the deployment platform; no repository or browser-bundle secrets.
- Independent review before adding any endpoint that could access project data.
