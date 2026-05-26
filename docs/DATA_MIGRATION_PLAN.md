# Data Migration Plan

## Current Rule

Current project data is JSON-based. Missing optional fields are normalized at load time and are written only when the user saves the project through normal workflows.

The maintenance center can now create SQLite storage at `information/data.db` and export that storage back to JSON. This is an explicit backup-first utility. It does not run automatically when a project opens.

## Compatibility Requirements

- Existing JSON projects remain valid.
- Missing optional fields are allowed.
- Unknown fields are preserved.
- No automatic rewrite happens only to add metadata.
- A backup is required before any storage format conversion writes project files.
- Conversion backups are stored under `information/statistics/backup` and use direction labels such as `json_turn_sqlite` and `sqlite_turn_json`.
- Generated database files such as `information/data.db` and generated reports such as `information/sqlite-conversion-report.json` are project artifacts, not repository files.

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

## Future Active-Mode Migration Workflow

1. Load and validate source data.
2. Create a backup.
3. Run a schema check against a temporary target.
4. Convert into a temporary target.
5. Run consistency checks.
6. Write a report.
7. Replace the active target only after validation passes.
8. Keep rollback instructions visible in the report.

## Verification Before Enabling A Migration

- `npm run verify` passes.
- `npm run db:check-schema` passes.
- `npm run db:test-conversion` passes.
- `npm run db:test-storage-conversion` passes.
- The in-memory JSON/table-model round-trip check passes.
- The conversion report and backup preflight plan checks pass.
- Dedicated conversion tests exist.
- Round-trip JSON output is stable.
- Failure cases leave the source project unchanged.
- Manual backup and restore still work.
