# Data Migration Plan

## Current Rule

Current project data is JSON-based. Missing optional fields are normalized at load time and are written only when the user saves the project through normal workflows.

## Compatibility Requirements

- Existing JSON projects remain valid.
- Missing optional fields are allowed.
- Unknown fields are preserved.
- No automatic rewrite happens only to add metadata.
- A backup is required before any future storage format conversion.

## Field Evolution

| Area | Rule |
| --- | --- |
| Taxonomy fields | Optional on old records; manual edits and suggestions are stored on save. |
| Phenology entries | Continue to load from `phenologyEntries`, `phenology`, or compatible legacy shapes. |
| Image references | Remain project-relative. |
| Zone references | Continue to accept `zoneRef`, `zoneId`, `zone`, and compatible legacy fields. |
| Settings | Unknown settings fields remain untouched. |

## Future Migration Workflow

1. Load and validate source data.
2. Create a backup.
3. Convert into a temporary target.
4. Run consistency checks.
5. Write a report.
6. Replace the active target only after validation passes.
7. Keep rollback instructions visible in the report.

## Verification Before Enabling A Migration

- `npm run verify` passes.
- The in-memory JSON/table-model round-trip check passes.
- The conversion report and backup preflight plan checks pass.
- Dedicated conversion tests exist.
- Round-trip JSON output is stable.
- Failure cases leave the source project unchanged.
- Manual backup and restore still work.
