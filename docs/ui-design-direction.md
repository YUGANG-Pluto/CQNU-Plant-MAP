# UI design direction

Scope: keep the app lightweight, map-first, and maintainable. Do not add bundled design assets, large UI frameworks, or local map assets.

## Sources reviewed

- Figma UI design principles: https://www.figma.com/resource-library/ui-design-principles/
- Canva visual hierarchy guidance: https://www.canva.com/learn/visual-hierarchy/
- GitHub Primer design system: https://primer.github.io/design/guides/introduction/
- CSDN Chinese admin-system UI discussions: https://blog.csdn.net/2501_92274820/article/details/149201306

## Local direction

- Use a field-notebook visual language: botanical but not single-green, warm paper background, restrained teal, deep green, muted terracotta, and amber.
- Prefer workbench density over landing-page composition. The first viewport must remain the usable map workspace.
- Keep settings complete before any reduction. Future simplification should hide advanced controls behind progressive disclosure, not delete data fields or saved settings.
- Keep controls compact and predictable. Avoid decorative cards inside cards; reserve cards for repeated content, modals, and actual grouped tools.
- Preserve online basemap references and external Leaflet loading. Do not vendor map assets locally.

## Future setting simplification checkpoint

Before removing or merging any setting control:

1. Confirm it is not the only UI path to a saved value.
2. Confirm existing `settings.json` values still normalize and apply.
3. Keep backward compatibility in `uiTheme`.
4. Add a self-check for the migration or control binding.
5. Run `npm test` and full `node --check`.
