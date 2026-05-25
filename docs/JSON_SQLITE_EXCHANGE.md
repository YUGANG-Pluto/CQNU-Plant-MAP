# JSON And SQLite Exchange Plan

## Purpose

JSON and SQLite exchange must preserve existing project data, support local backups, and keep JSON as a compatible interchange format.

## JSON To SQLite

Planned workflow:

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

Planned workflow:

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

## Not Implemented Yet

The current application does not include runtime conversion UI, SQLite schema creation, or database migration commands.

