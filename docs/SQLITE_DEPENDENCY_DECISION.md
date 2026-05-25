# SQLite Dependency Decision

## Status

Decision record for future SQLite runtime work. No SQLite dependency is currently installed, and no runtime database code is enabled.

Package metadata was checked on 2026-05-25 through npm package metadata only. No package installation was performed.

## Current Runtime Context

| Area | Current value |
| --- | --- |
| Desktop runtime | Electron `^31.7.7` |
| Current Node dependency floor | Package dependencies are JavaScript-only except Electron tooling. |
| Active project storage | JSON project folder under `information/`. |
| Renderer database access | Not allowed. |
| Main process database access | Allowed only through a narrow project-conversion service in a future phase. |

## Candidate Packages

| Package | Current checked version | License | Notes |
| --- | --- | --- | --- |
| `better-sqlite3` | `12.10.0` | MIT | Synchronous native binding, small API, good fit for main-process conversion work if native packaging verifies. |
| `sqlite3` | `6.0.1` | BSD-3-Clause | Native binding with callback-oriented API. Viable fallback if packaging works better for the target environment. |
| `sql.js` | `1.14.1` | MIT | WebAssembly-based. Avoid as first choice for project-folder persistence because file handling and memory behavior need extra design. |

## Preferred Direction

Use `better-sqlite3` for the first real SQLite prototype only after a dedicated install and packaging probe passes on the target Windows environment.

Reasoning:

- The database work belongs in the main process, where synchronous conversion steps are easier to keep transactional.
- The API is compact enough for a narrow conversion service.
- The license is compatible with the current private application model.
- The current engine metadata covers the Node range used by modern Electron toolchains.

## Fallback Direction

Use `sqlite3` only if `better-sqlite3` fails installation, native loading, or packaging validation in the target environment.

Do not use `sql.js` for the first persistent project database implementation unless native packages are rejected and a separate file-persistence design is approved.

## Required Probe Before Adding A Dependency

Before adding any SQLite dependency to `package.json`, run a separate probe branch or local checkpoint that verifies:

1. Install succeeds with the selected registry source.
2. `npm run verify` still passes.
3. Electron main process can load the package.
4. `electron-builder` can package a Windows installer.
5. The packaged application can open and close a test database in a temporary directory.
6. No SQLite binary, database file, or generated build output is committed.

## Runtime Boundary

Future SQLite access must stay behind a main-process service. Renderer code must not receive:

- SQL strings;
- absolute database paths;
- file handles;
- raw database connections;
- complete project directory listings.

The renderer may request only business operations such as conversion preflight, conversion execution, export back to JSON, and report retrieval.

## Minimal Future IPC Shape

Potential future commands, subject to later implementation review:

| Channel | Payload | Result |
| --- | --- | --- |
| `storage:conversionPreflight` | `{ projectDir, direction }` | conversion report and backup preflight plan |
| `storage:convertJsonToSqlite` | `{ projectDir, backupDir? }` | conversion report |
| `storage:exportSqliteToJson` | `{ projectDir, backupDir? }` | export report |

These channels must reuse trusted project-directory checks and must not expose SQL execution.

## Decision Boundary

This decision does not authorize runtime SQLite implementation. It only defines the dependency direction and security boundary for the next implementation phase.

