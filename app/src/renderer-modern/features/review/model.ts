import type { UnknownRecord } from '../../domain/project/types';

export type ReviewSeverity = 'high' | 'medium' | 'low';

export type ReviewIssueId =
  | 'invalidZone'
  | 'missingCoordinate'
  | 'abnormalCoordinate'
  | 'missingScientificName'
  | 'missingChineseName'
  | 'missingFamily'
  | 'missingGenus'
  | 'doubtfulTaxonomy'
  | 'unverifiedTaxonomy'
  | 'missingPhenology'
  | 'missingImage'
  | 'missingGrowthForm'
  | 'missingOrigin';

export interface ReviewIssueDefinition {
  id: ReviewIssueId;
  severity: ReviewSeverity;
  labelKey: string;
  detailKey: string;
}

export type ResearchReviewIssue = ReviewIssueDefinition;

export interface ResearchReviewTask {
  id: string;
  pointInternalId: string;
  pointId: string;
  displayName: string;
  scientificName: string;
  zoneInternalId: string;
  severity: ReviewSeverity;
  issues: readonly ResearchReviewIssue[];
  searchText: string;
}

export interface ResearchReviewQueue {
  totalPoints: number;
  readyPoints: number;
  pendingPoints: number;
  openIssueCount: number;
  progressPercent: number;
  tasks: readonly ResearchReviewTask[];
  issueCounts: Readonly<Record<ReviewIssueId, number>>;
}

export interface ResearchReviewBridge {
  definitions: readonly ReviewIssueDefinition[];
  build(zones: unknown[], points: unknown[]): ResearchReviewQueue;
}

export const REVIEW_ISSUE_DEFINITIONS: readonly ReviewIssueDefinition[] = Object.freeze([
  { id: 'invalidZone', severity: 'high', labelKey: 'reviewIssueInvalidZone', detailKey: 'reviewIssueInvalidZoneDetail' },
  { id: 'missingCoordinate', severity: 'high', labelKey: 'reviewIssueMissingCoordinate', detailKey: 'reviewIssueMissingCoordinateDetail' },
  { id: 'abnormalCoordinate', severity: 'high', labelKey: 'reviewIssueAbnormalCoordinate', detailKey: 'reviewIssueAbnormalCoordinateDetail' },
  { id: 'missingScientificName', severity: 'medium', labelKey: 'reviewIssueMissingScientificName', detailKey: 'reviewIssueMissingScientificNameDetail' },
  { id: 'missingChineseName', severity: 'medium', labelKey: 'reviewIssueMissingChineseName', detailKey: 'reviewIssueMissingChineseNameDetail' },
  { id: 'missingFamily', severity: 'medium', labelKey: 'reviewIssueMissingFamily', detailKey: 'reviewIssueMissingFamilyDetail' },
  { id: 'missingGenus', severity: 'medium', labelKey: 'reviewIssueMissingGenus', detailKey: 'reviewIssueMissingGenusDetail' },
  { id: 'doubtfulTaxonomy', severity: 'high', labelKey: 'reviewIssueDoubtfulTaxonomy', detailKey: 'reviewIssueDoubtfulTaxonomyDetail' },
  { id: 'unverifiedTaxonomy', severity: 'medium', labelKey: 'reviewIssueUnverifiedTaxonomy', detailKey: 'reviewIssueUnverifiedTaxonomyDetail' },
  { id: 'missingPhenology', severity: 'medium', labelKey: 'reviewIssueMissingPhenology', detailKey: 'reviewIssueMissingPhenologyDetail' },
  { id: 'missingImage', severity: 'low', labelKey: 'reviewIssueMissingImage', detailKey: 'reviewIssueMissingImageDetail' },
  { id: 'missingGrowthForm', severity: 'low', labelKey: 'reviewIssueMissingGrowthForm', detailKey: 'reviewIssueMissingGrowthFormDetail' },
  { id: 'missingOrigin', severity: 'low', labelKey: 'reviewIssueMissingOrigin', detailKey: 'reviewIssueMissingOriginDetail' }
]);

const SEVERITY_ORDER: Record<ReviewSeverity, number> = { high: 0, medium: 1, low: 2 };
const MISSING_PHENOLOGY_LABELS = new Set(['', '不明', '未知', 'unknown', 'na', 'n/a', 'none']);

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : {};
}

function cleanText(value: unknown): string {
  const text = String(value ?? '').trim();
  return ['null', 'undefined', 'n/a', 'na'].includes(text.toLocaleLowerCase()) ? '' : text;
}

function firstText(record: UnknownRecord, keys: string[]): string {
  for (const key of keys) {
    const value = cleanText(record[key]);
    if (value) return value;
  }
  return '';
}

function arrayValues(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value as UnknownRecord);
  return [];
}

function phenologyEntries(point: UnknownRecord): UnknownRecord[] {
  const source = point.phenologyEntries ?? point.phenologyRecords ?? point.phenology;
  return arrayValues(source).map(asRecord);
}

function imageValues(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(cleanText).filter(Boolean);
  const text = cleanText(value);
  return text ? text.split(/[;,|]/).map(item => item.trim()).filter(Boolean) : [];
}

function pointHasImages(point: UnknownRecord, entries: UnknownRecord[]): boolean {
  const pointImages = [point.images, point.imageIds, point.photos].flatMap(imageValues);
  const entryImages = entries.flatMap(entry => [entry.images, entry.imageIds, entry.photos].flatMap(imageValues));
  return pointImages.length + entryImages.length > 0;
}

function pointHasPhenology(entries: UnknownRecord[]): boolean {
  return entries.some(entry => {
    const status = firstText(entry, ['floweringState', 'label', 'status']).toLocaleLowerCase();
    if (!MISSING_PHENOLOGY_LABELS.has(status)) return true;
    return [
      'surveyDate',
      'observedAt',
      'observer',
      'habitat',
      'abundance',
      'growthForm',
      'cultivatedStatus',
      'note'
    ].some(key => Boolean(cleanText(entry[key])));
  });
}

