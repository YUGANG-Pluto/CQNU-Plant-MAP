(function initStatsResearch(root, factory) {
  const shared = typeof module !== 'undefined' && module.exports
    ? require('./statsResearch/shared')
    : root.StatsResearchShared;
  const diversity = typeof module !== 'undefined' && module.exports
    ? require('./statsResearch/diversity')
    : root.StatsResearchDiversity;
  const similarity = typeof module !== 'undefined' && module.exports
    ? require('./statsResearch/similarity')
    : root.StatsResearchSimilarity;
  const quality = typeof module !== 'undefined' && module.exports
    ? require('./statsResearch/quality')
    : root.StatsResearchQuality;
  const builders = typeof module !== 'undefined' && module.exports
    ? require('./statsResearch/builders')
    : root.StatsResearchBuilders;
  const exporters = typeof module !== 'undefined' && module.exports
    ? require('./statsResearch/exporters')
    : root.StatsResearchExporters;
  const api = factory(shared, diversity, similarity, quality, builders, exporters);
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.StatsResearch = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createStatsResearch(shared, diversity, similarity, quality, builders, exporters) {
  const { MISSING_LABEL, MISSING_SPECIES, UNASSOCIATED_ZONE_ID, UNASSOCIATED_ZONE_LABEL, QUALITY_ISSUES, METRIC_DEFINITIONS, FORMULA_NOTES, DATA_SCOPE_NOTES, normalizePointForStats, normalizeZoneForStats, normalizeSpeciesKey, getZoneId, getSpeciesMeta, getAbundanceValue, getPointImages, getPointPhenologyEntries, groupPointsByZone, buildProjectSummary, buildZoneSummaries, buildTaxonomicComposition, buildTaxonomyCompleteness, buildLifeFormComposition, buildOriginComposition, buildPhenologyStats, buildTimeTrendStats, buildZoneSpeciesSets, buildZoneSpeciesCounts, calculateDiversityMetrics, calculateHillNumbers, calculateJaccardMatrix, calculateSorensenMatrix, calculateBrayCurtisMatrix, calculateWhittakerBeta, detectDuplicatePoints, calculateDataQuality, buildMatrixModel, heatLevel, buildChartDataFromStats, resolveZoneLabel, formatZoneLabel, getDisplayZoneName, buildStatistics, rowsToCsv, matrixToCsv, matrixToJson, matrixToMarkdown, statisticsFullJson, statisticsSummaryMarkdown, chartRowsToCsv, renderHeatmapSvg, buildExportFileName, formatMetricValue, percent, roundNumber } = { ...shared, ...diversity, ...similarity, ...quality, ...builders, ...exporters };

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
    buildTaxonomyCompleteness,
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
