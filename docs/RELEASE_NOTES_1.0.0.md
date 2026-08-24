# CQNU Plant MAP 1.0.0

Release date: 2026-07-29

## Highlights

- Provides a local desktop workspace for campus plant zoning, point records, phenology tracking, image evidence, query, statistics, backup, and maintenance.
- Adds a research-oriented statistics center with diversity metrics, zone similarity matrices, phenology trends, data-quality analysis, and CSV, JSON, Markdown, and SVG exports.
- Supports scientific-white and liquid-glass interface themes with responsive layouts and reduced-motion behavior.
- Uses a TypeScript Electron main process and preload layer with a Preact and Vite renderer shell.
- Splits renderer, statistics, basemap, maintenance, species-reference, localization, and validation code into focused modules.

## Storage And Compatibility

- Existing JSON projects remain readable without a forced migration.
- SQLite storage is optional and can coexist with JSON.
- Conversion is user-triggered, creates a backup first, writes a conversion log, and preserves unknown fields.
- When both formats exist, automatic loading prefers SQLite while explicit JSON loading remains available.

## Security And Privacy

- Renderer code has no direct filesystem, database, path, or child-process access.
- Filesystem operations remain behind preload and IPC business APIs.
- Project-directory trust, path guards, IPC source validation, and controlled external-link opening remain enforced.
- Species-reference network requests are user-triggered and do not upload complete projects, coordinates, or local paths.

## Validation

- Repository hygiene, JavaScript syntax, TypeScript contracts, production builds, source-size governance, and self-checks pass through `npm run verify`.
- Unit and integration tests pass through `npm test`.
- Hidden renderer smoke coverage validates the required application controls.
- SQLite dependency, schema, conversion, storage, and runtime acceptance probes pass.
- Windows NSIS packaging completes successfully.

## Distribution

The Windows installer is produced separately from the source repository. Generated installers, dependencies, logs, databases, and local project data are not committed.

Installer:

- File: `校园植物分区管理系统 Setup 1.0.0.exe`
- Size: 80.37 MiB
- SHA-256: `CF5E4776A3AFC4CF90276D870F910C2C99A7AD90AC7D38BD8415BEFB1C5AE475`