function zoneAliases(zones: unknown[]): Map<string, string> {
  const aliases = new Map<string, string>();
  zones.map(asRecord).forEach(zone => {
    const internalId = cleanText(zone.id);
    [zone.id, zone.zoneId, zone.name, zone.title, zone.label].map(cleanText).filter(Boolean)
      .forEach(alias => aliases.set(alias, internalId || alias));
  });
  return aliases;
}

function pointZoneReference(point: UnknownRecord): string {
  const properties = asRecord(point.properties);
  return firstText(point, ['zoneRef', 'zoneId', 'zone', 'zoneKey']) || cleanText(properties.zoneId);
}

function issueMap(): Record<ReviewIssueId, number> {
  return Object.fromEntries(REVIEW_ISSUE_DEFINITIONS.map(issue => [issue.id, 0])) as Record<ReviewIssueId, number>;
}

function taskIssues(point: UnknownRecord, aliases: Map<string, string>): ResearchReviewIssue[] {
  const entries = phenologyEntries(point);
  const zoneRef = pointZoneReference(point);
  const lat = Number(point.lat ?? point.latitude);
  const lng = Number(point.lng ?? point.lon ?? point.longitude);
  const hasCoordinate = Number.isFinite(lat) && Number.isFinite(lng);
  const family = firstText(point, ['family', 'familyName', '科']);
  const genus = firstText(point, ['genus', 'genusName', '属']);
  const verification = firstText(point, ['taxonomyVerificationStatus']).toLocaleLowerCase();
  const growthForm = firstText(point, ['growthForm', 'lifeForm', '生活型']) ||
    entries.map(entry => firstText(entry, ['growthForm', 'lifeForm'])).find(Boolean) || '';
  const origin = firstText(point, ['cultivatedStatus', 'nativeStatus', 'origin', '来源属性']) ||
    entries.map(entry => firstText(entry, ['cultivatedStatus', 'nativeStatus', 'origin'])).find(Boolean) || '';
  const matches: Partial<Record<ReviewIssueId, boolean>> = {
    invalidZone: !zoneRef || !aliases.has(zoneRef),
    missingCoordinate: !hasCoordinate,
    abnormalCoordinate: hasCoordinate && (lat < -90 || lat > 90 || lng < -180 || lng > 180),
    missingScientificName: !firstText(point, ['plantNameSci', 'scientificName', 'latinName', '学名']),
    missingChineseName: !firstText(point, ['plantNameCn', 'chineseName', 'name', '中文名']),
    missingFamily: !family,
    missingGenus: !genus,
    doubtfulTaxonomy: verification === 'doubtful',
    unverifiedTaxonomy: Boolean(family || genus) && !['manuallyverified', 'doubtful', 'rejected'].includes(verification),
    missingPhenology: !pointHasPhenology(entries),
    missingImage: !pointHasImages(point, entries),
    missingGrowthForm: !growthForm,
    missingOrigin: !origin
  };
  return REVIEW_ISSUE_DEFINITIONS.filter(issue => matches[issue.id]);
}

function taskSeverity(issues: readonly ResearchReviewIssue[]): ReviewSeverity {
  return issues.reduce<ReviewSeverity>((current, issue) => (
    SEVERITY_ORDER[issue.severity] < SEVERITY_ORDER[current] ? issue.severity : current
  ), 'low');
}

export function buildResearchReviewQueue(zones: unknown[] = [], points: unknown[] = []): ResearchReviewQueue {
  const aliases = zoneAliases(zones);
  const counts = issueMap();
  const tasks = points.map(asRecord).map((point, index) => {
    const issues = taskIssues(point, aliases);
    if (!issues.length) return null;
    issues.forEach(issue => { counts[issue.id] += 1; });
    const pointInternalId = cleanText(point.id) || `point-${index + 1}`;
    const pointId = firstText(point, ['pointId', 'id']) || `P${index + 1}`;
    const displayName = firstText(point, ['plantNameCn', 'chineseName', 'plantNameSci', 'scientificName', 'pointId', 'id']) || pointId;
    const scientificName = firstText(point, ['plantNameSci', 'scientificName', 'latinName', '学名']);
    const zoneRef = pointZoneReference(point);
    return {
      id: `review-${pointInternalId}`,
      pointInternalId,
      pointId,
      displayName,
      scientificName,
      zoneInternalId: aliases.get(zoneRef) || '',
      severity: taskSeverity(issues),
      issues,
      searchText: [pointId, displayName, scientificName, zoneRef, ...issues.map(issue => issue.id)]
        .join(' ')
        .toLocaleLowerCase()
    } as ResearchReviewTask;
  }).filter((task): task is ResearchReviewTask => Boolean(task));

  tasks.sort((left, right) => (
    SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity] ||
    right.issues.length - left.issues.length ||
    left.pointId.localeCompare(right.pointId)
  ));
  const totalPoints = points.length;
  const pendingPoints = tasks.length;
  const readyPoints = Math.max(0, totalPoints - pendingPoints);
  const openIssueCount = Object.values(counts).reduce((sum, count) => sum + count, 0);
  return {
    totalPoints,
    readyPoints,
    pendingPoints,
    openIssueCount,
    progressPercent: totalPoints ? Math.round(readyPoints / totalPoints * 100) : 0,
    tasks,
    issueCounts: counts
  };
}

export function createResearchReviewBridge(): ResearchReviewBridge {
  return {
    definitions: REVIEW_ISSUE_DEFINITIONS,
    build: buildResearchReviewQueue
  };
}
