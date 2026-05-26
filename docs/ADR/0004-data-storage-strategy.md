# ADR 0004: Data Storage Strategy

## Status

Accepted for current JSON storage with an opt-in SQLite project-copy utility.

## Context

Existing project folders use JSON files and image folders under `information/`. Users may already have local projects in that format.

The application now includes a guarded maintenance utility that can create a SQLite copy from JSON and export that copy back to JSON. The utility is intended for controlled local storage checks and does not change the active runtime format.

## Decision

Continue supporting JSON as the active storage format. SQLite conversion is opt-in and must be started by the user from maintenance actions. Every write operation must create a pre-conversion backup and must preserve unknown JSON fields through compatibility payloads.

Do not introduce an automatic storage-mode switch, automatic project migration, or renderer database access in this decision.

## Consequences

- Current projects remain readable.
- Renderer normalization handles older shapes.
- Backup and export continue to work with the JSON project folder.
- The SQLite copy can be used for conversion validation without disabling JSON workflows.
- Active SQLite runtime storage still requires a separate approved scope, tests, and a documented rollback path.
