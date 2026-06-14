# Type System Plan

## Current Position

The application currently uses JavaScript with JSDoc typedefs and a narrow TypeScript `checkJs` gate. This remains the active implementation style while shared contracts are stabilized before any `.ts` conversion.

SQLite explicit runtime storage is now part of the storage contract. TypeScript architecture work can start after the SQLite runtime acceptance gate passes together with backup restore, conversion, verification, and packaging checks.

## Principles

- Keep runtime behavior unchanged while adding type coverage.
- Start with project data contracts, IPC payloads, export rows, and statistics models.
- Do not convert the whole renderer in one pass.
- Do not add a typecheck command until a `tsconfig` and initial checked files exist.
- Keep JSON project compatibility as the primary storage contract.

## Recommended Sequence

1. Stabilize JSDoc typedefs for zones, points, images, phenology entries, species reference summaries, statistics rows, and export rows.
2. Add a small shared contract module for storage and IPC payload shapes.
3. Keep `tsconfig.json` with `checkJs` for a narrow include list.
4. Expand `npm run typecheck` only after each included area passes locally.
5. Convert files to TypeScript only when the conversion reduces maintenance risk.

## Current Typecheck Scope

`npm run typecheck` is active and included in `npm run verify`.

The current checked scope is intentionally narrow:

- `preload.js`
- `src/main/projectStore.js`
- `src/main/storageConversionService.js`
- `src/main/backupService.js`
- `src/shared/types/**/*.d.ts`

This scope covers project loading/saving, explicit SQLite runtime behavior, storage conversion, guarded backup restore, and preload IPC shape. It does not check the full renderer yet.

## Expansion Gate

Expand TypeScript architecture work only when all of these pass in one local verification pass:

- `npm run verify`, including `npm run typecheck`
- `npm run test --if-present`
- `npm run db:test-storage-conversion`
- `npm run db:test-runtime`
- `npm run dist`

The next TypeScript change should add one bounded area at a time, preferably `sqliteExchangeModel`, `sqliteSchemaService`, or the maintenance storage UI contract. Do not start with renderer-wide conversion.

## Initial Contract Targets

| Area | Contract |
| --- | --- |
| Project storage | `settings.json`, `zones.json`, `points.json`, image references. |
| SQLite runtime | `information/data.db`, conversion reports, explicit JSON fallback, source cleanup, backup restore. |
| Taxonomy fields | `family`, `genus`, taxonomy source, confidence, verification status, candidate summary. |
| IPC | Project load/save, backup, diagnostics, species reference, external link opening. |
| Statistics | Summary, zone rows, diversity metrics, heatmap matrix model, export descriptors. |
| Export | CSV rows, JSON report, Markdown report, GeoJSON feature properties. |

## Initial Shared Declarations

The repository now includes minimal declaration files under `app/src/shared/types/`.

| Declaration | Contract |
| --- | --- |
| `settings.d.ts` | `ProjectSettings` |
| `zone.d.ts` | `ZoneRecord` |
| `point.d.ts` | `PointRecord`, taxonomy summary contracts |
| `phenology.d.ts` | `PhenologyRecord` |
| `image.d.ts` | `ImageAsset` |
| `backup.d.ts` | `BackupManifest` |
| `ipc.d.ts` | `IpcResponse` |
| `project.d.ts` | `JsonProjectSnapshot` |
| `sqlite-exchange.d.ts` | `SqliteTableModel`, `ConversionReport`, `BackupPreflightPlan` |

`tsconfig.json` and `npm run typecheck` are active. These declarations are the baseline for gradual checking and later file conversion.

## Non-Goals

- No full-application rewrite.
- No database migration as part of type-system work.
- No change to Electron security boundaries.
