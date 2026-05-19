# Settings simplification audit

This is a no-behavior-change inventory for the next UI simplification step.

## Current setting groups

Theme token and legacy effect controls:

- `data-effect="glassOpacity"` -> `uiTheme.effects.glassOpacity`
- `data-effect="glassBlur"` -> `uiTheme.effects.glassBlur`
- `data-effect="radius"` -> `uiTheme.effects.radius`
- `data-effect="shadowStrength"` -> `uiTheme.effects.shadowStrength`
- `data-effect="contrast"` -> `uiTheme.effects.contrast`

Glass controls:

- `data-glass="mode"` -> `uiTheme.glass.mode`
- `data-glass="opacity"` -> `uiTheme.glass.opacity`
- `data-glass="blur"` -> `uiTheme.glass.blur`
- `data-glass="saturate"` -> `uiTheme.glass.saturate`
- `data-glass="highlight"` -> `uiTheme.glass.highlight`
- `data-glass="shadow"` -> `uiTheme.glass.shadow`
- `data-glass="brightness"` -> `uiTheme.glass.brightness`
- `data-glass="apply.modules"` -> `uiTheme.glass.apply.modules`
- `data-glass="apply.controls"` -> `uiTheme.glass.apply.controls`
- `data-glass="apply.mapBadges"` -> `uiTheme.glass.apply.mapBadges`
- `data-glass="apply.charts"` -> `uiTheme.glass.apply.charts`
- `data-glass="apply.settings"` -> `uiTheme.glass.apply.settings`

Progress controls:

- `data-progress="height"` -> `uiTheme.progress.height`
- `data-progress="mode"` -> `uiTheme.progress.mode`
- `data-progress="showPercent"` -> `uiTheme.progress.showPercent`
- `data-progress="showStage"` -> `uiTheme.progress.showStage`
- `data-progress="glass"` -> `uiTheme.progress.glass`

Motion controls:

- `data-motion="mode"` -> `uiTheme.motion.mode`
- `data-motion="speedMultiplier"` -> `uiTheme.motion.speedMultiplier`
- `data-motion="fadeDuration"` -> `uiTheme.motion.fadeDuration`
- `data-motion="transitionDuration"` -> `uiTheme.motion.transitionDuration`
- `data-motion="modalDuration"` -> `uiTheme.motion.modalDuration`
- `data-motion="stagger"` -> `uiTheme.motion.stagger`
- `data-motion="hoverLift"` -> `uiTheme.motion.hoverLift`
- `data-motion="scaleEnter"` -> `uiTheme.motion.scaleEnter`
- `data-motion="scalePress"` -> `uiTheme.motion.scalePress`
- `data-motion="easing"` -> `uiTheme.motion.easing`
- `data-motion="hover"` -> `uiTheme.motion.hover`
- `data-motion="modal"` -> `uiTheme.motion.modal`
- `data-motion="layout"` -> `uiTheme.motion.layout`
- `data-motion="themeTransition"` -> `uiTheme.motion.themeTransition`
- `data-motion="reduced"` -> `uiTheme.motion.reduced`

Status and brand controls:

- `data-status-color="success|danger|warning|unknown|enabled|disabled"` -> `uiTheme.statusColors`
- `data-brand="style"` -> `uiTheme.brand.style`
- `data-brand="display"` -> `uiTheme.brand.display`
- `data-brand="hue"` -> `uiTheme.brand.hue`
- `data-brand="saturation"` -> `uiTheme.brand.saturation`
- `data-brand="lightness"` -> `uiTheme.brand.lightness`

## Safe simplification and deletion strategy

Do first:

- Keep every persisted field and normalizer.
- Delete bad or redundant controls when safety checks pass; do not hide poor effects just to avoid deletion.
- Change visibility, grouping, and labels only for controls that still have clear user value.
- Put low-frequency but useful controls behind an Advanced section.
- Keep reset buttons for glass, brand, and status colors.

Good first candidates for progressive disclosure:

- `uiTheme.motion.*` detailed sliders except `mode` and `reduced`.
- `uiTheme.glass.*` detailed sliders except `mode`.
- `uiTheme.effects.glassOpacity` and `uiTheme.effects.glassBlur`, because they overlap conceptually with `uiTheme.glass.opacity` and `uiTheme.glass.blur`; do not remove until compatibility is verified.
- Brand hue/saturation/lightness can be advanced if `style` and `display` remain visible.

Good first candidates for deletion or merge after compatibility checks:

- Glass modes whose only difference is small opacity/blur/saturation variation.
- Motion sliders that are fully represented by stronger presets and rarely need manual adjustment.
- Theme presets that are only color swaps without distinct layout, density, or chart grammar.
- Chart effects that create fake depth but reduce value comparison accuracy.

