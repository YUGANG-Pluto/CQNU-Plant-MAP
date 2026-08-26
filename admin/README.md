# Management System

This directory contains the TypeScript account, authorization, session, CSRF, audit, HTTP, and browser-management modules used by the private site.

## Current Scope

- Hosting access control remains the outer gate for the private deployment.
- Accounts support user and administrator roles, read/edit/save workspace access, first-use activation, password reset, and a maximum of three administrators.
- Durable production accounts, sessions, credential grants, and audit events use the configured D1 binding.
- Browser management controllers live under `src/ui/` and compile to `dist/ui/`; the site build publishes those compiled modules instead of parallel hand-written JavaScript.
- There is no remote project store and no project-data API.
- The contracts do not accept point records, zone records, coordinates, images, local paths, browser file handles, or desktop project databases.
- Identity assertions are accepted only after a configured provider verifier has validated them. The adapter never trusts a role supplied by the browser.
- Session tokens and CSRF tokens are random opaque values; only SHA-256 digests are stored server-side.
- Sessions have idle and absolute expiry, periodic token rotation, single-session revocation, and principal-wide revocation.
- Mutating route contracts require an exact allowed origin and matching CSRF token. Unknown routes are denied.
- Audit metadata uses a narrow field allowlist and redacts credential-shaped values and local paths.
- Browser avatars remain local browser preferences and are not sent to the management service.

## Deliberate Boundaries

- Public registration, open invitations, or multi-tenant organizations.
- Remote synchronization of browser or desktop project data.
- Provider-specific OIDC or WebAuthn authentication.
- Any endpoint that accepts project records, images, coordinates, paths, file handles, or database contents.

The in-memory stores remain test fixtures. Production changes must retain deny-by-default authorization, `HttpOnly`/`Secure`/`SameSite=Strict` cookies, exact-origin CSRF protection, bounded credentials, session expiry and rotation, administrator-count guards, and redacted audit events.

## Validation

Run `npm run check` in this directory. It performs strict TypeScript checking, a clean build, and the account/security test suite. The site package invokes the clean admin build before collecting `dist/ui` and server modules.
