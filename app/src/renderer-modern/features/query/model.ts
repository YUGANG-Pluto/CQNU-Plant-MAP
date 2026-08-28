import type {
  PhenologyDomainRecord,
  PointDomainRecord,
  ProjectDomainSnapshot,
  UnknownRecord
} from '../../domain/project/types';

export type QueryCompletenessFilter =
  | ''
  | 'missingScientificName'
  | 'missingCommonName'
  | 'missingPhenology'
  | 'missingImage';

export interface ProjectQueryFilters {
  text: string;
  zoneId: string;
  completeness: QueryCompletenessFilter;
  growthForm: string;
  floweringState: string;
  cultivatedStatus: string;
  habitat: string;
  observer: string;
  start: string;
  end: string;
}

export interface PointQueryCompleteness {
  missingScientificName: boolean;
  missingCommonName: boolean;
  missingPhenology: boolean;
  missingImage: boolean;
}

export interface ProjectQueryResult {
  type: 'zone' | 'point';
  id: string;
  displayName: string;
  zoneInternalId: string;
  zoneName: string;
  zoneCode: string;
  phenologyLabels: string;
  flags: Readonly<PointQueryCompleteness>;
}

const COMPLETENESS_FILTERS = new Set<QueryCompletenessFilter>([
  '',
  'missingScientificName',
  'missingCommonName',
  'missingPhenology',
  'missingImage'
]);

const EMPTY_FLAGS: Readonly<PointQueryCompleteness> = Object.freeze({
  missingScientificName: false,
  missingCommonName: false,
  missingPhenology: false,
  missingImage: false
});

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : {};
}

function cleanText(value: unknown): string {
  const text = String(value ?? '').trim();
  return ['null', 'undefined'].includes(text.toLocaleLowerCase()) ? '' : text;
}

function lowerText(value: unknown): string {
  return cleanText(value).toLocaleLowerCase();
}

function normalizeFilters(value: unknown): Readonly<ProjectQueryFilters> {
  const input = asRecord(value);
  const completeness = cleanText(input.completeness) as QueryCompletenessFilter;
  return Object.freeze({
    text: lowerText(input.text),
    zoneId: cleanText(input.zoneId),
    completeness: COMPLETENESS_FILTERS.has(completeness) ? completeness : '',
    growthForm: lowerText(input.growthForm),
    floweringState: lowerText(input.floweringState),
    cultivatedStatus: lowerText(input.cultivatedStatus),
    habitat: lowerText(input.habitat),
    observer: lowerText(input.observer),
    start: cleanText(input.start),
    end: cleanText(input.end)
  });
}

function imageCount(value: unknown): number {
  if (Array.isArray(value)) return value.filter(Boolean).length;
  const text = cleanText(value);
  return text ? text.split(/\s*;\s*/).filter(Boolean).length : 0;
}

function pointHasPhenology(entries: readonly PhenologyDomainRecord[]): boolean {
  return entries.some(entry =>
    [
      entry.label,
      entry.floweringState,
      entry.surveyDate,
      entry.habitat,
      entry.observer,
      entry.growthForm,
      entry.cultivatedStatus,
      entry.abundance,
      entry.note
    ].some(Boolean)
  );
}

export function getPointQueryCompleteness(point: PointDomainRecord): Readonly<PointQueryCompleteness> {
  const entryImageCount = point.phenologyEntries.reduce((total, entry) => total + entry.images.length, 0);
  return Object.freeze({
    missingScientificName: !point.plantNameSci,
    missingCommonName: !point.plantNameCn,
    missingPhenology: !pointHasPhenology(point.phenologyEntries),
    missingImage: imageCount(point.source.images) + entryImageCount === 0
  });
}

function hasEntryFilters(filters: ProjectQueryFilters): boolean {
  return Boolean(
    filters.growthForm ||
    filters.floweringState ||
    filters.cultivatedStatus ||
    filters.habitat ||
    filters.observer ||
    filters.start ||
    filters.end
  );
}

