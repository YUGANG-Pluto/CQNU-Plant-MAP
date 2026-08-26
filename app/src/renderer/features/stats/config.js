const statsChartRegistry = window.rendererStatsRegistry;
if (!statsChartRegistry) {
  throw new Error('Typed statistics chart registry is unavailable.');
}
const STATS_CHART_GROUPS = statsChartRegistry.groups;
const STATS_CHART_LABELS = statsChartRegistry.labels;
const STATS_RECOMMENDED_CHARTS = statsChartRegistry.presets.recommended;
const STATS_PAPER_CHARTS = statsChartRegistry.presets.paper;
const STATS_QUALITY_CHARTS = statsChartRegistry.presets.quality;

let statsVisibleChartIds = null;
const statsViewState = {
  heatPalette: 'warm',
  fullscreenBound: false
};

function statsUi(key, fallback) {
  const value = typeof t === 'function' ? t(key) : key;
  return value === key ? fallback : value;
}

function allStatsChartIds() {
  return [...statsChartRegistry.chartIds];
}

function ensureStatsChartPrefs() {
  if (!statsVisibleChartIds) {
    statsVisibleChartIds = new Set(STATS_RECOMMENDED_CHARTS);
  }
}

function setStatsChartMode(mode) {
  if (mode === 'all') statsVisibleChartIds = new Set(allStatsChartIds());
  else if (mode === 'none') statsVisibleChartIds = new Set();
  else if (mode === 'paper') statsVisibleChartIds = new Set(STATS_PAPER_CHARTS);
  else if (mode === 'quality') statsVisibleChartIds = new Set(STATS_QUALITY_CHARTS);
  else statsVisibleChartIds = new Set(STATS_RECOMMENDED_CHARTS);
}

function isStatsChartVisible(chartId) {
  ensureStatsChartPrefs();
  return statsVisibleChartIds.has(chartId);
}

function statsChartLabel(chartId) {
  const entry = STATS_CHART_LABELS[chartId] || [chartId, chartId];
  return statsUi(entry[0], entry[1]);
}

function getResearchStats() {
  const engine = window.StatsResearch;
  return engine.buildStatistics(state.zones || [], state.points || [], { abundanceValueMode: false, topN: 10 });
}

function safeDisplayText(value, fallback = '\u2014') {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  if (!text || text === '\u2014' || text === '\u2014\u2014' || ['N/A', 'NA', 'null', 'undefined', 'NaN'].includes(text)) return fallback;
  return text;
}

function isZoneFallbackLabel(value) {
  const text = String(value || '').trim();
  return !text || text === '-' || text === '--' || text === '\u2014' || text === '\u2014\u2014' || ['N/A', 'NA', 'null', 'undefined', 'NaN'].includes(text);
}

function formatZoneDisplayName(zoneLike, options = {}) {
  const language = options.language || state.settings?.language || 'zh';
  const engine = window.StatsResearch;
  const zones = options.zones || state.zones || [];
  const fallback = engine.resolveZoneLabel('', zones, { language });
  if (!zoneLike || typeof zoneLike !== 'object') {
    if (isZoneFallbackLabel(zoneLike)) return fallback;
    const resolved = engine.resolveZoneLabel(zoneLike, zones, { language });
    if (resolved && resolved !== fallback && !isZoneFallbackLabel(resolved)) return resolved;
    return engine.formatZoneLabel(zoneLike, { language });
  }
  const labelKeys = options.labelKeys || ['zoneName', 'name', 'title', 'displayName'];
  const idKeys = options.idKeys || ['zoneId', 'zoneCode', 'zoneRef', 'zoneKey', 'zone', 'id'];
  const labelValue = labelKeys.map(key => zoneLike[key]).find(value => !isZoneFallbackLabel(value));
  if (labelValue) return engine.formatZoneLabel(labelValue, { language });
  const zoneIds = idKeys.map(key => zoneLike[key]).filter(value => !isZoneFallbackLabel(value));
  for (const zoneId of zoneIds) {
    const resolved = engine.resolveZoneLabel(zoneId, zones, { language });
    if (resolved && resolved !== fallback && !isZoneFallbackLabel(resolved)) return resolved;
  }
  if (zoneIds.length) return fallback;
  const fallbackLabel = zoneLike.label;
  if (!isZoneFallbackLabel(fallbackLabel)) return engine.formatZoneLabel(fallbackLabel, { language });
  return fallback;
}

