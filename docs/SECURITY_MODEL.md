# Security Model

This document describes the desktop and browser security boundaries for the CQNU Campus Plant Mapping System.

## Web Access Boundary

The browser site separates management data from plant project data.

| Layer | Responsibility |
| --- | --- |
| Management Worker | Account activation, authentication, member permissions, session lease, password reset, and allowlisted audit events. |
| Management database | Account, keyed credential digest, single-use token digest, session digest, and security audit metadata only. |
| Browser platform adapter | Enforces `read`, `edit`, and `save` capabilities before local project operations. |
| Browser local storage | OPFS SQLite, optional authorized-directory mirror, images, backups, and diagnostics for the plant project. |

The management service never accepts project records, images, coordinates, local paths, directory handles, or full third-party API responses. Project data remains in the browser or a directory explicitly authorized by the user.

Passwords use PBKDF2-HMAC-SHA-256 with a deployment-provided pepper. Purpose-separated HMAC keys sign or digest session, CSRF, activation, and password-reset material. Production cookies are host-only, `HttpOnly`, `Secure`, and `SameSite=Strict`; state-changing account requests also require a same-origin CSRF token.

Sessions require a renewable online lease and have a 24-hour absolute lifetime. Account activation, password change, username change, permission change, reset, disable, and explicit logout revoke the affected sessions. Reset and activation links are single-use and expire.

## Desktop Boundary

The application runs as a local-first Electron desktop application.

| Layer | Responsibility |
| --- | --- |
| Main process | File system access, dialogs, project storage, image import, backup, logs, species reference requests, and controlled system actions. |
| Preload | Exposes a narrow business command surface through `window.plantApp`. |
| Renderer | Renders the user interface and calls business commands. It must not access Node.js file, process, or child process capabilities directly. |
| Project folder | User-selected local folder containing `information/settings.json`, `information/zones.json`, `information/points.json`, and `information/images/`. |

## Browser Window Controls

The main window must keep these settings enabled:

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- `webSecurity: true`
- `allowRunningInsecureContent: false`
- `webviewTag: false`

New windows are denied by default. Page navigation is limited to the local application page and its hash routes.

## Content Security Policy

The application uses a lightweight Content Security Policy in `app/index.html`.

Allowed remote loading is intentionally narrow:

- `https://unpkg.com` for Leaflet runtime files;
- `https:` images for map tiles and reference images;
- local `file:` images for user-selected preview images;
- `https:` connections for external reference services where needed.

Object and frame embedding are disabled.

## IPC Boundary

IPC calls are accepted only from the local application page. The main process checks the sender URL before running a handler.

IPC handlers return a stable shape:

```json
{
  "ok": true,
  "data": {}
}
```

or:

```json
{
  "ok": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Readable message"
  }
}
```

Renderer code unwraps this shape and displays user-facing errors through the shared dialog flow.

## File And Directory Trust

Project directories must be selected through the system directory picker during the current application run before project load, save, image maintenance, or backup operations can use them.

Backup directories are also trusted only after the system directory picker returns them. Default backup directories are derived from a trusted project directory.

Path checks are centralized in `app/src/main/pathGuard.js`:

- project directories cannot be disk roots;
- project files are limited to the known JSON files;
- project-relative paths cannot escape with absolute paths, drive-relative paths, `..`, or colon segments;
- image operations are limited to `information/images/` and approved image extensions;
- backup cleanup is limited to trusted backup folders and `.zip` files;
- imports and exports are limited by extension and size where applicable.

## External Links

The renderer does not open new windows directly. External source links are sent to the main process through `window:openExternal`.

Only `http:` and `https:` URLs are allowed. Other schemes are rejected.

## Network Services

The application may contact external services when the user uses related features:

- online basemap tile providers;
- GBIF and iNaturalist species reference endpoints;
- iNaturalist image comparison after the user actively chooses an image.

The iNaturalist token field is request-scoped. It is not saved to project state, local storage, or session storage.

## Storage Conversion Boundary

SQLite storage conversion is handled in the main process. Renderer code can request only preflight, create-copy, and export-back operations through preload. It does not receive SQL strings, database handles, absolute database paths, or direct file-system access.

Storage conversion writes are limited to trusted project directories and create a backup under `information/statistics/backup` before project files are changed. Successful conversion removes the previous source format only after validation and backup.

Backup restore is also main-process mediated. Renderer code can request only restore inspection for a selected backup zip and a confirmed restore operation. Restore rejects unsafe zip entries, ignores nested backup-folder entries, creates a `pre_restore` safety backup before overlaying project files, and keeps generic archive extraction or arbitrary file writing out of the preload surface.

Log review is also main-process mediated. Renderer code can list log metadata, request one named log file, or delete selected log files by name. It cannot pass arbitrary log paths.

## Current Verification

Security contracts are checked by:

- `npm run check:repo`
- `npm run check:syntax`
- `npm run self-check`
- `npm run verify`

The self-check covers key browser window settings, IPC sender validation, trusted project directories, path guards, external URL restrictions, and preload surface expectations.
