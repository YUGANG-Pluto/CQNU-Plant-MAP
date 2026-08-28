# CQNU Plant MAP Site

The site is the restricted-access release, documentation, and browser application surface for CQNU Plant MAP. It remains isolated from Electron main-process capabilities. The browser workspace is local-first through explicit file access, OPFS, SQLite Wasm, Cache Storage, and controlled downloads. An authenticated user may also explicitly create, read, and version an account-scoped cloud project snapshot.

## Commands

```powershell
npm run check
```

Sites remote builds run from the repository root through `npm run build`. The root
entry prepares only missing workspace dependencies, builds the shared browser
renderer, validates the site Worker, and copies the verified output to `dist/`.

The source has no runtime dependency installation step. The build produces the standard Sites artifact layout under `dist/`:

- `server/index.js`: routing, security headers, health reporting, and static-asset binding.
- `client/**`: documentation and browser-workspace static assets.
- `.openai/hosting.json`: hosting metadata.

The Worker remains small because renderer bundles, SQLite Wasm, maps, styles, and images are served as static client assets instead of being embedded in Worker source.

## Deployment configuration

- `.openai/hosting.json` binds the site D1 database as `DB`; the Worker creates the account, session, audit, and cloud-project tables idempotently on first use.
- `CQNU_MANAGEMENT_AUTH_KEYRING` is required and must be a deployment secret containing JSON shaped as `{ "activeKeyId": "...", "keys": { "...": "base64url-key" } }`. Each key decodes to 32–64 random bytes; never store a real value in source control.
- On an empty database, `CQNU_BOOTSTRAP_ADMIN_PASSWORD` and `CQNU_BOOTSTRAP_USER_PASSWORD` are required. Optional `CQNU_BOOTSTRAP_ADMIN_USERNAME` and `CQNU_BOOTSTRAP_USER_USERNAME` default to `admin` and `user`. Bootstrap accounts must replace temporary credentials before normal workspace access.
- Existing D1 data is reused on later deployments. Removing bootstrap variables after first initialization does not remove accounts, while rotating the key ring must retain old keys until existing keyed records have expired or been replaced.

```powershell
npm run package:sites
```

This validates the build and creates an ignored deployment archive under `.sites-artifacts/`. The archive contains the `dist/` directory, not source code, local project data, dependencies, or desktop packages.

## Private deployment and rollback

1. Commit and push the exact source state on `site/main`.
2. Run `npm run package:sites` from the same source state.
3. Save a Sites version with the pushed commit SHA and generated archive.
4. Deploy the saved version with restricted owner-only access.
5. Verify `/health`, `/`, `/docs`, and `/workspace` after deployment.

Publishing a new version does not remove older saved versions. Rollback redeploys the last verified saved version, then checks the same health and route set. Access mode must remain restricted unless a separate public-release decision is approved.

## Publishing boundary

- Desktop installers and source releases remain on GitHub Releases.
- This site keeps the documentation homepage and serves the full browser application from `/workspace`.
- Small browser-local research tools are registered through a versioned app manifest and served from dedicated `/apps/*` routes. `/apps/project-inspector` performs a local, non-mutating project preflight without uploading selected files.
- User-selected project directories and source files remain on the device. Cloud upload sends only the explicitly selected `settings`, `zones`, and `points` record snapshot; point fields may include coordinates.
- Before upload, service credentials, credential-bearing URL parameters, and device-absolute paths are removed from the snapshot. Relative image references may remain for record compatibility, while SQLite/JSON source files, backups, logs, directory handles, service tokens, and image bytes remain local.
- Cloud projects are owner-scoped, require the existing authenticated session, enforce `workspace.read`/`workspace.save`, use exact-origin CSRF protection, and reject stale revisions.
- Project snapshots are capped at 8 MiB, split across bounded D1 rows, versioned, and verified with SHA-256 before a browser working copy is opened.
- Browser project writes use an OPFS SQLite primary copy and, when granted, a compatible JSON directory mirror.
- The workspace reports detected browser capabilities. Missing directory-picker support falls back to explicit file selection and downloads; missing critical OPFS database capabilities blocks writes with a readable explanation.
- External browser backup ZIP files are inspected for format, safe paths, encryption, entry and expansion limits, JSON shape, bitmap signatures, and CRC integrity before a restore token is issued.
- Browser backups preserve compatible JSON records and referenced image bytes; manual downloads are standard ZIP files.
- A previously selected directory handle is recovered when the browser still grants permission. If permission was revoked, the user must explicitly select the directory again.
- Only one `/workspace` tab may own the OPFS database write lock at a time; documentation routes remain available.
- Third-party species and image-reference queries run only after an explicit user action and send only the selected query name or image required for that request.
- The site service worker caches application resources for resilience but does not cache third-party requests or project data.
