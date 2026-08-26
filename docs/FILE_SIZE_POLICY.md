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

There are currently no allowlisted source files and no source files above the 600-line warning threshold. Renderer smoke checks, renderer self-check contracts, and workspace primitive styles are split into domain modules while retaining stable entry files.

When a future file crosses the split-review threshold, add a focused split before adding an exception. An exception requires an active file path, a concrete ownership reason, and a removal condition in the executable size-check allowlist.

## Check Command

Run from `app/`:

```bash
npm run check:size
```

`npm run verify` includes this check. The check fails when a new source file grows beyond the split-review threshold without a documented reason.
