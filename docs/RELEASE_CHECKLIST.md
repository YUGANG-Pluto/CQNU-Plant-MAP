# Release Checklist

Use this checklist before preparing a local installer or a tagged release.

## Version And Scope

- Confirm the intended version number and tag name.
- Use `vX.Y.Z-beta.N` for a test release and `vX.Y.Z` for a stable release.
- Confirm `app/package.json`, `site/package.json`, and both lock files use the same version.
- Confirm the release scope in `CHANGELOG.md`.
- Confirm no unrelated work is mixed into the release commit.
- Confirm no project data, logs, backups, tokens, diagnostics, or temporary exports are staged.

## Required Local Checks

Run from the application folder:

```bash
cd app
npm run check:version
npm run verify
```

If dependencies are installed locally, also run:

```bash
cd app
npm run lint
```

Run a manual smoke test using a synthetic project:

- create or open project;
- draw zone;
- add point;
- edit phenology;
- import image;
- run query and statistics;
- use species reference without applying unwanted suggestions;
- enter and exit safe mode;
- run maintenance health check;
- save and reopen.

## Authorization And Notices

Confirm these files are present and current:

- `LICENSE.md`
- `SCHOOL_USE_LICENSE.md`
- `EULA.md`
- `THIRD_PARTY_NOTICES.md`
- `PRIVACY.md`
- `SECURITY.md`
- `Copyright.md`

Confirm `app/package.json` remains:

```json
{
  "license": "SEE LICENSE IN LICENSE.md",
  "private": true
}
```

## Packaging

Run from the application folder when a Windows installer is needed:

```bash
cd app
npm run dist
```

Confirm:

- `app/build/icon.ico` exists before packaging;
- installer output is created under `app/dist/`;
- generated installer is not committed to the source tree;
- installer name and app version match the planned release.

## Release Notes

Release notes should include:

- version;
- date;
- major user-visible changes;
- compatibility notes;
- known limitations;
- verification commands that passed;
- packaging status.

Mark Beta tags as GitHub prereleases. Only stable `vX.Y.Z` releases may be designated as the latest stable release.

Do not include private project data, local machine paths, credentials, or temporary files in release notes.

## Rollback

Before distribution:

- keep the previous stable tag or installer available;
- keep a sample project backup for quick regression checks;
- document any required manual rollback steps if project data format changes.
