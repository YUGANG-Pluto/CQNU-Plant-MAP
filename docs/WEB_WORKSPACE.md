# Browser Workspace

The browser workspace is available at `/workspace` and uses the same renderer, domain models, statistics, and user workflows as the desktop application. Platform-specific operations are implemented with browser APIs rather than Electron IPC.

## Local Storage Model

- The primary browser copy is a SQLite Wasm database stored in Origin Private File System (OPFS).
- If the user grants a project directory, compatible `settings.json`, `zones.json`, and `points.json` files are mirrored under `information/`.
- Images are archived under `information/images/` when directory permission is available. Otherwise, they are held in origin-scoped Cache Storage.
- Backups and diagnostic logs are stored in the browser database and remain under explicit user control.
- Export commands download visible CSV, JSON, Markdown, SVG, diagnostics, or backup content through the browser.

The site server does not receive project records, coordinates, images, local directory handles, or local paths. Clearing the site's browser data removes OPFS, IndexedDB handle references, Cache Storage images, and internal browser backups that have not been exported or mirrored elsewhere.

## Browser Permissions

Chromium-based browsers can grant read/write access to a selected project directory. A directory handle is remembered by the browser, but permission can be revoked by the browser or operating system. When directory access is unavailable, users can import project files and continue in the OPFS copy.

Only one tab can hold the browser database writer lock. If another workspace tab already owns the lock, close it before opening the project in a second tab.

## Desktop Interchange

The browser OPFS database and desktop `information/data.db` are separate runtime formats. The browser does not obtain an arbitrary filesystem path and does not directly open the desktop database file. Use the compatible JSON project files for transfer between runtimes. Unknown JSON fields are preserved by the browser project model.

## Network Boundary

- Map requests follow the map provider selected and configured by the user.
- GBIF and iNaturalist name queries run only after an explicit user action and send the entered scientific or common name.
- iNaturalist image comparison runs only after the user selects an image; an access token is used for that request only and is not persisted.
- The workspace service worker caches same-origin application resources only. It does not cache third-party API requests or project data.
