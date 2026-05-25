# SQLite Guide

## Current Behavior

The application currently stores project data in local JSON files under the trusted project folder. SQLite is documented as a future optional local data layer and is not required to open, edit, save, back up, or export current projects.

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
| Run SQLite schema checks | Ready |

## Dependency Status

`SQLITE_DEPENDENCY_DECISION.md` records the dependency direction for a future SQLite runtime. `better-sqlite3` is installed for dependency probing, but current JSON workflows do not require a database conversion feature.

`npm run db:check-schema` is a development readiness command. It validates the planned schema in a temporary database only and does not create or modify project databases.
