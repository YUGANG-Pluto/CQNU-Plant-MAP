(function initStatsResearchShared(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.StatsResearchShared = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createStatsResearchShared() {
  const MISSING_LABEL = '未填写';
  const MISSING_SPECIES = 'missingSpecies';
  const UNASSOCIATED_ZONE_ID = '__unassociated_zone__';
  const UNASSOCIATED_ZONE_LABEL = '未关联分区';
  const EXPORT_VERSION = 'research-stats-v1';

  const QUALITY_ISSUES = [
    { id: 'missingScientificName', label: '缺失学名' },
    { id: 'missingChineseName', label: '缺失中文名' },
    { id: 'missingFamily', label: '缺失科' },
    { id: 'missingGenus', label: '缺失属' },
    { id: 'missingGrowthForm', label: '缺失生活型' },
    { id: 'missingOrigin', label: '缺失来源属性' },
    { id: 'missingCoordinate', label: '缺失坐标' },
    { id: 'unassociatedZone', label: '未关联分区' },
    { id: 'missingImage', label: '缺失图片' },
    { id: 'missingPhenology', label: '缺失物候记录' },
    { id: 'unreviewed', label: '未复核记录' },
    { id: 'unverifiedTaxonomy', label: '未核验科属' },
    { id: 'doubtfulTaxonomy', label: '存疑科属' },
    { id: 'duplicateCandidate', label: '疑似重复点位' },
    { id: 'abnormalCoordinate', label: '坐标异常' },
    { id: 'invalidZoneRef', label: '分区引用无效' },
    { id: 'invalidImageRef', label: '图片引用异常' }
  ];

  const METRIC_DEFINITIONS = [
    { id: 'speciesRichness', name: '物种丰富度 S', formula: 'count(unique speciesKey)' },
    { id: 'shannon', name: 'Shannon-Wiener H', formula: '-sum(p_i * ln(p_i))' },
    { id: 'simpsonDiversity', name: 'Simpson 多样性指数 1-D', formula: '1 - sum(p_i^2)' },
    { id: 'pielou', name: 'Pielou 均匀度 J', formula: "H' / ln(S)" },
    { id: 'margalef', name: 'Margalef 丰富度指数', formula: '(S - 1) / ln(N)' },
    { id: 'menhinick', name: 'Menhinick 丰富度指数', formula: 'S / sqrt(N)' },
    { id: 'bergerParker', name: 'Berger-Parker 优势度', formula: 'max(n_i) / N' },
    { id: 'hillQ0', name: 'Hill number q=0', formula: 'S' },
    { id: 'hillQ1', name: 'Hill number q=1', formula: "exp(H')" },
    { id: 'hillQ2', name: 'Hill number q=2', formula: '1 / D' },
    { id: 'jaccard', name: 'Jaccard 相似性', formula: '|A ∩ B| / |A ∪ B|' },
    { id: 'sorensen', name: 'Sørensen-Dice 相似性', formula: '2 * |A ∩ B| / (|A| + |B|)' },
    { id: 'brayCurtis', name: 'Bray-Curtis 相异度', formula: 'sum(|n_ai - n_bi|) / sum(n_ai + n_bi)' },
    { id: 'qualityScore', name: '数据质量评分', formula: 'max(0, 100 - deductions)' }
  ];

  const FORMULA_NOTES = [
    '物种数按唯一 speciesKey 统计。',
    '多样性指数默认基于点位记录频次计算；存在有效 abundanceValue 时可按丰度字段计算。',
    '未采用标准样方、固定样线、可靠个体数或盖度时，结果不应解释为严格群落生态学结论。',
    'Jaccard 和 Sørensen 用于比较分区间物种记录集合相似性。',
    'Bray-Curtis 如启用，基于点位频次或丰度字段计算。',
    '数据质量评分只反映记录完整性，不代表生态质量。',
    '调查批次不足时，物候统计仅说明记录分布。'
  ];

  const DATA_SCOPE_NOTES = [
    '统计结果来自当前打开项目的 zones.json 和 points.json。',
    '未知字段会被保留在原始项目数据中，统计计算只读取必要字段。',
    'missingSpecies 不计入物种丰富度，但计入数据质量问题。',
    '热力矩阵用于辅助展示，不替代原始数据和导出表格。'
  ];

  function isBlank(value) {
    return value === null || value === undefined || String(value).trim() === '';
  }

  function cleanString(value, fallback = '') {
    if (isBlank(value)) return fallback;
    return String(value).trim();
  }

  function toFiniteNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  function roundNumber(value, digits = 3) {
    if (value === null || value === undefined) return null;
    const num = Number(value);
    if (!Number.isFinite(num)) return null;
    const factor = 10 ** digits;
    return Math.round(num * factor) / factor;
  }

  function percent(part, total, digits = 1) {
    if (!Number.isFinite(Number(part)) || !Number.isFinite(Number(total)) || Number(total) <= 0) {
      return 0;
    }
    return roundNumber((Number(part) / Number(total)) * 100, digits);
  }

  function normalizeDate(value) {
    if (isBlank(value)) return null;
    const text = String(value).trim();
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return null;
    return date;
  }

  function monthKeyFromDate(value) {
    const date = normalizeDate(value);
    if (!date) return '未知日期';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  function firstValue(source, keys) {
    if (!source || typeof source !== 'object') return undefined;
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(source, key) && !isBlank(source[key])) {
        return source[key];
      }
    }
    return undefined;
  }

  function firstText(source, keys, fallback = MISSING_LABEL) {
    return cleanString(firstValue(source, keys), fallback);
  }

  function uniqueValues(values) {
    return [...new Set(values.filter(value => !isBlank(value)).map(value => String(value).trim()))];
  }

  function formatZoneLabel(label, options = {}) {
    const fallback = options.language === 'en' ? 'Unassigned zone' : UNASSOCIATED_ZONE_LABEL;
    const text = cleanString(label, fallback);
    if (!text || text === 'N/A' || text === 'NA' || text === 'null' || text === 'undefined') {
      return fallback;
    }
    return text;
  }

  function resolveZoneLabel(zoneOrId, zones = [], options = {}) {
    if (zoneOrId && typeof zoneOrId === 'object') {
      return formatZoneLabel(
        zoneOrId.name || zoneOrId.title || zoneOrId.label || zoneOrId.zoneName || zoneOrId.zoneId || zoneOrId.id,
        options
      );
    }
    const id = cleanString(zoneOrId, '');
    const normalizedZones = Array.isArray(zones) ? zones : [];
    const matched = normalizedZones.find(zone => {
      const aliases = [zone.id, zone.zoneId, zone.name, zone.title, zone.label, zone.zoneName]
        .filter(value => !isBlank(value))
        .map(value => String(value).trim());
      return aliases.includes(id);
    });
    return matched ? resolveZoneLabel(matched, zones, options) : formatZoneLabel('', options);
  }

  function getDisplayZoneName(point, zones = [], options = {}) {
    return resolveZoneLabel(getZoneId(point), zones, options);
  }

  function normalizeZoneForStats(zone = {}) {
    const id = cleanString(zone.id || zone.zoneId || zone.name, UNASSOCIATED_ZONE_ID);
    const zoneId = cleanString(zone.zoneId || zone.id || id, id);
    const name = formatZoneLabel(zone.name || zone.title || zone.label || zone.zoneName || zoneId);
    return {
      id,
      zoneId,
      name,
      label: name,
      raw: zone
    };
  }

  function getZoneId(point = {}) {
    const rawZone = point.zone;
    if (rawZone && typeof rawZone === 'object') {
      return cleanString(rawZone.zoneId || rawZone.id || rawZone.name, UNASSOCIATED_ZONE_ID);
    }
    const properties = point.properties && typeof point.properties === 'object' ? point.properties : {};
    return cleanString(
      firstValue(point, ['zoneId', 'zoneRef', 'zone']) || firstValue(properties, ['zoneId', 'zoneRef', 'zone']),
      UNASSOCIATED_ZONE_ID
    );
  }

  function normalizeSpeciesKey(point = {}) {
    const sci = firstValue(point, ['scientificName', 'plantNameSci', 'latinName', 'sciName', '学名']);
    const cn = firstValue(point, ['chineseName', 'plantNameCn', 'commonName', 'name', '中文名']);
    const key = cleanString(sci || cn, '');
    return key || MISSING_SPECIES;
  }

  function getSpeciesMeta(point = {}) {
    const scientificName = cleanString(firstValue(point, ['scientificName', 'plantNameSci', 'latinName', 'sciName', '学名']), '');
    const chineseName = cleanString(firstValue(point, ['chineseName', 'plantNameCn', 'commonName', 'name', '中文名']), '');
    const entries = getPointPhenologyEntries(point);
    const entryFamily = entries.map(entry => entry.family).find(value => !isBlank(value) && value !== MISSING_LABEL);
    const entryGenus = entries.map(entry => entry.genus).find(value => !isBlank(value) && value !== MISSING_LABEL);
    const family = firstText(point, ['family', 'familyName', '科']);
    const genus = firstText(point, ['genus', 'genusName', '属']);
    const speciesKey = normalizeSpeciesKey(point);
    return {
      speciesKey,
      scientificName,
      chineseName,
      family: family === MISSING_LABEL ? (entryFamily || MISSING_LABEL) : family,
      genus: genus === MISSING_LABEL ? (entryGenus || MISSING_LABEL) : genus,
      displayName: scientificName || chineseName || MISSING_LABEL,
      missingSpecies: speciesKey === MISSING_SPECIES
    };
  }

  function getAbundanceValue(point = {}, mode = false) {
    if (!mode) return null;
    const value = firstValue(point, ['abundanceValue', 'abundance', 'count', 'individuals']);
    const num = toFiniteNumber(value);
    return num && num > 0 ? num : null;
  }

  function normalizeImagesArray(value) {
    if (Array.isArray(value)) return value.map(item => cleanString(item, '')).filter(Boolean);
    if (isBlank(value)) return [];
    return String(value).split(/\s*;\s*/).map(item => cleanString(item, '')).filter(Boolean);
  }

  function getPointImages(point = {}) {
    const images = [
      ...normalizeImagesArray(point.images),
      ...normalizeImagesArray(point.imageIds),
      ...normalizeImagesArray(point.photos)
    ];
    getPointPhenologyEntries(point).forEach(entry => {
      images.push(...normalizeImagesArray(entry.images));
      images.push(...normalizeImagesArray(entry.imageIds));
      images.push(...normalizeImagesArray(entry.photos));
    });
    return uniqueValues(images);
  }

  function copyPhenologyEntry(raw = {}) {
    return {
      id: cleanString(raw.id || raw.entryId, ''),
      label: cleanString(raw.label || raw.floweringState || raw.phenology || raw.phaseName, ''),
      surveyDate: cleanString(raw.surveyDate || raw.observedAt || raw.createdAt || raw.date, ''),
      floweringState: cleanString(raw.floweringState || raw.label || raw.phenology || raw.phaseName, MISSING_LABEL),
      growthForm: firstText(raw, ['growthForm', 'lifeForm', '生活型']),
      cultivatedStatus: firstText(raw, ['nativeStatus', 'cultivatedStatus', 'origin', '来源属性']),
      family: firstText(raw, ['family', 'familyName', '科']),
      genus: firstText(raw, ['genus', 'genusName', '属']),
      speciesKey: cleanString(raw.speciesKey || '', ''),
      images: normalizeImagesArray(raw.images)
    };
  }

  function getPointPhenologyEntries(point = {}) {
    const candidates = [point.phenologyEntries, point.phenology, point.phenologyRecords]
      .find(value => Array.isArray(value) && value.length);
    const entries = [];
    if (candidates) {
      candidates.forEach(item => entries.push(copyPhenologyEntry(item)));
    } else {
      const legacyFields = ['floweringState', 'label', 'surveyDate', 'observedAt', 'date', 'growthForm', 'cultivatedStatus'];
      if (legacyFields.some(key => !isBlank(point[key]))) {
        entries.push(copyPhenologyEntry(point));
      }
    }
    const seen = new Set();
    return entries.filter(entry => {
      const key = entry.id || JSON.stringify(entry);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function normalizeTaxonomyStatus(value) {
    const text = cleanString(value, 'unverified');
    return ['unverified', 'suggested', 'manuallyVerified', 'doubtful', 'rejected'].includes(text) ? text : 'unverified';
  }

  function normalizeTaxonomySource(value) {
    const text = cleanString(value, 'unknown');
    return ['manual', 'iNaturalist', 'GBIF', 'iNaturalist+GBIF', 'unknown'].includes(text) ? text : 'unknown';
  }

  function pointNeedsTaxonomyReview(point = {}) {
    const status = normalizeTaxonomyStatus(point.taxonomyVerificationStatus);
    return status === 'suggested' || status === 'unverified';
  }

  function normalizePointForStats(point = {}, options = {}) {
    const meta = getSpeciesMeta(point);
    const entries = getPointPhenologyEntries(point);
    const lat = toFiniteNumber(firstValue(point, ['lat', 'latitude', 'y']));
    const lng = toFiniteNumber(firstValue(point, ['lng', 'lon', 'longitude', 'x']));
    const surveyDate = cleanString(
      firstValue(point, ['surveyDate', 'observedAt', 'createdAt', 'date']) ||
      firstValue(entries[0] || {}, ['surveyDate', 'observedAt', 'createdAt', 'date']),
      ''
    );
    return {
      id: cleanString(point.id || point.pointId || '', ''),
      pointId: cleanString(point.pointId || point.id || '', ''),
      zoneId: getZoneId(point),
      lat,
      lng,
      scientificName: meta.scientificName,
      chineseName: meta.chineseName,
      speciesKey: meta.speciesKey,
      speciesLabel: meta.displayName,
      family: meta.family,
      genus: meta.genus,
      identificationStatus: cleanString(point.identificationStatus || 'draft', 'draft'),
      taxonomySource: normalizeTaxonomySource(point.taxonomySource),
      taxonomyMatchedName: cleanString(point.taxonomyMatchedName || '', ''),
      taxonomyConfidence: toFiniteNumber(point.taxonomyConfidence),
      taxonomyConfidenceLabel: cleanString(point.taxonomyConfidenceLabel || 'unknown', 'unknown'),
      taxonomyVerificationStatus: normalizeTaxonomyStatus(point.taxonomyVerificationStatus),
      taxonomyUpdatedAt: cleanString(point.taxonomyUpdatedAt || '', ''),
      taxonomyCandidatesSummary: Array.isArray(point.taxonomyCandidatesSummary) ? point.taxonomyCandidatesSummary.slice(0, 5) : [],
      growthForm: firstText(point, ['growthForm', 'lifeForm', '生活型']),
      origin: firstText(point, ['nativeStatus', 'cultivatedStatus', 'origin', '来源属性']),
      abundanceValue: getAbundanceValue(point, options.abundanceValueMode),
      surveyDate,
      phenologyEntries: entries,
      images: getPointImages(point),
      reviewed: point.reviewed === true || point.isReviewed === true || cleanString(point.reviewStatus, '').includes('已'),
      raw: point
    };
  }

  function normalizedZonesWithUnassociated(zones, includeUnassociated) {
    const normalized = (Array.isArray(zones) ? zones : []).map(normalizeZoneForStats);
    if (includeUnassociated && !normalized.some(zone => zone.id === UNASSOCIATED_ZONE_ID)) {
      normalized.push({
        id: UNASSOCIATED_ZONE_ID,
        zoneId: UNASSOCIATED_ZONE_ID,
        name: UNASSOCIATED_ZONE_LABEL,
        label: UNASSOCIATED_ZONE_LABEL,
        raw: {}
      });
    }
    return normalized;
  }

  function buildZoneAliasMap(zones) {
    const map = new Map();
    zones.forEach(zone => {
      [zone.id, zone.zoneId, zone.name, zone.label].filter(Boolean).forEach(alias => {
        map.set(String(alias).trim(), zone.id);
      });
    });
    return map;
  }

  function groupPointsByZone(points = [], zones = []) {
    const normalizedZones = normalizedZonesWithUnassociated(zones, false);
    const aliases = buildZoneAliasMap(normalizedZones);
    const normalizedPoints = (Array.isArray(points) ? points : []).map(point => normalizePointForStats(point));
    const groups = new Map(normalizedZones.map(zone => [zone.id, []]));
    let hasUnassociated = false;
    normalizedPoints.forEach(point => {
      const zoneKey = aliases.get(point.zoneId) || UNASSOCIATED_ZONE_ID;
      if (zoneKey === UNASSOCIATED_ZONE_ID) hasUnassociated = true;
      if (!groups.has(zoneKey)) groups.set(zoneKey, []);
      groups.get(zoneKey).push(point);
    });
    if (hasUnassociated && !groups.has(UNASSOCIATED_ZONE_ID)) groups.set(UNASSOCIATED_ZONE_ID, []);
    return groups;
  }

  function buildMatrixModel(input = {}, options = {}) {
    const rows = (input.rows || []).map(row => ({ id: String(row.id), label: cleanString(row.label || row.id, '') }));
    const columns = (input.columns || rows).map(column => ({ id: String(column.id), label: cleanString(column.label || column.id, '') }));
    const cells = (input.cells || []).map(cell => ({
      rowId: String(cell.rowId),
      columnId: String(cell.columnId),
      value: cell.value === null || cell.value === undefined ? null : Number(cell.value),
      displayValue: cleanString(cell.displayValue, cell.value === null || cell.value === undefined ? '' : formatMetricValue(cell.value, 3)),
      raw: cell.raw || {}
    }));
    const values = cells.map(cell => cell.value).filter(value => Number.isFinite(value));
    return {
      id: input.id || options.id || 'stats-matrix',
      title: input.title || options.title || '统计矩阵',
      metric: input.metric || options.metric || 'matrix',
      valueType: input.valueType || options.valueType || 'count',
      range: input.range || options.range || (values.length ? [Math.min(...values), Math.max(...values)] : null),
      rows,
      columns,
      cells,
      notes: input.notes || options.notes || [],
      emptyMessage: input.emptyMessage || options.emptyMessage || '暂无可计算的矩阵数据。'
    };
  }

  function heatLevel(value, matrix) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return null;
    const num = Number(value);
    if (matrix.valueType === 'similarity' || matrix.valueType === 'dissimilarity') {
      if (num <= 0) return 0;
      if (num <= 0.2) return 1;
      if (num <= 0.4) return 2;
      if (num <= 0.6) return 3;
      if (num <= 0.8) return 4;
      return 5;
    }
    const values = matrix.cells.map(cell => cell.value).filter(item => Number.isFinite(item));
    const minValue = values.length ? Math.min(...values) : 0;
    const maxValue = values.length ? Math.max(...values) : 0;
    const normalized = maxValue > minValue ? (num - minValue) / (maxValue - minValue) : (num > 0 ? 1 : 0);
    return Math.max(0, Math.min(5, Math.ceil(normalized * 5)));
  }

  function formatMetricValue(value, digits = 3) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return '';
    return Number(value).toFixed(digits).replace(/\.?0+$/, '');
  }

  return {
    MISSING_LABEL,
    MISSING_SPECIES,
    UNASSOCIATED_ZONE_ID,
    UNASSOCIATED_ZONE_LABEL,
    EXPORT_VERSION,
    QUALITY_ISSUES,
    METRIC_DEFINITIONS,
    FORMULA_NOTES,
    DATA_SCOPE_NOTES,
    isBlank,
    cleanString,
    toFiniteNumber,
    roundNumber,
    percent,
    normalizeDate,
    monthKeyFromDate,
    firstValue,
    firstText,
    uniqueValues,
    formatZoneLabel,
    resolveZoneLabel,
    getDisplayZoneName,
    normalizeZoneForStats,
    getZoneId,
    normalizeSpeciesKey,
    getSpeciesMeta,
    getAbundanceValue,
    normalizeImagesArray,
    getPointImages,
    copyPhenologyEntry,
    getPointPhenologyEntries,
    normalizeTaxonomyStatus,
    normalizeTaxonomySource,
    pointNeedsTaxonomyReview,
    normalizePointForStats,
    normalizedZonesWithUnassociated,
    buildZoneAliasMap,
    groupPointsByZone,
    buildMatrixModel,
    heatLevel,
    formatMetricValue
  };
});
