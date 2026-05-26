# SQLite Readiness Checklist

## Current Decision

SQLite remains a planned optional local data layer. The application continues to use the JSON project-folder model for active runtime behavior.

This checklist is used to decide when SQLite storage work can continue without weakening JSON compatibility, backups, exports, or Electron security boundaries.

## Prerequisite Status

| Area | Status | Evidence |
| --- | --- | --- |
| JSON project format documented | Ready | `DATA_SCHEMA.md` documents `settings.json`, `zones.json`, `points.json`, images, export fields, and taxonomy fields. |
| JSON compatibility policy documented | Ready | `DATA_MIGRATION_PLAN.md` keeps old projects valid and unknown fields preserved. |
| SQLite target schema documented | Ready | `SQLITE_SCHEMA.md` defines planned tables and compatibility rules. |
| JSON/SQLite exchange plan documented | Ready | `JSON_SQLITE_EXCHANGE.md` defines conversion directions and reports. |
| User-facing SQLite status documented | Ready | `SQLITE_GUIDE.md` states SQLite is planned and not required for current workflows. |
| SQLite dependency decision documented | Ready | `SQLITE_DEPENDENCY_DECISION.md` defines active dependency probe, fallback, install probe, and IPC boundary. |
| File size governance active | Ready | `npm run check:size` is included in `npm run verify`. |
| Repository hygiene active | Ready | `npm run check:repo` requires the planning documents and verification scripts. |
| Runtime self-check active | Ready | `npm run self-check` covers core storage, backup, export, security, statistics, and species reference contracts. |
| Independent test structure | Ready | `tests/unit`, `tests/integration`, and synthetic fixtures exist. |
| JSON to SQLite table model | Ready | `sqliteExchangeModel.js` creates an in-memory table model and has independent unit round-trip coverage. |
| Conversion report model | Ready | The in-memory model produces counts, unknown-field preservation metrics, privacy flags, safety flags, and warnings. |
| Backup preflight plan | Ready | The pure plan lists relative backup inputs and validation gates without executing backup work. |
| SQLite dependency probe scripts | Ready | `sqlite:probe` and `sqlite:probe:electron` run Electron main-process temporary database load checks. |
| SQLite dependency probe result | Ready | `better-sqlite3` installs, rebuilds for Electron, loads in Electron main process, runs a parameterized query, cleans temporary files, and packages through `npm run dist`. |
| Path and storage service tests | Ready | `pathGuard`, `projectStore`, and `backupService` have focused Node test runner coverage using temporary directories. |
| Minimal shared type declarations | Ready | `app/src/shared/types` defines project, point, zone, phenology, image, backup, IPC, and SQLite exchange contracts. |
| Backup-before-conversion behavior | Ready | Project storage conversion creates a backup under `information/statistics/backup` before writing `information/data.db` or exporting back to JSON. |
| Project storage conversion service | Ready | `storageConversionService.js` validates a trusted project folder, writes local SQLite storage, exports SQLite back to JSON, removes the previous source format after success, and writes a conversion report. |
| JSON to SQLite converter | Ready | The guarded service writes the current table model into `information/data.db`, reloads SQLite, and removes the source JSON files after backup. |
| SQLite to JSON exporter | Ready | The guarded service reads `information/data.db`, validates the schema, writes JSON through `projectStore` after backup, and removes the source database after success. |
| SQLite schema checker | Ready | `db:check-schema` creates a temporary schema database, validates planned tables and representative columns, then deletes the temporary files. |
| Temporary JSON/SQLite conversion test | Ready | `db:test-conversion` writes synthetic JSON fixtures through a temporary SQLite database and verifies JSON equality after read-back. |
| Runtime conversion tests | Ready | `db:test-storage-conversion` uses a synthetic temporary project to verify backup-first project conversion and export equality. |
| Active SQLite runtime switch | Not implemented | JSON remains the active runtime format after creating a SQLite copy. |
| Typecheck command | Not implemented | Type declarations exist, but no `tsconfig.json` or `typecheck` script is active. |

## Gate Before Runtime SQLite Work

SQLite active-runtime storage should not start until the following are part of the same scoped change:

1. User-controlled storage-mode selection.
2. Recovery behavior for failed active-mode switching.
3. Packaged application project conversion smoke tests.
4. User-facing rollback messages.
5. Runtime database path rules for active mode.
6. Failure rollback tests.

## Non-Goals For The Current State

- No SQLite database files are committed.
- `better-sqlite3` is used only in main-process readiness checks and the guarded project conversion service.
- No project data is migrated automatically.
- No current JSON workflow depends on SQLite.
- The current table-model round-trip is a verification aid, not a database writer.
- The current conversion report and backup preflight plan are data-only readiness aids.
- The current schema checker is a temporary database readiness aid, not a project database writer.
- The current temporary conversion test writes only synthetic fixtures to a temporary database and is not a project migration feature.
- The current project storage conversion utility writes local SQLite storage only after explicit user action.
- If both JSON and SQLite are present, automatic loading prefers SQLite while explicit JSON loading remains available when JSON files exist.
