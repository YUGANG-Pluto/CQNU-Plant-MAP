# Management System

This directory contains the TypeScript account, authorization, session, CSRF, audit, HTTP, and browser-management modules used by the private site.

## Current Scope

- Hosting access control remains the outer gate for the private deployment.
- Accounts support user and administrator roles, read/edit/save workspace access, first-use activation, optional post-activation password change, password reset, and a maximum of three administrators.
- Durable production accounts, sessions, credential grants, audit events, and account-scoped cloud project versions use the configured D1 binding.
- Browser management controllers live under `src/ui/` and compile to `dist/ui/`; the site build publishes those compiled modules instead of parallel hand-written JavaScript.
- The site-only cloud project API lists, creates, reads, renames, versions, restores, and deletes `settings`, `zones`, and `points` record snapshots for the authenticated owner. Historical snapshots have a separate read-only endpoint for local comparison before restore.
- Cloud project requests reject service credentials, credential-bearing URL parameters, and device-absolute paths. Relative image references may remain in records, but browser file handles, image bytes, backup archives, logs, and desktop SQLite/JSON source files are never accepted.
- Snapshots are bounded to 8 MiB, split below D1 row limits, protected by optimistic revisions, and verified with SHA-256 on current and historical reads.
- Restoring an older snapshot appends a new revision. Deleting a cloud project removes its current record, immutable revision metadata, and chunks in one D1 batch after an expected-revision check.
- Administrators may inspect per-account project counts and byte totals. The management usage endpoint does not return project names or snapshot content.
- Identity assertions are accepted only after a configured provider verifier has validated them. The adapter never trusts a role supplied by the browser.
- Session tokens and CSRF tokens are random opaque values; only SHA-256 digests are stored server-side.
- Sessions have idle and absolute expiry, periodic token rotation, single-session revocation, and principal-wide revocation.
- Mutating route contracts require an exact allowed origin and matching CSRF token. Unknown routes are denied.
- Audit metadata uses a narrow field allowlist and redacts credential-shaped values and local paths.
- Browser avatars remain local browser preferences and are not sent to the management service.
- An administrator can reset all existing login identities to the known temporary password `123456`. The operation preserves account IDs, usernames, roles, permissions, and project ownership, but returns every account to pending activation, invalidates outstanding credential links, revokes every session, and records a redacted audit event.

## Deliberate Boundaries

- Public registration, open invitations, or multi-tenant organizations.
- Background synchronization, desktop cloud access, shared projects, or organization-wide project visibility.
- Provider-specific OIDC or WebAuthn authentication.
- Any endpoint that accepts images, paths, file handles, backup archives, logs, or database-file contents.

The in-memory stores remain test fixtures. Production changes must retain deny-by-default authorization, `HttpOnly`/`Secure`/`SameSite=Strict` cookies, exact-origin CSRF protection, bounded credentials, session expiry and rotation, administrator-count guards, and redacted audit events.

The request entry in `src/site-handler.ts` owns route lookup, authentication, authorization, and failure auditing. Public session routes, account routes, member routes, cloud-project routes, response mapping, and shared request helpers are kept in separate modules so each boundary can be reviewed independently.

## Production environment

- Bind D1 as `DB`.
- Set `CQNU_MANAGEMENT_AUTH_KEYRING` as a deployment secret. Its JSON contains `activeKeyId` and a `keys` map of base64url-encoded 32–64 byte random keys.
- For the first request against an empty D1 database, set `CQNU_BOOTSTRAP_ADMIN_PASSWORD` and `CQNU_BOOTSTRAP_USER_PASSWORD`. Usernames are optional and default to `admin` and `user`.
- Bootstrap credentials are temporary and force first-use activation. Activation may retain the temporary password, but the account remains marked for a recommended personal-password change until a policy-compliant password is saved. Do not commit key-ring material or deployment secrets.
- Schema setup is idempotent. The production runtime reuses existing accounts and cloud project versions instead of reseeding them.

## Validation

Run `npm run check` in this directory. It performs strict TypeScript checking, a clean build, and the account/security test suite. The site package invokes the clean admin build before collecting `dist/ui` and server modules.
