export interface ProjectEditSnapshot {
  zones: unknown[];
  points: unknown[];
  selectedZoneId: string | null;
  selectedPointId: string | null;
  selectedPhenologyId: string;
}

export interface ProjectEditHistoryEntry {
  id: string;
  labelKey: string;
  createdAt: string;
  before: ProjectEditSnapshot;
  after: ProjectEditSnapshot;
}

export interface ProjectEditHistoryStatus {
  canUndo: boolean;
  canRedo: boolean;
  undoCount: number;
  redoCount: number;
  undoLabelKey: string;
  redoLabelKey: string;
}

export interface ProjectEditHistoryBridge {
  clear(): ProjectEditHistoryStatus;
  push(entry: ProjectEditHistoryEntry): ProjectEditHistoryStatus;
  undo(): ProjectEditHistoryEntry | null;
  redo(): ProjectEditHistoryEntry | null;
  inspect(): ProjectEditHistoryStatus;
}

const DEFAULT_HISTORY_LIMIT = 30;

function cloneEntry(entry: ProjectEditHistoryEntry): ProjectEditHistoryEntry {
  return structuredClone(entry);
}

export function createProjectEditHistory(
  limit = DEFAULT_HISTORY_LIMIT
): ProjectEditHistoryBridge {
  const historyLimit = Math.max(1, Math.floor(limit));
  const undoStack: ProjectEditHistoryEntry[] = [];
  const redoStack: ProjectEditHistoryEntry[] = [];

  const inspect = (): ProjectEditHistoryStatus => ({
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    undoCount: undoStack.length,
    redoCount: redoStack.length,
    undoLabelKey: undoStack.at(-1)?.labelKey || '',
    redoLabelKey: redoStack.at(-1)?.labelKey || ''
  });

  return {
    clear() {
      undoStack.length = 0;
      redoStack.length = 0;
      return inspect();
    },
    push(entry) {
      undoStack.push(cloneEntry(entry));
      if (undoStack.length > historyLimit) undoStack.shift();
      redoStack.length = 0;
      return inspect();
    },
    undo() {
      const entry = undoStack.pop();
      if (!entry) return null;
      redoStack.push(entry);
      return cloneEntry(entry);
    },
    redo() {
      const entry = redoStack.pop();
      if (!entry) return null;
      undoStack.push(entry);
      return cloneEntry(entry);
    },
    inspect
  };
}
