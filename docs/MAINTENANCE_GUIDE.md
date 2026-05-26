# Maintenance Guide

## Principles

- Keep each change focused.
- Preserve project JSON compatibility.
- Keep file-system access in the main process.
- Keep user data out of source control.
- Update documentation when behavior changes.

## Routine Checks

Run from `app/`:

```bash
npm run verify
```

When dependencies are installed, also run:

```bash
npm run lint
```

## Data Maintenance

Use the in-app maintenance center for health checks, conservative repair, log review, diagnostic export, settings import/export, safe mode, and guarded storage conversion.

## Storage Conversion

The storage conversion controls are optional maintenance actions:

- Conversion preflight checks whether the current JSON project can be represented by the SQLite table model.
- Create SQLite copy saves the current project, creates a `json_turn_sqlite` backup under `information/statistics/backup`, writes `information/data.db`, removes source JSON files after success, and reloads SQLite.
- Export back to JSON creates a `sqlite_turn_json` backup under `information/statistics/backup`, reads `information/data.db`, validates the schema, writes JSON through the normal project storage service, removes the source database after success, and reloads JSON.
- Load SQLite and Load JSON let the user explicitly choose a format when both formats are present.

Use a copied or backed-up project when testing conversion behavior.

## Log Review

The maintenance center lists log files and recent entries separately. Select a log file to read its contents in the maintenance center or delete that selected file. Routine log cleanup is user-selected instead of automatic expiration cleanup.

## Safe Mode

Safe mode should remain browse-only for write actions. Browsing, query, statistics viewing, read-only reference lookup, and map dragging should remain available.

## Dependency Maintenance

When package dependencies change, update `package-lock.json`, review license notes, update `THIRD_PARTY_NOTICES.md`, and run verification.

## Release Maintenance

Before a release, review the release checklist, run verification, build the installer, test install/uninstall, and keep rollback artifacts.
