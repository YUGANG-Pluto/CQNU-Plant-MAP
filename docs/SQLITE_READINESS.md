# SQLite Readiness Checklist

## Current Decision

SQLite remains a planned optional local data layer. The application continues to use the JSON project-folder model for active runtime behavior.

This checklist is used to decide when SQLite conversion work can start without weakening JSON compatibility, backups, exports, or Electron security boundaries.

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
| Backup-before-conversion behavior | Planned | Backup behavior exists for JSON projects, but conversion-specific backup flow is not implemented. |
| JSON to SQLite converter | Not implemented | No runtime conversion command, database writer, or UI exists. |
| SQLite to JSON exporter | Not implemented | No runtime conversion command, database reader, or UI exists. |
| SQLite schema checker | Ready | `db:check-schema` creates a temporary schema database, validates planned tables and representative columns, then deletes the temporary files. |
| Runtime conversion tests | Not implemented | Runtime database conversion tests should be added with the converter. |
| Typecheck command | Not implemented | Type declarations exist, but no `tsconfig.json` or `typecheck` script is active. |

## Gate Before Runtime SQLite Work

SQLite runtime implementation should not start until the following are part of the same scoped change:

1. JSON to SQLite conversion.
2. SQLite to JSON export.
3. Backup-before-conversion.
4. Conversion report generation.
5. Round-trip self-check or tests.
6. User-facing failure and rollback messages.
7. Runtime database path rules.
8. Failure rollback tests.

## Non-Goals For The Current State

- No SQLite database files are committed.
- `better-sqlite3` is installed only for dependency probing and is not wired into user-facing conversion workflows.
- No project data is migrated automatically.
- No current JSON workflow depends on SQLite.
- The current table-model round-trip is a verification aid, not a database writer.
- The current conversion report and backup preflight plan are data-only readiness aids.
- The current schema checker is a temporary database readiness aid, not a project database writer.