function zoneDisplayText(value) {
  return formatZoneDisplayName(value);
}

function zoneDisplayFromRow(row, key = 'label') {
  return formatZoneDisplayName({ ...row, label: row[key] ?? row.label }, { labelKeys: ['zoneName'] });
}

function zoneChartRow(row, extra = {}) {
  return {
    zoneId: row.zoneId,
    zoneCode: row.zoneCode,
    zoneName: row.zoneName,
    label: formatZoneDisplayName(row),
    ...extra
  };
}

function computeStats() {
  const stats = getResearchStats();
  const zoneRank = stats.zoneSummaries
    .map(row => zoneChartRow(row, {
      speciesCount: row.speciesRichness,
      pointCount: row.pointCount,
      percentage: stats.projectSummary.pointCount ? Number((row.pointCount / stats.projectSummary.pointCount * 100).toFixed(1)) : 0
    }))
    .sort((a, b) => b.speciesCount - a.speciesCount || b.pointCount - a.pointCount);
  const sourceCounts = stats.originComposition.overall.map(row => [row.label, row.count]);
  const growthCounts = stats.lifeFormComposition.overall.map(row => [row.label, row.count]);
  const phenologyCounts = stats.phenologyStats.stateCounts.map(row => [row.label, row.count]);
  const now = new Date();
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 31);
  const datedPoints = (state.points || []).map(point => window.StatsResearch.normalizePointForStats(point));
  const weekAdded = datedPoints.filter(point => point.surveyDate && new Date(point.surveyDate) >= weekStart).length;
  const monthAdded = datedPoints.filter(point => point.surveyDate && new Date(point.surveyDate) >= monthStart).length;
  return { zoneRank, sourceCounts, growthCounts, phenologyCounts, weekAdded, monthAdded, stats };
}

function statsCategoryRows(category) {
  const { stats, zoneRank, sourceCounts, growthCounts, phenologyCounts, weekAdded, monthAdded } = computeStats();
  if (category === 'zone') {
    return zoneRank.map(item => ({
      ...item,
      label: item.label,
      count: item.pointCount,
      pointCount: item.pointCount,
      speciesCount: item.speciesCount,
      percentage: item.percentage
    }));
  }
  const toRows = entries => {
    const total = entries.reduce((sum, [, value]) => sum + Number(value || 0), 0) || 1;
    return entries.map(([label, value]) => ({
      label: safeDisplayText(label, statsUi('notFilled', 'Not filled')),
      count: Number(value || 0),
      pointCount: Number(value || 0),
      speciesCount: Number(value || 0),
      percentage: Number((Number(value || 0) / total * 100).toFixed(1))
    }));
  };
  if (category === 'source') return toRows(sourceCounts);
  if (category === 'growth') return toRows(growthCounts);
  if (category === 'phenology') return toRows(phenologyCounts);
  if (category === 'recent') {
    return [
      { label: t('statsWeek'), count: weekAdded, pointCount: weekAdded, speciesCount: weekAdded, percentage: monthAdded ? Number((weekAdded / monthAdded * 100).toFixed(1)) : 0 },
      { label: t('statsMonth'), count: monthAdded, pointCount: monthAdded, speciesCount: monthAdded, percentage: 100 }
    ];
  }
  return stats.zoneSummaries.map(row => zoneChartRow(row, { count: row.pointCount, pointCount: row.pointCount, speciesCount: row.speciesRichness, percentage: row.imageCompleteness }));
}

