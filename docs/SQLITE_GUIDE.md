# SQLite Guide

## Current Behavior

The application currently stores project data in local JSON files under the trusted project folder. SQLite is documented as a future optional local data layer and is not required to open, edit, save, back up, or export current projects.

The maintenance center also provides a guarded local conversion utility. It can create SQLite storage at `information/data.db` from the current JSON project, and it can export that SQLite storage back to JSON after validation. These actions are explicit and backup-first.

Conversion backup files are stored under `information/statistics/backup`. JSON to SQLite backups include `json_turn_sqlite` in the file name; SQLite to JSON backups include `sqlite_turn_json`.

## User-Facing Rules For Future SQLite Mode

- The user chooses when to convert a project.
- A backup is created before conversion.
- Conversion failure must leave the source project usable.
- JSON export remains available after conversion.
- Image files stay in the project folder and are referenced by relative paths.
- The database file stays local to the project folder.

## Safety Rules

- Do not store complete third-party lookup responses.
- Do not store service tokens.
- Do not store absolute local image paths.
- Do not replace existing JSON projects without an explicit user action.
- Do not require SQLite for ordinary JSON project workflows.

## Support Status

| Capability | Current status |
| --- | --- |
| Open JSON project | Supported |
| Save JSON project | Supported |
| Back up JSON project | Supported |
| Export JSON project data | Supported |
| Convert JSON to SQLite | Planned |
| Convert SQLite to JSON | Planned |
| Create SQLite copy from JSON | Ready |
| Export SQLite copy back to JSON | Ready |
| Run SQLite schema checks | Ready |
| Run temporary JSON/SQLite conversion tests | Ready |

## Maintenance Conversion Utility

Use the maintenance center only after saving the current project:

1. Run conversion preflight to confirm the project can be represented by the current SQLite table model.
2. Select Create SQLite copy from JSON to save the current project, create a backup, and write `information/data.db`.
3. After successful JSON to SQLite conversion, the original JSON files are removed from `information/` and the project reloads from SQLite.
4. Select Export SQLite copy back to JSON only when the local SQLite storage should become JSON files again. A backup is created first, and validation failure stops the write.
5. After successful SQLite to JSON export, the source `information/data.db` file is removed.
6. If both JSON and SQLite files are present, automatic loading prefers SQLite. The maintenance center can explicitly load JSON when JSON files exist.
7. Refresh storage and backups lists current storage artifacts and backup zip files. Selected backup files can be deleted directly; selected current storage files can be deleted only after confirmation.
8. If the selected deletion would remove the only available storage format, the maintenance center requires a second confirmation before the main process accepts the request.

The utility does not upload project data, images, local paths, or service tokens. Renderer code does not receive SQL strings, database handles, or absolute database paths.

## Dependency Status

`SQLITE_DEPENDENCY_DECISION.md` records the dependency direction for a future SQLite runtime. `better-sqlite3` is installed for dependency probing, but current JSON workflows do not require a database conversion feature.

`npm run db:check-schema` is a development readiness command. It validates the planned schema in a temporary database only and does not create or modify project databases.

`npm run db:test-conversion` is also a development readiness command. It round-trips synthetic JSON fixtures through a temporary SQLite database and deletes the temporary database before exit.

`npm run db:test-storage-conversion` exercises the guarded project conversion service against a synthetic temporary project. It verifies backup creation, `information/data.db`, the conversion report, and JSON equality after export.
