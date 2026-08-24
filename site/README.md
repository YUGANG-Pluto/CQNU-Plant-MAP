# CQNU Plant MAP Site

The site is the restricted-access release, documentation, and browser application surface for CQNU Plant MAP. It remains isolated from Electron main-process capabilities. The browser workspace uses explicit directory or file selection, OPFS, SQLite Wasm, Cache Storage, and controlled downloads; project data remains on the user's device.

## Commands

```powershell
npm run check
```

The source has no runtime dependency installation step. The build produces the standard Sites artifact layout under `dist/`:

- `server/index.js`: routing, security headers, health reporting, and static-asset binding.
- `client/**`: documentation and browser-workspace static assets.
- `.openai/hosting.json`: hosting metadata.

The Worker remains small because renderer bundles, SQLite Wasm, maps, styles, and images are served as static client assets instead of being embedded in Worker source.

```powershell
npm run package:sites
```

This validates the build and creates an ignored deployment archive under `.sites-artifacts/`. The archive contains the `dist/` directory, not source code, local project data, dependencies, or desktop packages.

## Private deployment and rollback

1. Commit and push the exact source state on `web/main`.
2. Run `npm run package:sites` from the same source state.
3. Save a Sites version with the pushed commit SHA and generated archive.
4. Deploy the saved version with restricted owner-only access.
5. Verify `/health`, `/`, `/docs`, and `/workspace` after deployment.

Publishing a new version does not remove older saved versions. Rollback redeploys the last verified saved version, then checks the same health and route set. Access mode must remain restricted unless a separate public-release decision is approved.

## Publishing boundary

- Desktop installers and source releases remain on GitHub Releases.
- This site keeps the documentation homepage and serves the full browser application from `/workspace`.
- User-selected project directories, JSON, CSV, GeoJSON, and images remain on the user's device and are not uploaded by the site.
- Project records, local paths, service tokens, coordinates, and user images are not bundled with the published site.
- Browser project writes use an OPFS SQLite primary copy and, when granted, a compatible JSON directory mirror.
- Browser backups preserve compatible JSON records and referenced image bytes; manual downloads are standard ZIP files.
- A previously selected directory handle is recovered when the browser still grants permission. If permission was revoked, the user must explicitly select the directory again.
- Only one `/workspace` tab may own the OPFS database write lock at a time; documentation routes remain available.
- Third-party species and image-reference queries run only after an explicit user action and send only the selected query name or image required for that request.
- The site service worker caches application resources for resilience but does not cache third-party requests or project data.
