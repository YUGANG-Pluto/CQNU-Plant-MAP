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
| File size governance active | Ready | `npm run check:size` is included in `npm run verify`. |
| Repository hygiene active | Ready | `npm run check:repo` requires the planning documents and verification scripts. |
| Runtime self-check active | Ready | `npm run self-check` covers core storage, backup, export, security, statistics, and species reference contracts. |
| JSON to SQLite table model | Ready | `sqliteExchangeModel.js` creates an in-memory table model and round-trips it back to JSON in self-check. |
| Conversion report model | Ready | The in-memory model produces counts, unknown-field preservation metrics, privacy flags, safety flags, and warnings. |
| Backup preflight plan | Ready | The pure plan lists relative backup inputs and validation gates without executing backup work. |
| Backup-before-conversion behavior | Planned | Backup behavior exists for JSON projects, but conversion-specific backup flow is not implemented. |
| JSON to SQLite converter | Not implemented | No runtime conversion command, database writer, or UI exists. |
| SQLite to JSON exporter | Not implemented | No runtime conversion command, database reader, or UI exists. |
| SQLite schema checker | Not implemented | No database schema check command exists. |
| Conversion round-trip tests | Not implemented | Dedicated conversion tests should be added with the converter. |
| Typecheck command | Not implemented | `TYPE_SYSTEM_PLAN.md` defines the staged adoption path. |

## Gate Before Runtime SQLite Work

SQLite runtime implementation should not start until the following are part of the same scoped change:

1. A schema creation module.
2. JSON to SQLite conversion.
3. SQLite to JSON export.
4. Backup-before-conversion.
5. Conversion report generation.
6. Round-trip self-check or tests.
7. User-facing failure and rollback messages.

## Non-Goals For The Current State

- No SQLite database files are committed.
- No SQLite runtime dependency is required.
- No project data is migrated automatically.
- No current JSON workflow depends on SQLite.
- The current table-model round-trip is a verification aid, not a database writer.
- The current conversion report and backup preflight plan are data-only readiness aids.
