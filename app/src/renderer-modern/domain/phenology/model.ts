export type DraftStatus = 'saved' | 'dirty' | 'saving' | 'error';
export type DraftValues = Readonly<Record<string, string>>;

export interface DraftInspection {
  dirty: boolean;
  status: DraftStatus;
  current: DraftValues;
  stored: DraftValues;
}

export interface PhenologyDraftController {
  inspect(current: unknown, stored: unknown): Readonly<DraftInspection>;
  transition(nextStatus: DraftStatus): DraftStatus;
  getStatus(): DraftStatus;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function normalizeDraftValues(value: unknown, fields: readonly string[]): DraftValues {
  const record = asRecord(value);
  return Object.freeze(Object.fromEntries(
    fields.map(field => [field, String(record[field] ?? '')])
  ));
}

export function hasDraftChanges(
  currentValue: unknown,
  storedValue: unknown,
  fields: readonly string[]
): boolean {
  const current = normalizeDraftValues(currentValue, fields);
  const stored = normalizeDraftValues(storedValue, fields);
  return fields.some(field => current[field] !== stored[field]);
}

export function createPhenologyDraftController(
  fieldsValue: readonly string[]
): PhenologyDraftController {
  const fields = Object.freeze([...new Set(fieldsValue.map(String).filter(Boolean))]);
  let status: DraftStatus = 'saved';
  return Object.freeze({
    inspect(currentValue: unknown, storedValue: unknown) {
      const current = normalizeDraftValues(currentValue, fields);
      const stored = normalizeDraftValues(storedValue, fields);
      const dirty = fields.some(field => current[field] !== stored[field]);
      if (status !== 'saving' && status !== 'error') status = dirty ? 'dirty' : 'saved';
      return Object.freeze({ dirty, status, current, stored });
    },
    transition(nextStatus: DraftStatus) {
      status = nextStatus;
      return status;
    },
    getStatus() {
      return status;
    }
  });
}
