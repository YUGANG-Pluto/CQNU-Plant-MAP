# Browser App Host

## Purpose

The research site can host small browser-local tools without granting them Electron capabilities or access to the management service. Each tool has a stable manifest, a dedicated route, route-scoped assets, and an explicit local-data policy.

The host is intended for focused research utilities. It is not a plugin loader and does not execute remote code.

## Manifest Contract

Application manifests are defined in `site/src/apps/registry.mjs` and include:

- stable application ID and manifest version;
- route, entry script, and presentation key;
- accepted local file types;
- required browser capabilities;
- availability status;
- persistence, network, upload, and local-file-read policy.

Published tools must use static, repository-owned scripts. A manifest cannot add Electron IPC, Node.js modules, management credentials, or arbitrary filesystem access.

## Local Data Boundary

- File and directory access starts only after a user action.
- Selected files are parsed in browser memory unless the tool explicitly declares another browser-local persistence mode.
- No project file, coordinate, image, local path, or database content is uploaded by the app host.
- Tools must not use `fetch`, `XMLHttpRequest`, `WebSocket`, or remote script injection unless a future manifest contract explicitly permits and reviews that capability.
- Output is returned through browser downloads or another declared local capability.

## Project Inspector

`/apps/project-inspector` is the first hosted tool. It accepts a selected project folder or files, then performs a non-mutating preflight:

- recognizes project settings, zones, points, images, and SQLite files;
- validates the SQLite 3 file signature without opening or modifying the database;
- counts selected files and recognized records;
- reports coexistence of JSON and SQLite storage;
- exports a local JSON preflight report.

The inspector does not replace the full `/workspace` application. It provides a quick compatibility check before a project is opened in the workspace.

## Adding A Tool

1. Add a versioned manifest to `site/src/apps/registry.mjs`.
2. Add one route-scoped script under `site/src/apps/`.
3. Add only the styles needed by the tool.
4. Register the route and assets in the site renderer and build script.
5. Add route, security-policy, responsive-layout, and functional smoke assertions.
6. Keep application state local and preserve the site, management, and Electron capability boundaries.

The site check and visual regression suite must pass before a new tool becomes available.
