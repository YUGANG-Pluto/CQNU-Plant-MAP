# VibeUI design-md adaptation

This note records the style-only adaptation applied after reviewing VibeUI and selected design-md references.

## Sources

- VibeUI: https://vibeui.top/
- Awesome Design MD repository: https://github.com/VoltAgent/awesome-design-md
- Linear design-md: https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/linear.app/DESIGN.md
- Figma design-md: https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/figma/DESIGN.md
- IBM Carbon / design language references from the design-md index were used as direction for data density, grid discipline, and chart readability.
- Figma prototype animation guidance: https://help.figma.com/hc/en-us/articles/360040522373-Prototype-animations
- Canva movement and motion-path guidance: https://www.canva.com/learn/how-to-create-movement-in-design/ and https://www.canva.com/features/motion-path-animator/
- Material motion duration/easing guidance: https://m1.material.io/motion/duration-easing.html
- GitHub Primer product UI guidance: https://primer.style/product/getting-started/

## Safe boundary

- No IPC, file format, project data, map tile source, or packaging logic was changed.
- The new layer is `src/renderer/styles/70-vibeui-design-md.css` and is imported last from `app.css`.
- Existing theme IDs stay at six active families. Legacy theme compatibility stays in normalization code.
- Glass remains lightweight: no external asset localization and no local basemap packaging.
- Motion respects the existing `.motion-disabled` and `prefers-reduced-motion` contracts.

## Translation rules

- Field Notebook: warm field-work surface, map-first hierarchy, low decorative weight.
- Scientific White: grid discipline, square controls, no heavy shadow.
- Botanical Scientific: restrained green lab tone with readable white working surfaces.
- Linear Minimal: border-led, low-shadow, durable for long data entry sessions.
- Deep Slate: dark professional shell with light work cards and stronger layer separation.
- Flow Data: chart-forward but restrained, with better card depth and visual grouping.

## Implementation scope

- Added shared `--vibe-*` tokens for line strength, panel wash, and easing.
- Harmonized chart cards, legends, donut center plates, and bar depth with the active theme.
- Added subtle hover lift for safe surfaces and precise non-playful feedback for danger buttons.
- Kept mobile hover behavior quiet to avoid layout jumps on narrow screens.

## Motion consolidation pass

- Kept the motion system lightweight: no animation library, no remote assets, no extra package install.
- Added reusable CSS-only keyframes for panel entry, advanced settings reveal, chart reveal, bar rise, point reveal, donut slice fade, legend entry, and status pulse.
- Scoped the richer chart and workspace sequence animations to `.motion-mode-rich`; standard mode keeps short transitions and existing modal behavior.
- Added chart render hooks (`--chart-index`, `--slice-index`, `--legend-index`) so stagger timing is declarative and removable without changing data logic.
- Preserved accessibility and safety boundaries through `.motion-disabled` and `prefers-reduced-motion`; mobile also collapses stagger delays to reduce visual noise.
- Design rationale: Figma informed matched-layer/state transitions, Canva informed directional visual flow without adding decorative clutter, Material informed short desktop durations, Primer reinforced compact and task-focused UI behavior.

## Statistics center polish

- Kept statistical calculations and chart types unchanged.
- Tightened the stats modal hierarchy: KPI chips, controls, chart cards, legends, scroll hints, and empty states now have a consistent density and border rhythm.
- Added a dedicated `chart-empty-state` surface for empty bar/combo charts instead of using generic muted body text.
- Kept chart overflow lightweight through native horizontal scrolling and styled scrollbars; no charting library or canvas dependency was added.
- Improved SVG value label readability with a subtle text stroke while leaving the generated values and titles unchanged.
- Mobile rules collapse the stats controls, card grid, and legends into one column to avoid cramped labels.

## Theme and motion maintenance pass

- Theme keep list stays at six active styles: `field-notebook`, `scientific-white`, `botanical-scientific`, `linear-minimal`, `deep-slate`, and `flow-data`.
- Compatibility-only legacy styles remain in `LEGACY_UI_STYLE_MAP`; no old CSS selectors are reintroduced.
- `field-notebook` remains the default because it is map-first, light, and readable for daily data entry.
- `scientific-white` and `linear-minimal` are both retained, but with different roles: scientific grid discipline versus low-shadow long-session editing.
- `deep-slate` and `flow-data` are retained as high-contrast / chart-forward options, but are treated as stronger visual personalities rather than defaults.
- Statistics modal chart cards no longer lift on hover; they use border and shadow feedback so the chart stays stationary during inspection.
- Donut and pie charts use one stage reveal plus slice fade, not nested SVG reveal plus slice reveal, to avoid over-animated chart entry.
- Donut slice stagger is capped through `--vibe-chart-slice-stagger` so rich motion remains visible without becoming slow on category-heavy charts.

## Future cleanup candidates

- Add Playwright or Electron screenshot checks once dependencies are available.
- Consider chart-type-specific labels or tooltips after the statistical drawing contract is stable.

## Brand and chart structure cleanup

- The app now uses a single faithful SVG badge traced from the original CQNU PNG logo. The earlier simplified logo SVGs were removed because they did not match the original badge.
- The visible brand color/display controls were removed to avoid hidden visual drift from the required original logo appearance. Old `uiTheme.brand` fields remain normalized for compatibility only.
- Statistics modal chart cards now share one renderer for title, caption, and body structure. This keeps future chart polish focused in one place instead of repeating card markup in every tab.
- Custom statistics metric selectors now render their selected values directly, reducing after-render correction logic.
