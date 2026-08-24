# Management System Foundation

This directory defines the owner-only authorization, identity-adapter, session, CSRF, audit, and HTTP route contracts for the future management system.

## Current Scope

- The active mode is `owner-only`.
- Hosting access control remains the outer gate.
- Only site publication, release administration, future member administration, and audit-event reading are represented.
- There is no remote project store and no project-data API.
- The contracts do not accept point records, zone records, coordinates, images, local paths, browser file handles, or desktop project databases.
- Identity assertions are accepted only after a configured provider verifier has validated them. The adapter never trusts a role supplied by the browser.
- Session tokens and CSRF tokens are random opaque values; only SHA-256 digests are stored server-side.
- Sessions have idle and absolute expiry, periodic token rotation, single-session revocation, and principal-wide revocation.
- Mutating route contracts require an exact allowed origin and matching CSRF token. Unknown routes are denied.
- Audit metadata uses a narrow field allowlist and redacts credential-shaped values and local paths.

## Deliberately Not Implemented

- Password storage or a custom credential database.
- Public registration, invitations, password recovery, or multi-tenant organizations.
- Remote synchronization of browser or desktop project data.
- A production HTTP server or deployment secret configuration.
- A durable production session store, rate limiter, or provider-specific OIDC/WebAuthn verifier.

The next reviewed phase may connect these contracts to a maintained identity provider and durable server-side session store. It must retain deny-by-default authorization, `HttpOnly`/`Secure`/`SameSite=Strict` cookies, CSRF protection, rate limits, step-up authentication for high-risk changes, and redacted audit events. The in-memory stores in this package are test and integration fixtures, not production persistence.
