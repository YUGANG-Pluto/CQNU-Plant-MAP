import type { CloudProjectSnapshot } from '../../../shared/types/cloud-projects';

export type CloudProjectDiffKind = 'settings' | 'zones' | 'points';
export type CloudProjectDiffChange = 'added' | 'removed' | 'modified';

export interface CloudProjectDiffItem {
  id: string;
  label: string;
  change: CloudProjectDiffChange;
}

export interface CloudProjectDiffSection {
  kind: CloudProjectDiffKind;
  localCount: number;
  cloudCount: number;
  added: number;
  removed: number;
  modified: number;
  unchanged: number;
  items: readonly CloudProjectDiffItem[];
}

export interface CloudProjectSnapshotDiff {
  settings: CloudProjectDiffSection;
  zones: CloudProjectDiffSection;
  points: CloudProjectDiffSection;
  changed: boolean;
  changedCount: number;
}

const PREVIEW_LIMIT = 12;
const EMPTY_SNAPSHOT: CloudProjectSnapshot = {
  formatVersion: 1,
  settings: {},
  zones: [],
  points: []
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, stableValue(item)])
  );
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(stableValue(left)) === JSON.stringify(stableValue(right));
}

function usableText(value: unknown): string {
  const text = typeof value === 'string' || typeof value === 'number'
    ? String(value).trim()
    : '';
  return text && !['null', 'undefined', 'n/a', 'na'].includes(text.toLowerCase()) ? text : '';
}

function recordIdentity(
  item: Record<string, unknown>,
  kind: 'zones' | 'points',
  index: number
): { id: string; label: string } {
  const idFields = kind === 'zones'
    ? ['id', 'zoneId', 'zoneKey', 'uuid']
    : ['id', 'pointId', 'recordId', 'uuid'];
  const labelFields = kind === 'zones'
    ? ['name', 'title', 'label', ...idFields]
    : ['plantNameCn', 'chineseName', 'name', 'plantNameSci', 'scientificName', ...idFields];
  const id = idFields.map(field => usableText(item[field])).find(Boolean) || `#${index + 1}`;
  const label = labelFields.map(field => usableText(item[field])).find(Boolean) || `${kind}-${index + 1}`;
  return { id, label };
}

function indexRecords(
  values: readonly Record<string, unknown>[],
  kind: 'zones' | 'points'
): Map<string, { value: Record<string, unknown>; label: string }> {
  const result = new Map<string, { value: Record<string, unknown>; label: string }>();
  const duplicates = new Map<string, number>();
  values.forEach((value, index) => {
    const identity = recordIdentity(record(value), kind, index);
    const occurrence = duplicates.get(identity.id) || 0;
    duplicates.set(identity.id, occurrence + 1);
    const key = occurrence ? `${identity.id}#${occurrence + 1}` : identity.id;
    result.set(key, { value: record(value), label: identity.label });
  });
  return result;
}

function buildRecordSection(
  kind: 'zones' | 'points',
  localValues: readonly Record<string, unknown>[],
  cloudValues: readonly Record<string, unknown>[]
): CloudProjectDiffSection {
  const local = indexRecords(localValues, kind);
  const cloud = indexRecords(cloudValues, kind);
  const keys = [...new Set([...local.keys(), ...cloud.keys()])].sort((left, right) => left.localeCompare(right));
  const items: CloudProjectDiffItem[] = [];
  let added = 0;
  let removed = 0;
  let modified = 0;
  let unchanged = 0;

  keys.forEach(id => {
    const localItem = local.get(id);
    const cloudItem = cloud.get(id);
    if (!localItem && cloudItem) {
      added += 1;
      if (items.length < PREVIEW_LIMIT) items.push({ id, label: cloudItem.label, change: 'added' });
      return;
    }
    if (localItem && !cloudItem) {
      removed += 1;
      if (items.length < PREVIEW_LIMIT) items.push({ id, label: localItem.label, change: 'removed' });
      return;
    }
    if (localItem && cloudItem && !sameValue(localItem.value, cloudItem.value)) {
      modified += 1;
      if (items.length < PREVIEW_LIMIT) items.push({ id, label: cloudItem.label || localItem.label, change: 'modified' });
      return;
    }
    unchanged += 1;
  });

  return Object.freeze({
    kind,
    localCount: localValues.length,
    cloudCount: cloudValues.length,
    added,
    removed,
    modified,
    unchanged,
    items: Object.freeze(items)
  });
}

function buildSettingsSection(
  localSettings: Record<string, unknown>,
  cloudSettings: Record<string, unknown>
): CloudProjectDiffSection {
  const keys = [...new Set([...Object.keys(localSettings), ...Object.keys(cloudSettings)])]
    .sort((left, right) => left.localeCompare(right));
  const items: CloudProjectDiffItem[] = [];
  let added = 0;
  let removed = 0;
  let modified = 0;
  let unchanged = 0;
  keys.forEach(key => {
    const hasLocal = Object.hasOwn(localSettings, key);
    const hasCloud = Object.hasOwn(cloudSettings, key);
    let change: CloudProjectDiffChange | null = null;
    if (!hasLocal && hasCloud) {
      added += 1;
      change = 'added';
    } else if (hasLocal && !hasCloud) {
      removed += 1;
      change = 'removed';
    } else if (!sameValue(localSettings[key], cloudSettings[key])) {
      modified += 1;
      change = 'modified';
    } else {
      unchanged += 1;
    }
    if (change && items.length < PREVIEW_LIMIT) items.push({ id: key, label: key, change });
  });
  return Object.freeze({
    kind: 'settings',
    localCount: Object.keys(localSettings).length,
    cloudCount: Object.keys(cloudSettings).length,
    added,
    removed,
    modified,
    unchanged,
    items: Object.freeze(items)
  });
}

export function compareCloudProjectSnapshots(
  localSnapshot: CloudProjectSnapshot | null | undefined,
  cloudSnapshot: CloudProjectSnapshot | null | undefined
): CloudProjectSnapshotDiff {
  const local = localSnapshot || EMPTY_SNAPSHOT;
  const cloud = cloudSnapshot || EMPTY_SNAPSHOT;
  const settings = buildSettingsSection(record(local.settings), record(cloud.settings));
  const zones = buildRecordSection('zones', Array.isArray(local.zones) ? local.zones : [], Array.isArray(cloud.zones) ? cloud.zones : []);
  const points = buildRecordSection('points', Array.isArray(local.points) ? local.points : [], Array.isArray(cloud.points) ? cloud.points : []);
  const changedCount = [settings, zones, points]
    .reduce((sum, section) => sum + section.added + section.removed + section.modified, 0);
  return Object.freeze({ settings, zones, points, changed: changedCount > 0, changedCount });
}
