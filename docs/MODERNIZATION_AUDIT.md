# Modernization Audit

## Scope

This audit covers the shared map workspace, browser runtime, access-management interface, research navigation site, motion system, and the modern-to-compatibility renderer boundary. Project data formats, map geometry behavior, Electron IPC, path validation, backup behavior, and JSON/SQLite conversion contracts remain unchanged.

## Product Boundaries

The product has three visual domains. They share accessibility, spacing, motion timing, focus behavior, and component engineering, but they do not share one palette or one density model.

| Domain | Visual language | Primary responsibility |
| --- | --- | --- |
| Map workspace | Scientific white, botanical green, restrained translucent command surfaces | Mapping, selection, point and zone editing, research tools |
| Access management | Ice blue, graphite, opaque security data surfaces | Accounts, capabilities, sessions, activation, and audit records |
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
- Existing renderer business modules remain behind one compatibility loader while their data and behavior contracts are still active.
- Browser file access remains user initiated through File System Access or compatible import controls. Browser SQLite uses bounded local file parsing or OPFS and does not grant arbitrary filesystem access.

### Motion And Material

- Enabled motion uses perceptible tiers of at least 320 ms for micro-interactions, approximately 400-580 ms for state transitions, and approximately 620-720 ms for scene or modal entrances.
- Navigation, cards, dialogs, menus, status changes, and staged content entrances use distinct but restrained motion patterns.
- Reduced-motion and reduced-transparency preferences remove nonessential effects and preserve readable fallbacks.
- Hover effects do not move neighboring layout or hide data.

## Simplification Decisions

Removed:

- Right-inspector overlap scoring and element measurement.
- Right-inspector `ResizeObserver` and `MutationObserver` coordination.
- Unread right-inspector mode and diagnostic state.
- Stale structural CSS selectors from the previous workbar, panel, and module layout.
- A self-check dependency on the former component file location.

Retained intentionally:

- The map `ResizeObserver`, because Leaflet must invalidate its size after real container changes.
- The motion `MutationObserver`, because legacy-rendered dialogs and list items still need motion registration.
- The compatibility loader and stable control IDs, because current editing, statistics, maintenance, and export functions still bind through that boundary.
- JSON compatibility payloads and SQLite exchange fields, because they preserve unknown project data.

## Security And Data Review

- Renderer code still has no direct Node.js filesystem, process, or child-process access.
- Electron file and system operations remain behind the preload business API and main-process validation.
- Browser project selection remains a synchronous user gesture and project data stays on the user's device.
- Management sessions, CSRF checks, activation, administrator limits, and redacted audits are unchanged.
- No new external service, data upload path, or project schema migration was introduced.

## Verification

Release synchronization on 2026-08-28 used the following checks:

| Check | Result | Purpose |
| --- | --- | --- |
| `npm run lint` | Passed | Source and architecture lint rules |
| `npm run typecheck` | Passed | Electron, Preact, and checked JavaScript boundaries |
| `npm test` | Passed: 69 unit, 9 integration | Pure models and project-service contracts |
| `npm --prefix ../admin test` | Passed: 19 | Accounts, sessions, permissions, CSRF, activation, and audit contracts |
| `npm --prefix ../site run check` | Passed | Seven routes, published assets, management boundary, and page presentation contracts |
| `npm run self-check` | Passed | Runtime wiring, security, storage, and UI contracts |
| `npm run check:repo` | Passed | Repository hygiene and restricted artifacts |
| `npm run check:size` | Passed | File split policy |
| `npm run smoke:web` | Passed | Browser local project, SQLite, workspace, layer, modal, management, and multi-tab flows |
| `npm run smoke:renderer` | Passed: 84 required controls | Desktop renderer startup and major feature surfaces |
| `npm run verify` | Passed | Combined release-oriented build and structural gates |
| SQLite schema, conversion, storage, and runtime probes | Passed | Temporary synthetic database acceptance and cleanup |

Generated screenshots, temporary databases, logs, dependencies, and build outputs are local verification artifacts and are not synchronized to the source repository.

## Remaining Migration Boundary

The compatibility renderer is not dead code. It still owns mature map editing, statistics, maintenance, phenology, taxonomy-reference, backup, and export workflows. Future conversion should move one domain at a time behind typed tests and preserve stable project data and preload contracts. A broad rewrite would increase regression risk without improving user-visible behavior.

The next useful architecture work is domain-by-domain extraction of business state from global renderer bindings, beginning with one low-risk read-only workflow. It should proceed only after this shell and platform baseline remains green in desktop, browser, and SQLite acceptance checks.

## Design References

- Apple Human Interface Guidelines: Materials and Motion
- Esri Calcite Design System: Shell and Shell Panel
- WAI-ARIA Authoring Practices: Modal Dialog
- IBM Carbon Design System: Data Table

These references guide local interaction decisions; their component libraries and visual brands are not bundled or copied into the product.
