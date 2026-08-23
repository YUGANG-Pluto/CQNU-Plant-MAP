# CQNU Plant MAP Site

The site is the restricted-access release, documentation, and read-only browser surface for the desktop application. It is intentionally isolated from Electron main-process capabilities. The read-only workspace can parse files explicitly selected by the user, but keeps those records in browser memory and never receives a local project path or opens a SQLite database.

## Commands

```powershell
npm run check
```

The build produces a self-contained Sites Worker package under `dist/`. The source has no runtime dependency installation step.

## Publishing boundary

- Desktop installers and source releases remain on GitHub Releases.
- This site serves documentation, release navigation, a product preview, and a local-memory read-only workspace.
- User-selected JSON, CSV, or GeoJSON files remain in the active browser session and are not uploaded by the site.
- Project records, local paths, service tokens, coordinates, and user images are not bundled with the published site.
- Project writes, SQLite, backups, image management, and third-party species queries remain desktop-only capabilities.
