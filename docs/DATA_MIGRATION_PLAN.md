# Data Migration Plan

## Current Rule

Current project data can be JSON-based or SQLite-based after explicit user conversion. Missing optional fields are normalized at load time and are written only when the user saves the project through normal workflows.

The maintenance center can create SQLite storage at `information/data.db` and export that storage back to JSON. This is an explicit backup-first utility. It does not run automatically when a project opens. When both JSON and SQLite are present, automatic loading prefers SQLite; explicit JSON loading remains available when JSON files exist.

## Compatibility Requirements

- Existing JSON projects remain valid.
- Missing optional fields are allowed.
- Unknown fields are preserved.
- No automatic rewrite happens only to add metadata.
- A backup is required before any storage format conversion writes project files.
- Conversion backups are stored under `information/statistics/backup` and use direction labels such as `json_turn_sqlite` and `sqlite_turn_json`.
- Generated database files such as `information/data.db` and generated reports such as `information/sqlite-conversion-report.json` are project artifacts, not repository files.
- After a successful JSON to SQLite conversion, source JSON files are removed and kept in the direction-labeled backup.
- After a successful SQLite to JSON export, the source database is removed and kept in the direction-labeled backup.
- Each SQLite write path must run a schema check before the converted storage is accepted.

## Field Evolution

| Area | Rule |
| --- | --- |
| Taxonomy fields | Optional on old records; manual edits and suggestions are stored on save. |
| Phenology entries | Continue to load from `phenologyEntries`, `phenology`, or compatible legacy shapes. |
| Image references | Remain project-relative. |
| Zone references | Continue to accept `zoneRef`, `zoneId`, `zone`, and compatible legacy fields. |
| Settings | Unknown settings fields remain untouched. |

## Current Optional Conversion Workflow

1. Load and validate source JSON data.
2. Create a project backup.
3. Write a temporary SQLite database.
4. Run schema and consistency checks.
5. Move the completed database to `information/data.db`.
6. Write a conversion report.
7. Remove the source JSON files after successful SQLite validation.
8. Reload the project from SQLite.

Exporting back to JSON also creates a backup first, reads `information/data.db`, validates the schema, restores unknown JSON fields from compatibility payloads, writes JSON through the normal project storage service, removes the source database after success, and reloads from JSON.

## Runtime Storage Acceptance

`npm run db:test-runtime` verifies the current explicit runtime behavior with a synthetic temporary project:

1. Convert JSON to SQLite with backup-first behavior.
2. Confirm automatic loading uses SQLite.
3. Save project changes through SQLite.
4. Create a JSON fallback and confirm automatic loading still prefers SQLite.
5. Confirm explicit JSON loading reads the JSON fallback.
6. Export SQLite back to JSON.
7. Confirm the source database is removed and the exported JSON matches the SQLite-edited project.

## Verification Before Enabling A Migration

- `npm run verify` passes.
- `npm run db:check-schema` passes.
- `npm run db:test-conversion` passes.
- `npm run db:test-storage-conversion` passes.
- `npm run db:test-runtime` passes.
- The in-memory JSON/table-model round-trip check passes.
- The conversion report and backup preflight plan checks pass.
- Dedicated conversion tests exist.
- Round-trip JSON output is stable.
- Failure cases leave the source project unchanged.
- Manual backup and restore still work.
