# Browser Workspace

The browser workspace is available at `/workspace` and uses the same renderer, domain models, statistics, and user workflows as the desktop application. Platform-specific operations are implemented with browser APIs rather than Electron IPC.

## Local Storage Model

- The primary browser copy is a SQLite Wasm database stored in Origin Private File System (OPFS).
- If the user grants a project directory, compatible `settings.json`, `zones.json`, and `points.json` files are mirrored under `information/`.
- Images are archived under `information/images/` when directory permission is available. Otherwise, they are held in origin-scoped Cache Storage.
- Backups and diagnostic logs are stored in the browser database and remain under explicit user control.
- Export commands download visible CSV, JSON, Markdown, SVG, diagnostics, or backup content through the browser.

The site server does not receive project records, coordinates, images, local directory handles, or local paths. Clearing the site's browser data removes OPFS, IndexedDB handle references, Cache Storage images, and internal browser backups that have not been exported or mirrored elsewhere.

## Access Management

The site uses a separate account and session service to decide who may enter the workspace. The service does not store or proxy plant project records.

- `read` allows project opening, browsing, queries, statistics, diagnostics, and exports.
- `edit` adds in-memory editing, but changes remain a session draft and are not written to the local project.
- `save` adds local project persistence, image changes, backups, restore, and storage conversion.
- Administrators can manage members, access levels, activation links, password-reset links, and security audit events. Administrative status always includes `save` access and is limited to three enabled accounts.
- Bootstrap and newly created accounts require activation before normal access. Deployment-provided temporary credentials are never stored in source files.
- An active browser renews a short online lease through a heartbeat. Losing that lease ends the session, and every continuously active session has an absolute 24-hour lifetime.

Authentication cookies are host-only, `HttpOnly`, `Secure`, and `SameSite=Strict`. Authenticated mutations require a same-origin CSRF token. Username, password, permission, reset, and disable operations revoke affected sessions.

## Browser Permissions

The workspace reports detected capabilities instead of assuming support from the browser name. The current hidden acceptance target is Chromium. Chromium, Firefox, and Safari use the same checks for WebAssembly, Worker, OPFS, Web Locks, IndexedDB, Cache Storage, secure identifiers, file selection, downloads, and optional directory selection.

When all required capabilities are present, the workspace edits the OPFS SQLite copy. Directory selection enables the additional JSON mirror; without it, the workspace falls back to explicit file selection and downloads. Missing critical local database capabilities blocks writes with a readable explanation and never falls back to remote storage.

A directory handle is remembered by the browser, but permission can be revoked by the browser or operating system. When directory access is unavailable, users can import project files and continue in the OPFS copy.

Only one tab can hold the browser database writer lock. If another workspace tab already owns the lock, close it before opening the project in a second tab.

## Portable Backup ZIP

- Manual browser backups can be downloaded as ZIP files containing the manifest, `settings.json`, `zones.json`, `points.json`, and readable raster image bytes.
- External ZIP files are inspected before decompression and restore. The inspection rejects path traversal, absolute paths, encrypted or split archives, Zip64, unsupported compression, duplicate paths, excessive entry counts, and configured size or expansion limits.
- After decompression, the workspace validates UTF-8 JSON shapes, the exact backup format and version, image allowlists and raster signatures, manifest consistency, and CRC integrity.
- A successful inspection creates a short-lived in-memory restore token. The ZIP is not uploaded or persisted by the site.
- Restore requires two confirmations and creates a `pre_restore` internal safety backup before replacing the active browser project. Unknown project record fields are preserved.

## Desktop Interchange

The browser OPFS database and desktop `information/data.db` are separate runtime formats. The browser does not obtain an arbitrary filesystem path and does not directly open the desktop database file. Use the compatible JSON project files for transfer between runtimes. Unknown JSON fields are preserved by the browser project model.

## Network Boundary

- Map requests follow the map provider selected and configured by the user.
- GBIF and iNaturalist name queries run only after an explicit user action and send the entered scientific or common name.
- iNaturalist image comparison runs only after the user selects an image; an access token is used for that request only and is not persisted.
- The workspace service worker caches same-origin application resources only. It does not cache third-party API requests or project data.