Do not remove until migration/compatibility is proven:

- `uiTheme.effects.*`, because older themes and presets still read these values.
- `uiTheme.glass.apply.*`, because it controls where the glass effect is applied and has no equivalent single setting.
- `uiTheme.statusColors`, because progress, status checks, and toggles depend on it.

## Required checks for next edit

- Existing `settings.json` with old `uiTheme` must normalize without data loss.
- `index.html` script order must still load `theme/config.js` before `theme/index.js`.
- Run `npm test`.
- Run full `node --check` for all JS files.

## 2026-05-18 pruning decision

Theme presets were reduced to six active choices:

- `field-notebook`
- `scientific-white`
- `botanical-scientific`
- `linear-minimal`
- `deep-slate`
- `flow-data`

Removed from active choices and mapped for compatibility:

- `cloud-soft` -> `field-notebook`
- `lavender-soft` -> `flow-data`
- `nordic-minimal` -> `linear-minimal`
- `deep-indigo` -> `deep-slate`
- `dimensional-chart` -> `flow-data`

Glass modes were reduced to:

- `off`
- `light`
- `liquid`

Removed from active choices and mapped for compatibility:

- `standard` -> `light`
- `bright` -> `light`
- `dark` -> `liquid`

Rationale:

- The removed themes were mainly palette variants or over-specialized visual treatments.
- The removed glass modes were intermediate opacity/blur combinations with weak user-facing distinction.
- Compatibility maps keep older `settings.json` values usable while preventing the visible UI from carrying redundant options.

## 2026-05-18 CSS residue cleanup

Completed:

- Removed legacy theme-only CSS selectors for `cloud-soft`, `lavender-soft`, `nordic-minimal`, `deep-indigo`, and `dimensional-chart`.
- Kept `LEGACY_UI_STYLE_MAP` unchanged so older project settings still normalize to the six active themes.
- Kept `THEME_STYLE_CLASSES` able to remove legacy classes from the root element during theme application.
- Added self-check coverage to prevent legacy theme selectors from re-entering stylesheet files.

No persisted fields were removed, no project data migration was introduced, and no IPC, packaging, or basemap-loading behavior changed.

## 2026-05-18 settings panel regrouping

Completed:

- Kept high-frequency controls visible: theme preset, layout preset, glass mode, progress mode, motion mode, reduced motion, and brand display/style.
- Moved low-frequency controls into native `details` advanced groups: color token tuning, legacy texture sliders, glass numeric parameters/scopes, detailed motion sliders, status colors, and brand hue/saturation/lightness.
- Kept every existing control id and `data-*` binding so renderer event handlers and persisted fields continue to work.
- Added self-check coverage for advanced grouping, unique HTML ids, retained controls, and new i18n keys.

This step improves visual clarity and maintainability without deleting settings, changing defaults, or altering normalizers.

## 2026-05-18 second-pass slimming audit

Scope:

- Audit only; no UI controls, persisted fields, defaults, normalizers, or compatibility maps were removed in this pass.
- Current visible/bound setting surface contains 5 `data-effect`, 11 `data-glass`, 5 `data-progress`, 14 `data-motion`, 6 `data-status-color`, and 5 `data-brand` controls.
- `theme/config.js` is still the source of defaults and compatibility maps; `theme/index.js` owns normalization, CSS variable output, and control syncing.

### Must keep visible

These are high-value user-facing choices and should remain first-level controls:

- Theme preset: `themeStylePresets`
- Layout preset: `themeLayoutPresets`
- Glass mode: `data-glass="mode"`
- Progress mode: `data-progress="mode"`
- Motion mode: `data-motion="mode"`
- Reduced motion: `data-motion="reduced"`
- Brand icon style/display: `data-brand="style"` and `data-brand="display"`
- Theme reset/apply actions: `btnResetThemeAll`, `btnSaveTheme`

Reason:

- They select clear presets or accessibility-critical behavior.
- They map directly to visible UI state and are easier to explain than raw numeric sliders.
- Removing them would make the settings panel less usable rather than lighter.

### Keep, but keep behind Advanced

These fields have legitimate expert value but should not return to the primary surface:

