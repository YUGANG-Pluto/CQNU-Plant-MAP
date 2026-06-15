# Testing Guide

## Automated Checks

Run from `app/`:

```bash
npm run ci:install
npm run check:repo
npm run check:syntax
npm run typecheck
npm run check:size
npm run self-check
npm run test:unit
npm run test:integration
npm run prepare:electron
npm run sqlite:probe
npm run sqlite:probe:electron
npm run db:check-schema
npm run db:test-conversion
npm run db:test-storage-conversion
npm run db:test-runtime
npm test
npm run verify
```

| Command | Coverage |
| --- | --- |
| `ci:install` | CI dependency installation using `npm ci --ignore-scripts` so native modules do not compile against Node before the Electron rebuild step. |
| `check:repo` | Required files, license metadata, ignored files, restricted repository artifacts. |
| `check:syntax` | JavaScript syntax with `node --check`. |
| `typecheck` | Narrow TypeScript `checkJs` gate for storage, backup restore, preload IPC, and shared declarations. |
| `check:size` | Source file size thresholds and large-file allowlist reasons. |
| `self-check` | Runtime contracts for path guards, project storage, backup, logging, UI wiring, security, and selected feature contracts. |
| `prepare:electron` | Installs the Electron runtime after script-free CI installation and rebuilds native dependencies against the Electron runtime ABI. |
| `test:unit` | Node test runner unit tests for pure models and path guards. |
| `test:integration` | Node test runner integration tests using system temporary directories. |
| `sqlite:probe` | Electron main-process probe for the selected SQLite dependency in a temporary directory. |
| `sqlite:probe:electron` | Electron main-process probe for the selected SQLite dependency in a temporary directory. |
| `sqlite:probe:node` | Optional Node ABI diagnostic for the selected SQLite dependency. It may fail after the native module is rebuilt for Electron. |
| `db:check-schema` | Electron main-process schema readiness check using a temporary schema database. |
| `db:test-conversion` | Electron main-process temporary JSON/SQLite round-trip check using synthetic fixtures. |
| `db:test-storage-conversion` | Electron main-process project storage conversion check using a synthetic temporary project. |
| `db:test-runtime` | Electron main-process SQLite runtime acceptance check using a synthetic temporary project. |
| `test` | Unit and integration test sequence. |
| `verify` | Repository, syntax, size, and self-check sequence. |

## Test Layers

| Layer | Location | Purpose |
| --- | --- | --- |
| Structural contracts | `scripts/self-check.js` | Application wiring, security boundaries, required files, documentation contracts, and broad feature contracts. |
| Unit tests | `tests/unit/` | Pure model behavior and focused service contracts. |
| Integration tests | `tests/integration/` | Main-process services that need temporary directories or zip files. |
| Fixtures | `tests/fixtures/` | Synthetic JSON project data only. No real survey records or private images. |

`npm run verify` intentionally remains a structural gate and does not force the full test suite yet. It includes the narrow `typecheck` gate. CI and local release checks should still run `npm run test --if-present`.

GitHub CI uses Node 20 LTS and runs the structural checks as separate steps: repository hygiene, syntax, typecheck, file size policy, self-check, unit/integration tests, and SQLite runtime acceptance. Keeping these steps separate makes GitHub failures point to the exact gate instead of hiding them inside one combined command. CI sets `ELECTRON_MIRROR` and `npm_config_registry` so Electron binary installation uses the same mirror strategy as local setup when the default download path is unstable. CI runs `npm run ci:install` so install-time native scripts are skipped, then runs `npm run prepare:electron` so the Electron runtime is installed and native SQLite bindings are compiled for Electron before runtime checks.

SQLite probe commands create only temporary databases under the system temporary directory and delete them before exit. The schema check command also creates a temporary schema database under the system temporary directory and deletes it before exit. The temporary conversion database created by `db:test-conversion` follows the same cleanup rule and uses only synthetic fixtures. The project conversion check created by `db:test-storage-conversion` uses a synthetic temporary project, writes a temporary `information/data.db`, verifies `information/statistics/backup`, verifies source-format cleanup after each direction, verifies backup-first conversion and export equality, then removes the temporary project.

The runtime acceptance check created by `db:test-runtime` also uses a synthetic temporary project. It verifies automatic SQLite priority after conversion, saving through SQLite, explicit JSON loading when both formats exist, export back to JSON, source cleanup, direction-labeled backups, and the renderer SQL boundary flags. It removes the temporary project before exit.

## Manual Smoke Test

1. Start the app.
2. Create or open a synthetic project.
3. Draw a zone.
4. Add a point inside the zone.
5. Edit point and phenology fields.
6. Import and preview an image.
7. Query the point and view statistics.
8. Export CSV and GeoJSON.
9. Create a backup.
10. Run maintenance health check.
11. Enter and exit safe mode.
12. Save, close, reopen, and confirm data remains.

## Species Reference Link And Token Smoke Test

Use synthetic point data and do not store real service credentials in the project folder.

1. Open a point and launch the species reference panel.
2. Run a GBIF or iNaturalist text lookup.
3. Click every visible source, Wiki, or attribution link and confirm the system default browser opens the target page.
4. Open the image comparison area and click the iNaturalist token page action.
5. Confirm the default browser opens `https://www.inaturalist.org/users/api_token`.
6. Log in to iNaturalist in the browser if needed, copy the temporary API token, and paste it into the app token field.
7. Run image comparison against a synthetic or non-private image.
8. Confirm suggestions render, token text is not saved into project JSON, and closing the panel clears temporary lookup state.

## Test Data Rules

Use temporary or synthetic data only. Do not commit real survey records, private images, tokens, logs, backups, diagnostics, exports, or local folders.

## Regression Focus

- path validation and trusted directories;
- JSON compatibility;
- image archive paths;
- CSV and GeoJSON fields;
- safe mode locks;
- map selection and redraw behavior;
- backup creation and cleanup;
- species reference source links, token-page opening, and temporary cache behavior.
- SQLite readiness table-model round-trip, temporary schema database check, temporary conversion database check, project storage conversion check, runtime acceptance check, conversion report, and backup preflight plan.
- maintenance log file selection, reading, and selected-file deletion.

## Statistics Center Regression

1. Open the statistics center from the workspace summary and from the main toolbar.
2. Confirm overview, zone analysis, taxonomic composition, life form and origin, diversity metrics, zone similarity, phenology, time trend, data quality, export, metric notes, and custom statistics sections render without layout overlap.
3. Confirm empty projects show explicit empty states and do not display `NaN`, `undefined`, or `null`.
4. Confirm Jaccard, Sørensen-Dice, Bray-Curtis, month-by-phenology, and zone-by-quality matrices use table heatmaps with legends and horizontal scrolling.
5. Use chart display control to switch recommended charts, report-oriented charts, quality charts, all charts, hidden charts, and a custom chart selection.
6. Open a bar, donut, combo, and heatmap chart in fullscreen, then close with the `X` button and the `Esc` key.
7. Confirm long zone names are truncated inside tables and heatmaps with the full value available through the cell title, and that unassigned zones are not shown as `N/A`.
8. Switch the heatmap palette between warm orange-red and default, then confirm matrix values and exports are unchanged.
9. Confirm the export page uses readable Chinese or English labels instead of internal export keys.
10. Export at least one statistics CSV, full JSON, Markdown summary, heatmap CSV, heatmap JSON, heatmap Markdown, and heatmap SVG.
11. Confirm exported CSV starts with a UTF-8 BOM and SVG files open in a browser without external resource references.
12. Confirm point, zone, image, backup, maintenance, and project save workflows still work after opening and exporting statistics.
