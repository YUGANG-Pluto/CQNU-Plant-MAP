# File Size Policy

## Purpose

Large source files are allowed only when they have a clear ownership reason and a documented split path. The goal is to keep feature work reviewable without forcing mechanical rewrites.

## Thresholds

| Lines | Status | Rule |
| --- | --- | --- |
| 0-300 | Normal | No action needed. |
| 301-600 | Acceptable | Keep cohesive and avoid unrelated growth. |
| 601-800 | Warning | Prefer extracting reusable helpers during related work. |
| 801-1000 | Split review | New growth should include a section split or a reason to defer. |
| Over 1000 | Allowlist required | The file must have a documented reason and a future split direction. |

## Current Split Review Notes

| File | Reason |
| --- | --- |
| `app/index.html` | Single-window Electron shell. Split only with renderer component extraction. |
| `app/scripts/self-check.js` | Central contract harness. Split after stable domain test groups are defined. |
| `app/src/main/speciesReferenceService.js` | Reference lookup service with provider normalization. Split by provider after interface contracts stabilize. |
| `app/src/renderer/app.js` | Renderer coordinator with feature binding. Split after module event boundaries are stable. |
| `app/src/renderer/features/basemap/index.js` | Basemap workflow module with UI wiring and provider rules. |
| `app/src/renderer/features/maintenance/index.js` | Maintenance workflow module with diagnostics and repair actions. |
| `app/src/renderer/features/stats/index.js` | Statistics center UI module scheduled for gradual section extraction. |
| `app/src/renderer/features/stats/statsResearch.js` | Pure statistics and export helpers kept together for formula consistency. |
| `app/src/renderer/features/theme/index.js` | Theme editor workflow module with preview and persistence wiring. |
| `app/src/renderer/i18n/en.js` | English UI dictionary. Split by feature after key ownership is stabilized. |
| `app/src/renderer/i18n/zh.js` | Chinese UI dictionary. Split by feature after key ownership is stabilized. |
| `app/src/renderer/styles/10-core-components.css` | Shared component CSS bundle. Split with design token stabilization. |
| `app/src/renderer/styles/20-theme-layouts.css` | Theme and layout CSS bundle. Split after theme token names stabilize. |
| `app/src/renderer/styles/40-workspace-basemap.css` | Workspace and basemap CSS bundle. Split with renderer view extraction. |
| `app/src/renderer/styles/70-vibeui-design-md.css` | Design adaptation CSS bundle. Split after the adapted pattern set is stable. |

## Check Command

Run from `app/`:

```bash
npm run check:size
```

`npm run verify` includes this check. The check fails when a new source file grows beyond the split-review threshold without a documented reason.
