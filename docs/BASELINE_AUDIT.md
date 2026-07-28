# Baseline Audit

Audit date: 2026-07-29

## Current Application Baseline

- Desktop runtime: Electron 31.7.7.
- Application package version: 1.0.0.
- Main entry: `app/main-dist/main/index.js`, compiled from `app/electron/main/index.ts`.
- Preload entry: `app/main-dist/preload/index.js`, bundled from `app/electron/preload/index.ts`.
- Renderer entry: the Preact shell built from `app/src/renderer-modern/`, with `app/index.html` as a minimal host.
- Project storage supports JSON and SQLite under a user-selected local project folder.
- JSON compatibility remains available for `settings.json`, `zones.json`, `points.json`, and `images/`.

## Current Engineering State

- Self-check script exists at `app/scripts/self-check.js`.
- JavaScript syntax check is available through `npm run check:syntax`.
- Repository hygiene check is available through `npm run check:repo`.
- Source file size governance is available through `npm run check:size`.
- Combined local verification is available through `npm run verify`.
- Electron and renderer TypeScript contracts are checked through `npm run typecheck`.
- Hidden renderer smoke coverage is available through `npm run smoke:renderer`.
- The Windows installer command remains `npm run dist`.

## Authorization And Repository Hygiene

- The application package is marked `UNLICENSED` and private to avoid accidental open licensing.
- Formal license, school-use, privacy, security, and third-party notice files are present at the repository root.
- The package lock file is required for reproducible dependency installation.
- The installer icon path `app/build/icon.ico` is kept trackable.

## Data And Runtime Impact

- Existing JSON projects remain readable without forced migration.
- Optional taxonomy fields remain compatible with current point records.
- JSON and SQLite conversion is user-triggered, backup-first, logged, and handled only in the main process.
- Unknown project fields are preserved through conversion compatibility payloads.
- Renderer code has no direct filesystem, database, path, or child-process access.
- IPC source validation, preload whitelisting, project-directory trust, and path guards remain enforced.

## Known Follow-Up Items

- Continue migrating compatibility-layer renderer features to typed Preact modules only when the change reduces maintenance cost.
- Keep release, testing, security, and storage documentation synchronized with future tagged releases.
- Require backup and round-trip validation for any future project data format change.
