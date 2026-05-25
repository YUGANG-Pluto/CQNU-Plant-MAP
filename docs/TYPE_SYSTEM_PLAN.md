# Type System Plan

## Current Position

The application currently uses JavaScript with JSDoc typedefs in selected renderer modules. This remains the active implementation style until shared contracts are stable enough for gradual type checking.

## Principles

- Keep runtime behavior unchanged while adding type coverage.
- Start with project data contracts, IPC payloads, export rows, and statistics models.
- Do not convert the whole renderer in one pass.
- Do not add a typecheck command until a `tsconfig` and initial checked files exist.
- Keep JSON project compatibility as the primary storage contract.

## Recommended Sequence

1. Stabilize JSDoc typedefs for zones, points, images, phenology entries, species reference summaries, statistics rows, and export rows.
2. Add a small shared contract module for storage and IPC payload shapes.
3. Add `tsconfig.json` with `checkJs` for a narrow include list.
4. Introduce `npm run typecheck` only after the first checked include list passes locally.
5. Convert files to TypeScript only when the conversion reduces maintenance risk.

## Initial Contract Targets

| Area | Contract |
| --- | --- |
| Project storage | `settings.json`, `zones.json`, `points.json`, image references. |
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

No `tsconfig.json`, `typecheck` script, or build integration is active yet. These declarations are a stable starting point for later narrow type checking.

## Non-Goals

- No full-application rewrite.
- No database migration as part of type-system work.
- No change to Electron security boundaries.
