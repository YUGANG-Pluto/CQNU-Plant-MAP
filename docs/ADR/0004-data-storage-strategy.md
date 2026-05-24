# ADR 0004: Data Storage Strategy

## Status

Accepted for current JSON storage; database structure changes are deferred.

## Context

Existing project folders use JSON files and image folders under `information/`. Users may already have local projects in that format.

## Decision

Continue supporting JSON as the active storage format. Do not introduce database tables, schema migrations, or format-conversion code in the current work. Any future database storage effort must be reopened as a separate migration task with backup, rollback, compatibility, and test rules.

## Consequences

- Current projects remain readable.
- Renderer normalization handles older shapes.
- Backup and export continue to work with the JSON project folder.
- Database migration must not be introduced without a separate approved scope, tests, and a documented upgrade path.
