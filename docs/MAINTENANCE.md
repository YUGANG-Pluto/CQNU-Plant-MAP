# Maintenance Guide

This guide covers routine maintenance for the CQNU Campus Plant Mapping System repository and desktop application.

## Maintenance Principles

- Keep changes small, reversible, and tied to one purpose.
- Preserve existing JSON project compatibility unless a migration plan has been approved.
- Do not change Electron preload or IPC boundaries without a focused review.
- Keep the application local-first and avoid bundling large map or reference datasets.
- Keep formal documents synchronized with user-facing behavior and release scope.

## Routine Repository Checks

Before committing:

```bash
cd app
npm run verify
```

If dependencies are installed locally, also run:

```bash
cd app
npm run lint
```

When package dependencies change, regenerate and review:

```bash
cd app
npm install --package-lock-only
```

## Data Safety

- Do not place real `information/` folders inside the repository.
- Do not commit imported plant images, diagnostics, logs, backups, access tokens, or temporary exports.
- Treat exported CSV, GeoJSON, settings JSON, and diagnostics as user-controlled local files.
- Back up test projects before testing import, merge, repair, or cleanup functions.

## Dependency Maintenance

When updating dependencies:

1. Review package purpose and upstream license.
2. Update `package-lock.json`.
3. Update `THIRD_PARTY_NOTICES.md` if package names or license notes change.
4. Run `npm run verify`.
5. Run a manual smoke test for affected workflows.

## Application Maintenance

Use the in-app maintenance center for:

- project health checks;
- conservative repair;
- diagnostics export;
- log review and cleanup;
- safe mode troubleshooting;
- UI settings import and export.

Safe mode should remain browse-only for editing surfaces. Browsing, query, statistics viewing, map dragging, and read-only reference lookup should remain available.

## Documentation Maintenance

Update formal documents when behavior changes:

- `README.md` for user-facing features and usage.
- `CHANGELOG.md` for version-visible changes.
- `docs/TESTING.md` for validation changes.
- `docs/RELEASE_CHECKLIST.md` for packaging and release process changes.
- `THIRD_PARTY_NOTICES.md` for dependency changes.
- `PRIVACY.md` for data or network behavior changes.
- `SECURITY.md` for security boundary or reporting changes.

## Recovery And Rollback

- Prefer one focused commit per maintenance topic.
- Use Git history to inspect or revert a failed maintenance change.
- Keep installer output outside source control unless a release workflow explicitly stores it elsewhere.
- Keep project data backups outside source control.
