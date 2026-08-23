# Management Security Model

## Trust Boundaries

1. The hosting provider's owner gate authenticates the only currently permitted operator.
2. A future identity adapter resolves that operator to an enabled owner principal.
3. Server-side sessions carry an identifier, role, issue time, expiry, and authentication method only.
4. Every protected route checks an explicit capability and denies access by default.
5. Audit events store action metadata after credential and project-data keys are removed.

## Data Exclusion Boundary

The management system does not receive or store plant points, zones, coordinates, images, browser directory handles, desktop paths, SQLite project databases, JSON project files, or third-party species tokens. The browser workspace keeps those values on the user's device.

## Required Controls Before Production Identity

- Server-side, revocable, short-lived sessions in `HttpOnly`, `Secure`, `SameSite=Strict` cookies.
- OIDC or WebAuthn through a maintained identity provider; no home-grown password hashing flow.
- CSRF protection and origin validation on every mutating route.
- Request and authentication rate limits.
- Step-up authentication for publication, release, and member changes.
- Immutable, redacted audit events with request correlation identifiers.
- Secret injection from the deployment platform; no repository or browser-bundle secrets.
- Independent review before adding any endpoint that could access project data.
