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

- Holds the integrated desktop application, release site, documentation, and release history.
- Must remain buildable and pass the repository checks.
- Stable and Beta tags are created only from reviewed commits on this branch.

### `dev`

- Optional integration branch for work that is not ready to tag.
- Create it only when multiple changes need to progress in parallel.
- Merge it back only after desktop and site checks pass together.

### Short-Lived Work Branches

Use `app/<topic>` and `site/<topic>` only when desktop and site work genuinely need separate review. These branches are temporary and must converge through the integration branch before release. They must not establish independent product versions or incompatible shared behavior.

For a single coordinated change, keep one branch and update both directories together. This is the default because it makes version and capability drift visible in one review.

## Tag Rules

- Tags are immutable release records. Never move or reuse a published tag.
- Stable tags use `vX.Y.Z`.
- Beta tags use `vX.Y.Z-beta.N` and GitHub prerelease status.
- The package version, site version, lock files, changelog heading, and tag must agree.
- Generated installers, databases, logs, backups, and local project data are not committed with a tag.

The earlier `v8.0` and `v9.0.1-beta.1` tags are legacy archive markers from the pre-SemVer history. They remain available for traceability but do not determine the next maintained version number.

## Release Flow

1. Select the next stable target and Beta sequence.
2. Update application and site package versions together.
3. Record user-visible changes and compatibility notes in `CHANGELOG.md`.
4. Run the desktop, site, test, storage, and repository checks.
5. Commit and push the integrated source.
6. Create the matching annotated tag.
7. Mark Beta releases as prereleases; mark only accepted `vX.Y.Z` releases as stable.
8. Keep the previous stable tag and rollback notes available.
