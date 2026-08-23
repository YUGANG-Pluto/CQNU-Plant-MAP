# CQNU Plant MAP Site

The site is the public release and documentation surface for the desktop application. It is intentionally isolated from Electron main-process capabilities and never reads a local project directory or SQLite database.

## Commands

```powershell
npm run check
```

The build produces a self-contained Sites Worker package under `dist/`. The source has no runtime dependency installation step.

## Publishing boundary

- Desktop installers and source releases remain on GitHub Releases.
- This site serves documentation, release navigation, and a read-only product preview.
- Project records, local paths, service tokens, coordinates, and user images are not bundled.
