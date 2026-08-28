# Branch Policy

## Maintained Branches

| Branch | Responsibility | Release role |
|---|---|---|
| `main` | Reviewed integration, documentation, and release history | Sole source of stable and Beta tags |
| `desktop/main` | Electron application, desktop adapters, local storage, packaging, and installers | Desktop candidate line |
| `web/main` | Shared browser application, PWA, and browser-local storage adapters | Browser-local candidate line |
| `site/main` | Restricted site deployment, cloud project D1 API, site-only project library, and deployment documentation | Site candidate line |
| `admin/foundation` | Management service, authorization boundaries, account UI, audit contracts, and database schema | Management candidate line |

## Shared Behavior

- Domain models, statistics, validation, import/export formats, and user-visible workflow rules are shared across desktop and browser builds.
- Electron-only access remains behind the preload and IPC boundary.
- Browser-only access remains behind the Web Platform Adapter and must use explicit browser permissions.
- Platform adapters may differ internally, but the same supported operation must preserve its user-visible meaning and data contract.
- Site documentation routes and the documentation homepage remain available when `/workspace` changes.
- Browser plant records remain local by default. Only `site/main` may add an explicit, authenticated cloud snapshot workflow; it must not be merged into Electron capabilities by implication.

## Integration Rules

1. Develop platform-specific changes on the corresponding maintained branch or a short-lived topic branch.
2. Run the checks for the affected platform before merging.
3. Validate shared-contract changes on both desktop and browser builds.
4. Merge reviewed maintained branches into `main` for a coordinated release.
5. Create release tags only from `main`.

## Data And Artifact Rules

- Do not commit project records, images, logs, backups, credentials, tokens, local file handles, installers, or generated build directories.
- Browser project data remains local unless the user explicitly exports, mirrors, or uploads a visible cloud project snapshot.
- Site cloud snapshots may contain `settings`, `zones`, and `points` records, including coordinates and relative image references. The upload sanitizer removes service credentials and device-absolute paths; source databases, image bytes, backups, logs, and browser handles remain local.
