# Developer Guide

## Runtime

The application is an Electron desktop app. Current CI uses Node 24 on Windows.

Recommended local commands are run from `app/`:

```bash
npm ci
npm start
npm run verify
```

Use `npm install` only when dependencies change and `package-lock.json` needs to be refreshed.

## Important Paths

| Path | Purpose |
| --- | --- |
| `app/electron/main` | TypeScript application lifecycle, window policy, and IPC registration. |
| `app/electron/preload` | TypeScript preload API bridge. |
| `app/electron/shared` | IPC channel and response contracts. |
| `app/index.html` | Minimal renderer host page. |
| `app/src/main` | Main-process services and security boundary. |
| `app/src/renderer-modern` | Preact shell, modal markup, themes, and presentation styles. |
| `app/src/renderer` | Compatibility business features, map, state, and import/export. |
| `app/src/renderer/legacy-loader.js` | Ordered compatibility module manifest. |
| `app/scripts` | Repository and runtime checks. |
| `docs` | Product, engineering, testing, security, release, and maintenance references. |

## Script Order

`index.html` loads only the modern shell, local Leaflet assets, and `legacy-loader.js`. Keep compatibility dependency order in the loader manifest: shared state, DOM registry, utilities, locale fragments, normalizers, map modules, feature modules, shell coordination, then `app.js`.

## Build Outputs

`main-dist/` and `renderer-dist/` are generated and ignored by source control. `npm start` rebuilds both automatically. Do not copy generated output into the synchronization repository.

## Data Safety

Use synthetic project folders for tests. Do not put real `information/` folders, images, logs, backups, exports, or tokens inside the repository.

## Dependency Changes

When dependencies change:

1. Update `app/package-lock.json`.
2. Update `THIRD_PARTY_NOTICES.md`.
3. Run `npm run verify`.
4. Smoke test affected workflows.

## Local Verification

```bash
npm run check:repo
npm run check:syntax
npm run typecheck
npm run build
npm run self-check
npm run verify
```

Run `npm run lint` when `node_modules` is installed.
