const CURRENT_RUNTIME_SCHEMA = 'runtime-v9.0-1';

const LEGACY_PHENOLOGY_ALIASES = Object.freeze({
  开花: '盛花期',
  结果: '果熟期',
  营养期: '营养生长期',
  落花: '凋花期',
  花蕾: '现蕾期',
  幼果: '幼果期',
  成熟: '果熟期'
});

const DEFAULT_PHENOLOGY_ENTRY = Object.freeze({
  id: '',
  label: '不明',
  observer: '',
  surveyDate: '',
  habitat: '',
  abundance: '',
  growthForm: '',
  floweringState: '不明',
  cultivatedStatus: '',
  note: '',
  images: []
});

const FALLBACK_FLOWERING_STATE = Object.freeze([
  '萌芽期',
  '展叶期',
  '营养生长期',
  '花芽分化期',
  '现蕾期',
  '始花期',
  '盛花期',
  '末花期',
  '凋花期',
  '幼果期',
  '果熟期',
  '种子成熟期',
  '落叶期',
  '休眠期',
  '不明'
]);
const DEFAULT_POINT_FIELDS = Object.freeze({
  pointId: '',
  zoneRef: '',
  plantNameCn: '',
  plantNameSci: '',
  family: '',
  genus: '',
  identificationStatus: 'draft',
  taxonomySource: 'unknown',
  taxonomyMatchedName: '',
  taxonomyConfidence: null,
  taxonomyConfidenceLabel: 'unknown',
  taxonomyVerificationStatus: 'unverified',
  taxonomyUpdatedAt: '',
  taxonomyCandidatesSummary: [],
  lat: NaN,
  lng: NaN,
  selectedPhenologyId: ''
});

function getFloweringStateOptions() {
  if (typeof STANDARD_OPTIONS !== 'undefined' && Array.isArray(STANDARD_OPTIONS.floweringState)) {
    return STANDARD_OPTIONS.floweringState;
  }
  return FALLBACK_FLOWERING_STATE;
}

