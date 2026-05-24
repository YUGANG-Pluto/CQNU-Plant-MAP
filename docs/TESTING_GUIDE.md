# Testing Guide

## Automated Checks

Run from `app/`:

```bash
npm run check:repo
npm run check:syntax
npm run self-check
npm test
npm run verify
```

| Command | Coverage |
| --- | --- |
| `check:repo` | Required files, license metadata, ignored files, restricted repository artifacts. |
| `check:syntax` | JavaScript syntax with `node --check`. |
| `self-check` | Runtime contracts for path guards, project storage, backup, logging, UI wiring, security, and selected feature contracts. |
| `test` | Current test entry, delegated to `self-check`. |
| `verify` | Repository, syntax, and self-check sequence. |

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
