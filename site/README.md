# CQNU Plant MAP Site

The site is the restricted-access release, documentation, and browser application surface for CQNU Plant MAP. It remains isolated from Electron main-process capabilities. The browser workspace uses explicit directory or file selection, OPFS, SQLite Wasm, Cache Storage, and controlled downloads; project data remains on the user's device.

## Commands

```powershell
npm run check
```

The build produces a self-contained Sites Worker package under `dist/`. The source has no runtime dependency installation step.

## Publishing boundary

- Desktop installers and source releases remain on GitHub Releases.
- This site keeps the documentation homepage and serves the full browser application from `/workspace`.
- User-selected project directories, JSON, CSV, GeoJSON, and images remain on the user's device and are not uploaded by the site.
- Project records, local paths, service tokens, coordinates, and user images are not bundled with the published site.
- Browser project writes use an OPFS SQLite primary copy and, when granted, a compatible JSON directory mirror.
- Third-party species and image-reference queries run only after an explicit user action and send only the selected query name or image required for that request.
- The site service worker caches application resources for resilience but does not cache third-party requests or project data.
