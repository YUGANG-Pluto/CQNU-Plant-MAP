# Testing Guide

This guide defines the local validation scope for the CQNU Campus Plant Mapping System.

## Core Commands

Run commands from the application folder:

```bash
cd app
npm run check:repo
npm run check:syntax
npm run self-check
npm test
npm run verify
```

## What Each Command Covers

| Command | Purpose |
| --- | --- |
| `npm run check:repo` | Verifies repository hygiene, required formal documents, package metadata, package lock, tracked installer icon, and restricted repository traces. |
| `npm run check:syntax` | Runs `node --check` on JavaScript files without requiring a full dependency install. |
| `npm run self-check` | Runs project contract checks for path guards, JSON storage, backup, logging, maintenance center, safe mode, theme contracts, charts, and species reference. |
| `npm test` | Current project test entry; it delegates to `self-check`. |
| `npm run verify` | Runs repository hygiene, syntax check, and self-check in one command. |

## Manual Smoke Test

Before treating a build as usable, manually verify:

1. Start the application.
2. Create or open a local project folder.
3. Add a zone and a point.
4. Edit point fields, scientific name, common name, phenology, and notes.
5. Import and preview a local image.
6. Use query filters and statistics views.
7. Open species reference and confirm that suggestions stay temporary until applied.
8. Enter safe mode, confirm edit controls are locked, browse the map, then exit safe mode.
9. Run maintenance health check and export diagnostics.
10. Save, close, reopen, and confirm data is preserved.

## Test Data Rules

- Use synthetic or copied test projects, not real survey data.
- Do not commit project folders, images, logs, diagnostics, backups, tokens, or exported files.
- Keep large binary output outside the repository unless it is a required tracked release asset.

## Regression Focus

Pay special attention to:

- path validation and project directory boundaries;
- existing JSON project compatibility;
- safe mode edit locking and exit recovery;
- image import and preview;
- species reference temporary cache behavior;
- chart rendering and reduced-motion behavior;
- backup creation and cleanup;
- installer icon and package metadata.
