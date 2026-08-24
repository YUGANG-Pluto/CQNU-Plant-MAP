# ADR 0003: IPC Security Boundary

## Status

Accepted.

## Context

The renderer needs project, image, backup, log, and reference operations, but direct file-system access would expand risk.

## Decision

Expose a narrow `window.plantApp` business API through preload. Validate IPC sender origin in the main process. Keep path checks in `pathGuard`.

## Consequences

- Renderer code stays free of Node file-system and process APIs.
- IPC returns a stable `{ ok, data, error }` shape.
- New file operations must be added as business services, not generic file commands.