function metricLabel(metric) {
  const labels = {
    count: ['statsMetricRecordCount', 'Record count'],
    pointCount: ['statsMetricPointCount', 'Point count'],
    speciesCount: ['statsMetricSpeciesCount', 'Species count'],
    speciesRichness: ['statsMetricSpeciesRichnessS', 'Species richness S'],
    totalAbundance: ['statsMetricTotalRecordFrequency', 'Total record frequency N'],
    percentage: ['statsMetricCategoryShare', 'Category share (%)'],
    phenologyRecordShare: ['statsMetricPhenologyRecordShare', 'Phenology record share (%)'],
    phenologyStateShare: ['statsMetricPhenologyStateShare', 'Phenology state share (%)'],
    imageCompleteness: ['statsMetricImageCompleteness', 'Image completeness (%)'],
    phenologyCoverage: ['statsMetricPhenologyCoverage', 'Phenology coverage (%)'],
    familyCompleteness: ['statsMetricFamilyCompleteness', 'Family completeness (%)'],
    genusCompleteness: ['statsMetricGenusCompleteness', 'Genus completeness (%)'],
    taxonomySuggestedCount: ['statsMetricTaxonomySuggested', 'Automatic suggestions'],
    taxonomyUnverifiedCount: ['statsMetricTaxonomyUnverified', 'Unverified taxonomy records'],
    manuallyVerifiedCount: ['statsMetricTaxonomyVerified', 'Manually verified records'],
    doubtfulTaxonomyCount: ['statsMetricTaxonomyDoubtful', 'Doubtful taxonomy records'],
    qualityScore: ['statsColumnQualityScore', 'Quality score'],
    newPointCount: ['statsColumnNewPoints', 'New points'],
    cumulativePointCount: ['statsColumnCumulativePoints', 'Cumulative points'],
    cumulativeSpeciesCount: ['statsColumnCumulativeSpecies', 'Cumulative species'],
    phenologyRecordCount: ['statsColumnPhenologyRecords', 'Phenology records'],
    imageRecordCount: ['statsColumnImageRecords', 'Image records'],
    weekAdded: ['statsMetricWeek', 'This week'],
    monthAdded: ['statsMetricMonth', 'This month'],
    shannon: ['statsMetricShannon', 'Shannon diversity H′'],
    simpsonDominance: ['statsMetricSimpsonDominance', 'Simpson dominance D'],
    simpsonDiversity: ['statsMetricSimpsonDiversity', 'Simpson diversity 1-D'],
    pielou: ['statsMetricPielou', 'Pielou evenness J'],
    margalef: ['statsMetricMargalef', 'Margalef richness'],
    menhinick: ['statsMetricMenhinick', 'Menhinick richness'],
    bergerParker: ['statsMetricBergerParker', 'Berger-Parker dominance'],
    hillQ0: ['statsMetricHillQ0', 'Hill q0 species richness'],
    hillQ1: ['statsMetricHillQ1', 'Hill q1 common species'],
    hillQ2: ['statsMetricHillQ2', 'Hill q2 dominant species'],
    evenness: ['statsMetricEvenness', 'Evenness exp(H′)/S']
  };
  const entry = labels[metric] || [metric, metric];
  return statsUi(entry[0], entry[1]);
}

function metricAxisLabel(metric) {
  if (['percentage', 'phenologyRecordShare', 'phenologyStateShare', 'imageCompleteness', 'phenologyCoverage', 'familyCompleteness', 'genusCompleteness'].includes(metric)) return statsUi('statsAxisRate', 'Rate (%)');
  if (['hillQ0', 'hillQ1', 'hillQ2'].includes(metric)) return statsUi('statsAxisEffectiveSpecies', 'Effective species number');
  if (['shannon', 'simpsonDominance', 'simpsonDiversity', 'pielou', 'margalef', 'menhinick', 'bergerParker', 'evenness'].includes(metric)) return statsUi('statsAxisMetricValue', 'Metric value');
  return statsUi('statsAxisCount', 'Count');
}

