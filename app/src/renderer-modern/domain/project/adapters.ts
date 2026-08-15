import { compactTaxonomyCandidates } from '../taxonomy/model';
import type {
  CompatibilityWarning,
  PhenologyDomainRecord,
  PointDomainRecord,
  ProjectDomainSnapshot,
  UnknownRecord,
  ZoneDomainRecord
} from './types';

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asRecord(value: unknown): UnknownRecord {
  return isRecord(value) ? value : {};
}

function cleanText(value: unknown): string {
  const text = String(value ?? '').trim();
  return ['null', 'undefined'].includes(text.toLocaleLowerCase()) ? '' : text;
}

function firstText(record: UnknownRecord, keys: string[]): string {
  for (const key of keys) {
    const value = cleanText(record[key]);
    if (value) return value;
  }
  return '';
}

function finiteNumber(value: unknown): number | null {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function cloneRecord(record: UnknownRecord): UnknownRecord {
  if (typeof structuredClone === 'function') return structuredClone(record);
  return JSON.parse(JSON.stringify(record)) as UnknownRecord;
}

function deepFreeze<T>(value: T): Readonly<T> {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value as Record<string, unknown>).forEach(item => deepFreeze(item));
    Object.freeze(value);
  }
  return value as Readonly<T>;
}

function sourceView(record: UnknownRecord): Readonly<UnknownRecord> {
  return deepFreeze(cloneRecord(record));
}

function arrayRecords(value: unknown): UnknownRecord[] {
  if (Array.isArray(value)) return value.map(asRecord);
  if (isRecord(value)) return Object.values(value).map(asRecord);
  return [];
}

function imageValues(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(cleanText).filter(Boolean);
  const text = cleanText(value);
  return text ? text.split(/[;,|]/).map(item => item.trim()).filter(Boolean) : [];
}

export function adaptZoneRecord(value: unknown): Readonly<ZoneDomainRecord> {
  const zone = asRecord(value);
  const geometry = isRecord(zone.geometry) ? sourceView(zone.geometry) : null;
  return Object.freeze({
    source: sourceView(zone),
    id: cleanText(zone.id),
    zoneId: firstText(zone, ['zoneId', 'code']),
    name: firstText(zone, ['name', 'title', 'label', 'displayName', 'zoneId', 'id']),
    description: cleanText(zone.description),
    geometry
  });
}

export function adaptPhenologyRecord(value: unknown): Readonly<PhenologyDomainRecord> {
  const entry = asRecord(value);
  const label = firstText(entry, ['label', 'floweringState', 'status']);
  return Object.freeze({
    source: sourceView(entry),
    id: cleanText(entry.id),
    label,
    observer: cleanText(entry.observer),
    surveyDate: firstText(entry, ['surveyDate', 'observedAt', 'date']),
    habitat: cleanText(entry.habitat),
    abundance: cleanText(entry.abundance),
    growthForm: firstText(entry, ['growthForm', 'lifeForm']),
    floweringState: firstText(entry, ['floweringState', 'label', 'status']),
    cultivatedStatus: firstText(entry, ['cultivatedStatus', 'nativeStatus', 'origin']),
    note: cleanText(entry.note),
    images: Object.freeze([
      ...imageValues(entry.images),
      ...imageValues(entry.imageIds),
      ...imageValues(entry.photos)
    ])
  });
}

export function adaptPointRecord(value: unknown): Readonly<PointDomainRecord> {
  const point = asRecord(value);
  const properties = asRecord(point.properties);
  const entries = point.phenologyEntries ?? point.phenologyRecords ?? point.phenology;
  return Object.freeze({
    source: sourceView(point),
    id: cleanText(point.id),
    pointId: firstText(point, ['pointId', 'id']),
    zoneRef: firstText(point, ['zoneRef', 'zoneId', 'zone', 'zoneKey']) || cleanText(properties.zoneId),
    lat: finiteNumber(point.lat ?? point.latitude),
    lng: finiteNumber(point.lng ?? point.lon ?? point.longitude),
    plantNameCn: firstText(point, ['plantNameCn', 'chineseName', 'name', '中文名']),
    plantNameSci: firstText(point, ['plantNameSci', 'scientificName', 'latinName', '学名']),
    family: firstText(point, ['family', 'familyName', '科']),
    genus: firstText(point, ['genus', 'genusName', '属']),
    identificationStatus: cleanText(point.identificationStatus) || 'draft',
    taxonomySource: cleanText(point.taxonomySource) || 'unknown',
    taxonomyVerificationStatus: cleanText(point.taxonomyVerificationStatus) || 'unverified',
    taxonomyCandidatesSummary: Object.freeze(
      compactTaxonomyCandidates(point.taxonomyCandidatesSummary, 5)
        .map(candidate => Object.freeze(candidate))
    ),
    phenologyEntries: Object.freeze(arrayRecords(entries).map(adaptPhenologyRecord))
  });
}

export function adaptProjectRecords(
  zonesValue: unknown,
  pointsValue: unknown
): Readonly<ProjectDomainSnapshot> {
  const rawZones = Array.isArray(zonesValue) ? zonesValue : [];
  const rawPoints = Array.isArray(pointsValue) ? pointsValue : [];
  const zones = rawZones.map(adaptZoneRecord);
  const points = rawPoints.map(adaptPointRecord);
  const warnings: CompatibilityWarning[] = [];

  rawZones.forEach((value, index) => {
    if (!isRecord(value)) warnings.push({ code: 'invalid-zone-record', path: `zones[${index}]` });
    else if (!zones[index].id) warnings.push({ code: 'missing-zone-id', path: `zones[${index}].id` });
  });
  rawPoints.forEach((value, index) => {
    if (!isRecord(value)) warnings.push({ code: 'invalid-point-record', path: `points[${index}]` });
    else {
      if (!points[index].id) warnings.push({ code: 'missing-point-id', path: `points[${index}].id` });
      if (points[index].lat === null || points[index].lng === null) {
        warnings.push({ code: 'invalid-coordinate', path: `points[${index}]` });
      }
    }
  });

  return Object.freeze({
    zones: Object.freeze(zones),
    points: Object.freeze(points),
    warnings: Object.freeze(warnings.map(warning => Object.freeze(warning)))
  });
}
