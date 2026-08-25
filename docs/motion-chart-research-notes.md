# Motion and chart research notes

Purpose: prepare the next UI/theme/statistics-center redesign without changing behavior in this pass.

## References

- Material Design motion duration and easing: https://m1.material.io/motion/duration-easing.html
- Material Design motion principles: https://m1.material.io/motion/material-motion.html
- Apple Human Interface Guidelines - Motion: https://developer.apple.com/design/Human-Interface-Guidelines/motion
- Microsoft Fluent 2 - Motion: https://fluent2.microsoft.design/motion
- W3C WCAG reduced motion technique: https://www.w3.org/WAI/WCAG21/Techniques/css/C39.html
- SAP Fiori motion overview: https://www.sap.com/design-system/fiori-design-web/v1-136/foundations/interaction/motion-design-overview
- Canva visual hierarchy: https://www.canva.com/learn/visual-hierarchy/
- Canva data visualization guidance: https://www.canva.com/graphs/data-visualization/
- GitHub Primer introduction: https://primer.github.io/design/guides/introduction/
- IBM Design Language data visualization basics: https://www.ibm.com/design/language/data-visualization/design/basics
- WHO data design language: https://apps.who.int/gho/data/design-language/principles/
- Datawrapper chart design reference: https://academy.datawrapper.de/

## Deletion policy

The product target is small, beautiful, and maintainable. Bad or redundant effects should not be hidden in an Advanced section just to preserve them. Hide only when a control is useful but low-frequency. Delete when the effect is visually weak, hard to explain, duplicated by a better effect, or creates maintenance cost without user value.

Safe deletion requires:

- The persisted field has a compatibility fallback or migration path.
- Existing `settings.json` files still normalize and render.
- The remaining UI has an equivalent or better user-facing outcome.
- The deleted effect is not the only way to control accessibility, status, or error feedback.
- A self-check or explicit manual validation point is added before the deletion is considered complete.

Deletion candidates should be evaluated in this order:

1. Duplicate visual effects with nearly identical output.
2. Intermediate glass modes that differ only by opacity/blur values.
3. Decorative motion that does not clarify state, navigation, or data change.
4. Chart styles that distort comparison accuracy.
5. Theme presets that are only palette swaps and do not add a distinct visual grammar.

## Motion direction

Keep motion purposeful. It should explain state changes, guide attention, and make repeated tool use feel smooth. It should not become decorative noise.

Recommended motion tiers:

- Off: no animation, still keeps instant focus and active states.
- Minimal: 320-500ms, restrained opacity and scale with limited layout movement.
- Standard: 440-720ms, clear fades and spatial continuity for panels, dialogs, charts, and workspace entrances.
- Reduced motion: system preference or the explicit off mode removes nonessential animation without hiding state changes.

After pruning, the visible motion model should be:

- Simple switch: reduced motion.
- Primary choice: off, minimal, or standard.
- Stored custom values remain compatible, but enabled legacy timings are raised to the maintained perceptibility floor.

Hover should stay, but become more nuanced:

- Primary buttons: small lift plus shadow softening.
- Cards/tools: 1-3px lift only; avoid floating every card at once.
- Chart marks: highlight selected segment/bar, dim non-selected data, show label or tooltip.
- Dangerous actions: no playful bounce; use precise color and focus feedback.

Good next implementation target:

- Keep only `mode` and `reduced motion` visible by default.
- Move detailed duration/easing/scale controls to Advanced.
- Preserve all `uiTheme.motion.*` fields for backward compatibility.

## Theme direction

Target about 6 theme families, each with real visual grammar instead of only color swaps:

- Field Notebook: warm field-work surface, map-first, low shadow.
- Scientific White: clean research workspace, strong readability.
- Botanical Lab: cool green/teal with restrained scientific tone.
- Linear Minimal: border-led, low-shadow, long data-entry friendly.
- Deep Slate: professional dark shell, light working cards.
- Presentation Data: richer chart emphasis, still not dashboard-noisy.

Glass effects:

- Keep 1 lightweight glass mode for normal use.
- Keep 1 expressive liquid glass mode for presentation/data-view use.
- Delete weak intermediate glass modes after compatibility checks. Do not keep them merely as hidden clutter.

## Statistics-center chart direction

Charts should match the active theme tokens. Avoid isolated chart palettes that fight the app shell.

Bar charts:

- Add subtle dimensional depth through highlight edge, base shadow, and rounded top corners.
- Use consistent baseline and axis labels; do not fake 3D perspective that distorts value comparison.
- Hover/selection should clarify values through emphasis, not animation overload.
- Remove chart embellishments if they reduce comparability or make values harder to read.

Donut/pie charts:

- Prefer donut for summaries because the center can hold total/count/selected category.
- Add shallow depth with layered arc shadow and inner rim; avoid exploded 3D pie distortions.
- Use direct labels for important slices and legend for long-tail categories.

Transitions:

- Animate chart entry by data role: axes first, then marks, then labels.
- Keep updates smooth enough to understand changes, but short enough for repeated use.
- Use `prefers-reduced-motion`/existing reduced setting to disable chart motion.

## Next safe execution sequence

1. Audit existing theme presets and mark keep/merge/remove candidates.
2. Reduce theme options to about 6. Merge or delete weak themes, retaining legacy id mapping where needed.
3. Simplify motion UI through pruning first, progressive disclosure second.
4. Refactor chart rendering helpers around shared theme tokens.
5. Add dimensional bar and donut variants behind existing chart type controls.
6. Run `npm test`, full `node --check`, then Electron visual check when dependencies are available.

## 2026-05-18 implementation notes

- Theme presets are now reduced to six active choices.
- Glass modes are reduced to `off`, `light`, and `liquid`.
- Motion naming now uses "Expressive" instead of generic "Rich" to clarify intent.
- Bar charts now use shallow depth layers and top gloss without changing the baseline or value scale.
- Pie and donut rendering are now distinct; donut keeps a center summary, pie uses a center plate for legibility.
- Chart hover motion is subtle and disabled when the app is in reduced-motion mode.
