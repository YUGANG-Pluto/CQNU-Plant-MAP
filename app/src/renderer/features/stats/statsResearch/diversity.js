(function initStatsResearchDiversity(root, factory) {
  const shared = typeof module !== 'undefined' && module.exports
    ? require('./shared')
    : root.StatsResearchShared;
  const api = factory(shared);
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.StatsResearchDiversity = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createStatsResearchDiversity(shared) {
  const { MISSING_LABEL, MISSING_SPECIES, UNASSOCIATED_ZONE_ID, UNASSOCIATED_ZONE_LABEL, EXPORT_VERSION, QUALITY_ISSUES, METRIC_DEFINITIONS, FORMULA_NOTES, DATA_SCOPE_NOTES, isBlank, cleanString, toFiniteNumber, roundNumber, percent, normalizeDate, monthKeyFromDate, firstValue, firstText, uniqueValues, formatZoneLabel, resolveZoneLabel, getDisplayZoneName, normalizeZoneForStats, getZoneId, normalizeSpeciesKey, getSpeciesMeta, getAbundanceValue, normalizeImagesArray, getPointImages, copyPhenologyEntry, getPointPhenologyEntries, normalizeTaxonomyStatus, normalizeTaxonomySource, pointNeedsTaxonomyReview, normalizePointForStats, normalizedZonesWithUnassociated, buildZoneAliasMap, groupPointsByZone, buildMatrixModel, heatLevel, formatMetricValue } = shared;

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

  return {
    validSpeciesPoints,
    countBy,
    rowsFromCountMap,
    speciesCountsFromPoints,
    calculateHillNumbers,
    calculateDiversityMetrics
  };
});
