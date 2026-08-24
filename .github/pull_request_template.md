# Pull Request Checklist

## Summary

-

## Change Type

- [ ] Feature
- [ ] Fix
- [ ] Documentation
- [ ] Maintenance
- [ ] Release preparation

## Affected Modules

- [ ] Main process
- [ ] Preload API
- [ ] Renderer UI
- [ ] Map workflow
- [ ] Project data
- [ ] Import/export
- [ ] Backup or maintenance
- [ ] Documentation only

## Data Format Impact

- [ ] No project data format change.
- [ ] Existing JSON project files remain compatible.
- [ ] Migration or rollback path is documented if needed.

## Compatibility

- [ ] Existing project folders can still be opened.
- [ ] Existing CSV and GeoJSON export expectations remain compatible.
- [ ] User workflow changes are documented if present.

## Security Impact

- [ ] Renderer permissions are unchanged.
- [ ] Preload API remains business-scoped.
- [ ] File-system paths remain validated in the main process.
- [ ] External links or third-party service behavior are unchanged, or documented.

## User Interface Impact

- [ ] No UI change.
- [ ] UI change was manually smoke tested.
- [ ] User workflow changes are documented.

## Verification

- [ ] `npm run check:repo`
- [ ] `npm run check:syntax`
- [ ] `npm run self-check`
- [ ] `npm test`
- [ ] `npm run verify`
- [ ] Manual smoke test completed when UI or data behavior changed.

## Documentation

- [ ] No documentation update needed.
- [ ] README or user docs updated.
- [ ] Development, testing, security, or release docs updated.

## Rollback

- [ ] Revert this change without data migration.
- [ ] Rollback notes are included for data or release changes.

## Release Impact

- [ ] No release impact.
- [ ] Changelog updated.
- [ ] Installer build checked separately.
