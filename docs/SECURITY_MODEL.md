# Security Model

This document describes the current desktop security boundary for the CQNU Campus Plant Mapping System.

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

## Current Verification

Security contracts are checked by:

- `npm run check:repo`
- `npm run check:syntax`
- `npm run self-check`
- `npm run verify`

The self-check covers key browser window settings, IPC sender validation, trusted project directories, path guards, external URL restrictions, and preload surface expectations.
