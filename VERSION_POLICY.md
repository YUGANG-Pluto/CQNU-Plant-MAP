# Version And Branch Policy

## Current Line

- Stable baseline: `1.0.0`, tag `v1.0.0`.
- Current test release: `1.1.0-beta.2`, tag `v1.1.0-beta.2`.
- Desktop application and release site use the same version number.

## Version Numbers

The maintained release line follows Semantic Versioning:

- `X.Y.Z` is a stable release.
- `X.Y.Z-beta.N` is a test release for the same planned stable version.
- `X` changes for incompatible product or data-contract changes.
- `Y` changes for backward-compatible features or substantial architecture work.
- `Z` changes for backward-compatible fixes and maintenance.
- `N` increases for each Beta candidate without changing the planned stable version.

Examples:

- `v1.1.0-beta.1`: first Beta candidate for 1.1.0.
- `v1.1.0-beta.2`: second Beta candidate after additional fixes.
- `v1.1.0`: stable 1.1.0 release after acceptance.

Do not use a plain `vX.Y` tag for maintained releases. Do not mark a Beta release as the latest stable release.

## Branches

### `main`

- Holds reviewed integration commits, documentation, and release history.
- Must remain buildable and pass the repository checks.
- Stable and Beta tags are created only from reviewed commits merged to this branch.

### `desktop/main`

- Maintains the Electron desktop application and desktop-specific adapters.
- Desktop storage, preload, IPC, packaging, and installer changes are developed here.
- Shared domain changes must remain compatible with `web/main` before integration.

### `web/main`

- Maintains the browser application, PWA runtime, and release site deployment.
- The documentation homepage remains the public entry point; the full browser application is served from `/workspace`.
- Browser persistence and file access use browser capabilities and must not depend on Electron APIs.

### `admin/foundation`

- Holds future management-system contracts, authorization boundaries, and threat-model documentation.
- It does not store or read project records, images, coordinates, or local file handles unless a separately reviewed product phase explicitly adds that capability.
- Identity, tenant, and hosted-data implementations are not enabled on this branch by default.

### Short-Lived Work Branches

Use `desktop/<topic>`, `web/<topic>`, `admin/<topic>`, or `shared/<topic>` for focused review. These branches are temporary and must converge through their corresponding maintained branch and then `main` before release. They must not establish independent product versions or incompatible shared behavior.

Cross-platform behavior belongs in shared modules. Platform-specific code belongs behind the platform adapter boundary. A change that affects both desktop and browser behavior must be validated on both maintained branches before it reaches `main`.

## Tag Rules

- Tags are immutable release records. Never move or reuse a published tag.
- Stable tags use `vX.Y.Z`.
- Beta tags use `vX.Y.Z-beta.N` and GitHub prerelease status.
- The package version, site version, lock files, changelog heading, and tag must agree.
- Generated installers, databases, logs, backups, and local project data are not committed with a tag.

The earlier `v8.0` and `v9.0.1-beta.1` tags are legacy archive markers from the pre-SemVer history. They remain available for traceability but do not determine the next maintained version number.

## Release Flow

1. Select the next stable target and Beta sequence.
2. Integrate reviewed `desktop/main` and `web/main` changes into `main`.
3. Update application and site package versions together.
4. Record user-visible changes and compatibility notes in `CHANGELOG.md`.
5. Run the desktop, site, test, storage, and repository checks.
6. Commit and push the integrated source.
7. Create the matching annotated tag.
8. Mark Beta releases as prereleases; mark only accepted `vX.Y.Z` releases as stable.
9. Keep the previous stable tag and rollback notes available.
