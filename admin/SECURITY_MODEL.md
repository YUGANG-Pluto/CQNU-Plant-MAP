# Management Security Model

## Trust Boundaries

1. The hosting provider's owner gate authenticates the only currently permitted operator.
2. The identity adapter accepts only assertions already verified by a maintained provider adapter and maps the configured provider subject to the owner principal.
3. Server-side sessions store token and CSRF digests, role, issue/rotation/activity times, idle and absolute expiry, authentication method, and revocation state. Raw tokens are returned only at issue or rotation.
4. Every protected route checks an explicit capability and denies access by default.
5. Every state-changing route requires an exact allowed Origin and a session-bound CSRF token.
6. Audit events accept only allowlisted action metadata after credential-shaped values and local paths are redacted.

## Cloud Project Boundary

The browser remains local-first. Only an explicit cloud project operation sends `settings`, `zones`, and `points` record snapshots, which may include coordinates and relative image references already present in point records. The client removes service credentials, credential-bearing URL parameters, and device-absolute paths before upload; the Worker independently rejects them. Projects are scoped to the authenticated account and require `workspace.read` or `workspace.save`. The service does not receive image bytes, browser directory handles, SQLite/JSON source files, backups, logs, or third-party service tokens.

Each snapshot is size-bounded, split across bounded D1 rows, assigned an immutable revision record, and verified with SHA-256 before it is returned. Optimistic revision checks reject stale uploads, renames, restores, and deletions. Restoring an older revision appends a new revision instead of rewriting history. Owner-triggered deletion removes the project and all of its version chunks in one D1 batch; a browser-local working copy already opened by the user is not deleted. Administrators can read account-level project counts and byte totals without receiving project names or snapshot content. The API has no sharing, background synchronization, cross-account project read, or cross-account project mutation route.

## Password Controls

- Password verifiers use a random salt, PBKDF2-HMAC-SHA-256, and a deployment-provided HMAC pepper.
- The shared implementation defaults to 600,000 iterations. Cloudflare-hosted Workers use the platform ceiling of 100,000 iterations and retain the iteration count for future transparent upgrades.
- Bootstrap and administrator-reset passwords are accepted only as temporary activation credentials. Normal password policy rejects common values and requires at least 6 characters.
- Five failed logins lock the account for 10 minutes. Credential, identity, and permission changes revoke active sessions.
- The bulk identity-reset route is administrator-only, exact-origin CSRF protected, and requires the current administrator password plus a fixed confirmation phrase. It preserves roles and project ownership while resetting every account to pending activation, invalidating outstanding credential links, revoking all sessions, and writing count-only audit metadata.
- A user may defer the personal-password change after activation. In that state the shared temporary credential remains valid and the account exposes a persistent recommendation flag; saving a personal password clears the flag and revokes other sessions.

## Required Controls Before Production Identity

- Retain the D1-backed account, session, audit, and cloud project stores; in-memory stores remain test fixtures only.
- OIDC or WebAuthn through a maintained identity provider for a future public or multi-tenant deployment.
- Provider-specific signature, issuer, audience, nonce, replay, and callback-state validation before the identity adapter is called.
- Request and authentication rate limits.
- Step-up authentication for publication, release, and member changes.
- Immutable, redacted audit events with request correlation identifiers.
- Secret injection from the deployment platform; no repository or browser-bundle secrets.
- Independent review before adding deletion, sharing, image upload, database-file upload, or cross-account project access.
