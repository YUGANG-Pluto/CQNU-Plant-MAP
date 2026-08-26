(function initStatsResearchQuality(root, factory) {
  const shared = typeof module !== 'undefined' && module.exports
    ? require('./shared')
    : root.StatsResearchShared;
  const api = factory(shared);
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.StatsResearchQuality = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createStatsResearchQuality(shared) {
  const {
    MISSING_LABEL,
    MISSING_SPECIES,
    UNASSOCIATED_ZONE_ID,
    QUALITY_ISSUES,
    roundNumber,
    percent,
    pointNeedsTaxonomyReview,
    normalizePointForStats,
    normalizedZonesWithUnassociated,
    buildZoneAliasMap
  } = shared;

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
      unverifiedTaxonomy: 0,
      doubtfulTaxonomy: 0,
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
      if ((point.family !== MISSING_LABEL || point.genus !== MISSING_LABEL) && pointNeedsTaxonomyReview(point)) issues.unverifiedTaxonomy += 1;
      if (point.taxonomyVerificationStatus === 'doubtful') issues.doubtfulTaxonomy += 1;
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

  return {
    haversineMeters,
    detectDuplicatePoints,
    coordinateMissing,
    coordinateAbnormal,
    imageRefInvalid,
    calculateQualityLevel,
    zoneRefInvalid,
    calculateDataQuality
  };
});
