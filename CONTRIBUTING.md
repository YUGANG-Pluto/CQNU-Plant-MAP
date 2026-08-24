# Contributing Guide

This repository is maintained as a local-first desktop application for campus plant survey work. Changes should keep the software stable, data-compatible, and suitable for controlled school use.

## Branches

- `main` is the stable branch.
- `dev` is the integration branch when used.
- Use focused branches for feature, fix, release, or hotfix work.

## Change Scope

Before editing, identify the affected layer:

- `app/src/main`: file access, dialogs, backups, logs, network services, and security checks.
- `app/preload.js`: narrow business API exposed to the renderer.
- `app/src/renderer`: UI, map interaction, import/export composition, and local state.
- `docs`: user, development, testing, security, release, and maintenance references.

Keep changes small. Do not mix unrelated formatting with behavior changes.

## Data Compatibility

Existing project folders use:

```text
information/settings.json
information/zones.json
information/points.json
information/images/
```

Do not rename fields, discard unknown data, or change image path rules without a documented migration and a backup path.

## Security Boundary

Renderer code must not use Node file-system or process capabilities. File access stays in the main process through the preload business API and path validation.

## Local Checks

Run from `app/`:

```bash
npm run check:repo
npm run check:syntax
npm run self-check
npm run verify
```

Run `npm run lint` when dependencies are installed.

## Do Not Commit

- real project folders or images;
- logs, diagnostics, backups, exports, or tokens;
- generated installer output;
- local environment files;
- non-product work notes.

