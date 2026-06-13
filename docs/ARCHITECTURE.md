# Architecture

## Overview

CQNU Campus Plant Mapping System is a local-first Electron desktop application. The application stores project data in a user-selected local folder and uses online map or reference services only when the user uses those features.

## Runtime Layers

| Layer | Responsibility |
| --- | --- |
| Main process | Window creation, file dialogs, project JSON/SQLite storage, image import, backups, logs, diagnostics, species reference requests, and controlled system actions. |
| Preload | Exposes the `window.plantApp` business API through Electron context isolation. |
| Renderer | Renders the map workspace, editors, query center, statistics, theme controls, maintenance center, and local UI state. |
| Project folder | Holds user project files under `information/`. |

## Current Structure

```text
app/
  main.js
  preload.js
  index.html
  src/main/
  src/renderer/
  scripts/
docs/
.github/
```

`app/index.html` loads Leaflet and local renderer scripts directly. The renderer modules share global state from `src/renderer/state/store.js`.

## Data Flow

1. The user selects a project directory through the system picker.
2. The main process trusts the selected directory for the current run.
3. `projectStore` creates or reads JSON project files, or reads `information/data.db` after explicit SQLite conversion.
4. Renderer normalizers preserve compatibility with older project records.
5. Saves write through the active storage format in the main process. Automatic loading prefers SQLite when both formats exist; explicit JSON loading remains available through maintenance controls.

## IPC Flow

Renderer code calls `window.plantApp`. Preload maps those calls to named IPC channels. `ipcRegister` wraps handlers in a stable result shape and verifies that calls come from the local application page.

## Main Services

- `projectStore.js`: project structure, JSON/SQLite loading, active-format saving, modified time.
- `dialogService.js`: import/export and directory selection dialogs.
- `imageService.js`: image copy into project archive and EXIF read.
- `backupService.js`: zip backup creation and expired backup handling.
- `logger.js`: local application logs and cleanup.
- `maintenanceService.js`: project image reference checks.
- `storageConversionService.js`: backup-first JSON to SQLite conversion, SQLite to JSON export, artifact cleanup, and runtime acceptance support.
- `speciesReferenceService.js`: GBIF and iNaturalist lookup.
- `pathGuard.js`: directory trust and path safety.
- `securityPolicy.js`: renderer source validation and external URL control.

## Renderer Areas

- `map/`: Leaflet setup, zones, points, coordinate transforms.
- `features/project`: load, save, CSV and GeoJSON import/export.
- `features/phenology`: point and phenology editing.
- `features/images`: image archive UI and preview.
- `features/query`: search and completeness filters.
- `features/stats`: summaries and SVG charts.
- `features/backup`: manual backup UI.
- `features/merge`: local project merge flow.
- `features/maintenance`: health check, repair, logs, safe mode, diagnostics.
- `features/theme`: theme, glass, motion, status color settings.
- `features/speciesReference`: temporary species suggestions and apply flow.

## Security Boundary

The renderer has no Node integration. Preload exposes only business commands. Main-process services validate paths before reading, writing, copying, deleting, or opening external targets.

## Future Direction

The next architecture work should stay incremental: keep source-link and token validation documented, keep SQLite runtime acceptance passing, and introduce shared type contracts only where they reduce maintenance risk. TypeScript architecture should begin with `checkJs` around storage and IPC contracts before any renderer-wide conversion.
