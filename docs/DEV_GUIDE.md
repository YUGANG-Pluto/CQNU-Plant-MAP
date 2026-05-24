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
| `app/main.js` | Electron application bootstrap. |
| `app/preload.js` | Preload API bridge. |
| `app/index.html` | Renderer shell, script order, and UI markup. |
| `app/src/main` | Main-process services and security boundary. |
| `app/src/renderer` | UI, map, state, import/export, and feature modules. |
| `app/scripts` | Repository and runtime checks. |
| `docs` | Product, engineering, testing, security, release, and maintenance references. |

## Script Order

`index.html` loads renderer scripts in dependency order. Keep shared state, DOM registry, utilities, i18n, normalizers, map modules, feature modules, then `app.js`.

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
npm run self-check
npm run verify
```

Run `npm run lint` when `node_modules` is installed.

