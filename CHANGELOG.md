# Changelog

Maintained releases follow `VERSION_POLICY.md`. Stable releases use `vX.Y.Z`; test releases use `vX.Y.Z-beta.N`.

## Unreleased

- No unreleased changes.

## 1.1.0-beta.2 - 2026-08-23

### Added

- Added a typed renderer platform adapter with Electron and browser capability profiles.
- Added local-memory read-only project parsing for separated project JSON, consolidated JSON, CSV, and GeoJSON files.
- Added a restricted `/workspace` site route with project overview, zone summaries, missing-field diagnostics, and read-only summary download.
- Added a loopback-only browser preview command for validating the shared renderer without exposing main-process files or write services.

### Changed

- Routed renderer project, export, storage, backup, diagnostics, species-reference, external-link, and window operations through the platform adapter.
- Updated compatible development-tool transitive packages to patched releases without changing direct dependency ranges.
- Updated Web architecture and privacy documentation to distinguish local browser-memory processing from desktop-only capabilities.

### Fixed

- Removed the remaining renderer dependency on direct `window.plantApp` access outside the adapter installation boundary.
- Preserved selected local-file modification times in browser read-only sessions.
- Cleared all currently reported npm audit findings in both production and development dependency trees.

### Compatibility

- Existing JSON and SQLite project structures are unchanged and require no migration.
- Electron preload channels, IPC handlers, path validation, SQLite services, and desktop save behavior are unchanged.
- Browser mode cannot save projects, open SQLite, manage backups, read desktop logs, upload images, or query third-party species services.
- `1.0.0` remains the stable baseline while the 1.1 line remains in Beta acceptance.

## 1.1.0-beta.1 - 2026-08-23

### Added

- Added a restricted-access release and documentation site with product, documentation, Web architecture, release, and privacy routes.
- Added a shared version consistency check for the desktop application, site, lock files, and release tags.
- Added site build and test coverage to GitHub Actions.

### Changed

- Split the SQLite exchange model into focused compatibility, serialization, deserialization, validation, report, and preflight modules while preserving its public facade and model version.
- Modularized renderer workflows and typed domains for workspace, phenology, maintenance, species reference, history, review, and command interactions.
- Refreshed Electron, packaging, linting, TypeScript, and compatible transitive dependencies without changing the project-data contract.
- Defined a single SemVer release line for the desktop application and site, with Beta prereleases and immutable stable tags.

### Fixed

- Prevented SQLite exchange records with repeated business identifiers from producing duplicate internal keys.
- Added validation for duplicate internal keys and dangling phenology or taxonomy point references.
- Stabilized Windows CI path handling and native Electron dependency preparation.

### Compatibility

- Existing JSON and SQLite projects remain supported without a forced migration.
- Unknown project fields remain preserved by the exchange model.
- Electron preload, IPC, path validation, renderer sandbox, and local-first storage boundaries are unchanged.
- `1.0.0` remains the stable baseline until the 1.1 line completes Beta acceptance.

## 1.0.0 - 2026-07-29

### Added

- Established the TypeScript Electron main process, preload boundary, IPC contracts, and Preact/Vite renderer shell.
- Added the research statistics center with diversity, similarity, phenology, time trend, data quality, table heatmaps, SVG heatmaps, and multi-format exports.
- Added controlled JSON and SQLite storage selection, conversion backups, conversion logs, diagnostics, and guarded cleanup.
- Added taxonomy suggestions through existing iNaturalist and GBIF reference services with manual verification controls.
- Added the scientific white and translucent glass interface themes, responsive layout, fullscreen chart review, chart display controls, and accessible motion fallbacks.
- Added repository, syntax, type, size, self-check, unit, integration, renderer smoke, SQLite, and Windows packaging checks.

### Compatibility

- Preserved existing project fields, unknown fields, project opening, saving, backup, restore, map, point, image, and phenology workflows.
- Kept local file and database access behind the Electron main process and approved preload APIs.

## Legacy Tags

- `v8.0`: historical desktop archive marker.
- `v9.0.1-beta.1`: historical pre-SemVer Beta marker.

Legacy tags are retained for traceability and are not part of the maintained 1.x version sequence.