function entryMatches(entry: PhenologyDomainRecord, filters: ProjectQueryFilters): boolean {
  if (filters.growthForm && !lowerText(entry.growthForm).includes(filters.growthForm)) return false;
  if (filters.floweringState && !lowerText(`${entry.label} ${entry.floweringState}`).includes(filters.floweringState))
    return false;
  if (filters.cultivatedStatus && !lowerText(entry.cultivatedStatus).includes(filters.cultivatedStatus)) return false;
  if (filters.habitat && !lowerText(entry.habitat).includes(filters.habitat)) return false;
  if (filters.observer && !lowerText(entry.observer).includes(filters.observer)) return false;
  if (filters.start && (!entry.surveyDate || entry.surveyDate < filters.start)) return false;
  if (filters.end && (!entry.surveyDate || entry.surveyDate > filters.end)) return false;
  return true;
}

function pointSearchText(point: PointDomainRecord, zoneName: string, zoneCode: string): string {
  const entryValues = point.phenologyEntries.flatMap(entry => [
    entry.label,
    entry.floweringState,
    entry.note,
    entry.habitat,
    entry.observer,
    entry.growthForm,
    entry.cultivatedStatus,
    ...entry.images
  ]);
  return lowerText(
    [point.pointId, point.plantNameCn, point.plantNameSci, zoneCode, zoneName, ...entryValues].join(' ')
  );
}

function freezeResult(result: ProjectQueryResult): Readonly<ProjectQueryResult> {
  return Object.freeze(result);
}

export function runProjectQuery(
  snapshot: Readonly<ProjectDomainSnapshot>,
  input: unknown = {}
): readonly Readonly<ProjectQueryResult>[] {
  const filters = normalizeFilters(input);
  const entryFiltersActive = hasEntryFilters(filters);
  const zonesById = new Map(snapshot.zones.map(zone => [zone.id, zone]));

  const zoneResults = snapshot.zones
    .filter(zone => {
      if (filters.text && !lowerText([zone.zoneId, zone.name, zone.description].join(' ')).includes(filters.text)) {
        return false;
      }
      if (filters.zoneId && zone.id !== filters.zoneId) return false;
      return !filters.completeness && !entryFiltersActive;
    })
    .map(zone =>
      freezeResult({
        type: 'zone',
        id: zone.id,
        displayName: zone.name || zone.zoneId || zone.id,
        zoneInternalId: zone.id,
        zoneName: zone.name,
        zoneCode: zone.zoneId,
        phenologyLabels: '',
        flags: EMPTY_FLAGS
      })
    );

  const pointResults = snapshot.points
    .filter(point => {
      const zone = zonesById.get(point.zoneRef);
      if (filters.text && !pointSearchText(point, zone?.name || '', zone?.zoneId || '').includes(filters.text))
        return false;
      if (filters.zoneId && point.zoneRef !== filters.zoneId) return false;
      const flags = getPointQueryCompleteness(point);
      if (filters.completeness && !flags[filters.completeness]) return false;
      if (!entryFiltersActive) return true;
      return point.phenologyEntries.some(entry => entryMatches(entry, filters));
    })
    .map(point => {
      const zone = zonesById.get(point.zoneRef);
      const phenologyLabels = point.phenologyEntries
        .map(entry => entry.label || entry.floweringState)
        .filter(Boolean)
        .join(' / ');
      return freezeResult({
        type: 'point',
        id: point.id,
        displayName: point.plantNameCn || point.plantNameSci || point.pointId,
        zoneInternalId: zone?.id || '',
        zoneName: zone?.name || '',
        zoneCode: zone?.zoneId || '',
        phenologyLabels,
        flags: getPointQueryCompleteness(point)
      });
    });

  return Object.freeze([...zoneResults, ...pointResults]);
}
