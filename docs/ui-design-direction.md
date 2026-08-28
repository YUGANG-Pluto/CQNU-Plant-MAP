# UI Design Direction

CQNU Plant MAP uses one shared component system with a different visual emphasis for each task. The interface remains lightweight, map-first, responsive, and free of large UI frameworks or decorative asset bundles.

## Reference Patterns

- Apple Human Interface Guidelines, Materials: https://developer.apple.com/design/human-interface-guidelines/materials
- Apple Human Interface Guidelines, Motion: https://developer.apple.com/design/human-interface-guidelines/motion
- IBM Carbon, Data table: https://carbondesignsystem.com/components/data-table/usage/
- Esri Calcite, Shell and Shell Panel: https://developers.arcgis.com/calcite-design-system/components/shell/
- WAI-ARIA Authoring Practices, Modal dialog: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/

These references inform local layout and interaction decisions. Their component libraries are not bundled into the application.

## Task-Specific Languages

The three product domains share engineering primitives, not one visual theme. Spacing, focus behavior, motion timing, accessibility, and component quality stay consistent; palette, density, surface treatment, and information hierarchy follow each domain's work.

### Research Navigation

- Use a searchable directory and clear module groups rather than a marketing landing page.
- Available modules are actionable; planned modules remain visibly disabled and never use placeholder links.
- Use restrained glass material for the pinned navigation and search toolbar only.
- Keep the first viewport focused on navigation, current release state, and the next operational action.
- Use content-specific accents: botanical green for the research directory, blue for documentation, cyan for architecture, rose for release information, and green for privacy guidance.

### Map Workspace

- Keep the map as the primary canvas with pinned global actions, a start-side tool panel, and an end-side object inspector.
- Use translucent material only for command surfaces and map overlays where spatial context remains useful.
- Keep forms, tables, statistics, and long-form records on opaque scientific-white surfaces.
- Collapse or relocate side tools at narrow widths instead of compressing the map into an unusable area.
- Use botanical green as the primary accent, supported by neutral white and cool gray surfaces. Do not inherit the management palette.

### Access Management

- Use a dense ice-blue and graphite operational layout with explicit page headings, toolbar search, status chips, and full-width tables.
- Keep row heights, header heights, and column alignment consistent. Long content stays inside the table scroll container.
- Keep primary actions in the table toolbar and member-specific actions in their row.
- Do not use decorative glass effects behind security, account, audit, or permission data.
- Reserve translucent material for navigation and transient controls; keep security and account records on opaque, high-contrast surfaces.

### Documentation And Release Pages

- Choose the accent from the subject instead of inheriting the map or management theme.
- Documentation uses blue, architecture uses cyan, release information uses restrained rose, and privacy guidance uses green.
- Keep article bodies on clean white surfaces with readable line lengths. Accent color supports navigation and status only; it does not tint long-form content.

### Authentication And Activation

- Use a single-task surface with one primary action and no unrelated navigation inside the form.
- Explain activation, expiry, and password-reset state next to the relevant control.
- Use native modal semantics or an equivalent focus-trapped dialog for sensitive confirmations.

## Shared Interaction Rules

- Micro-interactions use at least 320 ms, standard state changes use about 400-580 ms, and scene or modal entrances use about 620-720 ms with consistent easing.
- Page, panel, chart, and dialog entrances combine a real opacity transition with restrained spatial movement so the state change remains perceptible without blocking input.
- Staggered entrances use short 48-72 ms intervals and cap the number of delayed items so dense research views do not become theatrical or slow to operate.
- Hover and press feedback must preserve layout and cannot move adjacent content.
- `prefers-reduced-motion` disables nonessential transitions and transforms.
- Every busy operation exposes a readable status; unavailable actions are disabled with a reason instead of failing silently.
- Icon-only actions require an accessible name and tooltip. Familiar command icons come from the existing Lucide dependency.
- Long tables receive the available page width and use internal horizontal scrolling only as a fallback.
- Dialogs appear above the active shell, retain a visible close action, close with Escape, and return focus after dismissal.

## Theme Boundary

- `theme-scientific-white` is the default content surface for research data and map-workspace forms.
- Access management uses its own ice-blue and graphite operational palette.
- Site and documentation pages select a content-specific accent and do not mirror the workspace or management palette.
- `theme-liquid-glass` is an optional material layer for navigation, command bars, hover tools, and transient overlays in each domain; its tint follows that domain.
- Glass material never reduces text contrast, obscures data, or replaces a semantic boundary.
- Avoid decorative gradients, floating color blobs, oversized rounded cards, and one-color page treatments.

## Change Checkpoint

Before removing, merging, or restyling a control:

1. Confirm it is not the only route to a saved value or existing feature.
2. Confirm desktop and browser adapters preserve the same user-visible meaning.
3. Preserve existing project fields and unknown data.
4. Add or update a focused contract check when behavior changes.
5. Run renderer type checks, responsive visual checks, and the affected application tests.
