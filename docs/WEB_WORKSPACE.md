# Browser Workspace

The browser workspace is available at `/workspace` and uses the same renderer, domain models, statistics, and user workflows as the desktop application. Platform-specific operations are implemented with browser APIs rather than Electron IPC.

## Local Storage Model

- The primary browser copy is a SQLite Wasm database stored in Origin Private File System (OPFS).
- A user-selected desktop SQLite project (`.db`, `.sqlite`, or `.sqlite3`) can be imported locally. The browser validates and reads the selected file in a Worker, then creates an editable OPFS working copy without changing the source database.
- If the user grants a project directory, compatible `settings.json`, `zones.json`, and `points.json` files are mirrored under `information/`.
- Images are archived under `information/images/` when directory permission is available. Otherwise, they are held in origin-scoped Cache Storage.
- Backups and diagnostic logs are stored in the browser database and remain under explicit user control.
- Export commands download visible CSV, JSON, Markdown, SVG, diagnostics, or backup content through the browser.

The local workflow does not transmit project content. On `site/main`, a separate cloud project library can explicitly upload the current `settings`, `zones`, and `points` snapshot, including coordinates and relative image references present in point records. Before upload, service credentials, credential-bearing URL parameters, and device-absolute paths are removed. Source SQLite/JSON files, image bytes, backups, logs, and local directory handles remain local. Clearing browser data removes OPFS, IndexedDB handles, Cache Storage images, and internal backups, but does not delete cloud versions the user already saved.

## Access Management

The site uses a separate account and session service to decide who may enter the workspace. Its cloud project service stores only explicit, owner-scoped record snapshots.

- `read` allows local and owner-scoped cloud project opening, browsing, queries, statistics, diagnostics, and exports.
- `edit` adds in-memory editing, but changes remain a session draft and are not written to the local project.
- `save` adds local persistence, explicit cloud project creation/upload/rename/version restore/delete, image changes, backup management, and storage conversion.
- Administrators can manage members, access levels, activation links, password-reset links, security audit events, and account-level cloud storage usage. The storage view exposes counts and byte totals, not project content. Administrative status always includes `save` access and is limited to three enabled accounts.
- Bootstrap and newly created accounts require activation before normal access. Deployment-provided temporary credentials are never stored in source files.
- An active browser renews a short online lease through a heartbeat. Losing that lease ends the session, and every continuously active session has an absolute 24-hour lifetime.

Authentication cookies are host-only, `HttpOnly`, `Secure`, and `SameSite=Strict`. Authenticated mutations require a same-origin CSRF token. Username, password, permission, reset, and disable operations revoke affected sessions.

## Browser Permissions

The workspace reports detected capabilities instead of assuming support from the browser name. The current hidden acceptance target is Chromium. Chromium, Firefox, and Safari use the same checks for WebAssembly, Worker, OPFS, Web Locks, IndexedDB, Cache Storage, secure identifiers, file selection, downloads, and optional directory selection.

When all required capabilities are present, the workspace edits the OPFS SQLite copy. A JSON-backed directory enables an additional JSON mirror. A directory whose preferred source is `information/data.db`, or an explicitly selected SQLite file, remains read-only at its original location; subsequent saves are written to the OPFS working copy. Missing critical local database capabilities blocks writes with a readable explanation and never falls back to remote storage.

A directory handle is remembered by the browser, but permission can be revoked by the browser or operating system. When directory access is unavailable, users can import project files and continue in the OPFS copy.

Only one tab can hold the browser database writer lock. If another workspace tab already owns the lock, close it before opening the project in a second tab.

## Cloud Project Library

- Cloud operations exist only on `site/main`; Electron and `desktop/main` expose no cloud project IPC or UI.
- The client sanitizes the visible snapshot before upload, and the Worker independently rejects credentials or device-absolute paths that bypass the client.
- Project listing, usage, reads, and version-history reads require `workspace.read`. Creating, uploading, renaming, restoring, or deleting a cloud project requires `workspace.save` plus exact-origin CSRF validation.
- Projects are isolated by authenticated account. A project owned by another account is returned as not found rather than exposing its existence.
- Each upload creates a monotonically increasing revision. A stale expected revision is rejected so a browser cannot silently overwrite a newer version.
- Restoring a historical revision verifies its stored digest and writes that snapshot as the next revision. Existing history remains immutable.
- Permanent deletion requires two UI confirmations and removes the owner-scoped project, revisions, and chunks transactionally. It does not erase an OPFS working copy already open in the browser.
- “Create database” creates one logical cloud project in the configured D1 binding. It does not provision a separate physical D1 database.
- A snapshot is capped at 8 MiB, split into bounded D1 rows, and protected by SHA-256. Integrity is verified before records are imported into an OPFS working copy.
- Cloud opening and upload are user commands, not background synchronization. Images remain local and missing image bytes do not block record access.

## Portable Backup ZIP

- Manual browser backups can be downloaded as ZIP files containing the manifest, `settings.json`, `zones.json`, `points.json`, and readable raster image bytes.
- External ZIP files are inspected before decompression and restore. The inspection rejects path traversal, absolute paths, encrypted or split archives, Zip64, unsupported compression, duplicate paths, excessive entry counts, and configured size or expansion limits.
- After decompression, the workspace validates UTF-8 JSON shapes, the exact backup format and version, image allowlists and raster signatures, manifest consistency, and CRC integrity.
- A successful inspection creates a short-lived in-memory restore token. The ZIP is not uploaded or persisted by the site.
- Restore requires two confirmations and creates a `pre_restore` internal safety backup before replacing the active browser project. Unknown project record fields are preserved.

## Desktop Interchange

The browser can import a desktop `information/data.db` through an explicit file or directory selection. It checks the SQLite signature, accepted extension, file-size limit, integrity, schema metadata, and expected project tables before deserializing the project. Unknown compatibility fields, phenology records, and taxonomy candidate summaries are preserved by the interchange model.

The selected desktop database is an immutable import source. Browser edits, images, backups, and logs continue in origin-local storage and do not write back to that file or its directory. Select the source again to re-import later changes. When compatible JSON files coexist with `information/data.db`, automatic directory opening prefers SQLite; users can still select JSON explicitly when they need that copy.

## Network Boundary

- Map requests follow the map provider selected and configured by the user.
- GBIF and iNaturalist name queries run only after an explicit user action and send the entered scientific or common name.
- iNaturalist image comparison runs only after the user selects an image; an access token is used for that request only and is not persisted.
- The workspace service worker caches same-origin application resources only. It does not cache third-party API requests or project data.