- Token editing: `THEME_COLOR_SLOTS`, `themeHue`, `themeSaturation`, `themeLightness`, `themeTokenColorGrid`
- Chart palette generation: `btnGenerateChartPalette`
- Glass scopes: `glass.apply.modules`, `controls`, `mapBadges`, `charts`, `settings`
- Status colors: `success`, `danger`, `warning`, `unknown`, `enabled`, `disabled`
- Detailed motion sliders/toggles: `speedMultiplier`, `fadeDuration`, `transitionDuration`, `modalDuration`, `stagger`, `hoverLift`, `scaleEnter`, `scalePress`, `easing`, `hover`, `modal`, `layout`, `themeTransition`
- Brand color sliders: `brand.hue`, `brand.saturation`, `brand.lightness`

Reason:

- They are useful for fine tuning and compatibility testing.
- They are low-frequency controls and can overwhelm ordinary use.
- They should remain reachable until a safer preset-only path is proven.

### Low-risk UI removal candidates

These can likely be removed from the UI in the next implementation pass while keeping persisted fields and normalizers:

- `themeAlpha`
  - Risk: Low.
  - Evidence: it writes `uiTheme.effects.glassOpacity` through `setThemeEffect`, but `applyThemeVariables()` no longer reads `effects.glassOpacity` directly for the actual glass CSS variables.
  - Recommendation: delete the control from `index.html` and `src/renderer/dom/elements.js`; keep the persisted field and normalizer.

- `themeContrast`
  - Risk: Low to medium.
  - Evidence: `effects.contrast` is normalized and synced, but no current CSS variable is derived from it in `applyThemeVariables()`.
  - Recommendation: remove from UI only after one manual visual pass confirms no expected contrast behavior is missing.

- One of the duplicate glass opacity/blur pairs:
  - `themeGlassOpacity` / `themeGlassBlur` are legacy texture controls.
  - `themeGlassEffectOpacity` / `themeGlassEffectBlur` are the newer glass-system controls.
  - Recommendation: keep the newer `data-glass` controls, remove the older `data-effect="glassOpacity|glassBlur"` UI controls, and keep compatibility logic that mirrors old saved effects into glass defaults if needed.

### Medium-risk merge candidates

These should be merged only after a small compatibility edit and a self-check update:

- Progress detail controls: `progressShowPercent`, `progressShowStage`, `progressGlass`, `progressHeight`
  - Proposed merge: keep `progressMode` visible, move or remove detail toggles from the normal flow.
  - Risk: Medium, because progress cards are user-visible during backups/imports/exports.
  - Safer path: keep them in Advanced for now, do not delete in the next pass.

- Motion individual toggles: `hover`, `modal`, `layout`, `themeTransition`
  - Proposed merge: rely on `motionMode` plus `reduced`.
  - Risk: Medium, because current CSS classes are toggled independently and are useful for debugging.
  - Safer path: keep in Advanced until preset behavior is stable after real UI testing.

- Glass apply scopes:
  - Proposed merge: convert to three presets later, for example `workspace`, `map-heavy`, `full`.
  - Risk: Medium to high, because scope classes directly affect modules, controls, map badges, charts, and settings.
  - Safer path: keep the scope checkboxes in Advanced.

### Do not delete now

These should stay as persisted fields and normalizers even if their UI controls are eventually removed:

- `uiTheme.effects.*`
- `uiTheme.glass.*`
- `uiTheme.glass.apply.*`
- `uiTheme.progress.*`
- `uiTheme.motion.*`
- `uiTheme.statusColors`
- `uiTheme.brand.*`
- `LEGACY_UI_STYLE_MAP`, `LEGACY_GLASS_MODE_MAP`, and `THEME_STYLE_CLASSES`

Reason:

- Existing `settings.json` files may contain these keys.
- Normalizers provide backward compatibility and safe clamping.
- Removing data fields would be a migration, not a UI simplification.

### Recommended implementation options

Option A - conservative UI cleanup:

- Remove only `themeAlpha`.
- Keep every other control where it is.
- Add a self-check proving `themeAlpha` is no longer present while `effects.glassOpacity` still normalizes.
- Lowest risk, small visual simplification.

Option B - practical cleanup:

- Remove `themeAlpha`, `themeContrast`, `themeGlassOpacity`, and `themeGlassBlur` from the UI.
- Keep `uiTheme.effects.*` in presets and normalizers.
- Keep `themeRadius` and `themeShadowStrength`, because they still drive `--radius-*` and `--shadow-*`.
- Add a self-check ensuring the newer `data-glass="opacity|blur"` controls remain.
- Best balance for "small and maintainable".

Option C - preset-first cleanup:

- Do Option B.
- Move progress detail controls into a deeper Advanced subgroup.
- Keep motion detail controls but make the preset mode visually dominant.
- Medium risk only because it changes UI hierarchy more than Option B.

Option D - aggressive cleanup:

