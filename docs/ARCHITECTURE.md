# Architecture

## Overview

CQNU Campus Plant Mapping System is a local-first application with Electron and browser workspaces. Both runtimes keep project data in user-controlled local storage and use online map or reference services only when the user invokes those features.

## Runtime Layers

| Layer                    | Responsibility                                                                                                                                                   |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Main process             | Window creation, file dialogs, project JSON/SQLite storage, image import, backups, logs, diagnostics, species reference requests, and controlled system actions. |
| Preload                  | Exposes the `window.plantApp` business API through Electron context isolation.                                                                                   |
| Renderer                 | Renders the map workspace, editors, query center, statistics, theme controls, maintenance center, and local UI state.                                            |
| Browser platform adapter | Maps the shared workspace contract to File System Access, OPFS SQLite, Cache Storage, and browser-safe backup services.                                          |
| Site Worker              | Serves navigation, documentation, the browser workspace, private management APIs, and explicit owner-scoped cloud project snapshots.                             |
| Browser app host         | Serves versioned, route-scoped browser-local research utilities with declared file and network capabilities.                                                     |
| Management service       | Provides typed accounts, sessions, CSRF, capabilities, member administration, and redacted audit events.                                                         |
| Project folder           | Holds user project files under `information/`.                                                                                                                   |

## Current Structure

```text
app/
  electron/
    main/
    preload/
    shared/
  main-dist/                 # generated
  renderer-dist/             # generated
  index.html
  src/
    main/
    renderer/
    renderer-modern/
    shared/types/
  scripts/
admin/
  src/                       # management server and typed browser UI
  ui/                        # static management markup, styles, local profile bridge
site/
  src/
    apps/                     # browser-local app manifests and route scripts
  scripts/
docs/
.github/
```

`app/package.json` points Electron to the compiled TypeScript main entry under `main-dist/`. The sandboxed preload is bundled as one CommonJS file so it only requires Electron at runtime. `app/index.html` is a minimal host page: it loads the Preact shell, local Leaflet assets, and one compatibility loader. The compatibility loader owns the dependency order for renderer modules that still share state from `src/renderer/state/store.js`.

## Data Flow

1. The user selects a project directory through the system picker.
2. The main process trusts the selected directory for the current run.
3. `projectStore` creates or reads JSON project files, or reads `information/data.db` after explicit SQLite conversion.
4. Renderer normalizers preserve compatibility with older project records.
5. Saves write through the active storage format in the main process. Automatic loading prefers SQLite when both formats exist; explicit JSON loading remains available through maintenance controls.

## IPC Flow

Renderer code calls `window.plantApp`. `electron/preload/index.ts` maps those calls to the named channels declared in `electron/shared/ipc-contract.ts`. `electron/main/ipc/register.ts` wraps handlers in a stable result shape and verifies that calls come from the local application page.

## Main Services

- `projectStore.js`: project structure, JSON/SQLite loading, active-format saving, modified time.
- `dialogService.js`: import/export and directory selection dialogs.
- `imageService.js`: image copy into project archive and EXIF read.
- `backupService.js`: zip backup creation and expired backup handling.
- `logger.js`: local application logs and cleanup.
- `maintenanceService.js`: project image reference checks.
- `storageConversionService.js`: backup-first JSON to SQLite conversion, SQLite to JSON export, artifact cleanup, and runtime acceptance support.
- `speciesReferenceService.js`: GBIF and iNaturalist orchestration.
- `speciesReference/`: request client, provider normalizers, text utilities, and taxonomy suggestion voting.
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
- `renderer-modern`: Preact shell, modal markup, theme model, and modern chart presentation.
- `renderer-modern/features/selection`: typed object-selection state with a compatibility mirror for existing map and inspector workflows.
- `renderer-modern/features/query`: typed read-only query filters, completeness flags, and immutable result modeling behind the existing query UI.
- `renderer-modern/features/review`: typed issue calculation and workbench session control behind the existing localized review UI.
- `renderer-modern/features/project`: typed browser project workflow, owner-scoped cloud project library, conflict handling, and read-only version comparison.

Large renderer domains are split by responsibility. Statistics separates controls, views, exports, workspace summaries, and pure research calculations. Maintenance separates health and repair, logs and settings, and storage conversion. Basemap handling separates configuration, layer rendering, overlays, and diagnostics. Locale dictionaries use the same domain split in Chinese and English.

The management request dispatcher keeps authentication and authorization in one entry point while delegating public session, account, member, and cloud-project routes to typed modules. Cloud history reads remain owner-scoped and pass the same size and SHA-256 integrity verification as current-version reads.

## Build Flow

1. `npm run build:main` compiles the TypeScript main process.
2. `npm run build:preload` bundles the sandbox preload into one file.
3. `npm run build:renderer` builds the Preact shell and design-system styles.
4. `npm run build` runs all three steps.
5. `npm start` runs the build before Electron starts.
6. `npm --prefix admin run build` cleans and compiles server and browser-management TypeScript.
7. `npm --prefix site run build` runs the admin build, then publishes only compiled management modules and the browser workspace assets.
8. `npm run smoke:web` rebuilds the renderer and site through `presmoke:web` before browser smoke testing, preventing stale shared-workspace assets from being tested.
9. `npm run check:bundle` keeps the initial renderer entry within reviewed raw and gzip budgets while SQLite workers remain separate lazy assets.
10. Site app manifests register route-scoped assets; an app route does not load other hosted-app scripts.

Generated directories are excluded from source synchronization and recreated locally or in packaging.

## Security Boundary

The renderer has no Node integration. Preload exposes only business commands. Main-process services validate paths before reading, writing, copying, deleting, or opening external targets.

Hosted browser tools are static repository code. Their manifest declares local file access, persistence, network, and upload behavior. The first hosted tool performs a read-only project preflight entirely in browser memory and has no network capability. See `docs/SITE_APP_HOST.md`.

## Migration Boundary

The modern Preact shell owns markup and theme presentation. Existing renderer business functions remain behind a compatibility loader until each feature can be converted without changing project data behavior. New work should use TypeScript for Electron boundaries and Preact-owned UI, preserve the named IPC contract, and avoid direct Node access in renderer code.
