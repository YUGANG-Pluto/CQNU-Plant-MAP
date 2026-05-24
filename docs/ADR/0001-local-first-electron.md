# ADR 0001: Local-First Electron Application

## Status

Accepted.

## Context

Campus plant survey work needs a desktop workflow that can operate with local project folders and does not require a server.

## Decision

Use Electron as the desktop runtime and store project data in user-selected local folders.

## Consequences

- Users control project storage and backups.
- Main process owns file-system access.
- Online map and reference services remain optional runtime dependencies.
- Future data migrations must preserve existing JSON projects.

