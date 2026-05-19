# Pull Request Checklist

## Summary

- 

## Scope

- [ ] No project data, images, logs, backups, tokens, diagnostics, or temporary exports are included.
- [ ] No unrelated feature or formatting churn is mixed into this change.
- [ ] User-facing documentation is updated when behavior changes.

## Compatibility

- [ ] Existing JSON project files remain compatible, or a migration path is documented.
- [ ] User workflow changes are documented.
- [ ] Electron preload, IPC, and file-system boundaries are unchanged, or reviewed as part of this change.
- [ ] License, privacy, and third-party notices are updated if needed.

## Verification

- [ ] `npm run check:repo`
- [ ] `npm run check:syntax`
- [ ] `npm run self-check`
- [ ] `npm test`
- [ ] `npm run verify`
- [ ] Manual smoke test completed when UI or data behavior changed.

## Release Impact

- [ ] No release impact.
- [ ] Changelog updated.
- [ ] Installer build checked separately.
