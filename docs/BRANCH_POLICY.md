# Branch Policy

## Maintained Branches

| Branch | Responsibility | Release role |
|---|---|---|
| `main` | Reviewed integration, documentation, and release history | Sole source of stable and Beta tags |
| `desktop/main` | Electron application, desktop adapters, local storage, packaging, and installers | Desktop candidate line |
| `web/main` | Browser application, PWA, browser storage adapters, and Sites deployment | Web candidate line |
| `admin/foundation` | Management service, authorization boundaries, account UI, audit contracts, and database schema | Management candidate line |

## Shared Behavior

- Domain models, statistics, validation, import/export formats, and user-visible workflow rules are shared across desktop and browser builds.
- Electron-only access remains behind the preload and IPC boundary.
- Browser-only access remains behind the Web Platform Adapter and must use explicit browser permissions.
- Platform adapters may differ internally, but the same supported operation must preserve its user-visible meaning and data contract.
- Site documentation routes and the documentation homepage remain available when `/workspace` changes.
- The management service controls access only. Browser plant records remain in local browser storage or a user-authorized directory.

## Integration Rules

1. Develop platform-specific changes on the corresponding maintained branch or a short-lived topic branch.
2. Run the checks for the affected platform before merging.
3. Validate shared-contract changes on both desktop and browser builds.
4. Merge reviewed maintained branches into `main` for a coordinated release.
5. Create release tags only from `main`.

## Data And Artifact Rules

- Do not commit project records, images, logs, backups, credentials, tokens, local file handles, installers, or generated build directories.
- Browser project data remains local to the browser unless the user explicitly exports or synchronizes a visible file or directory.
- Management-system foundation work does not access raw project data in its preparation phase.