function createPhenologyId() {
  if (typeof makeUid === 'function') {
    return makeUid('pheno');
  }
  return `pheno_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
function normalizeValue(_field, value) {
  const text = String(value ?? '').trim();
  return text || '';
}

// 早期版本使用较粗物候词，加载时映射到现行标准选项。
function mapLegacyPhenology(value) {
  const text = String(value || '').trim();
  if (!text) {
    return '不明';
  }

  const direct = getFloweringStateOptions().find(item => item === text);
  if (direct) {
    return direct;
  }

  return LEGACY_PHENOLOGY_ALIASES[text] || text;
}

function normalizeImages(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }
  if (!value) {
    return [];
  }
  return String(value).split(/\s*;\s*/).filter(Boolean);
}

function pickPhenologyLabel(raw) {
  return mapLegacyPhenology(
    raw.label || raw.floweringState || raw.phaseName || raw.phenology || '不明'
  );
}

// 单物候旧记录补成 phenologyEntries，保持旧 points.json 可用。
function makePhenologyEntry(raw = {}) {
  const label = pickPhenologyLabel(raw);

  return {
    ...DEFAULT_PHENOLOGY_ENTRY,
    id: raw.id || createPhenologyId(),
    label,
    observer: String(raw.observer || '').trim(),
    surveyDate: String(raw.surveyDate || '').trim(),
    habitat: normalizeValue('habitat', raw.habitat),
    abundance: normalizeValue('abundance', raw.abundance),
    growthForm: normalizeValue('growthForm', raw.growthForm),
    floweringState: mapLegacyPhenology(raw.floweringState || label),
    cultivatedStatus: normalizeValue('cultivatedStatus', raw.cultivatedStatus),
    note: String(raw.note || '').trim(),
    images: normalizeImages(raw.images)
  };
}

function makeLegacyPhenologyEntry(point) {
  return makePhenologyEntry({
    label: mapLegacyPhenology(point.floweringState),
    floweringState: point.floweringState,
    observer: point.observer,
    surveyDate: point.surveyDate,
    habitat: point.habitat,
    abundance: point.abundance,
    growthForm: point.growthForm,
    cultivatedStatus: point.cultivatedStatus,
    note: point.note,
    images: point.images
  });
}

// 顶层字段继续镜像首个物候记录，避免旧导出和旧 UI 读取断裂。
function syncPointSummary(point) {
  const entry = (point.phenologyEntries || [])[0] || makePhenologyEntry({});
  point.observer = entry.observer;
  point.surveyDate = entry.surveyDate;
  point.habitat = entry.habitat;
  point.abundance = entry.abundance;
  point.growthForm = entry.growthForm;
  point.floweringState = entry.floweringState || entry.label;
  point.cultivatedStatus = entry.cultivatedStatus;
  point.note = entry.note;
  point.images = normalizeImages(entry.images);

  const hasSelected = (point.phenologyEntries || [])
    .some(entryItem => entryItem.id === point.selectedPhenologyId);

  if (!point.selectedPhenologyId || !hasSelected) {
    point.selectedPhenologyId = entry.id || '';
  }

  return point;
}

function normalizePointFields(point) {
  return {
    ...DEFAULT_POINT_FIELDS,
    ...point,
    lat: Number(point.lat),
    lng: Number(point.lng),
    plantNameCn: String(point.plantNameCn || '').trim(),
    plantNameSci: String(point.plantNameSci || '').trim(),
    family: String(point.family || '').trim(),
    genus: String(point.genus || '').trim(),
    identificationStatus: String(point.identificationStatus || 'draft').trim(),
    taxonomySource: String(point.taxonomySource || 'unknown').trim(),
    taxonomyMatchedName: String(point.taxonomyMatchedName || '').trim(),
    taxonomyConfidence: Number.isFinite(Number(point.taxonomyConfidence)) ? Number(point.taxonomyConfidence) : null,
    taxonomyConfidenceLabel: String(point.taxonomyConfidenceLabel || 'unknown').trim(),
    taxonomyVerificationStatus: String(point.taxonomyVerificationStatus || 'unverified').trim(),
    taxonomyUpdatedAt: String(point.taxonomyUpdatedAt || '').trim(),
    taxonomyCandidatesSummary: Array.isArray(point.taxonomyCandidatesSummary) ? point.taxonomyCandidatesSummary.slice(0, 5) : [],
    pointId: String(point.pointId || '').trim()
  };
}

function normalizePhenologyEntries(point) {
  if (Array.isArray(point.phenologyEntries) && point.phenologyEntries.length) {
    return point.phenologyEntries.map(makePhenologyEntry).filter(Boolean);
  }
  return [makeLegacyPhenologyEntry(point)];
}

function normalizePointRecord(point) {
  const next = normalizePointFields(point || {});
  next.phenologyEntries = normalizePhenologyEntries(next);

  if (!next.phenologyEntries.length) {
    next.phenologyEntries = [makePhenologyEntry({ label: '不明' })];
  }

  return syncPointSummary(next);
}

function numberPairFromArray(pair) {
  if (!Array.isArray(pair) || pair.length < 2) {
    return null;
  }

  const first = Number(pair[0]);
  const second = Number(pair[1]);
  if (!Number.isFinite(first) || !Number.isFinite(second)) {
    return null;
  }

  return [first, second];
}

function decodeArrayCoord(pair) {
  const numbers = numberPairFromArray(pair);
  if (!numbers) {
    return null;
  }

  const [first, second] = numbers;
  if (Math.abs(first) > 90 && Math.abs(second) <= 90) {
    return [second, first];
  }
  if (Math.abs(second) > 90 && Math.abs(first) <= 90) {
    return [first, second];
  }
  return [second, first];
}

function decodeObjectCoord(pair) {
  if (!pair || typeof pair !== 'object') {
    return null;
  }

  const lat = Number(pair.lat ?? pair.latitude ?? pair.y);
  const lng = Number(pair.lng ?? pair.lon ?? pair.longitude ?? pair.x);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return [lat, lng];
}

// GeoJSON 使用 [lng, lat]，Leaflet 使用 [lat, lng]，旧数据还可能混用对象坐标。
function decodeCoordPair(pair) {
  return decodeArrayCoord(pair) || decodeObjectCoord(pair);
}

function polygonFromCoordinates(coordinates) {
  if (!Array.isArray(coordinates?.[0])) {
    return null;
  }
  return { type: 'Polygon', coordinates: [coordinates] };
}

function polygonFromLatLngs(latlngs) {
  if (!Array.isArray(latlngs)) {
    return null;
  }

  const ring = latlngs
    .map(item => decodeCoordPair(item))
    .filter(Boolean)
    .map(([lat, lng]) => [lng, lat]);

  return ring.length >= 3 ? { type: 'Polygon', coordinates: [ring] } : null;
}

// 分区兼容 geometry、coordinates、latlngs 三种历史结构，最终统一为 GeoJSON Polygon。
function normalizeZoneRecord(zone) {
  const out = { ...(zone || {}) };
  const geometry = out.geometry;

  if (geometry?.type === 'Polygon' && Array.isArray(geometry.coordinates?.[0])) {
    return out;
  }

  const fromCoordinates = polygonFromCoordinates(out.coordinates);
  if (fromCoordinates) {
    out.geometry = fromCoordinates;
    return out;
  }

  const fromLatLngs = polygonFromLatLngs(out.latlngs);
  if (fromLatLngs) {
    out.geometry = fromLatLngs;
  }

  return out;
}

function getPhenologyEntries(point) {
  return point?.phenologyEntries || [];
}

function getSelectedPhenologyEntry(point = getSelectedPoint()) {
  if (!point) {
    return null;
  }
  const entries = getPhenologyEntries(point);
  return entries.find(entry => entry.id === state.selectedPhenologyId) || entries[0] || null;
}

function setSelectedPhenologyEntry(pointId, entryId) {
  if (pointId) {
    state.selectedPointId = pointId;
  }
  state.selectedPhenologyId = entryId || '';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CURRENT_RUNTIME_SCHEMA,
    LEGACY_PHENOLOGY_ALIASES,
    DEFAULT_PHENOLOGY_ENTRY,
    DEFAULT_POINT_FIELDS,
    mapLegacyPhenology,
    normalizeImages,
    makePhenologyEntry,
    syncPointSummary,
    normalizePointRecord,
    decodeCoordPair,
    normalizeZoneRecord
  };
}
