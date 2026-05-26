# SQLite Schema Plan

## Status

SQLite is a planned optional local data layer. The active runtime format remains the project-folder JSON layout documented in `DATA_SCHEMA.md`.

No automatic SQLite migration runs during project open, save, backup, restore, or export. JSON remains the active runtime format.

`npm run db:check-schema` is available as a development readiness check. It creates a temporary SQLite database in the system temp directory, validates the planned table layout, closes the database, and deletes the temporary files. It does not read or write project data.

## Storage Location

When implemented, the default database file should live inside the trusted project folder, for example:

```text
project-folder/
  information/
    data.db
```

The repository must not commit `.db`, `.sqlite`, or `.sqlite3` files.

## Draft Tables

The following table layout is a target design only. It is not an active migration.

| Table | Purpose |
| --- | --- |
| `project_settings` | Key-value settings currently stored in `settings.json`. |
| `zones` | Zone records, display metadata, and GeoJSON geometry. |
| `points` | Point records, coordinates, names, taxonomy fields, status fields, and summary mirrors. |
| `phenology_entries` | Multi-entry phenology observations linked to points. |
| `images` | Project-relative image references and metadata. |
| `point_images` | Many-to-many point to image links when needed. |
| `taxonomy_candidates` | Simplified taxonomy candidate summaries, capped per point. |
| `export_runs` | Optional conversion and export report metadata. |

## Current In-Memory Model

`app/src/main/sqliteExchangeModel.js` provides a table-shaped in-memory model for readiness checks. It does not connect to SQLite and does not write a database file.

The model currently covers:

- `project_settings`;
- `zones`;
- `points`;
- `phenology_entries`;
- `images`;
- `taxonomy_candidates`.

Rows include compatibility payloads so unknown JSON fields can be restored during round-trip checks.

The same module can also produce a conversion report and backup preflight plan. These outputs are data-only readiness artifacts and do not write files.

## Current Schema Service

`app/src/main/sqliteSchemaService.js` defines the current schema creation statements and the temporary schema checker used by `npm run db:check-schema`.

The schema service currently validates:

- `project_settings`;
- `zones`;
- `points`;
- `phenology_entries`;
- `images`;
- `point_images`;
- `taxonomy_candidates`;
- `export_runs`.

The checker verifies required tables and representative columns, including taxonomy fields and compatibility payload columns. It uses `better-sqlite3` only in the main-process readiness path and does not expose a renderer database API.

## Current Temporary Conversion Test

`app/src/main/sqliteConversionService.js` provides a temporary JSON/SQLite round-trip readiness service. It writes the in-memory table model into a temporary SQLite database, reads it back into the same table model shape, and restores JSON for equality checks.

`npm run db:test-conversion` runs this service against synthetic fixtures only. The command:

- creates the database under the system temporary directory;
- writes no project database;
- changes no project JSON files;
- validates schema tables before reading back;
- verifies JSON equality after SQLite round-trip;
- deletes the temporary database before exit.

This is not a user-facing conversion feature and does not register a renderer API.

## Current Project Storage Conversion

The maintenance center now provides an opt-in project storage conversion service for controlled local checks:

- Create SQLite copy from JSON: writes `information/data.db` inside the trusted project folder.
- Export SQLite copy back to JSON: reads `information/data.db` and writes the project JSON files after validation.
- Both write operations create a project backup first.
- Conversion backups are written under `information/statistics/backup` with `json_turn_sqlite` or `sqlite_turn_json` in the file name.
- After successful JSON to SQLite conversion, the source JSON files are removed and the project reloads from SQLite.
- After successful SQLite to JSON export, the source SQLite database is removed and the project reloads from JSON.
- If both formats are present, automatic project loading prefers SQLite; users can still explicitly load JSON when JSON files exist.
- The service writes `information/sqlite-conversion-report.json` with record counts, schema validation status, the conversion report and backup preflight plan outcome, and safety flags.
- Renderer code calls only business commands through preload. It does not receive SQL strings, database handles, or absolute database paths.
- The repository must not commit generated database files or conversion reports from user projects.

## Compatibility Rules

- JSON projects must remain readable.
- Unknown JSON fields must not be dropped during conversion.
- Geometry coordinates must preserve WGS84 `[lng, lat]` GeoJSON order.
- Images remain files referenced by project-relative paths, not BLOB values by default.
- Taxonomy suggestions remain advisory and keep manual verification status.

## Migration Readiness

Before SQLite becomes the active runtime storage mode, the project still needs:

- A user-controlled storage-mode switch.
- Recovery behavior for failed conversion.
- Packaged application conversion smoke tests.
- User-visible documentation for choosing JSON or SQLite as the active storage mode.
