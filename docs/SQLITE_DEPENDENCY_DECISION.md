# SQLite Dependency Decision

## Status

Decision record for future SQLite runtime work. The `better-sqlite3` dependency probe is active, and a guarded Project storage conversion utility is available for explicit maintenance actions. JSON remains the active runtime storage format.

The better-sqlite3 dependency probe is active for Electron main-process validation.

Package metadata and local dependency behavior were checked on 2026-05-25 with the selected package installed in the application workspace.

## Current Runtime Context

| Area | Current value |
| --- | --- |
| Desktop runtime | Electron `^31.7.7` |
| Current Node dependency floor | `better-sqlite3` is installed for the dependency probe. |
| Active project storage | JSON project folder under `information/`. |
| Renderer database access | Not allowed. |
| Main process database access | Allowed only through a narrow project-conversion service in a future phase. |

## Candidate Packages

| Package | Current checked version | License | Notes |
| --- | --- | --- | --- |
| `better-sqlite3` | `12.10.0` | MIT | Synchronous native binding, small API, good fit for main-process conversion work if native packaging verifies. |
| `sqlite3` | `6.0.1` | BSD-3-Clause | Native binding with callback-oriented API. Viable fallback if packaging works better for the target environment. |
| `sql.js` | `1.14.1` | MIT | WebAssembly-based. Avoid as first choice for project-folder persistence because file handling and memory behavior need extra design. |

## Probe Result

| Check | Result |
| --- | --- |
| Package installed | Pass: `better-sqlite3` `12.10.0`. |
| Electron native rebuild | Pass: rebuilt for Electron `31.7.7`. |
| Electron main-process load | Pass: `sqlite:probe` can load the package. |
| Temporary database create | Pass: probe database is created under the system temporary directory. |
| Parameterized query | Pass: insert and select use prepared statements. |
| Close and cleanup | Pass: probe closes the database and removes the temporary directory. |
| Schema readiness check | Pass: `db:check-schema` creates the planned tables in a temporary database and removes the temporary directory. |
| Temporary conversion test | Pass: `db:test-conversion` round-trips synthetic JSON fixtures through a temporary database and removes the temporary directory. |
| Project storage conversion | Pass: maintenance actions can create `information/data.db` after `json_turn_sqlite` backup and export that SQLite storage back to JSON after `sqlite_turn_json` backup. |
| Node ABI diagnostic | Not a runtime gate: Node CLI loading can fail after rebuilding the native module for Electron ABI. |
| Installer packaging | Pass: `npm run dist` completes with `better-sqlite3` native dependency rebuild. |
| Packaged app runtime DB load | Planned: packaged conversion smoke testing remains a release gate. |
| Active SQLite runtime storage | Not implemented. |

## Active Probe Direction

Use `better-sqlite3` for the active dependency probe and the first real SQLite prototype only if the probe passes on the target Windows environment.

Reasoning:

- The database work belongs in the main process, where synchronous conversion steps are easier to keep transactional.
- The API is compact enough for a narrow conversion service.
- The license is compatible with the current private application model.
- The current engine metadata covers the Node range used by modern Electron toolchains.

## Fallback Direction

Use `sqlite3` only if `better-sqlite3` fails installation, native loading, or packaging validation in the target environment.

Do not use `sql.js` for the first persistent project database implementation unless native packages are rejected and a separate file-persistence design is approved.

## Required Probe Before Runtime Use

Before using the SQLite dependency in runtime conversion code, verify:

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

The renderer may request only business operations such as conversion preflight, creating a SQLite copy, export back to JSON, and report retrieval.

## Minimal Future IPC Shape

Current and future commands must stay narrow:

| Channel | Payload | Result |
| --- | --- | --- |
| `storage:conversionPreflight` | `{ projectDir }` | conversion report and backup preflight plan |
| `storage:createSqliteFromJson` | `{ projectDir, backupDir? }` | conversion report |
| `storage:exportSqliteToJson` | `{ projectDir, backupDir? }` | export report |

These channels must reuse trusted project-directory checks and must not expose SQL execution.

## Decision Boundary

This decision authorizes only the guarded project conversion utility and dependency probe. Automatic loading prefers SQLite when both formats are present, but a broader active-storage policy still requires separate review.
