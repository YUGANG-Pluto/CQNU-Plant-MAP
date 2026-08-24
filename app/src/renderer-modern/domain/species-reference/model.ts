import type { SpeciesReferenceResult } from '../../../shared/types/species-reference';

export type SpeciesReferenceBusyKind = 'query' | 'image';
export type SpeciesReferencePanelPhase = 'idle' | 'querying' | 'comparing' | 'ready' | 'empty';

export interface SpeciesReferencePanelSnapshot {
  phase: SpeciesReferencePanelPhase;
  pointId: string;
  selectedId: string;
  suggestionIds: readonly string[];
  queryBusy: boolean;
  imageBusy: boolean;
}

export interface SpeciesReferencePanelController {
  clear(): Readonly<SpeciesReferencePanelSnapshot>;
  replace(result: unknown, pointId?: unknown): Readonly<SpeciesReferencePanelSnapshot>;
  select(suggestionId: unknown): Readonly<SpeciesReferencePanelSnapshot>;
  setBusy(kind: SpeciesReferenceBusyKind, busy: unknown): Readonly<SpeciesReferencePanelSnapshot>;
  inspect(): Readonly<SpeciesReferencePanelSnapshot>;
}

interface MutablePanelState {
  pointId: string;
  selectedId: string;
  suggestionIds: string[];
  hasResult: boolean;
  queryBusy: boolean;
  imageBusy: boolean;
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asResult(value: unknown): Partial<SpeciesReferenceResult> {
  return value && typeof value === 'object' ? value as Partial<SpeciesReferenceResult> : {};
}

function getSuggestionIds(value: unknown): string[] {
  const result = asResult(value);
  const suggestions = Array.isArray(result.suggestions) ? result.suggestions : [];
  return [...new Set(suggestions.map(item => cleanText(item?.id)).filter(Boolean))];
}

function getPhase(state: MutablePanelState): SpeciesReferencePanelPhase {
  if (state.imageBusy) return 'comparing';
  if (state.queryBusy) return 'querying';
  if (!state.hasResult) return 'idle';
  return state.suggestionIds.length ? 'ready' : 'empty';
}

function freezeSnapshot(state: MutablePanelState): Readonly<SpeciesReferencePanelSnapshot> {
  return Object.freeze({
    phase: getPhase(state),
    pointId: state.pointId,
    selectedId: state.selectedId,
    suggestionIds: Object.freeze([...state.suggestionIds]),
    queryBusy: state.queryBusy,
    imageBusy: state.imageBusy
  });
}

function emptyState(): MutablePanelState {
  return {
    pointId: '',
    selectedId: '',
    suggestionIds: [],
    hasResult: false,
    queryBusy: false,
    imageBusy: false
  };
}

export function createSpeciesReferencePanelController(): SpeciesReferencePanelController {
  let state = emptyState();

  return Object.freeze({
    clear() {
      state = emptyState();
      return freezeSnapshot(state);
    },
    replace(value: unknown, pointId: unknown = '') {
      const result = asResult(value);
      const suggestionIds = getSuggestionIds(result);
      const requestedId = cleanText(result.selectedId);
      state = {
        ...state,
        pointId: cleanText(pointId),
        selectedId: suggestionIds.includes(requestedId) ? requestedId : suggestionIds[0] || '',
        suggestionIds,
        hasResult: true
      };
      return freezeSnapshot(state);
    },
    select(value: unknown) {
      const suggestionId = cleanText(value);
      if (state.suggestionIds.includes(suggestionId)) {
        state = { ...state, selectedId: suggestionId };
      }
      return freezeSnapshot(state);
    },
    setBusy(kind: SpeciesReferenceBusyKind, busy: unknown) {
      state = {
        ...state,
        queryBusy: kind === 'query' ? !!busy : state.queryBusy,
        imageBusy: kind === 'image' ? !!busy : state.imageBusy
      };
      return freezeSnapshot(state);
    },
    inspect() {
      return freezeSnapshot(state);
    }
  });
}
