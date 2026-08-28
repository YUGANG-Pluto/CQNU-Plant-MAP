export type ObjectSelectionType = 'none' | 'zone' | 'point';
export type ObjectListTab = 'zones' | 'points';

export interface LegacySelectionState {
  selectedZoneId?: unknown;
  selectedPointId?: unknown;
  selectedPhenologyId?: unknown;
  hoveredZoneId?: unknown;
  hoveredPointId?: unknown;
  activeListTab?: unknown;
}

export interface ObjectSelectionSnapshot {
  version: 'object-selection-v1';
  revision: number;
  type: ObjectSelectionType;
  selectedZoneId: string;
  selectedPointId: string;
  selectedPhenologyId: string;
  hoveredZoneId: string;
  hoveredPointId: string;
  activeListTab: ObjectListTab;
}

export interface PointSelectionInput {
  pointId: unknown;
  zoneId?: unknown;
  phenologyId?: unknown;
}

export interface HoverSelectionInput {
  type: 'zone' | 'point';
  id: unknown;
  active?: boolean;
}

export interface ObjectSelectionStore {
  readonly version: 'object-selection-v1';
  getSnapshot(): Readonly<ObjectSelectionSnapshot>;
  subscribe(listener: (snapshot: Readonly<ObjectSelectionSnapshot>) => void): () => void;
  selectZone(zoneId: unknown): Readonly<ObjectSelectionSnapshot>;
  selectPoint(input: PointSelectionInput): Readonly<ObjectSelectionSnapshot>;
  selectPhenology(entryId: unknown): Readonly<ObjectSelectionSnapshot>;
  setHover(input: HoverSelectionInput): Readonly<ObjectSelectionSnapshot>;
  clearHover(): Readonly<ObjectSelectionSnapshot>;
  setActiveListTab(tab: unknown): Readonly<ObjectSelectionSnapshot>;
  clear(): Readonly<ObjectSelectionSnapshot>;
  sync(): Readonly<ObjectSelectionSnapshot>;
}

type SelectionPatch = Partial<{
  selectedZoneId: string | null;
  selectedPointId: string | null;
  selectedPhenologyId: string;
  hoveredZoneId: string | null;
  hoveredPointId: string | null;
  activeListTab: ObjectListTab;
}>;

function cleanText(value: unknown): string {
  return String(value ?? '').trim();
}

function normalizeSnapshot(
  source: LegacySelectionState | undefined,
  revision: number
): Readonly<ObjectSelectionSnapshot> {
  const selectedPointId = cleanText(source?.selectedPointId);
  const selectedZoneId = cleanText(source?.selectedZoneId);
  return Object.freeze({
    version: 'object-selection-v1' as const,
    revision,
    type: selectedPointId ? 'point' : selectedZoneId ? 'zone' : 'none',
    selectedZoneId,
    selectedPointId,
    selectedPhenologyId: cleanText(source?.selectedPhenologyId),
    hoveredZoneId: cleanText(source?.hoveredZoneId),
    hoveredPointId: cleanText(source?.hoveredPointId),
    activeListTab: source?.activeListTab === 'points' ? 'points' : 'zones'
  });
}

function snapshotValues(snapshot: Readonly<ObjectSelectionSnapshot>): string {
  return [
    snapshot.type,
    snapshot.selectedZoneId,
    snapshot.selectedPointId,
    snapshot.selectedPhenologyId,
    snapshot.hoveredZoneId,
    snapshot.hoveredPointId,
    snapshot.activeListTab
  ].join('\u0000');
}

export function createObjectSelectionStore(
  readState: () => LegacySelectionState | undefined,
  writeState: (patch: SelectionPatch) => void
): ObjectSelectionStore {
  const listeners = new Set<(snapshot: Readonly<ObjectSelectionSnapshot>) => void>();
  let snapshot = normalizeSnapshot(readState(), 0);

  function publish(patch?: SelectionPatch): Readonly<ObjectSelectionSnapshot> {
    if (patch) writeState(patch);
    const next = normalizeSnapshot(readState(), snapshot.revision + 1);
    if (snapshotValues(next) === snapshotValues(snapshot)) return snapshot;
    snapshot = next;
    listeners.forEach(listener => {
      try {
        listener(snapshot);
      } catch {
        // Selection observers cannot interrupt map or editor interactions.
      }
    });
    return snapshot;
  }

  const store: ObjectSelectionStore = {
    version: 'object-selection-v1',
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      listener(snapshot);
      return () => listeners.delete(listener);
    },
    selectZone(zoneId) {
      const id = cleanText(zoneId);
      return publish({
        selectedZoneId: id || null,
        selectedPointId: null,
        selectedPhenologyId: ''
      });
    },
    selectPoint(input) {
      const pointId = cleanText(input?.pointId);
      return publish({
        selectedPointId: pointId || null,
        selectedZoneId: cleanText(input?.zoneId) || null,
        selectedPhenologyId: pointId ? cleanText(input?.phenologyId) : ''
      });
    },
    selectPhenology(entryId) {
      return publish({ selectedPhenologyId: cleanText(entryId) });
    },
    setHover(input) {
      const id = input?.active === false ? '' : cleanText(input?.id);
      const key = input?.type === 'point' ? 'hoveredPointId' : 'hoveredZoneId';
      const currentId = key === 'hoveredPointId' ? snapshot.hoveredPointId : snapshot.hoveredZoneId;
      if (input?.active === false && cleanText(input?.id) !== currentId) return snapshot;
      return publish({ [key]: id || null });
    },
    clearHover() {
      return publish({ hoveredZoneId: null, hoveredPointId: null });
    },
    setActiveListTab(tab) {
      return publish({ activeListTab: tab === 'points' ? 'points' : 'zones' });
    },
    clear() {
      return publish({
        selectedZoneId: null,
        selectedPointId: null,
        selectedPhenologyId: '',
        hoveredZoneId: null,
        hoveredPointId: null
      });
    },
    sync() {
      return publish();
    }
  };

  return Object.freeze(store);
}
