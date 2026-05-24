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

Use the in-app maintenance center for health checks, conservative repair, log review, diagnostic export, settings import/export, and safe mode.

## Safe Mode

Safe mode should remain browse-only for write actions. Browsing, query, statistics viewing, read-only reference lookup, and map dragging should remain available.

## Dependency Maintenance

When package dependencies change, update `package-lock.json`, review license notes, update `THIRD_PARTY_NOTICES.md`, and run verification.

## Release Maintenance

Before a release, review the release checklist, run verification, build the installer, test install/uninstall, and keep rollback artifacts.