- Remove most motion detail toggles, progress detail toggles, glass scope checkboxes, and status color controls from the UI.
- Keep only presets and reset buttons.
- Not recommended yet; it would reduce expert maintainability and needs real Electron visual testing first.

Recommended next pass:

- Execute Option B.
- Do not delete any persisted fields or normalizers.
- Update self-check to assert that removed UI controls are absent and replacement controls remain.
- Run `npm test`, full JS `node --check`, CSS brace checks, and HTML id uniqueness checks.

## 2026-05-18 Option B implementation

Completed:

- Removed these visible UI controls from `index.html`:
  - `themeAlpha`
  - `themeGlassOpacity`
  - `themeGlassBlur`
  - `themeContrast`
- Removed the same controls from the DOM registry in `src/renderer/dom/elements.js`.
- Kept replacement/current controls:
  - `themeGlassEffectOpacity`
  - `themeGlassEffectBlur`
  - `themeRadius`
  - `themeShadowStrength`
- Kept `uiTheme.effects.glassOpacity`, `uiTheme.effects.glassBlur`, and `uiTheme.effects.contrast` normalization in `theme/index.js`.
- Added self-check coverage so removed UI controls do not re-enter the visible settings surface while compatibility normalization remains.

No persisted field, default preset, old project compatibility map, IPC route, package dependency, or basemap behavior was changed.

## 2026-05-18 Option C hierarchy slimming

Completed:

- Kept the first-level visual feedback surface to three high-frequency choices:
  - `progressMode`
  - `motionMode`
  - `motionReduced`
- Moved these progress detail controls into the existing Advanced motion/progress/status section:
  - `progressHeight`
  - `progressShowPercent`
  - `progressShowStage`
  - `progressGlass`
- Kept every control id and `data-progress` binding unchanged, so existing event handlers, persisted fields, defaults, and normalizers continue to work.
- Added self-check coverage to ensure progress detail controls remain reachable but do not return to the primary settings surface.

No persisted field, package dependency, IPC route, data migration, or visual default was changed.

## 2026-05-18 Brand and statistics cleanup

Completed:

- Replaced runtime brand usage with `src/renderer/assets/brand/cqnu-logo.svg`, traced from the original `title-logo.png` so the visible CQNU badge style is preserved.
- Removed the previous simplified SVG logo assets and PNG logo assets from the runtime brand folder:
  - `app-logo-full.svg`
  - `app-logo-mark.svg`
  - `source-logo.png`
  - `title-logo.png`
- Removed the visible brand icon color/display controls because they could conflict with the requirement that the original logo appearance stay unchanged.
- Kept `uiTheme.brand` normalization in code so old `settings.json` files remain readable; the fields are now compatibility-only and do not create a visible settings surface.
- Moved quick color palettes into Advanced color and kept chart palette tuning as the intended expert use case.
- Added a shared statistics chart-card renderer for title/caption structure and fixed custom-stat metric selects so they render the current selected metric directly.

No persisted field was deleted, and no IPC route, data migration, package dependency, basemap behavior, or statistical calculation was changed.

## 2026-05-18 Maintenance foundation step 1

Completed:

- Added a single Maintenance Center entry instead of scattering three new tool panels across the main UI.
- Added project health checks for missing IDs, duplicate visible codes, orphan points, invalid coordinates, missing names, missing phenology entries, duplicated image references, and missing image files.
- Added conservative repair only for safe structural fixes:
  - fill missing internal IDs,
  - fill missing visible zone/point codes,
  - normalize record shape through the existing normalizers,
  - remove duplicate image references inside the same phenology entry.
- Added log and diagnostic UI backed by main-process log listing, retention cleanup, and JSON diagnostic export.
- Added settings safe mode plus UI settings import/export for language, `uiTheme`, and `statsCustom` only.
- Added self-check coverage for the new IPC contract, guarded image-reference checks, maintenance UI wiring, and reduced `innerHTML` exposure.

No record deletion, coordinate correction, orphan-point reassignment, basemap localization, dependency change, package build change, or persisted field migration was introduced.

## 2026-05-19 Safe mode flow and README correction

Completed:

- Reworked Maintenance Center safe mode into a complete flow:
  - entering safe mode stores the previous `uiTheme`,
  - applies a lightweight linear theme,
  - turns glass effects off,
  - turns motion off,
  - shows an explicit safe-mode status,
  - provides an exit action that restores the saved previous UI settings.
- Replaced maintenance confirmation cancel labels with a generic cancel label instead of the point-creation-specific label.
- Updated README into a Chinese/English user manual focused on features, usage workflow, project data, maintenance center, import/export, and data-safety notes.

No zone, point, image, basemap, IPC safety boundary, package dependency, or build configuration was changed.
