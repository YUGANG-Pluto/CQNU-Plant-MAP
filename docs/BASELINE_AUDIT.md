# Baseline Audit

Audit date: 2026-05-19

## Current Application Baseline

- Desktop runtime: Electron 31.7.7.
- Application package version: 9.0.1.
- Main entry: `app/main.js`.
- Preload entry: `app/preload.js`.
- Renderer entry: `app/index.html`.
- Primary project storage remains JSON-based under a user-selected local project folder.
- Current project files remain `settings.json`, `zones.json`, `points.json`, and `images/`.

## Current Engineering State

- Self-check script exists at `app/scripts/self-check.js`.
- JavaScript syntax check is available through `npm run check:syntax`.
- Repository hygiene check is available through `npm run check:repo`.
- Source file size governance is available through `npm run check:size`.
- Combined local verification is available through `npm run verify`.
- The Windows installer command remains `npm run dist`.

## Authorization And Repository Hygiene

- The application package is marked `UNLICENSED` and private to avoid accidental open licensing.
- Formal license, school-use, privacy, security, and third-party notice files are present at the repository root.
- The package lock file is required for reproducible dependency installation.
- The installer icon path `app/build/icon.ico` is kept trackable.

## Data And Runtime Impact

- No business data format was changed in this baseline step.
- Optional taxonomy fields are documented for compatibility with current point records.
- No project migration was introduced.
- No IPC channel or Electron security boundary was changed.
- No user operation workflow was changed.

## Known Follow-Up Items

- Add neutral engineering documents for release, testing, and maintenance if team workflows expand.
- Consider continuous integration after local verification scripts remain stable.
- Keep SQLite planning documents synchronized before any runtime conversion work is introduced.
