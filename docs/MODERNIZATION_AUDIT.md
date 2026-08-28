# Modernization Audit

## Scope

This audit covers the shared map workspace, browser runtime, access-management interface, research navigation site, motion system, and the modern-to-compatibility renderer boundary. Project data formats, map geometry behavior, Electron IPC, path validation, backup behavior, and JSON/SQLite conversion contracts remain unchanged.

## Product Boundaries

The product has three visual domains. They share accessibility, spacing, motion timing, focus behavior, and component engineering, but they do not share one palette or one density model.

| Domain                          | Visual language                                                                            | Primary responsibility                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| Map workspace                   | Scientific white, botanical green, restrained translucent command surfaces                 | Mapping, selection, point and zone editing, research tools                 |
| Access management               | Ice blue, graphite, opaque security data surfaces                                          | Accounts, capabilities, sessions, activation, and audit records            |
| Research site and documentation | Content-specific accents for home, documentation, architecture, release, and privacy pages | Navigation, product guidance, release information, and platform boundaries |

Liquid Glass material is limited to functional navigation, command surfaces, hover tools, and transient overlays. Forms, tables, statistics, security records, and long-form documentation stay on stable opaque surfaces.

## Baseline Findings

- The workspace header and left tool area consumed map space and repeated commands already available elsewhere.
- The right side used measurement observers and density heuristics to decide which modules were visible, making object selection harder to predict.
- Map content, module navigation, and project maintenance were presented at the same visual level.
- The browser site could test an older shared renderer build unless the site was rebuilt before the workspace smoke test.
- Access management and documentation inherited too much of the map workspace's visual language.
- Stable feature IDs and the compatibility loader still carry active event bindings; removing them would break established workflows.

## Implemented Structure

### Map-First Shell

- A compact header keeps product identity, current project context, history, open, and save actions available without displacing the map.
- A narrow primary rail contains browse, draw-zone, add-point, layer, and module commands.
- Project source, pending point actions, and status information use small map overlays instead of permanent wide panels.
- Responsive rules convert the rail and inspector deliberately instead of relying on content measurement.

### Layer And Module Separation

- The layer popover handles base-map selection and independent zone/point visibility.
- The module launcher groups research/review actions separately from project/maintenance actions.
- Hidden map layers change view state only and do not mutate project records.
- Existing command IDs remain stable so the legacy business-event boundary continues to work.

### Selection-Driven Inspector

- No selection produces one explicit empty state.
- Zone selection shows zone details and the related plant list when space permits.
- Point selection prioritizes the point record; zone and list context remain available through the inspector drawer.
- The former overlap measurement, resize scoring, mutation monitoring, and unused diagnostic state were removed. Layout is now derived from selection type and one viewport breakpoint.

### Runtime And State Boundaries

- Preact owns application markup, shared shell components, theme presentation, and typed browser platform adapters.
- The typed project session store owns project-source, busy, dirty, save, and capability state for modern workflows.
- The typed object-selection store owns selected zone, point, phenology, hover, and list-tab state while publishing an immutable compatibility mirror for existing map workflows.
- The typed research-query bridge owns read-only filtering, completeness flags, phenology criteria, and immutable result records; the compatibility renderer only reads form controls, renders results, and forwards selection actions.
- Existing renderer business modules remain behind one compatibility loader while their data and behavior contracts are still active.
- Browser file access remains user initiated through File System Access or compatible import controls. Browser SQLite uses bounded local file parsing or OPFS and does not grant arbitrary filesystem access.

### Browser App Host

- The site app registry defines versioned route, asset, capability, persistence, network, upload, and local-file contracts.
- `/apps/project-inspector` performs a browser-memory-only preflight for selected JSON, image, and SQLite project files.
- The preflight validates bounded JSON and the SQLite file signature, reports recognized records, and exports a local report without mutating or uploading project data.
- Hosted app assets are route scoped and remain separate from Electron and management capabilities.

### Motion And Material

- Enabled motion uses perceptible tiers of at least 320 ms. The default expressive profile uses approximately 620 ms feedback, 860 ms surface transitions, and 1,040 ms layer entrances.
- Navigation, cards, dialogs, menus, status changes, and staged content entrances use distinct but restrained motion patterns.
- Reduced-motion and reduced-transparency preferences remove nonessential effects and preserve readable fallbacks.
- Hover effects do not move neighboring layout or hide data.
- The animation kernel uses `motion/mini` for WAAPI playback and browser-native pointer, keyboard, intersection, and View Transition primitives. The public motion-kernel API is unchanged.
- Completed scene animations release their effects so identity transforms cannot change fixed-position containing blocks on mobile.

### Visual And Bundle Gates

