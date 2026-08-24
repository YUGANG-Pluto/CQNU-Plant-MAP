# ADR 0004: Data Storage Strategy

## Status

Accepted for JSON-compatible storage with an opt-in SQLite runtime utility.

## Context

Existing project folders use JSON files and image folders under `information/`. Users may already have local projects in that format.

The application now includes a guarded maintenance utility that can create SQLite storage from JSON and export that storage back to JSON. The utility is intended for controlled local storage use after explicit user action.

## Decision

Continue supporting JSON as the compatibility format. SQLite conversion is opt-in and must be started by the user from maintenance actions. After successful JSON to SQLite conversion, automatic project loading and saving use SQLite while explicit JSON loading remains available when JSON files exist. Every conversion write operation must create a pre-conversion backup and must preserve unknown JSON fields through compatibility payloads.

Do not introduce automatic project migration or renderer database access in this decision.

## Consequences

- Current projects remain readable.
- Renderer normalization handles older shapes.
- Backup and export continue to work with the JSON project folder.
- SQLite can become the active runtime storage only after explicit conversion.
- Automatic loading prefers SQLite when both formats exist; explicit JSON loading remains available for compatibility checks.
- Backup restore, source cleanup, and JSON export remain the rollback path.
