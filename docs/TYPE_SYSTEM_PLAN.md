# Type System Plan

## Current Position

The Electron application boundary, modern renderer shell, management service, and management browser controllers use TypeScript. Existing storage services and compatibility renderer features remain JavaScript with a focused `checkJs` gate.

- `electron/main/`: application lifecycle, window policy, and IPC registration.
- `electron/preload/`: typed `window.plantApp` bridge.
- `electron/shared/`: stable IPC channel contract.
- `src/renderer-modern/`: Preact components, theme model, and presentation runtime.
- `src/shared/types/`: project and storage declarations used by checked JavaScript.
- `../admin/src/`: strict management server, security contracts, and browser UI controllers.

## Principles

- Keep runtime behavior unchanged while adding type coverage.
- Start with project data contracts, IPC payloads, export rows, and statistics models.
- Do not convert the whole renderer in one pass.
- Keep the active typecheck command narrow and expand it only after each included area passes locally.
- Keep JSON project compatibility as the primary storage contract.

## Implemented Sequence

1. Stabilized shared project and storage declarations.
2. Added a typed IPC channel contract.
3. Migrated the main lifecycle, window policy, IPC registration, and preload bridge.
4. Added strict typechecking for Preact renderer components.
5. Kept storage services under `checkJs` while preserving JSON and SQLite compatibility.
6. Migrated the management browser controllers to TypeScript and made the site consume only clean compiler output.
7. Added typed statistics snapshot, matrix-cell, chart-registry, and export-descriptor boundaries while preserving the legacy statistics engine API.
8. Added focused typed domain adapters for project records, phenology drafts, taxonomy candidates, maintenance issues, and species-reference panel state.
9. Added a typed object-selection store for selected zones, points, phenology records, hover state, and list-tab state while preserving the legacy state mirror.

## Current Typecheck Scope

`npm run typecheck` is active and included in `npm run verify`.

The current checked scope has three gates:

- `tsconfig.json`: checked JavaScript storage and backup services.
- `tsconfig.electron.json`: strict Electron main, preload, and IPC TypeScript.
- `tsconfig.renderer.json`: strict Preact renderer and Vite configuration.

The checked JavaScript scope includes:

- `src/main/projectStore.js`
- `src/main/storageConversionService.js`
- `src/main/backupService.js`
- `src/main/sqliteExchangeModel.js`
- `src/main/sqliteConversionService.js`
- `src/main/sqliteSchemaService.js`
- `src/shared/types/**/*.d.ts`

The combined `npm run typecheck` command covers these three gates.

The management package has a separate strict gate: `npm --prefix admin run check`. The site build invokes its clean TypeScript build before collecting server and browser modules.

## Expansion Gate

Convert another compatibility feature only when all of these pass in one local verification pass:

- `npm run verify`, including `npm run typecheck`
- `npm run test --if-present`
- `npm run db:test-storage-conversion`
- `npm run db:test-runtime`
- `npm run dist`

The next conversion should remain bounded to one feature and preserve its current global compatibility API until all callers move to explicit imports. The statistics bridge validates legacy engine output at the renderer boundary, and the object-selection store provides the same strategy for map and inspector selection. Formula modules and persisted project records remain intentionally unchanged.

## Initial Contract Targets

| Area            | Contract                                                                                           |
| --------------- | -------------------------------------------------------------------------------------------------- |
| Project storage | `settings.json`, `zones.json`, `points.json`, image references.                                    |
| SQLite runtime  | `information/data.db`, conversion reports, explicit JSON fallback, source cleanup, backup restore. |
| Taxonomy fields | `family`, `genus`, taxonomy source, confidence, verification status, candidate summary.            |
| IPC             | Project load/save, backup, diagnostics, species reference, external link opening.                  |
| Statistics      | Summary, zone rows, diversity metrics, heatmap matrix model, export descriptors.                   |
| Export          | CSV rows, JSON report, Markdown report, GeoJSON feature properties.                                |

## Initial Shared Declarations

The repository now includes minimal declaration files under `app/src/shared/types/`.

| Declaration            | Contract                                                      |
| ---------------------- | ------------------------------------------------------------- |
| `settings.d.ts`        | `ProjectSettings`                                             |
| `zone.d.ts`            | `ZoneRecord`                                                  |
| `point.d.ts`           | `PointRecord`, taxonomy summary contracts                     |
| `phenology.d.ts`       | `PhenologyRecord`                                             |
| `image.d.ts`           | `ImageAsset`                                                  |
| `backup.d.ts`          | `BackupManifest`                                              |
| `ipc.d.ts`             | `IpcResponse`                                                 |
| `project.d.ts`         | `JsonProjectSnapshot`                                         |
| `sqlite-exchange.d.ts` | `SqliteTableModel`, `ConversionReport`, `BackupPreflightPlan` |

These declarations remain the compatibility baseline for storage and project records.

## Non-Goals

- No single-pass conversion of all compatibility renderer features.
- No database migration as part of type-system work.
- No change to Electron security boundaries.