- A 15-scene visual baseline covers desktop and mobile workspace, management login and account views, site home and documentation, architecture, release, privacy, and the project inspector.
- Evidence compares quantized color grids, theme identity, stable layout anchors, and document-level overflow; local PNG captures remain ignored.
- The initial renderer entry is checked against raw and gzip budgets. SQLite workers remain separate lazy assets.
- The renderer entry is 373,902 bytes raw and 114,849 bytes gzip after adding the typed query model, compared with 434,822 bytes raw and 136,493 bytes gzip before the Motion boundary reduction.

## Simplification Decisions

Removed:

- Right-inspector overlap scoring and element measurement.
- Right-inspector `ResizeObserver` and `MutationObserver` coordination.
- Unread right-inspector mode and diagnostic state.
- Stale structural CSS selectors from the previous workbar, panel, and module layout.
- A self-check dependency on the former component file location.
- Full Motion DOM imports where only the mini WAAPI animation kernel was required.
- Duplicate query-center completeness and filtering logic from the compatibility renderer.

Retained intentionally:

- The map `ResizeObserver`, because Leaflet must invalidate its size after real container changes.
- The motion `MutationObserver`, because legacy-rendered dialogs and list items still need motion registration.
- The compatibility loader and stable control IDs, because current editing, statistics, maintenance, and export functions still bind through that boundary.
- JSON compatibility payloads and SQLite exchange fields, because they preserve unknown project data.
- Runtime smoke and visual evidence gates, because they cover different failure classes and share one extracted screenshot/navigation support module.

## Security And Data Review

- Renderer code still has no direct Node.js filesystem, process, or child-process access.
- Electron file and system operations remain behind the preload business API and main-process validation.
- Browser project selection remains a synchronous user gesture and project data stays on the user's device.
- Management sessions, CSRF checks, activation, administrator limits, and redacted audits are unchanged.
- No new external service, data upload path, or project schema migration was introduced.

## Verification

Release synchronization on 2026-08-28 used the following checks:

| Check                                                  | Result                         | Purpose                                                                                           |
| ------------------------------------------------------ | ------------------------------ | ------------------------------------------------------------------------------------------------- |
| `npm run lint`                                         | Passed                         | Source and architecture lint rules                                                                |
| `npm run typecheck`                                    | Passed                         | Electron, Preact, and checked JavaScript boundaries                                               |
| `npm test`                                             | Passed: 73 unit, 9 integration | Pure models and project-service contracts                                                         |
| `npm --prefix ../admin test`                           | Passed: 19                     | Accounts, sessions, permissions, CSRF, activation, and audit contracts                            |
| `npm --prefix ../site run check`                       | Passed                         | Eight routes, 66 published assets, management boundary, app host, and page presentation contracts |
| `npm --prefix ../site test`                            | Passed: 16                     | Route, local-app, motion, content-theme, management, and browser-workspace contracts              |
| `npm run self-check`                                   | Passed                         | Runtime wiring, security, storage, and UI contracts                                               |
| `npm run check:repo`                                   | Passed                         | Repository hygiene and restricted artifacts                                                       |
| `npm run check:size`                                   | Passed without warnings        | File split policy after extracting renderer-domain contracts and browser smoke support            |
| `npm run check:bundle`                                 | Passed                         | 373,902-byte initial JS, 114,849-byte gzip entry, separate lazy SQLite workers                    |
| `npm run smoke:web`                                    | Passed                         | Browser local project, SQLite, workspace, layer, modal, management, and multi-tab flows           |
| `npm run smoke:renderer`                               | Passed: 84 required controls   | Desktop renderer startup and major feature surfaces                                               |
| `npm run visual:check`                                 | Passed: 15 scenes              | Three visual domains, responsive anchors, hosted app, and overflow limits                         |
| `npm run verify`                                       | Passed                         | Combined release-oriented build and structural gates                                              |
| SQLite schema, conversion, storage, and runtime probes | Passed                         | Temporary synthetic database acceptance and cleanup                                               |
| `npm run dist`                                         | Passed                         | Unsigned Windows NSIS packaging probe; generated output remains local                             |

Generated screenshots, temporary databases, logs, dependencies, and build outputs are local verification artifacts and are not synchronized to the source repository.

## Remaining Migration Boundary

The compatibility renderer is not dead code. It still owns mature map editing, statistics, maintenance, phenology, taxonomy-reference, backup, and export workflows. Future conversion should move one domain at a time behind typed tests and preserve stable project data and preload contracts. A broad rewrite would increase regression risk without improving user-visible behavior.

The next useful architecture work is moving the review workbench's session, filter, and queue-selection controller out of global renderer bindings. Its existing typed issue calculator and the object-selection store should remain the authoritative inputs, while DOM rendering and edit commands stay in the compatibility layer until acceptance coverage is expanded.

## Design References

- Apple Human Interface Guidelines: Materials and Motion
- Esri Calcite Design System: Shell and Shell Panel
- WAI-ARIA Authoring Practices: Modal Dialog
- IBM Carbon Design System: Data Table

These references guide local interaction decisions; their component libraries and visual brands are not bundled or copied into the product.
