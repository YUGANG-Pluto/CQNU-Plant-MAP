(function initStatsResearchSimilarity(root, factory) {
  const shared = typeof module !== 'undefined' && module.exports
    ? require('./shared')
    : root.StatsResearchShared;
  const api = factory(shared);
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.StatsResearchSimilarity = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createStatsResearchSimilarity(shared) {
  const { roundNumber, buildMatrixModel, formatMetricValue } = shared;

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

  return {
    setIntersection,
    setUnion,
    calculateSetStats,
    entriesFromZoneCollection,
    buildSetMatrix,
    calculateJaccardMatrix,
    calculateSorensenMatrix,
    calculateBrayCurtisMatrix,
    calculateWhittakerBeta
  };
});
