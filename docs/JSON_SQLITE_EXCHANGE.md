# JSON And SQLite Exchange Plan

## Purpose

JSON and SQLite exchange must preserve existing project data, support local backups, and keep JSON as a compatible interchange format.

## Current Table Model

The current codebase includes an in-memory table-model adapter for readiness checks. It maps JSON project data to table-shaped records and back to JSON without opening or writing a SQLite database.

The table model verifies:

- settings key-value rows;
- zone rows and compatibility payloads;
- point rows with taxonomy fields;
- phenology entry rows;
- image reference rows;
- capped taxonomy candidate rows;
- unknown field preservation.

This adapter is not a runtime converter and does not create `.db`, `.sqlite`, or `.sqlite3` files.

The adapter is covered by independent Node unit tests with synthetic fixtures in `app/tests/fixtures/`.

## Temporary Database Round Trip

`app/src/main/sqliteConversionService.js` is a readiness-only conversion service for temporary databases. It takes the current table model, writes it into a temporary SQLite database, reads it back into table rows, and restores JSON.

`npm run db:test-conversion` runs this check with synthetic fixtures. It verifies:

- schema creation in a temporary database;
- JSON to SQLite table insertion;
- SQLite table read-back;
- restored JSON equality;
- unknown field preservation;
- taxonomy candidate summary preservation;
- cleanup of the temporary database directory.

The command does not read an active project folder, write `information/data.db`, register IPC, or enable runtime migration UI.

## Current Conversion Report Model

The current codebase can generate a neutral conversion report from the in-memory table model. The report includes:

- direction and generated time;
- source and target format names;
- settings, zone, point, phenology, image reference, and taxonomy candidate counts;
- unknown-field preservation counts;
- rows with compatibility payloads;
- privacy flags for local paths, service tokens, and raw provider responses;
- safety flags that confirm no database file is written and no backup is executed.

The report does not include absolute project paths, user home paths, service tokens, or complete provider responses.

## Current Backup Preflight Plan

The backup preflight plan is a data-only checklist for a later runtime conversion. It lists relative project files to include, generated outputs to exclude, validation gates, and rollback-oriented steps.

The plan does not execute backup work and does not write files.

## Project Storage Conversion

`app/src/main/storageConversionService.js` is the current guarded project conversion service. It is available only through maintenance-center business actions and main-process IPC handlers.

The service:

- validates the trusted project folder with path safety checks;
- creates a project backup under `information/statistics/backup` before writing project files;
- uses `json_turn_sqlite` and `sqlite_turn_json` backup labels for conversion direction clarity;
- writes `information/data.db` from the current JSON project when the user selects Create SQLite copy from JSON;
- removes the source JSON files after a successful JSON to SQLite conversion;
- reads `information/data.db` and writes JSON through `projectStore` when the user selects Export SQLite copy back to JSON;
- removes the source SQLite database after a successful SQLite to JSON export;
- writes `information/sqlite-conversion-report.json` with counts, schema validation, backup file, and safety flags;
- prefers SQLite during automatic loading when both formats exist, while explicit JSON loading remains available when JSON files exist;
- does not expose SQL strings, database handles, or absolute database paths to renderer code.

## JSON To SQLite

Current guarded workflow:

1. Validate trusted project directory.
2. Read `settings.json`, `zones.json`, `points.json`, and image references.
3. Create a pre-conversion backup.
4. Create `information/data.db` in a temporary location.
5. Import zones, points, phenology entries, image references, taxonomy summaries, and settings.
6. Record unknown fields in a compatibility payload so they can round-trip.
7. Run consistency checks.
8. Move the completed database into place only after checks pass.
9. Write a conversion report.

## SQLite To JSON

Current guarded workflow:

1. Validate trusted project directory and database file.
2. Export settings, zones, points, phenology entries, image references, and compatibility payloads.
3. Rebuild `settings.json`, `zones.json`, and `points.json`.
4. Keep image paths project-relative.
5. Write JSON files to a temporary location first.
6. Replace target files only after validation passes.
7. Write a conversion report.

## Conversion Report

The report should include:

- conversion direction;
- generated time;
- source files;
- target files;
- record counts;
- skipped records;
- warnings;
- backup path;
- validation result.

## Round-Trip Checks

Round-trip tests should verify:

- zone count and zone ids;
- point count and point ids;
- coordinates;
- phenology entry count;
- image reference count;
- taxonomy fields and verification status;
- unknown field preservation;
- UTF-8 CSV and JSON output stability.

## Runtime Storage Acceptance

`npm run db:test-runtime` exercises the explicit SQLite runtime path against a synthetic temporary project. It verifies:

- JSON to SQLite conversion removes the source JSON files after backup and validation;
- automatic project loading uses SQLite after conversion;
- saving without an explicit storage format writes back to SQLite when `information/data.db` exists;
- when both JSON and SQLite files exist, automatic loading still prefers SQLite;
- explicit JSON loading remains available when JSON files exist;
- SQLite export writes JSON through `projectStore`, removes the source database after success, and preserves the SQLite-edited project data;
- conversion backups include the direction labels `json_turn_sqlite` and `sqlite_turn_json`;
- renderer-facing reports continue to hide SQL strings, database handles, and raw database paths.
