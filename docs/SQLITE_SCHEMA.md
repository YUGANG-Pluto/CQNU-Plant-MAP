# SQLite Schema Plan

## Status

SQLite is a planned optional local data layer. The active runtime format remains the project-folder JSON layout documented in `DATA_SCHEMA.md`.

No SQLite database file, migration script, or conversion command is currently part of the application runtime.

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

## Compatibility Rules

- JSON projects must remain readable.
- Unknown JSON fields must not be dropped during conversion.
- Geometry coordinates must preserve WGS84 `[lng, lat]` GeoJSON order.
- Images remain files referenced by project-relative paths, not BLOB values by default.
- Taxonomy suggestions remain advisory and keep manual verification status.

## Migration Readiness

Before this plan becomes runtime code, the project needs:

- A conversion report format.
- Backup-before-conversion behavior.
- JSON to SQLite and SQLite to JSON round-trip checks.
- Recovery behavior for failed conversion.
- User-visible documentation for choosing JSON or SQLite storage.
