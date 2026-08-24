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
- Refresh storage and backups lists current JSON files, the current SQLite database, and backup zip files. Users can select backup files or current storage files for deletion.
- Deleting the only available storage format requires a second confirmation. This prevents accidental removal of the last readable project data file.
- If no readable storage format remains, restore by extracting the matching backup zip from `information/statistics/backup` into the project folder, then reopen the project.
- Conversion failure keeps the source storage format in place. Use conversion preflight and the latest log diagnosis before retrying.

Use a copied or backed-up project when testing conversion behavior.

## Backup Restore

Backup restore is a high-risk maintenance action and should be used only after inspecting the selected backup:

- Select exactly one backup zip from `information/statistics/backup`.
- Run restore inspection first. The inspection reports the backup file count, restored storage format, skipped nested backup entries, and blocking issues.
- Restore requires a second high-risk confirmation before project files are changed.
- Before restore writes project files, the application creates a `pre_restore` safety backup in `information/statistics/backup`.
- Restore skips backup-folder entries inside the zip, so existing backup artifacts are preserved instead of being overwritten by nested backup files.
- Restore accepts only backup zip files under the trusted backup folder and rejects unsafe zip entries such as absolute paths, drive paths, parent-directory escapes, or colon path segments.
- If the restored backup contains SQLite storage, old JSON source files are removed after restore. If the restored backup contains JSON storage without SQLite, the old SQLite database is removed after restore.
- After restore, reopen or reload the project through the application so the active storage format is read again.

## Log Review

The maintenance center lists log files and recent entries separately. Select one log file to read its contents and diagnosis summary in the maintenance center. Multiple log files can be selected for deletion. Routine log cleanup is user-selected instead of automatic expiration cleanup. A log with no warning or error entries reports `PASS`; logs with warnings or errors show the latest scopes and messages to help locate the maintenance breakpoint.

## Safe Mode

Safe mode should remain browse-only for write actions. Browsing, query, statistics viewing, read-only reference lookup, and map dragging should remain available.

## Dependency Maintenance

When package dependencies change, update `package-lock.json`, review license notes, update `THIRD_PARTY_NOTICES.md`, and run verification.

## Release Maintenance

Before a release, review the release checklist, run verification, build the installer, test install/uninstall, and keep rollback artifacts.
