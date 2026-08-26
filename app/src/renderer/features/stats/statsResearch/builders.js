(function initStatsResearchBuilders(root, factory) {
  const shared = typeof module !== 'undefined' && module.exports
    ? require('./shared')
    : root.StatsResearchShared;
  const diversity = typeof module !== 'undefined' && module.exports
    ? require('./diversity')
    : root.StatsResearchDiversity;
  const similarity = typeof module !== 'undefined' && module.exports
    ? require('./similarity')
    : root.StatsResearchSimilarity;
  const quality = typeof module !== 'undefined' && module.exports
    ? require('./quality')
    : root.StatsResearchQuality;
  const api = factory(shared, diversity, similarity, quality);
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.StatsResearchBuilders = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createStatsResearchBuilders(shared, diversity, similarity, quality) {
  const {
    MISSING_LABEL,
    MISSING_SPECIES,
    UNASSOCIATED_ZONE_ID,
    UNASSOCIATED_ZONE_LABEL,
    EXPORT_VERSION,
    METRIC_DEFINITIONS,
    FORMULA_NOTES,
    DATA_SCOPE_NOTES,
    cleanString,
    percent,
    monthKeyFromDate,
    uniqueValues,
    pointNeedsTaxonomyReview,
    normalizePointForStats,
    normalizedZonesWithUnassociated,
    buildZoneAliasMap,
    buildMatrixModel,
    validSpeciesPoints,
    countBy,
    rowsFromCountMap,
    speciesCountsFromPoints,
    calculateDiversityMetrics,
    calculateJaccardMatrix,
    calculateSorensenMatrix,
    calculateBrayCurtisMatrix,
    calculateWhittakerBeta,
    calculateDataQuality
  } = { ...shared, ...diversity, ...similarity, ...quality };

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
    const taxonomy = buildTaxonomyCompleteness(zones, points, options);
    return {
      zoneCount: Array.isArray(zones) ? zones.length : 0,
      pointCount: normalizedPoints.length,
      speciesRichness: species.size,
      familyRichness: families.size,
      genusRichness: genera.size,
      familyCompleteness: taxonomy.familyCompleteness,
      genusCompleteness: taxonomy.genusCompleteness,
      taxonomySuggestedCount: taxonomy.taxonomySuggestedCount,
      taxonomyUnverifiedCount: taxonomy.taxonomyUnverifiedCount,
      manuallyVerifiedCount: taxonomy.manuallyVerifiedCount,
      doubtfulTaxonomyCount: taxonomy.doubtfulTaxonomyCount,
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
      const familyPointCount = zonePoints.filter(point => point.family !== MISSING_LABEL).length;
      const genusPointCount = zonePoints.filter(point => point.genus !== MISSING_LABEL).length;
      return {
        zoneId: zone.id,
        zoneCode: zone.zoneId,
        zoneName: zone.name,
        label: zone.label,
        pointCount: zonePoints.length,
        speciesRichness: speciesCounts.size,
        familyRichness: new Set(zonePoints.filter(point => point.family !== MISSING_LABEL).map(point => point.family)).size,
        genusRichness: new Set(zonePoints.filter(point => point.genus !== MISSING_LABEL).map(point => point.genus)).size,
        familyCompleteness: percent(familyPointCount, zonePoints.length),
        genusCompleteness: percent(genusPointCount, zonePoints.length),
        taxonomySuggestedCount: zonePoints.filter(point => point.taxonomyVerificationStatus === 'suggested').length,
        taxonomyUnverifiedCount: zonePoints.filter(point => pointNeedsTaxonomyReview(point) && (point.family !== MISSING_LABEL || point.genus !== MISSING_LABEL)).length,
        manuallyVerifiedCount: zonePoints.filter(point => point.taxonomyVerificationStatus === 'manuallyVerified').length,
        doubtfulTaxonomyCount: zonePoints.filter(point => point.taxonomyVerificationStatus === 'doubtful').length,
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

  function buildTaxonomyCompleteness(zones = [], points = [], options = {}) {
    void zones;
    const normalizedPoints = points.map(point => normalizePointForStats(point, options));
    const total = normalizedPoints.length;
    const hasFamily = normalizedPoints.filter(point => point.family !== MISSING_LABEL).length;
    const hasGenus = normalizedPoints.filter(point => point.genus !== MISSING_LABEL).length;
    const taxonomySuggestedCount = normalizedPoints.filter(point => point.taxonomyVerificationStatus === 'suggested').length;
    const taxonomyUnverifiedCount = normalizedPoints.filter(point => pointNeedsTaxonomyReview(point) && (point.family !== MISSING_LABEL || point.genus !== MISSING_LABEL)).length;
    const manuallyVerifiedCount = normalizedPoints.filter(point => point.taxonomyVerificationStatus === 'manuallyVerified').length;
    const doubtfulTaxonomyCount = normalizedPoints.filter(point => point.taxonomyVerificationStatus === 'doubtful').length;
    const candidatePointCount = normalizedPoints.filter(point => point.taxonomyCandidatesSummary.length).length;
    const candidateCount = normalizedPoints.reduce((sum, point) => sum + point.taxonomyCandidatesSummary.length, 0);
    const confidenceRows = rowsFromCountMap(countBy(normalizedPoints.filter(point => point.taxonomyConfidenceLabel), 'taxonomyConfidenceLabel'), total);
    return {
      totalRecords: total,
      hasFamilyCount: hasFamily,
      hasGenusCount: hasGenus,
      missingFamilyCount: total - hasFamily,
      missingGenusCount: total - hasGenus,
      familyCompleteness: percent(hasFamily, total),
      genusCompleteness: percent(hasGenus, total),
      taxonomySuggestedCount,
      taxonomyUnverifiedCount,
      manuallyVerifiedCount,
      doubtfulTaxonomyCount,
      taxonomySourceSummary: rowsFromCountMap(countBy(normalizedPoints, 'taxonomySource'), total),
      taxonomyVerificationSummary: rowsFromCountMap(countBy(normalizedPoints, 'taxonomyVerificationStatus'), total),
      taxonomySuggestionSummary: {
        candidatePointCount,
        candidateCount,
        confidenceRows
      },
      note: '科属由人工填写或第三方物种参考服务自动建议，自动建议需经人工核验后用于正式统计。'
    };
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
    const taxonomyCompleteness = buildTaxonomyCompleteness(zones, points, options);
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
      taxonomyCompleteness,
      taxonomySourceSummary: taxonomyCompleteness.taxonomySourceSummary,
      taxonomyVerificationSummary: taxonomyCompleteness.taxonomyVerificationSummary,
      taxonomySuggestionSummary: taxonomyCompleteness.taxonomySuggestionSummary,
      familyComposition: taxonomicComposition.familyComposition,
      genusComposition: taxonomicComposition.genusComposition,
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

  return {
    buildZoneSpeciesSets,
    buildZoneSpeciesCounts,
    buildProjectSummary,
    buildZoneSummaries,
    buildTaxonomicComposition,
    buildCategoryComposition,
    buildTaxonomyCompleteness,
    buildLifeFormComposition,
    buildOriginComposition,
    buildCompositionByZone,
    buildPhenologyStats,
    buildTimeTrendStats,
    buildPhenologyMonthMatrix,
    buildQualityMatrix,
    buildChartDataFromStats,
    buildStatistics
  };
});
