(function initStatsResearch(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.StatsResearch = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createStatsResearch() {
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
    const family = firstText(point, ['family', 'familyName', '科']);
    const genus = firstText(point, ['genus', 'genusName', '属']);
    const speciesKey = normalizeSpeciesKey(point);
    return {
      speciesKey,
      scientificName,
      chineseName,
      family,
      genus,
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

  function validSpeciesPoints(points) {
    return points.filter(point => point.speciesKey && point.speciesKey !== MISSING_SPECIES);
  }

  function countBy(points, key, options = {}) {
    const map = new Map();
    points.forEach(point => {
      const label = cleanString(typeof key === 'function' ? key(point) : point[key], MISSING_LABEL);
      if (options.skipMissingSpecies && label === MISSING_SPECIES) return;
      const weight = options.weighted && point.abundanceValue ? point.abundanceValue : 1;
      map.set(label, (map.get(label) || 0) + weight);
    });
    return map;
  }

  function rowsFromCountMap(map, totalOverride) {
    const total = totalOverride ?? [...map.values()].reduce((sum, value) => sum + Number(value || 0), 0);
    return [...map.entries()]
      .map(([label, count]) => ({ label, count: roundNumber(count, 3), percentage: percent(count, total) }))
      .sort((a, b) => Number(b.count) - Number(a.count) || String(a.label).localeCompare(String(b.label)));
  }

  function speciesCountsFromPoints(points, options = {}) {
    const counts = new Map();
    points.forEach(point => {
      if (!point.speciesKey || point.speciesKey === MISSING_SPECIES) return;
      const value = options.abundanceValueMode && point.abundanceValue ? point.abundanceValue : 1;
      counts.set(point.speciesKey, (counts.get(point.speciesKey) || 0) + value);
    });
    return counts;
  }

  function calculateHillNumbers(speciesCounts) {
    const diversity = calculateDiversityMetrics(speciesCounts);
    return {
      q0: diversity.hillQ0,
      q1: diversity.hillQ1,
      q2: diversity.hillQ2
    };
  }

  function calculateDiversityMetrics(speciesCounts) {
    const counts = speciesCounts instanceof Map ? [...speciesCounts.values()] : Object.values(speciesCounts || {});
    const values = counts.map(Number).filter(value => Number.isFinite(value) && value > 0);
    const s = values.length;
    const n = values.reduce((sum, value) => sum + value, 0);
    if (n <= 0 || s === 0) {
      return {
        speciesRichness: 0,
        totalAbundance: 0,
        shannon: null,
        simpsonDominance: null,
        simpsonDiversity: null,
        pielou: null,
        margalef: null,
        menhinick: null,
        bergerParker: null,
        shannonMax: null,
        hillQ0: 0,
        hillQ1: null,
        hillQ2: null,
        evenness: null
      };
    }
    const proportions = values.map(value => value / n).filter(value => value > 0);
    const shannon = -proportions.reduce((sum, value) => sum + value * Math.log(value), 0);
    const simpsonDominance = proportions.reduce((sum, value) => sum + value * value, 0);
    const shannonMax = s > 0 ? Math.log(s) : null;
    const maxValue = Math.max(...values);
    return {
      speciesRichness: s,
      totalAbundance: roundNumber(n, 6),
      shannon: roundNumber(s <= 1 ? 0 : shannon, 6),
      simpsonDominance: roundNumber(simpsonDominance, 6),
      simpsonDiversity: roundNumber(1 - simpsonDominance, 6),
      pielou: s <= 1 ? null : roundNumber(shannon / Math.log(s), 6),
      margalef: n <= 1 ? null : roundNumber((s - 1) / Math.log(n), 6),
      menhinick: n <= 0 ? null : roundNumber(s / Math.sqrt(n), 6),
      bergerParker: roundNumber(maxValue / n, 6),
      shannonMax: shannonMax === null ? null : roundNumber(shannonMax, 6),
      hillQ0: s,
      hillQ1: roundNumber(Math.exp(shannon), 6),
      hillQ2: simpsonDominance <= 0 ? null : roundNumber(1 / simpsonDominance, 6),
      evenness: s <= 0 ? null : roundNumber(Math.exp(shannon) / s, 6)
    };
  }

  function setIntersection(a, b) {
    return [...a].filter(value => b.has(value));
  }

  function setUnion(a, b) {
    return new Set([...a, ...b]);
  }

  function calculateSetStats(a, b) {
    const intersection = setIntersection(a, b);
    const union = setUnion(a, b);
    const aOnly = [...a].filter(value => !b.has(value));
    const bOnly = [...b].filter(value => !a.has(value));
    return { intersection, union, aOnly, bOnly };
  }

  function entriesFromZoneCollection(collection) {
    if (!collection) return [];
    if (Array.isArray(collection.zones) && collection.sets instanceof Map) {
      return collection.zones.map(zone => ({
        id: zone.id,
        label: zone.label || zone.name || zone.id,
        value: collection.sets.get(zone.id) || new Set()
      }));
    }
    if (collection instanceof Map) {
      return [...collection.entries()].map(([id, value]) => ({ id, label: id, value }));
    }
    return Object.entries(collection).map(([id, value]) => ({ id, label: id, value }));
  }

  function buildSetMatrix(collection, metric) {
    const entries = entriesFromZoneCollection(collection);
    const rows = entries.map(entry => ({ id: entry.id, label: entry.label }));
    const cells = [];
    entries.forEach(row => {
      entries.forEach(column => {
        const a = row.value instanceof Set ? row.value : new Set(row.value || []);
        const b = column.value instanceof Set ? column.value : new Set(column.value || []);
        const stats = calculateSetStats(a, b);
        let value = null;
        if (metric === 'jaccard') {
          value = stats.union.size === 0 ? null : stats.intersection.length / stats.union.size;
        } else {
          value = (a.size + b.size) === 0 ? null : (2 * stats.intersection.length) / (a.size + b.size);
        }
        cells.push({
          rowId: row.id,
          columnId: column.id,
          value: value === null ? null : roundNumber(value, 6),
          displayValue: formatMetricValue(value, 3),
          raw: {
            rowLabel: row.label,
            columnLabel: column.label,
            intersectionCount: stats.intersection.length,
            unionCount: stats.union.size,
            rowSpeciesCount: a.size,
            columnSpeciesCount: b.size,
            rowUniqueCount: stats.aOnly.length,
            columnUniqueCount: stats.bOnly.length,
            sharedSpecies: stats.intersection
          }
        });
      });
    });
    return buildMatrixModel({
      id: metric === 'jaccard' ? 'jaccard-zone-matrix' : 'sorensen-zone-matrix',
      title: metric === 'jaccard' ? 'Jaccard 分区相似性矩阵' : 'Sørensen-Dice 分区相似性矩阵',
      metric,
      valueType: 'similarity',
      range: [0, 1],
      rows,
      columns: rows,
      cells,
      notes: [
        `${metric === 'jaccard' ? 'Jaccard' : 'Sørensen-Dice'} 相似性基于各分区记录到的唯一 speciesKey 集合计算。`,
        '值越高表示两个分区记录到的物种组成越相似。'
      ],
      emptyMessage: '暂无可计算的分区相似性数据。请至少建立两个包含有效物种记录的分区。'
    });
  }

  function calculateJaccardMatrix(zoneSpeciesSets) {
    return buildSetMatrix(zoneSpeciesSets, 'jaccard');
  }

  function calculateSorensenMatrix(zoneSpeciesSets) {
    return buildSetMatrix(zoneSpeciesSets, 'sorensen');
  }

  function calculateBrayCurtisMatrix(zoneSpeciesCounts) {
    const entries = entriesFromZoneCollection(zoneSpeciesCounts);
    const rows = entries.map(entry => ({ id: entry.id, label: entry.label }));
    const cells = [];
    entries.forEach(row => {
      entries.forEach(column => {
        const a = row.value instanceof Map ? row.value : new Map(Object.entries(row.value || {}));
        const b = column.value instanceof Map ? column.value : new Map(Object.entries(column.value || {}));
        const keys = new Set([...a.keys(), ...b.keys()]);
        let numerator = 0;
        let denominator = 0;
        let shared = 0;
        keys.forEach(key => {
          const av = Number(a.get(key) || 0);
          const bv = Number(b.get(key) || 0);
          if (av > 0 && bv > 0) shared += 1;
          numerator += Math.abs(av - bv);
          denominator += av + bv;
        });
        const value = denominator <= 0 ? null : numerator / denominator;
        cells.push({
          rowId: row.id,
          columnId: column.id,
          value: value === null ? null : roundNumber(value, 6),
          displayValue: formatMetricValue(value, 3),
          raw: {
            rowLabel: row.label,
            columnLabel: column.label,
            sharedSpeciesCount: shared,
            numerator: roundNumber(numerator, 6),
            denominator: roundNumber(denominator, 6),
            basis: '点位记录频次'
          }
        });
      });
    });
    return buildMatrixModel({
      id: 'bray-curtis-zone-matrix',
      title: 'Bray-Curtis 分区相异度矩阵',
      metric: 'brayCurtis',
      valueType: 'dissimilarity',
      range: [0, 1],
      rows,
      columns: rows,
      cells,
      notes: [
        'Bray-Curtis 相异度基于点位记录频次或有效丰度字段计算。',
        '值越高表示两个分区记录组成差异越大。'
      ],
      emptyMessage: '暂无可计算的 Bray-Curtis 数据。请至少建立两个包含有效物种记录的分区。'
    });
  }

  function calculateWhittakerBeta(zoneSpeciesSets) {
    const entries = entriesFromZoneCollection(zoneSpeciesSets).filter(entry => {
      const value = entry.value instanceof Set ? entry.value : new Set(entry.value || []);
      return value.size > 0;
    });
    if (entries.length < 2) return null;
    const gammaSet = new Set();
    let alphaSum = 0;
    entries.forEach(entry => {
      const value = entry.value instanceof Set ? entry.value : new Set(entry.value || []);
      alphaSum += value.size;
      value.forEach(species => gammaSet.add(species));
    });
    const meanAlpha = alphaSum / entries.length;
    return meanAlpha <= 0 ? null : roundNumber(gammaSet.size / meanAlpha - 1, 6);
  }

  function haversineMeters(a, b) {
    if (a.lat === null || a.lng === null || b.lat === null || b.lng === null) return null;
    const toRad = value => value * Math.PI / 180;
    const r = 6371000;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const value = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
    return r * c;
  }

  function detectDuplicatePoints(points = [], options = {}) {
    const threshold = Number(options.distanceMeters || 3);
    const normalized = points.map(point => normalizePointForStats(point, options))
      .filter(point => point.speciesKey !== MISSING_SPECIES && point.lat !== null && point.lng !== null);
    const duplicates = [];
    for (let i = 0; i < normalized.length; i += 1) {
      for (let j = i + 1; j < normalized.length; j += 1) {
        const a = normalized[i];
        const b = normalized[j];
        if (a.zoneId !== b.zoneId || a.speciesKey !== b.speciesKey) continue;
        if (a.pointId && b.pointId && a.pointId === b.pointId) continue;
        const exact = a.lat === b.lat && a.lng === b.lng;
        const distance = exact ? 0 : haversineMeters(a, b);
        if (distance !== null && distance <= threshold) {
          duplicates.push({
            zoneId: a.zoneId,
            speciesKey: a.speciesKey,
            pointA: a.pointId || a.id,
            pointB: b.pointId || b.id,
            distanceMeters: roundNumber(distance, 3)
          });
        }
      }
    }
    return duplicates;
  }

  function coordinateMissing(point) {
    return point.lat === null || point.lng === null;
  }

  function coordinateAbnormal(point) {
    if (coordinateMissing(point)) return false;
    return point.lat < -90 || point.lat > 90 || point.lng < -180 || point.lng > 180;
  }

  function imageRefInvalid(point) {
    return point.images.some(image => /^[a-zA-Z]:/.test(image) || image.includes('..') || image.startsWith('/') || image.startsWith('\\'));
  }

  function calculateQualityLevel(score) {
    if (score >= 85) return '良好';
    if (score >= 70) return '可用';
    if (score >= 50) return '需补充';
    return '不建议用于核心分析';
  }

  function zoneRefInvalid(point, aliases) {
    return point.zoneId !== UNASSOCIATED_ZONE_ID && !aliases.has(point.zoneId);
  }

  function calculateDataQuality(zones = [], points = [], options = {}) {
    const normalizedZones = normalizedZonesWithUnassociated(zones, false);
    const aliases = buildZoneAliasMap(normalizedZones);
    const normalizedPoints = points.map(point => normalizePointForStats(point, options));
    const duplicates = detectDuplicatePoints(points, options);
    const duplicatePointIds = new Set(duplicates.flatMap(item => [item.pointA, item.pointB]));
    const issues = {
      missingScientificName: 0,
      missingChineseName: 0,
      missingFamily: 0,
      missingGenus: 0,
      missingGrowthForm: 0,
      missingOrigin: 0,
      missingCoordinate: 0,
      unassociatedZone: 0,
      missingImage: 0,
      missingPhenology: 0,
      unreviewed: 0,
      duplicateCandidate: duplicates.length,
      abnormalCoordinate: 0,
      invalidZoneRef: 0,
      invalidImageRef: 0
    };
    normalizedPoints.forEach(point => {
      if (!point.scientificName) issues.missingScientificName += 1;
      if (!point.chineseName) issues.missingChineseName += 1;
      if (point.family === MISSING_LABEL) issues.missingFamily += 1;
      if (point.genus === MISSING_LABEL) issues.missingGenus += 1;
      if (point.growthForm === MISSING_LABEL) issues.missingGrowthForm += 1;
      if (point.origin === MISSING_LABEL) issues.missingOrigin += 1;
      if (coordinateMissing(point)) issues.missingCoordinate += 1;
      if (point.zoneId === UNASSOCIATED_ZONE_ID) issues.unassociatedZone += 1;
      if (!point.images.length) issues.missingImage += 1;
      if (!point.phenologyEntries.length) issues.missingPhenology += 1;
      if (!point.reviewed) issues.unreviewed += 1;
      if (coordinateAbnormal(point)) issues.abnormalCoordinate += 1;
      if (zoneRefInvalid(point, aliases)) issues.invalidZoneRef += 1;
      if (imageRefInvalid(point)) issues.invalidImageRef += 1;
    });
    const total = normalizedPoints.length;
    const ratio = value => total ? value / total : 0;
    const deduction = Math.min(20, Math.ceil(ratio(issues.missingScientificName) * 10) * 5) +
      Math.min(30, Math.ceil(ratio(issues.missingCoordinate) * 10) * 10) +
      Math.min(15, Math.ceil(ratio(issues.missingImage) * 10) * 3) +
      Math.min(15, Math.ceil(ratio(issues.missingPhenology) * 10) * 3) +
      Math.min(10, Math.ceil(ratio(issues.unreviewed) * 10) * 2) +
      Math.min(10, duplicates.length * 2);
    const score = Math.max(0, 100 - deduction);
    return {
      totalRecords: total,
      issues,
      issueRows: QUALITY_ISSUES.map(issue => ({
        id: issue.id,
        label: issue.label,
        count: issues[issue.id] || 0,
        percentage: percent(issues[issue.id] || 0, total)
      })),
      duplicateCandidates: duplicates,
      duplicatePointIds: [...duplicatePointIds],
      qualityScore: score,
      qualityLevel: calculateQualityLevel(score),
      note: '数据质量评分仅用于提示记录完整性，不代表植物群落生态质量。'
    };
  }

  function buildZoneSpeciesSets(zones = [], points = [], options = {}) {
    const normalizedZones = normalizedZonesWithUnassociated(zones, false);
    const aliases = buildZoneAliasMap(normalizedZones);
    const normalizedPoints = points.map(point => normalizePointForStats(point, options));
    const zoneMap = new Map(normalizedZones.map(zone => [zone.id, zone]));
    const sets = new Map(normalizedZones.map(zone => [zone.id, new Set()]));
    let hasUnassociated = false;
    normalizedPoints.forEach(point => {
      if (point.speciesKey === MISSING_SPECIES) return;
      const zoneId = aliases.get(point.zoneId) || UNASSOCIATED_ZONE_ID;
      if (zoneId === UNASSOCIATED_ZONE_ID) {
        hasUnassociated = true;
        if (!sets.has(zoneId)) sets.set(zoneId, new Set());
        if (!zoneMap.has(zoneId)) {
          zoneMap.set(zoneId, { id: zoneId, label: UNASSOCIATED_ZONE_LABEL, name: UNASSOCIATED_ZONE_LABEL, zoneId });
        }
      }
      sets.get(zoneId).add(point.speciesKey);
    });
    const resultZones = normalizedZones.filter(zone => sets.has(zone.id));
    if (hasUnassociated) resultZones.push(zoneMap.get(UNASSOCIATED_ZONE_ID));
    return { zones: resultZones, sets };
  }

  function buildZoneSpeciesCounts(zones = [], points = [], options = {}) {
    const speciesSets = buildZoneSpeciesSets(zones, points, options);
    const counts = new Map(speciesSets.zones.map(zone => [zone.id, new Map()]));
    const aliases = buildZoneAliasMap(speciesSets.zones);
    points.map(point => normalizePointForStats(point, options)).forEach(point => {
      if (point.speciesKey === MISSING_SPECIES) return;
      const zoneId = aliases.get(point.zoneId) || UNASSOCIATED_ZONE_ID;
      if (!counts.has(zoneId)) counts.set(zoneId, new Map());
      const current = counts.get(zoneId).get(point.speciesKey) || 0;
      counts.get(zoneId).set(point.speciesKey, current + (options.abundanceValueMode && point.abundanceValue ? point.abundanceValue : 1));
    });
    return { zones: speciesSets.zones, sets: counts };
  }

  function buildProjectSummary(zones = [], points = [], options = {}) {
    const normalizedPoints = points.map(point => normalizePointForStats(point, options));
    const species = new Set(validSpeciesPoints(normalizedPoints).map(point => point.speciesKey));
    const families = new Set(normalizedPoints.filter(point => point.family !== MISSING_LABEL).map(point => point.family));
    const genera = new Set(normalizedPoints.filter(point => point.genus !== MISSING_LABEL).map(point => point.genus));
    const imagePointCount = normalizedPoints.filter(point => point.images.length).length;
    const phenologyPointCount = normalizedPoints.filter(point => point.phenologyEntries.length).length;
    const phenologyCount = normalizedPoints.reduce((sum, point) => sum + point.phenologyEntries.length, 0);
    const quality = calculateDataQuality(zones, points, options);
    return {
      zoneCount: Array.isArray(zones) ? zones.length : 0,
      pointCount: normalizedPoints.length,
      speciesRichness: species.size,
      familyRichness: families.size,
      genusRichness: genera.size,
      imagePointCount,
      imageCompleteness: percent(imagePointCount, normalizedPoints.length),
      phenologyCount,
      phenologyPointCount,
      phenologyCoverage: percent(phenologyPointCount, normalizedPoints.length),
      missingRecordCount: quality.issueRows.reduce((sum, row) => sum + row.count, 0),
      unassociatedZonePointCount: quality.issues.unassociatedZone,
      duplicateCandidateCount: quality.duplicateCandidates.length,
      generatedAt: new Date().toISOString()
    };
  }

  function buildZoneSummaries(zones = [], points = [], options = {}) {
    const normalizedZones = normalizedZonesWithUnassociated(zones, true);
    const aliases = buildZoneAliasMap(normalizedZones);
    const normalizedPoints = points.map(point => normalizePointForStats(point, options));
    const rows = normalizedZones.map(zone => {
      const zonePoints = normalizedPoints.filter(point => (aliases.get(point.zoneId) || UNASSOCIATED_ZONE_ID) === zone.id);
      if (zone.id === UNASSOCIATED_ZONE_ID && !zonePoints.length) return null;
      const speciesCounts = speciesCountsFromPoints(zonePoints, options);
      const quality = calculateDataQuality([zone.raw || zone], zonePoints.map(point => point.raw), options);
      const duplicateCandidateCount = quality.duplicateCandidates.length;
      const imagePointCount = zonePoints.filter(point => point.images.length).length;
      const phenologyPointCount = zonePoints.filter(point => point.phenologyEntries.length).length;
      return {
        zoneId: zone.id,
        zoneCode: zone.zoneId,
        zoneName: zone.name,
        label: zone.label,
        pointCount: zonePoints.length,
        speciesRichness: speciesCounts.size,
        familyRichness: new Set(zonePoints.filter(point => point.family !== MISSING_LABEL).map(point => point.family)).size,
        genusRichness: new Set(zonePoints.filter(point => point.genus !== MISSING_LABEL).map(point => point.genus)).size,
        phenologyCount: zonePoints.reduce((sum, point) => sum + point.phenologyEntries.length, 0),
        imagePointCount,
        imageCompleteness: percent(imagePointCount, zonePoints.length),
        missingScientificNameCount: quality.issues.missingScientificName,
        missingChineseNameCount: quality.issues.missingChineseName,
        missingFamilyCount: quality.issues.missingFamily,
        missingGenusCount: quality.issues.missingGenus,
        missingCoordinateCount: quality.issues.missingCoordinate,
        missingImageCount: quality.issues.missingImage,
        missingPhenologyCount: zonePoints.length - phenologyPointCount,
        duplicateCandidateCount,
        qualityScore: quality.qualityScore,
        qualityLevel: quality.qualityLevel,
        diversity: calculateDiversityMetrics(speciesCounts)
      };
    }).filter(Boolean);
    return rows.sort((a, b) => String(a.label).localeCompare(String(b.label)));
  }

  function buildTaxonomicComposition(points = [], options = {}) {
    const normalizedPoints = points.map(point => normalizePointForStats(point, options));
    const valid = validSpeciesPoints(normalizedPoints);
    const familyRows = rowsFromCountMap(countBy(normalizedPoints, 'family', { weighted: options.abundanceValueMode }));
    const genusRows = rowsFromCountMap(countBy(normalizedPoints, 'genus', { weighted: options.abundanceValueMode }));
    const speciesRows = rowsFromCountMap(speciesCountsFromPoints(valid, options));
    return {
      familyComposition: familyRows,
      genusComposition: genusRows,
      speciesComposition: speciesRows,
      topFamilies: familyRows.slice(0, options.topN || 10),
      topGenera: genusRows.slice(0, options.topN || 10),
      topSpecies: speciesRows.slice(0, options.topN || 10),
      note: '高频组成基于点位记录频次或有效丰度字段，不等同于严格群落优势度。'
    };
  }

  function buildCategoryComposition(points = [], field, options = {}) {
    const normalizedPoints = points.map(point => normalizePointForStats(point, options));
    return rowsFromCountMap(countBy(normalizedPoints, field, { weighted: options.abundanceValueMode }));
  }

  function buildLifeFormComposition(points = [], options = {}) {
    const normalizedPoints = points.map(point => normalizePointForStats(point, options));
    const rows = buildCategoryComposition(points, 'growthForm', options);
    return {
      overall: rows,
      missingCount: normalizedPoints.filter(point => point.growthForm === MISSING_LABEL).length,
      byZone: buildCompositionByZone(normalizedPoints, 'growthForm')
    };
  }

  function buildOriginComposition(points = [], options = {}) {
    const normalizedPoints = points.map(point => normalizePointForStats(point, options));
    const rows = buildCategoryComposition(points, 'origin', options);
    return {
      overall: rows,
      missingCount: normalizedPoints.filter(point => point.origin === MISSING_LABEL).length,
      byZone: buildCompositionByZone(normalizedPoints, 'origin')
    };
  }

  function buildCompositionByZone(normalizedPoints, field) {
    const zoneMap = new Map();
    normalizedPoints.forEach(point => {
      if (!zoneMap.has(point.zoneId)) zoneMap.set(point.zoneId, []);
      zoneMap.get(point.zoneId).push(point);
    });
    return [...zoneMap.entries()].map(([zoneId, zonePoints]) => ({
      zoneId,
      rows: rowsFromCountMap(countBy(zonePoints, field))
    }));
  }

  function buildPhenologyStats(zones = [], points = [], options = {}) {
    const aliases = buildZoneAliasMap(normalizedZonesWithUnassociated(zones, true));
    const normalizedPoints = points.map(point => normalizePointForStats(point, options));
    const entries = [];
    normalizedPoints.forEach(point => {
      point.phenologyEntries.forEach(entry => {
        entries.push({
          pointId: point.pointId || point.id,
          zoneId: aliases.get(point.zoneId) || UNASSOCIATED_ZONE_ID,
          speciesKey: point.speciesKey,
          speciesLabel: point.speciesLabel,
          state: cleanString(entry.floweringState || entry.label, MISSING_LABEL),
          surveyDate: cleanString(entry.surveyDate || point.surveyDate, ''),
          month: monthKeyFromDate(entry.surveyDate || point.surveyDate)
        });
      });
    });
    const stateCounts = rowsFromCountMap(countBy(entries, 'state'));
    const zoneCounts = rowsFromCountMap(countBy(entries, 'zoneId'));
    const monthCounts = rowsFromCountMap(countBy(entries.filter(entry => entry.month !== '未知日期'), 'month'));
    const topSpecies = rowsFromCountMap(countBy(entries.filter(entry => entry.speciesKey !== MISSING_SPECIES), 'speciesLabel')).slice(0, options.topN || 10);
    return {
      totalPhenologyRecords: entries.length,
      phenologyPointCount: normalizedPoints.filter(point => point.phenologyEntries.length).length,
      missingPhenologyPointCount: normalizedPoints.filter(point => !point.phenologyEntries.length).length,
      zoneCounts,
      stateCounts,
      monthCounts,
      monthStateMatrix: buildPhenologyMonthMatrix(entries),
      topSpecies,
      entries,
      note: entries.length < 3 ? '物候记录不足时仅说明记录分布，不推断物候规律。' : '物候统计用于展示记录分布和管理覆盖情况。'
    };
  }

  function buildTimeTrendStats(points = [], options = {}) {
    const normalizedPoints = points.map(point => normalizePointForStats(point, options));
    const monthly = new Map();
    normalizedPoints.forEach(point => {
      const month = monthKeyFromDate(point.surveyDate);
      if (month === '未知日期') return;
      if (!monthly.has(month)) {
        monthly.set(month, { month, newPointCount: 0, newSpecies: new Set(), phenologyRecordCount: 0, imageRecordCount: 0 });
      }
      const row = monthly.get(month);
      row.newPointCount += 1;
      if (point.speciesKey !== MISSING_SPECIES) row.newSpecies.add(point.speciesKey);
      row.imageRecordCount += point.images.length;
    });
    normalizedPoints.forEach(point => {
      point.phenologyEntries.forEach(entry => {
        const month = monthKeyFromDate(entry.surveyDate || point.surveyDate);
        if (month === '未知日期') return;
        if (!monthly.has(month)) {
          monthly.set(month, { month, newPointCount: 0, newSpecies: new Set(), phenologyRecordCount: 0, imageRecordCount: 0 });
        }
        monthly.get(month).phenologyRecordCount += 1;
      });
    });
    const rows = [...monthly.values()].sort((a, b) => a.month.localeCompare(b.month));
    let cumulativePoints = 0;
    const cumulativeSpecies = new Set();
    rows.forEach(row => {
      cumulativePoints += row.newPointCount;
      row.newSpecies.forEach(item => cumulativeSpecies.add(item));
      row.newSpeciesCount = row.newSpecies.size;
      row.cumulativePointCount = cumulativePoints;
      row.cumulativeSpeciesCount = cumulativeSpecies.size;
      delete row.newSpecies;
    });
    return {
      rows,
      hasTrend: rows.length > 0,
      emptyMessage: rows.length ? '' : '日期数据不足，无法生成时间趋势。'
    };
  }

  function buildPhenologyMonthMatrix(entries) {
    const valid = entries.filter(entry => entry.month && entry.month !== '未知日期');
    const months = uniqueValues(valid.map(entry => entry.month)).sort();
    const states = uniqueValues(valid.map(entry => entry.state)).sort();
    const cells = [];
    months.forEach(month => {
      states.forEach(state => {
        const matched = valid.filter(entry => entry.month === month && entry.state === state);
        const species = new Set(matched.filter(entry => entry.speciesKey !== MISSING_SPECIES).map(entry => entry.speciesKey));
        const points = new Set(matched.map(entry => entry.pointId).filter(Boolean));
        cells.push({
          rowId: month,
          columnId: state,
          value: matched.length,
          displayValue: String(matched.length),
          raw: {
            month,
            state,
            recordCount: matched.length,
            pointCount: points.size,
            speciesCount: species.size
          }
        });
      });
    });
    return buildMatrixModel({
      id: 'phenology-month-state-matrix',
      title: '月份 × 物候状态矩阵',
      metric: 'phenologyMonthState',
      valueType: 'count',
      range: null,
      rows: months.map(month => ({ id: month, label: month })),
      columns: states.map(state => ({ id: state, label: state })),
      cells,
      notes: ['按调查日期月份与物候状态统计记录数。'],
      emptyMessage: '日期数据不足，无法生成月份 × 物候状态矩阵。'
    });
  }

  function buildQualityMatrix(zoneSummaries) {
    const columns = [
      { id: 'missingScientificNameCount', label: '缺失学名' },
      { id: 'missingChineseNameCount', label: '缺失中文名' },
      { id: 'missingFamilyCount', label: '缺失科' },
      { id: 'missingGenusCount', label: '缺失属' },
      { id: 'missingCoordinateCount', label: '缺失坐标' },
      { id: 'missingImageCount', label: '缺失图片' },
      { id: 'missingPhenologyCount', label: '缺失物候' },
      { id: 'duplicateCandidateCount', label: '疑似重复' }
    ];
    const rows = zoneSummaries.map(zone => ({ id: zone.zoneId, label: zone.label }));
    const cells = [];
    zoneSummaries.forEach(zone => {
      columns.forEach(column => {
        const value = Number(zone[column.id] || 0);
        cells.push({
          rowId: zone.zoneId,
          columnId: column.id,
          value,
          displayValue: String(value),
          raw: {
            zone: zone.label,
            issueType: column.label,
            count: value,
            ratio: percent(value, zone.pointCount)
          }
        });
      });
    });
    return buildMatrixModel({
      id: 'zone-data-quality-matrix',
      title: '分区 × 数据质量问题矩阵',
      metric: 'zoneDataQuality',
      valueType: 'count',
      range: null,
      rows,
      columns,
      cells,
      notes: ['按分区统计主要数据完整性问题。'],
      emptyMessage: '暂无可计算的数据质量矩阵。'
    });
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

  function buildChartDataFromStats(stats, chartType) {
    if (!stats) return [];
    if (chartType === 'zonePointBar') {
      return stats.zoneSummaries.map(row => ({ label: row.label, value: row.pointCount }));
    }
    if (chartType === 'zoneSpeciesBar') {
      return stats.zoneSummaries.map(row => ({ label: row.label, value: row.speciesRichness }));
    }
    if (chartType === 'diversityBar') {
      return stats.zoneSummaries.map(row => ({
        label: row.label,
        shannon: row.diversity.shannon,
        simpsonDiversity: row.diversity.simpsonDiversity,
        pielou: row.diversity.pielou
      }));
    }
    return [];
  }

  function buildStatistics(zones = [], points = [], options = {}) {
    const zoneSummaries = buildZoneSummaries(zones, points, options);
    const zoneSpeciesSets = buildZoneSpeciesSets(zones, points, options);
    const zoneSpeciesCounts = buildZoneSpeciesCounts(zones, points, options);
    const taxonomicComposition = buildTaxonomicComposition(points, options);
    const phenologyStats = buildPhenologyStats(zones, points, options);
    const dataQuality = calculateDataQuality(zones, points, options);
    const similarityMatrices = {
      jaccard: calculateJaccardMatrix(zoneSpeciesSets),
      sorensen: calculateSorensenMatrix(zoneSpeciesSets),
      brayCurtis: calculateBrayCurtisMatrix(zoneSpeciesCounts)
    };
    const heatmapMatrices = {
      jaccard: similarityMatrices.jaccard,
      sorensen: similarityMatrices.sorensen,
      brayCurtis: similarityMatrices.brayCurtis,
      phenologyMonthState: phenologyStats.monthStateMatrix,
      zoneDataQuality: buildQualityMatrix(zoneSummaries)
    };
    return {
      generatedAt: new Date().toISOString(),
      projectSummary: buildProjectSummary(zones, points, options),
      metricDefinitions: METRIC_DEFINITIONS,
      formulaNotes: FORMULA_NOTES,
      dataScopeNotes: DATA_SCOPE_NOTES,
      zoneSummaries,
      taxonomicComposition,
      lifeFormComposition: buildLifeFormComposition(points, options),
      originComposition: buildOriginComposition(points, options),
      diversityMetrics: {
        overall: calculateDiversityMetrics(speciesCountsFromPoints(points.map(point => normalizePointForStats(point, options)), options)),
        byZone: zoneSummaries.map(row => ({ zoneId: row.zoneId, label: row.label, ...row.diversity })),
        whittakerBeta: calculateWhittakerBeta(zoneSpeciesSets)
      },
      similarityMatrices,
      phenologyStats,
      timeTrendStats: buildTimeTrendStats(points, options),
      dataQuality,
      heatmapMatrices,
      exportVersion: EXPORT_VERSION
    };
  }

  function csvEscape(value) {
    if (value === null || value === undefined) return '';
    const text = String(value).replace(/\r?\n/g, ' ');
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function rowsToCsv(headers, rows) {
    const lines = [headers.map(csvEscape).join(',')];
    rows.forEach(row => {
      lines.push(headers.map(header => csvEscape(row[header])).join(','));
    });
    return `\uFEFF${lines.join('\r\n')}`;
  }

  function matrixToCsv(matrix) {
    const header = ['', ...matrix.columns.map(column => column.label)];
    const cellMap = new Map(matrix.cells.map(cell => [`${cell.rowId}::${cell.columnId}`, cell]));
    const lines = [header.map(csvEscape).join(',')];
    matrix.rows.forEach(row => {
      const values = [row.label];
      matrix.columns.forEach(column => {
        const cell = cellMap.get(`${row.id}::${column.id}`);
        values.push(cell ? cell.displayValue : '');
      });
      lines.push(values.map(csvEscape).join(','));
    });
    return `\uFEFF${lines.join('\r\n')}`;
  }

  function matrixToJson(matrix) {
    return JSON.stringify({
      generatedAt: new Date().toISOString(),
      title: matrix.title,
      metric: matrix.metric,
      valueType: matrix.valueType,
      range: matrix.range,
      rows: matrix.rows,
      columns: matrix.columns,
      cells: matrix.cells,
      notes: matrix.notes
    }, null, 2);
  }

  function matrixToMarkdown(matrix) {
    const validValues = matrix.cells.map(cell => cell.value).filter(value => Number.isFinite(value));
    const maxValue = validValues.length ? Math.max(...validValues) : null;
    const minValue = validValues.length ? Math.min(...validValues) : null;
    return [
      `# ${matrix.title}`,
      '',
      `- 指标：${matrix.metric}`,
      `- 类型：${matrix.valueType}`,
      `- 行数：${matrix.rows.length}`,
      `- 列数：${matrix.columns.length}`,
      maxValue === null ? '- 主要结果：暂无有效数值。' : `- 主要结果：最小值 ${formatMetricValue(minValue, 3)}，最大值 ${formatMetricValue(maxValue, 3)}。`,
      '',
      '## 公式与口径',
      ...matrix.notes.map(note => `- ${note}`),
      '',
      '## 局限性',
      '- 大矩阵请以 CSV 或 JSON 附件复核完整单元格数据。',
      '- 热力颜色仅辅助展示，不替代原始记录。'
    ].join('\n');
  }

  function statisticsFullJson(stats) {
    return JSON.stringify(stats, null, 2);
  }

  function statisticsSummaryMarkdown(stats) {
    const summary = stats.projectSummary;
    const topZones = stats.zoneSummaries.slice(0, 8);
    return [
      '# 项目统计摘要',
      '',
      '## 项目总览',
      `- 分区总数：${summary.zoneCount}`,
      `- 点位总数：${summary.pointCount}`,
      `- 有效物种数：${summary.speciesRichness}`,
      `- 科数：${summary.familyRichness}`,
      `- 属数：${summary.genusRichness}`,
      `- 图片完整率：${summary.imageCompleteness}%`,
      `- 物候覆盖率：${summary.phenologyCoverage}%`,
      '',
      '## 分区统计简表',
      '| 分区 | 点位数 | 物种数 | 图片完整率 | 质量评分 |',
      '|---|---:|---:|---:|---:|',
      ...topZones.map(row => `| ${row.label} | ${row.pointCount} | ${row.speciesRichness} | ${row.imageCompleteness}% | ${row.qualityScore} |`),
      '',
      '## 多样性指数简表',
      '| 分区 | 物种丰富度 S | Shannon 多样性 H′ | Simpson 多样性 1-D | Pielou 均匀度 J |',
      '|---|---:|---:|---:|---:|',
      ...topZones.map(row => `| ${row.label} | ${row.diversity.speciesRichness} | ${formatMetricValue(row.diversity.shannon)} | ${formatMetricValue(row.diversity.simpsonDiversity)} | ${formatMetricValue(row.diversity.pielou)} |`),
      '',
      '## 相似性分析摘要',
      '- Jaccard 和 Sørensen 用于比较分区间物种记录集合相似性。',
      `- Whittaker beta：${formatMetricValue(stats.diversityMetrics.whittakerBeta) || 'NA'}`,
      '',
      '## 物候统计摘要',
      `- 物候记录总数：${stats.phenologyStats.totalPhenologyRecords}`,
      `- 有物候记录点位数：${stats.phenologyStats.phenologyPointCount}`,
      '',
      '## 数据质量摘要',
      `- 质量评分：${stats.dataQuality.qualityScore}`,
      `- 质量等级：${stats.dataQuality.qualityLevel}`,
      `- 疑似重复点位：${stats.dataQuality.duplicateCandidates.length}`,
      '',
      '## 公式说明',
      ...stats.formulaNotes.map(note => `- ${note}`),
      '',
      '## 数据口径说明',
      ...stats.dataScopeNotes.map(note => `- ${note}`),
      '',
      '## 局限性说明',
      '- 本摘要可用于调研报告或论文初稿的描述性统计支撑，正式研究结论仍需结合采样设计和原始记录复核。'
    ].join('\n');
  }

  function chartRowsToCsv(rows, headers) {
    return rowsToCsv(headers, rows);
  }

  function xmlEscape(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function truncateLabel(label, maxLength = 16) {
    const text = String(label || '');
    return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
  }

  function renderHeatmapSvg(matrix, options = {}) {
    const cellSize = Number(options.cellSize || 36);
    const rowLabelWidth = Number(options.rowLabelWidth || 150);
    const columnLabelHeight = Number(options.columnLabelHeight || 110);
    const padding = Number(options.padding || 22);
    const titleHeight = 44;
    const legendHeight = 54;
    const noteHeight = 60;
    const matrixWidth = Math.max(1, matrix.columns.length) * cellSize;
    const matrixHeight = Math.max(1, matrix.rows.length) * cellSize;
    const width = padding * 2 + rowLabelWidth + matrixWidth;
    const height = padding * 2 + titleHeight + columnLabelHeight + matrixHeight + legendHeight + noteHeight;
    const startX = padding + rowLabelWidth;
    const startY = padding + titleHeight + columnLabelHeight;
    const palettes = {
      warm: ['#fff7ed', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#dc2626'],
      default: ['#f3f6fb', '#d8ecf2', '#add8df', '#79becb', '#459cac', '#167284']
    };
    const colors = palettes[options.palette] || palettes.warm;
    const cellMap = new Map(matrix.cells.map(cell => [`${cell.rowId}::${cell.columnId}`, cell]));
    const columnLabels = matrix.columns.map((column, index) => {
      const x = startX + index * cellSize + cellSize / 2;
      const y = startY - 8;
      return `<g transform="translate(${x},${y}) rotate(-45)"><text text-anchor="start" font-size="11" fill="#4b5563">${xmlEscape(truncateLabel(column.label, 18))}</text></g>`;
    }).join('');
    const rowLabels = matrix.rows.map((row, index) => {
      const x = padding + rowLabelWidth - 8;
      const y = startY + index * cellSize + cellSize / 2 + 4;
      return `<text x="${x}" y="${y}" text-anchor="end" font-size="12" fill="#4b5563">${xmlEscape(truncateLabel(row.label, 18))}</text>`;
    }).join('');
    const cells = matrix.rows.map((row, rowIndex) => matrix.columns.map((column, columnIndex) => {
      const cell = cellMap.get(`${row.id}::${column.id}`);
      const level = heatLevel(cell ? cell.value : null, matrix);
      const fill = level === null ? '#f9fafb' : colors[level];
      const x = startX + columnIndex * cellSize;
      const y = startY + rowIndex * cellSize;
      const display = cell ? cell.displayValue : '';
      const text = display && cellSize >= 34 ? `<text x="${x + cellSize / 2}" y="${y + cellSize / 2 + 4}" text-anchor="middle" font-size="10" fill="#111827">${xmlEscape(display)}</text>` : '';
      return `<g><rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${fill}" stroke="#ffffff" stroke-width="1"></rect>${text}</g>`;
    }).join('')).join('');
    const legendX = padding + rowLabelWidth;
    const legendY = startY + matrixHeight + 22;
    const legend = colors.map((color, index) => {
      const x = legendX + index * 42;
      return `<g><rect x="${x}" y="${legendY}" width="34" height="14" rx="3" fill="${color}"></rect><text x="${x + 17}" y="${legendY + 30}" text-anchor="middle" font-size="10" fill="#4b5563">${index}</text></g>`;
    }).join('');
    const note = matrix.notes[0] || '';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
<rect width="100%" height="100%" fill="#ffffff"></rect>
<text x="${padding}" y="${padding + 26}" font-size="20" font-weight="700" fill="#111827">${xmlEscape(matrix.title)}</text>
${columnLabels}
${rowLabels}
${cells}
<text x="${padding}" y="${legendY + 12}" font-size="12" fill="#4b5563">色阶</text>
${legend}
<text x="${padding}" y="${height - padding - 26}" font-size="12" fill="#4b5563">${xmlEscape(note)}</text>
<text x="${padding}" y="${height - padding - 8}" font-size="11" fill="#6b7280">矩阵值与 CSV / JSON 导出数据一致。</text>
</svg>`;
    return svg.replace(/NaN|undefined|null/g, '');
  }

  function buildExportFileName(prefix, ext, date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${prefix}_${y}${m}${d}.${ext}`;
  }

  return {
    MISSING_LABEL,
    MISSING_SPECIES,
    UNASSOCIATED_ZONE_ID,
    UNASSOCIATED_ZONE_LABEL,
    QUALITY_ISSUES,
    METRIC_DEFINITIONS,
    FORMULA_NOTES,
    DATA_SCOPE_NOTES,
    normalizePointForStats,
    normalizeZoneForStats,
    normalizeSpeciesKey,
    getZoneId,
    getSpeciesMeta,
    getAbundanceValue,
    getPointImages,
    getPointPhenologyEntries,
    groupPointsByZone,
    buildProjectSummary,
    buildZoneSummaries,
    buildTaxonomicComposition,
    buildLifeFormComposition,
    buildOriginComposition,
    buildPhenologyStats,
    buildTimeTrendStats,
    buildZoneSpeciesSets,
    buildZoneSpeciesCounts,
    calculateDiversityMetrics,
    calculateHillNumbers,
    calculateJaccardMatrix,
    calculateSorensenMatrix,
    calculateBrayCurtisMatrix,
    calculateWhittakerBeta,
    detectDuplicatePoints,
    calculateDataQuality,
    buildMatrixModel,
    heatLevel,
    buildChartDataFromStats,
    resolveZoneLabel,
    formatZoneLabel,
    getDisplayZoneName,
    buildStatistics,
    rowsToCsv,
    matrixToCsv,
    matrixToJson,
    matrixToMarkdown,
    statisticsFullJson,
    statisticsSummaryMarkdown,
    chartRowsToCsv,
    renderHeatmapSvg,
    buildExportFileName,
    formatMetricValue,
    percent,
    roundNumber
  };
});