function metricDecimals(metric) {
  if (['percentage', 'phenologyRecordShare', 'phenologyStateShare', 'imageCompleteness', 'phenologyCoverage', 'familyCompleteness', 'genusCompleteness'].includes(metric)) return 1;
  if (['shannon', 'simpsonDominance', 'simpsonDiversity', 'pielou', 'margalef', 'menhinick', 'bergerParker', 'hillQ0', 'hillQ1', 'hillQ2', 'evenness'].includes(metric)) return 3;
  return 0;
}

function categoryLabel(category) {
  return t(category === 'zone' ? 'statsCategoryZone' : category === 'growth' ? 'statsCategoryGrowth' : category === 'source' ? 'statsCategorySource' : category === 'phenology' ? 'statsCategoryPhenology' : 'statsSectionRecent');
}

function renderStatControls(customOnly = false) {
  ensureThemeSettings();
  const cfg = state.settings.statsCustom;
  const categoryOptions = ['zone', 'growth', 'source', 'phenology'].map(key => `<option value="${key}" ${cfg.category === key ? 'selected' : ''}>${escapeHtml(categoryLabel(key))}</option>`).join('');
  const metricOptions = selected => ['count', 'pointCount', 'speciesCount', 'percentage'].map(key => `<option value="${key}" ${selected === key ? 'selected' : ''}>${escapeHtml(metricLabel(key))}</option>`).join('');
  const typeOptions = [['combo', t('statsChartCombo')], ['bar', t('statsChartBar')], ['line', t('statsChartLine')], ['pie', t('statsChartPie')], ['donut', t('statsChartDonut')]].map(([value, label]) => `<option value="${value}" ${cfg.chartType === value ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('');
  return `<div class="stats-control-card ${customOnly ? 'stats-control-card-wide' : ''}"><div class="field"><label>${escapeHtml(t('statsCategory'))}</label><select id="statsCategorySelect" class="input">${categoryOptions}</select></div><div class="field"><label>${escapeHtml(t('statsBarMetric'))}</label><select id="statsBarMetricSelect" class="input">${metricOptions(cfg.barMetric)}</select></div><div class="field"><label>${escapeHtml(t('statsLineMetric'))}</label><select id="statsLineMetricSelect" class="input">${metricOptions(cfg.lineMetric)}</select></div><div class="field"><label>${escapeHtml(t('statsChartType'))}</label><select id="statsChartTypeSelect" class="input">${typeOptions}</select></div></div>`;
}

function resolveMetricsForCategory(category) {
  return category === 'zone' ? ['speciesCount', 'pointCount', 'percentage'] : ['count', 'percentage'];
}

function bindStatsControlEvents() {
  ['statsCategorySelect', 'statsBarMetricSelect', 'statsLineMetricSelect', 'statsChartTypeSelect'].forEach(id => {
    const node = document.getElementById(id);
    if (!node) return;
    node.addEventListener('change', async () => {
      if (typeof guardMaintenanceReadOnlyAction === 'function' && guardMaintenanceReadOnlyAction('stats-settings')) {
        renderStatsModal();
        return;
      }
      ensureThemeSettings();
      const cfg = state.settings.statsCustom;
      cfg.category = document.getElementById('statsCategorySelect')?.value || cfg.category;
      const valid = resolveMetricsForCategory(cfg.category);
      cfg.barMetric = document.getElementById('statsBarMetricSelect')?.value || cfg.barMetric;
      cfg.lineMetric = document.getElementById('statsLineMetricSelect')?.value || cfg.lineMetric;
      cfg.chartType = document.getElementById('statsChartTypeSelect')?.value || cfg.chartType;
      if (!valid.includes(cfg.barMetric)) cfg.barMetric = valid[0];
      if (!valid.includes(cfg.lineMetric)) cfg.lineMetric = valid[Math.min(1, valid.length - 1)] || valid[0];
      renderStatsModal();
      await persistProject();
    });
  });
}
