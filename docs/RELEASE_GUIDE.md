# Release Guide

## Release Scope

Each release should have a clear version, changelog entry, verification result, and rollback path.

## Pre-Release Checks

Run from `app/`:

```bash
npm ci
npm run verify
npm test --if-present
```

Run `npm run lint` when dependencies are installed. Build the installer only after verification passes.

## Packaging

Current Windows installer command:

```bash
npm run dist
```

Installer output is written under `app/dist/` and must not be committed to source control.

## Release Artifacts

A complete school-sample release should include:

- Windows installer;
- optional portable archive;
- SHA256 checksums;
- release notes;
- changelog;
- license and school-use documents;
- privacy notes;
- third-party notices;
- user manual or release manual;
- known limitations and rollback notes.

## Rollback

Keep the previous installer and matching source tag available. If a release changes project data, keep the migration notes and a tested restore path.

