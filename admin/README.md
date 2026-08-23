# Management System Foundation

This directory defines the owner-only authorization, session, audit, and HTTP route contracts for the future management system.

## Current Scope

- The active mode is `owner-only`.
- Hosting access control remains the outer gate.
- Only site publication, release administration, future member administration, and audit-event reading are represented.
- There is no remote project store and no project-data API.
- The contracts do not accept point records, zone records, coordinates, images, local paths, browser file handles, or desktop project databases.

## Deliberately Not Implemented

- Password storage or a custom credential database.
- Public registration, invitations, password recovery, or multi-tenant organizations.
- Remote synchronization of browser or desktop project data.
- A production HTTP server or deployment secret configuration.

The next reviewed phase may connect these contracts to an identity provider and secure server-side session store. That phase must retain deny-by-default authorization, short-lived secure sessions, CSRF protection for state changes, rate limits, and redacted audit events.
