const STATS_CHART_GROUPS = [
  {
    id: 'overview',
    labelKey: 'statsChartGroupOverview',
    charts: ['overviewCombo', 'overviewLifeDonut']
  },
  {
    id: 'zone',
    labelKey: 'statsChartGroupZone',
    charts: ['zonePointBar', 'zoneQualityBar']
  },
  {
    id: 'taxonomy',
    labelKey: 'statsChartGroupTaxonomy',
    charts: ['topFamilyBar', 'topGenusBar', 'topSpeciesBar', 'familyDonut', 'genusDonut']
  },
  {
    id: 'life',
    labelKey: 'statsChartGroupLife',
    charts: ['lifeDonut', 'originDonut', 'lifeMissingBar', 'originMissingBar']
  },
  {
    id: 'diversity',
    labelKey: 'statsChartGroupDiversity',
    charts: ['diversityCombo', 'richnessShannonCombo', 'hillCombo', 'bergerParkerBar']
  },
  {
    id: 'similarity',
    labelKey: 'statsChartGroupSimilarity',
    charts: ['jaccardHeatmap', 'sorensenHeatmap', 'brayCurtisHeatmap']
  },
  {
    id: 'phenology',
    labelKey: 'statsChartGroupPhenology',
    charts: ['phenologyStateDonut', 'phenologyZoneBar', 'phenologyMonthTrend', 'phenologyHeatmap']
  },
  {
    id: 'quality',
    labelKey: 'statsChartGroupQuality',
    charts: ['qualityIssueBar', 'zoneQualityScoreBar', 'qualityHeatmap']
  }
];

const STATS_CHART_LABELS = {
  overviewCombo: ['statsChartOverviewCombo', 'Zone points + species combo'],
  overviewLifeDonut: ['statsChartOverviewLifeDonut', 'Life form completeness donut'],
  zonePointBar: ['statsChartZonePointBar', 'Zone point count bar chart'],
  zoneQualityBar: ['statsChartZoneQualityBar', 'Zone quality score bar chart'],
  topFamilyBar: ['statsChartTopFamilyBar', 'Top family bar chart'],
  topGenusBar: ['statsChartTopGenusBar', 'Top genus bar chart'],
  topSpeciesBar: ['statsChartTopSpeciesBar', 'Frequent species bar chart'],
  familyDonut: ['statsChartFamilyDonut', 'Family composition donut'],
  genusDonut: ['statsChartGenusDonut', 'Genus composition donut'],
  lifeDonut: ['statsChartLifeDonut', 'Life form donut'],
  originDonut: ['statsChartOriginDonut', 'Origin attribute donut'],
  lifeMissingBar: ['statsChartLifeMissingBar', 'Life form missing bar chart'],
  originMissingBar: ['statsChartOriginMissingBar', 'Origin missing bar chart'],
  diversityCombo: ['statsChartDiversityCombo', 'Zone Shannon / Simpson / Pielou metrics'],
  richnessShannonCombo: ['statsChartRichnessShannonCombo', 'Species richness S + Shannon diversity H′'],
  hillCombo: ['statsChartHillCombo', 'Hill effective species numbers'],
  bergerParkerBar: ['statsChartBergerParkerBar', 'Berger-Parker bar chart'],
  jaccardHeatmap: ['statsChartJaccardHeatmap', 'Jaccard heatmap'],
  sorensenHeatmap: ['statsChartSorensenHeatmap', 'Sorensen heatmap'],
  brayCurtisHeatmap: ['statsChartBrayCurtisHeatmap', 'Bray-Curtis heatmap'],
  phenologyStateDonut: ['statsChartPhenologyStateDonut', 'Phenology state donut'],
  phenologyZoneBar: ['statsChartPhenologyZoneBar', 'Zone phenology bar chart'],
  phenologyMonthTrend: ['statsChartPhenologyMonthTrend', 'Monthly phenology trend'],
  phenologyHeatmap: ['statsChartPhenologyHeatmap', 'Month by phenology heatmap'],
  qualityIssueBar: ['statsChartQualityIssueBar', 'Data quality issue bar chart'],
  zoneQualityScoreBar: ['statsChartZoneQualityScoreBar', 'Zone quality score chart'],
  qualityHeatmap: ['statsChartQualityHeatmap', 'Zone by data quality heatmap']
};

const STATS_RECOMMENDED_CHARTS = [
  'overviewCombo',
  'overviewLifeDonut',
  'diversityCombo',
  'jaccardHeatmap',
  'qualityIssueBar',
  'qualityHeatmap'
];

const STATS_PAPER_CHARTS = [
  'overviewCombo',
  'diversityCombo',
  'richnessShannonCombo',
  'jaccardHeatmap',
  'sorensenHeatmap',
  'phenologyHeatmap'
];

const STATS_QUALITY_CHARTS = [
  'qualityIssueBar',
  'zoneQualityScoreBar',
  'qualityHeatmap'
];

let statsVisibleChartIds = null;
let statsHeatPalette = 'warm';
let statsFullscreenBound = false;

function statsUi(key, fallback) {
  const value = typeof t === 'function' ? t(key) : key;
  return value === key ? fallback : value;
}

function allStatsChartIds() {
  return STATS_CHART_GROUPS.flatMap(group => group.charts);
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
  if (['percentage', 'phenologyRecordShare', 'phenologyStateShare', 'imageCompleteness', 'phenologyCoverage'].includes(metric)) return statsUi('statsAxisRate', 'Rate (%)');
  if (['hillQ0', 'hillQ1', 'hillQ2'].includes(metric)) return statsUi('statsAxisEffectiveSpecies', 'Effective species number');
  if (['shannon', 'simpsonDominance', 'simpsonDiversity', 'pielou', 'margalef', 'menhinick', 'bergerParker', 'evenness'].includes(metric)) return statsUi('statsAxisMetricValue', 'Metric value');
  return statsUi('statsAxisCount', 'Count');
}

function metricDecimals(metric) {
  if (['percentage', 'phenologyRecordShare', 'phenologyStateShare', 'imageCompleteness', 'phenologyCoverage'].includes(metric)) return 1;
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

function renderStatsDisplayControls(activeGroups = []) {
  ensureStatsChartPrefs();
  const activeSet = new Set(activeGroups);
  const visibleCount = statsVisibleChartIds.size;
  const groups = STATS_CHART_GROUPS
    .filter(group => !activeGroups.length || activeSet.has(group.id))
    .map(group => `
      <details class="stats-chart-toggle-group" ${activeSet.has(group.id) ? 'open' : ''}>
        <summary>${escapeHtml(statsUi(group.labelKey, group.id))}</summary>
        <div class="stats-chart-toggle-list">
          ${group.charts.map(chartId => `
            <label class="stats-chart-toggle">
              <input type="checkbox" data-stats-chart-toggle="${escapeHtml(chartId)}" ${statsVisibleChartIds.has(chartId) ? 'checked' : ''}>
              <span>${escapeHtml(statsChartLabel(chartId))}</span>
            </label>
          `).join('')}
        </div>
      </details>
    `).join('');
  return `<section class="stats-display-control stats-wide-panel">
    <div class="stats-display-control-head">
      <div>
        <strong>${escapeHtml(statsUi('statsChartDisplayControl', 'Chart display control'))}</strong>
        <p class="subtle">${escapeHtml(statsUi('statsChartDisplaySummary', 'Choose which charts are visible. Hidden charts do not affect calculations or exports.'))} ${escapeHtml(visibleCount)}/${escapeHtml(allStatsChartIds().length)}</p>
      </div>
      <div class="stats-display-actions">
        <button class="btn btn-soft" data-stats-chart-action="recommended">${escapeHtml(statsUi('statsChartRecommended', 'Recommended'))}</button>
        <button class="btn btn-soft" data-stats-chart-action="paper">${escapeHtml(statsUi('statsChartPaper', 'Paper charts'))}</button>
        <button class="btn btn-soft" data-stats-chart-action="quality">${escapeHtml(statsUi('statsChartQualityOnly', 'Quality only'))}</button>
        <button class="btn btn-soft" data-stats-chart-action="all">${escapeHtml(statsUi('statsChartShowAll', 'Show all'))}</button>
        <button class="btn btn-soft" data-stats-chart-action="none">${escapeHtml(statsUi('statsChartHideAll', 'Hide all'))}</button>
      </div>
    </div>
    <div class="stats-chart-toggle-groups">${groups}</div>
  </section>`;
}

function bindStatsDisplayControls() {
  document.querySelectorAll('[data-stats-chart-toggle]').forEach(input => {
    input.addEventListener('change', () => {
      ensureStatsChartPrefs();
      const chartId = input.dataset.statsChartToggle;
      if (input.checked) statsVisibleChartIds.add(chartId);
      else statsVisibleChartIds.delete(chartId);
      renderStatsModal();
    });
  });
  document.querySelectorAll('[data-stats-chart-action]').forEach(button => {
    button.addEventListener('click', () => {
      setStatsChartMode(button.dataset.statsChartAction);
      renderStatsModal();
    });
  });
  document.querySelectorAll('[data-heat-palette-select]').forEach(select => {
    select.addEventListener('change', () => {
      statsHeatPalette = select.value === 'default' ? 'default' : 'warm';
      renderStatsModal();
    });
  });
}

function bindStatsAfterRender() {
  bindStatsControlEvents();
  bindStatsExportEvents();
  bindStatsDisplayControls();
  bindHeatmapCellEvents();
  bindStatsFullscreenEvents();
  if (typeof syncMaintenanceSafeModeUi === 'function') syncMaintenanceSafeModeUi();
}

function renderChartCard(title, body, options = {}) {
  const chartId = options.chartId || '';
  const className = ['chart-card', options.className].filter(Boolean).join(' ');
  const caption = options.caption ? `<p class="stats-chart-caption subtle">${escapeHtml(options.caption)}</p>` : '';
  const action = options.fullscreen === false ? '' : `<button type="button" class="btn btn-soft stats-fullscreen-btn" data-stats-fullscreen title="${escapeHtml(statsUi('statsFullscreen', 'Fullscreen'))}">${escapeHtml(statsUi('statsFullscreen', 'Fullscreen'))}</button>`;
  return `<div class="${className}" data-stats-chart-card="${escapeHtml(chartId)}"><div class="stats-chart-head"><div class="stats-chart-title-wrap"><h3 title="${escapeHtml(title)}">${escapeHtml(title)}</h3>${caption}</div><div class="stats-card-actions">${action}</div></div>${body}</div>`;
}

function formatStatsValue(value, digits = 3) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return safeDisplayText(value);
  if (Number.isNaN(Number(value))) return '—';
  const number = Number(value);
  return Number.isInteger(number) ? String(number) : number.toFixed(digits).replace(/\.?0+$/, '');
}

function renderStatsEmpty(message) {
  return `<div class="chart-empty-state"><span>${escapeHtml(message || t('resultsEmpty'))}</span></div>`;
}

function renderKpiGrid(items) {
  return `<div class="stats-card-grid">${items.map(item => `<div class="stat-chip morandi-surface"><span class="stat-label">${escapeHtml(item.label)}</span><strong>${escapeHtml(formatStatsValue(item.value, item.digits ?? 1))}</strong></div>`).join('')}</div>`;
}

function renderStatsTable(headers, rows, options = {}) {
  if (!rows.length) return renderStatsEmpty(options.emptyMessage);
  const head = headers.map(header => `<th class="${header.zone ? 'stats-zone-col' : ''}" title="${escapeHtml(header.label)}">${escapeHtml(header.label)}</th>`).join('');
  const body = rows.map(row => `<tr>${headers.map(header => {
    const raw = header.zone ? zoneDisplayFromRow(row, header.key) : row[header.key];
    const value = formatStatsValue(raw, header.digits ?? 3);
    const className = header.zone || header.longText ? 'stats-text-cell' : '';
    return `<td class="${className}" title="${escapeHtml(value)}"><span>${escapeHtml(value)}</span></td>`;
  }).join('')}</tr>`).join('');
  return `<div class="stats-table-panel stats-wide-panel"><div class="stats-table-scroll"><table class="stats-data-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div></div>`;
}

function renderOptionalChart(chartId, html) {
  return isStatsChartVisible(chartId) ? html : '';
}

function renderChartGrid(items, className = 'stats-chart-grid') {
  const visible = items.filter(Boolean);
  if (!visible.length) {
    return `<div class="${className} stats-wide-panel">${renderStatsEmpty(statsUi('statsChartsHidden', 'Charts are hidden. Use chart display control to show them again.'))}</div>`;
  }
  return `<div class="${className}">${visible.join('')}</div>`;
}

function renderStatsPage(content, options = {}) {
  return `<div class="stats-center-layout">${options.controls === false ? '' : renderStatsDisplayControls(options.groups || [])}${content}</div>`;
}

function renderExportButton(key, labelKey, fallback, format, disabled = false, tooltipKey = '') {
  const label = statsUi(labelKey, fallback);
  const tooltip = tooltipKey ? statsUi(tooltipKey, label) : label;
  return `<button class="btn btn-soft stats-export-btn" title="${escapeHtml(tooltip)}" data-stats-export="${escapeHtml(key)}" data-export-format="${escapeHtml(format)}" ${disabled ? 'disabled' : ''}>${escapeHtml(label)}</button>`;
}

function renderMatrixExportButtons(matrix) {
  const disabled = !matrix || !matrix.rows.length || !matrix.columns.length;
  return `<div class="stats-export-row">
    ${renderExportButton(`heatmap:${matrix.metric}:csv`, 'statsExportHeatmapCsv', 'Heatmap data CSV', 'csv', disabled)}
    ${renderExportButton(`heatmap:${matrix.metric}:json`, 'statsExportHeatmapJson', 'Heatmap data JSON', 'json', disabled)}
    ${renderExportButton(`heatmap:${matrix.metric}:md`, 'statsExportHeatmapMarkdown', 'Heatmap Markdown summary', 'md', disabled)}
    ${renderExportButton(`heatmap:${matrix.metric}:svg`, 'statsExportHeatmapSvg', 'Heatmap SVG', 'svg', disabled)}
  </div>`;
}

function getMatrixCell(matrix, rowId, columnId) {
  return matrix.cells.find(cell => cell.rowId === rowId && cell.columnId === columnId);
}

function heatLegendLabel(matrix) {
  if (matrix.valueType === 'similarity') return statsUi('statsHeatLegendSimilarity', '0 low similarity - 1 high similarity');
  if (matrix.valueType === 'dissimilarity') return statsUi('statsHeatLegendDissimilarity', '0 low difference - 1 high difference');
  return statsUi('statsHeatLegendCount', '0 - low - medium - high - highest');
}

function heatmapTooltip(matrix, row, column, cell) {
  if (!cell) return '';
  const raw = cell.raw || {};
  if (matrix.metric === 'jaccard') {
    return [
      `${statsUi('statsTooltipZoneA', 'Zone A')}: ${row.label}`,
      `${statsUi('statsTooltipZoneB', 'Zone B')}: ${column.label}`,
      `Jaccard: ${cell.displayValue}`,
      `${statsUi('statsTooltipSharedSpecies', 'Shared species')}: ${raw.intersectionCount || 0}`,
      `${statsUi('statsTooltipUnionSpecies', 'Union species')}: ${raw.unionCount || 0}`,
      `${statsUi('statsTooltipZoneAUnique', 'Zone A unique species')}: ${raw.rowUniqueCount || 0}`,
      `${statsUi('statsTooltipZoneBUnique', 'Zone B unique species')}: ${raw.columnUniqueCount || 0}`
    ].join('\n');
  }
  if (matrix.metric === 'sorensen') {
    return [
      `${statsUi('statsTooltipZoneA', 'Zone A')}: ${row.label}`,
      `${statsUi('statsTooltipZoneB', 'Zone B')}: ${column.label}`,
      `Sørensen: ${cell.displayValue}`,
      `${statsUi('statsTooltipSharedSpecies', 'Shared species')}: ${raw.intersectionCount || 0}`,
      `${statsUi('statsTooltipZoneASpecies', 'Zone A species')}: ${raw.rowSpeciesCount || 0}`,
      `${statsUi('statsTooltipZoneBSpecies', 'Zone B species')}: ${raw.columnSpeciesCount || 0}`
    ].join('\n');
  }
  if (matrix.metric === 'brayCurtis') {
    return [
      `${statsUi('statsTooltipZoneA', 'Zone A')}: ${row.label}`,
      `${statsUi('statsTooltipZoneB', 'Zone B')}: ${column.label}`,
      `Bray-Curtis: ${cell.displayValue}`,
      `${statsUi('statsTooltipBasis', 'Basis')}: ${raw.basis || statsUi('statsBasisPointFrequency', 'Point-record frequency')}`,
      `${statsUi('statsTooltipSharedSpecies', 'Shared species')}: ${raw.sharedSpeciesCount || 0}`,
      statsUi('statsTooltipDissimilarityNote', 'Higher values indicate greater recorded-composition difference.')
    ].join('\n');
  }
  if (matrix.metric === 'phenologyMonthState') {
    return [
      `${statsUi('statsTooltipMonth', 'Month')}: ${row.label}`,
      `${statsUi('statsTooltipPhenologyState', 'Phenology state')}: ${column.label}`,
      `${statsUi('statsTooltipRecordCount', 'Record count')}: ${raw.recordCount || 0}`,
      `${statsUi('statsTooltipPointCount', 'Point count')}: ${raw.pointCount || 0}`,
      `${statsUi('statsTooltipSpeciesCount', 'Species count')}: ${raw.speciesCount || 0}`
    ].join('\n');
  }
  return [
    `${statsUi('statsTooltipZone', 'Zone')}: ${row.label}`,
    `${statsUi('statsTooltipIssueType', 'Issue type')}: ${column.label}`,
    `${statsUi('statsTooltipIssueCount', 'Issue count')}: ${raw.count || cell.value || 0}`,
    `${statsUi('statsTooltipIssueRatio', 'Issue ratio')}: ${raw.ratio || 0}%`
  ].join('\n');
}

function matrixDisplayLabel(label, matrix) {
  return matrix.metric === 'phenologyMonthState' ? safeDisplayText(label) : zoneDisplayText(label);
}

function renderHeatmapPaletteControl() {
  return `<div class="stats-heatmap-controls">
    <label>${escapeHtml(statsUi('statsHeatPaletteLabel', 'Color palette'))}</label>
    <select class="input" data-heat-palette-select>
      <option value="warm" ${statsHeatPalette === 'warm' ? 'selected' : ''}>${escapeHtml(statsUi('statsHeatPaletteWarm', 'Warm: orange-red'))}</option>
      <option value="default" ${statsHeatPalette === 'default' ? 'selected' : ''}>${escapeHtml(statsUi('statsHeatPaletteDefault', 'Default'))}</option>
    </select>
  </div>`;
}

function renderHeatmapMatrix(matrix, options = {}) {
  const hasGrid = matrix.rows.length && matrix.columns.length;
  const chartId = options.chartId || matrix.metric;
  const allValues = matrix.cells.map(cell => cell.value).filter(value => Number.isFinite(value));
  const isAllZero = allValues.length && allValues.every(value => value === 0);
  const note = matrix.notes.map(item => `<p class="stats-chart-note subtle">${escapeHtml(item)}</p>`).join('');
  if (!hasGrid || !matrix.cells.length) {
    return renderChartCard(matrix.title, `${note}${renderStatsEmpty(matrix.emptyMessage)}${renderMatrixExportButtons(matrix)}`, { chartId, className: `stats-heatmap-panel heat-palette-${statsHeatPalette}` });
  }
  const header = `<tr><th class="stats-heatmap-corner">${escapeHtml(statsUi('statsHeatSortLabel', 'Sort: zone order / name'))}</th>${matrix.columns.map(column => {
    const label = matrixDisplayLabel(column.label, matrix);
    return `<th class="stats-heatmap-header" title="${escapeHtml(label)}"><span>${escapeHtml(label)}</span></th>`;
  }).join('')}</tr>`;
  const body = matrix.rows.map(row => {
    const rowLabel = matrixDisplayLabel(row.label, matrix);
    const cells = matrix.columns.map(column => {
      const columnLabel = matrixDisplayLabel(column.label, matrix);
      const cell = getMatrixCell(matrix, row.id, column.id);
      const level = window.StatsResearch.heatLevel(cell ? cell.value : null, matrix);
      const classes = ['stats-heatmap-cell', level === null ? 'is-empty' : `heat-level-${level}`, row.id === column.id ? 'is-diagonal' : ''].filter(Boolean).join(' ');
      const title = heatmapTooltip(matrix, { ...row, label: rowLabel }, { ...column, label: columnLabel }, cell);
      return `<td class="${classes}" title="${escapeHtml(title)}" data-heatmap-row="${escapeHtml(row.id)}" data-heatmap-column="${escapeHtml(column.id)}">${escapeHtml(cell ? cell.displayValue : '')}</td>`;
    }).join('');
    return `<tr><th class="stats-heatmap-row-label" title="${escapeHtml(rowLabel)}"><span>${escapeHtml(rowLabel)}</span></th>${cells}</tr>`;
  }).join('');
  const legend = `<div class="stats-heatmap-legend"><span>${escapeHtml(heatLegendLabel(matrix))}</span>${[0, 1, 2, 3, 4, 5].map(level => `<i class="heat-level-${level}">${level}</i>`).join('')}</div>`;
  const emptyHint = isAllZero ? `<p class="stats-chart-note subtle">${escapeHtml(statsUi('statsHeatAllZero', 'All valid matrix values are 0; exports are still available for review.'))}</p>` : '';
  const bodyHtml = `${note}${emptyHint}${legend}<div class="stats-heatmap-scroll"><table class="stats-heatmap-table"><thead>${header}</thead><tbody>${body}</tbody></table></div>${renderMatrixExportButtons(matrix)}`;
  return renderChartCard(matrix.title, bodyHtml, { chartId, className: `stats-heatmap-panel heat-palette-${statsHeatPalette}`, caption: statsUi('statsHeatCaption', 'Table heatmap; CSV export follows the current row and column order.') });
}

function bindHeatmapCellEvents() {
  document.querySelectorAll('.stats-heatmap-cell').forEach(cell => {
    cell.addEventListener('mouseenter', () => cell.classList.add('is-hovered'));
    cell.addEventListener('mouseleave', () => cell.classList.remove('is-hovered'));
    cell.addEventListener('click', () => {
      document.querySelectorAll('.stats-heatmap-cell.is-selected').forEach(selected => selected.classList.remove('is-selected'));
      cell.classList.add('is-selected');
    });
  });
}

function renderOverview(stats) {
  const summary = stats.projectSummary;
  const kpis = [
    { label: statsUi('statsKpiZones', 'Zones'), value: summary.zoneCount },
    { label: statsUi('statsKpiPoints', 'Points'), value: summary.pointCount },
    { label: statsUi('statsKpiSpecies', 'Valid species'), value: summary.speciesRichness },
    { label: statsUi('statsKpiImageCompleteness', 'Image completeness (%)'), value: summary.imageCompleteness },
    { label: statsUi('statsKpiPhenologyCoverage', 'Phenology coverage (%)'), value: summary.phenologyCoverage },
    { label: statsUi('statsKpiDuplicates', 'Duplicate candidates'), value: summary.duplicateCandidateCount }
  ];
  const zoneRows = stats.zoneSummaries.map(row => zoneChartRow(row, {
    pointCount: row.pointCount,
    speciesCount: row.speciesRichness,
    percentage: summary.pointCount ? Number((row.pointCount / summary.pointCount * 100).toFixed(1)) : 0
  }));
  const charts = renderChartGrid([
    renderOptionalChart('overviewCombo', renderChartCard(statsChartLabel('overviewCombo'), renderComboChart(zoneRows, 'pointCount', 'speciesCount', 'researchOverviewCombo'), { chartId: 'overviewCombo', caption: statsUi('statsCaptionPointFrequency', 'Based on current point-record frequency.') })),
    renderOptionalChart('overviewLifeDonut', renderChartCard(statsChartLabel('overviewLifeDonut'), renderPieLike(stats.lifeFormComposition.overall.map(row => [row.label, row.count]), true, 'researchLifeDonut'), { chartId: 'overviewLifeDonut', className: 'donut-card', caption: statsUi('statsCaptionMissingIncluded', 'Missing values are kept as a completeness signal.') }))
  ]);
  return renderStatsPage(`
    ${renderKpiGrid(kpis)}
    ${charts}
    ${renderStatsTable([
      { key: 'label', label: statsUi('statsColumnZone', 'Zone'), zone: true },
      { key: 'pointCount', label: statsUi('statsColumnPointCount', 'Point count') },
      { key: 'speciesRichness', label: statsUi('statsColumnSpeciesRichness', 'Species richness') },
      { key: 'imageCompleteness', label: statsUi('statsColumnImageCompleteness', 'Image completeness (%)'), digits: 1 },
      { key: 'qualityScore', label: statsUi('statsColumnQualityScore', 'Quality score') }
    ], stats.zoneSummaries, { emptyMessage: statsUi('statsNoZoneData', 'No zone statistics data.') })}
  `, { groups: ['overview'] });
}

function renderZoneAnalysis(stats) {
  const rows = stats.zoneSummaries.map(row => zoneChartRow(row, {
    pointCount: row.pointCount,
    speciesCount: row.speciesRichness,
    qualityScore: row.qualityScore,
    imageCompleteness: row.imageCompleteness
  }));
  const charts = renderChartGrid([
    renderOptionalChart('zonePointBar', renderChartCard(statsChartLabel('zonePointBar'), renderBarList(rows, 'pointCount', item => item.label, 'zonePointBar'), { chartId: 'zonePointBar', caption: statsUi('statsCaptionZonePointDensity', 'Compare point-record counts across zones.') })),
    renderOptionalChart('zoneQualityBar', renderChartCard(statsChartLabel('zoneQualityBar'), renderBarList(rows, 'qualityScore', item => item.label, 'zoneQualityBar'), { chartId: 'zoneQualityBar', caption: statsUi('statsCaptionQualityScore', 'Quality scores indicate record completeness only.') }))
  ]);
  return renderStatsPage(`
    ${charts}
    ${renderStatsTable([
      { key: 'label', label: statsUi('statsColumnZone', 'Zone'), zone: true },
      { key: 'pointCount', label: statsUi('statsColumnPointCount', 'Point count') },
      { key: 'speciesRichness', label: statsUi('statsColumnSpeciesRichness', 'Species richness') },
      { key: 'familyRichness', label: statsUi('statsColumnFamilyRichness', 'Family count') },
      { key: 'genusRichness', label: statsUi('statsColumnGenusRichness', 'Genus count') },
      { key: 'phenologyCount', label: statsUi('statsColumnPhenologyCount', 'Phenology records') },
      { key: 'imagePointCount', label: statsUi('statsColumnImagePointCount', 'Image points') },
      { key: 'imageCompleteness', label: statsUi('statsColumnImageCompleteness', 'Image completeness (%)'), digits: 1 },
      { key: 'duplicateCandidateCount', label: statsUi('statsColumnDuplicateCandidates', 'Duplicate candidates') },
      { key: 'qualityLevel', label: statsUi('statsColumnQualityLevel', 'Quality level'), longText: true }
    ], stats.zoneSummaries)}
  `, { groups: ['zone'] });
}

function renderTaxonomy(stats) {
  const taxonomy = stats.taxonomicComposition;
  const charts = renderChartGrid([
    renderOptionalChart('topFamilyBar', renderChartCard(statsChartLabel('topFamilyBar'), renderBarList(taxonomy.topFamilies, 'count', item => item.label, 'topFamilyBar'), { chartId: 'topFamilyBar', caption: taxonomy.note })),
    renderOptionalChart('topGenusBar', renderChartCard(statsChartLabel('topGenusBar'), renderBarList(taxonomy.topGenera, 'count', item => item.label, 'topGenusBar'), { chartId: 'topGenusBar', caption: taxonomy.note })),
    renderOptionalChart('topSpeciesBar', renderChartCard(statsChartLabel('topSpeciesBar'), renderBarList(taxonomy.topSpecies, 'count', item => item.label, 'topSpeciesBar'), { chartId: 'topSpeciesBar', caption: taxonomy.note })),
    renderOptionalChart('familyDonut', renderChartCard(statsChartLabel('familyDonut'), renderPieLike(taxonomy.familyComposition.slice(0, 8).map(row => [row.label, row.count]), true, 'familyDonut'), { chartId: 'familyDonut', className: 'donut-card', caption: statsUi('statsCaptionDistribution', 'Distribution based on current records.') })),
    renderOptionalChart('genusDonut', renderChartCard(statsChartLabel('genusDonut'), renderPieLike(taxonomy.genusComposition.slice(0, 8).map(row => [row.label, row.count]), true, 'genusDonut'), { chartId: 'genusDonut', className: 'donut-card', caption: statsUi('statsCaptionDistribution', 'Distribution based on current records.') }))
  ]);
  return renderStatsPage(`<p class="stats-chart-note subtle stats-wide-panel">${escapeHtml(taxonomy.note)}</p>${charts}`, { groups: ['taxonomy'] });
}

function renderLifeOrigin(stats) {
  const charts = renderChartGrid([
    renderOptionalChart('lifeDonut', renderChartCard(statsChartLabel('lifeDonut'), renderPieLike(stats.lifeFormComposition.overall.map(row => [row.label, row.count]), true, 'lifeDonut'), { chartId: 'lifeDonut', className: 'donut-card', caption: statsUi('statsCaptionMissingIncluded', 'Missing values are kept as a completeness signal.') })),
    renderOptionalChart('originDonut', renderChartCard(statsChartLabel('originDonut'), renderPieLike(stats.originComposition.overall.map(row => [row.label, row.count]), true, 'originDonut'), { chartId: 'originDonut', className: 'donut-card', caption: statsUi('statsCaptionMissingIncluded', 'Missing values are kept as a completeness signal.') })),
    renderOptionalChart('lifeMissingBar', renderChartCard(statsChartLabel('lifeMissingBar'), renderBarList([{ label: statsUi('statsMissingLifeForm', 'Missing life form'), count: stats.lifeFormComposition.missingCount }, { label: statsUi('statsFilled', 'Filled'), count: Math.max(0, stats.projectSummary.pointCount - stats.lifeFormComposition.missingCount) }], 'count', item => item.label, 'lifeMissingBar'), { chartId: 'lifeMissingBar', caption: statsUi('statsCaptionDataCompletion', 'Used for data completion review.') })),
    renderOptionalChart('originMissingBar', renderChartCard(statsChartLabel('originMissingBar'), renderBarList([{ label: statsUi('statsMissingOrigin', 'Missing origin'), count: stats.originComposition.missingCount }, { label: statsUi('statsFilled', 'Filled'), count: Math.max(0, stats.projectSummary.pointCount - stats.originComposition.missingCount) }], 'count', item => item.label, 'originMissingBar'), { chartId: 'originMissingBar', caption: statsUi('statsCaptionDataCompletion', 'Used for data completion review.') }))
  ]);
  return renderStatsPage(charts, { groups: ['life'] });
}

function renderDiversity(stats) {
  const rows = stats.zoneSummaries.map(row => zoneChartRow(row, {
    speciesRichness: row.diversity.speciesRichness,
    shannon: row.diversity.shannon || 0,
    simpsonDiversity: row.diversity.simpsonDiversity || 0,
    pielou: row.diversity.pielou || 0,
    hillQ0: row.diversity.hillQ0 || 0,
    hillQ1: row.diversity.hillQ1 || 0,
    hillQ2: row.diversity.hillQ2 || 0,
    bergerParker: row.diversity.bergerParker || 0
  }));
  const charts = renderChartGrid([
    renderOptionalChart('diversityCombo', renderChartCard(statsChartLabel('diversityCombo'), renderComboChart(rows, 'shannon', 'simpsonDiversity', 'diversityCombo'), { chartId: 'diversityCombo', caption: statsUi('statsCaptionDiversityLimit', 'Default basis is point-record frequency; do not over-interpret as strict community ecology.') })),
    renderOptionalChart('richnessShannonCombo', renderChartCard(statsChartLabel('richnessShannonCombo'), renderComboChart(rows, 'speciesRichness', 'shannon', 'richnessShannonCombo'), { chartId: 'richnessShannonCombo', caption: statsUi('statsCaptionSpeciesKey', 'S counts unique speciesKey values.') })),
    renderOptionalChart('hillCombo', renderChartCard(statsChartLabel('hillCombo'), renderComboChart(rows, 'hillQ0', 'hillQ1', 'hillCombo'), { chartId: 'hillCombo', caption: statsUi('statsCaptionHillNumbers', 'Hill q0/q1/q2 are effective species number metrics calculated from point-record frequency.') })),
    renderOptionalChart('bergerParkerBar', renderChartCard(statsChartLabel('bergerParkerBar'), renderBarList(rows, 'bergerParker', item => item.label, 'bergerParkerBar'), { chartId: 'bergerParkerBar', caption: statsUi('statsCaptionBergerParker', 'Higher values indicate stronger record-frequency concentration.') }))
  ]);
  return renderStatsPage(`
    <p class="stats-chart-note subtle stats-wide-panel">${escapeHtml(statsUi('statsCaptionDiversityLimit', 'Default basis is point-record frequency; do not over-interpret as strict community ecology.'))}</p>
    ${charts}
    ${renderStatsTable([
      { key: 'label', label: statsUi('statsColumnZone', 'Zone'), zone: true },
      { key: 'speciesRichness', label: metricLabel('speciesRichness') },
      { key: 'shannon', label: metricLabel('shannon'), digits: 3 },
      { key: 'simpsonDiversity', label: metricLabel('simpsonDiversity'), digits: 3 },
      { key: 'pielou', label: metricLabel('pielou'), digits: 3 },
      { key: 'hillQ0', label: metricLabel('hillQ0'), digits: 3 },
      { key: 'hillQ1', label: metricLabel('hillQ1'), digits: 3 },
      { key: 'hillQ2', label: metricLabel('hillQ2'), digits: 3 },
      { key: 'bergerParker', label: metricLabel('bergerParker'), digits: 3 }
    ], rows)}
  `, { groups: ['diversity'] });
}

function renderSimilarity(stats) {
  const charts = renderChartGrid([
    renderOptionalChart('jaccardHeatmap', renderHeatmapMatrix(stats.heatmapMatrices.jaccard, { chartId: 'jaccardHeatmap' })),
    renderOptionalChart('sorensenHeatmap', renderHeatmapMatrix(stats.heatmapMatrices.sorensen, { chartId: 'sorensenHeatmap' })),
    renderOptionalChart('brayCurtisHeatmap', renderHeatmapMatrix(stats.heatmapMatrices.brayCurtis, { chartId: 'brayCurtisHeatmap' }))
  ], 'stats-heatmap-grid');
  return renderStatsPage(`
    <div class="stats-wide-panel">${renderHeatmapPaletteControl()}<p class="stats-chart-note subtle">${escapeHtml(statsUi('statsSimilarityNote', 'Jaccard and Sørensen are similarity metrics; Bray-Curtis is a dissimilarity metric.'))}</p></div>
    ${charts}
  `, { groups: ['similarity'] });
}

function renderPhenology(stats) {
  const monthRows = stats.phenologyStats.monthCounts.map(row => ({ label: row.label, count: row.count, phenologyRecordShare: row.percentage }));
  const charts = renderChartGrid([
    renderOptionalChart('phenologyStateDonut', renderChartCard(statsChartLabel('phenologyStateDonut'), renderPieLike(stats.phenologyStats.stateCounts.map(row => [row.label, row.count]), true, 'phenologyStateDonut'), { chartId: 'phenologyStateDonut', className: 'donut-card', caption: statsUi('statsCaptionPhenologyState', 'Counts by phenology record state.') })),
    renderOptionalChart('phenologyZoneBar', renderChartCard(statsChartLabel('phenologyZoneBar'), renderBarList(stats.phenologyStats.zoneCounts.map(row => ({ ...row, label: formatZoneDisplayName({ zoneId: row.label }) })), 'count', item => item.label, 'phenologyZoneBar'), { chartId: 'phenologyZoneBar', caption: statsUi('statsCaptionPhenologyCoverage', 'Used to review phenology coverage by zone.') })),
    renderOptionalChart('phenologyMonthTrend', renderChartCard(statsChartLabel('phenologyMonthTrend'), monthRows.length ? renderComboChart(monthRows, 'count', 'phenologyRecordShare', 'phenologyMonthTrend') : renderStatsEmpty(statsUi('statsNoDateTrend', 'Date data is insufficient for a trend.')), { chartId: 'phenologyMonthTrend', caption: statsUi('statsCaptionValidDatesOnly', 'Only records with valid dates are included.') })),
    renderOptionalChart('phenologyHeatmap', renderHeatmapMatrix(stats.heatmapMatrices.phenologyMonthState, { chartId: 'phenologyHeatmap' }))
  ], 'stats-chart-grid');
  return renderStatsPage(`
    <div class="stats-wide-panel">${renderHeatmapPaletteControl()}<p class="stats-chart-note subtle">${escapeHtml(stats.phenologyStats.note)}</p></div>
    ${charts}
  `, { groups: ['phenology'] });
}

function renderTimeTrend(stats) {
  const rows = stats.timeTrendStats.rows.map(row => ({
    label: row.month,
    newPointCount: row.newPointCount,
    cumulativeSpeciesCount: row.cumulativeSpeciesCount,
    cumulativePointCount: row.cumulativePointCount,
    phenologyRecordCount: row.phenologyRecordCount,
    imageRecordCount: row.imageRecordCount
  }));
  if (!rows.length) return renderStatsPage(renderStatsEmpty(stats.timeTrendStats.emptyMessage), { controls: false });
  const charts = renderChartGrid([
    renderOptionalChart('phenologyMonthTrend', renderChartCard(statsChartLabel('phenologyMonthTrend'), renderComboChart(rows, 'phenologyRecordCount', 'imageRecordCount', 'timePhenologyImageTrend'), { chartId: 'phenologyMonthTrend', caption: statsUi('statsCaptionValidDatesOnly', 'Only records with valid dates are included.') })),
    renderOptionalChart('overviewCombo', renderChartCard(statsUi('statsChartPointSpeciesTrend', 'New points + cumulative species'), renderComboChart(rows, 'newPointCount', 'cumulativeSpeciesCount', 'pointSpeciesTrendCombo'), { chartId: 'overviewCombo', caption: statsUi('statsCaptionPointSpeciesTrend', 'Shows survey progress and species accumulation.') }))
  ]);
  return renderStatsPage(`
    ${charts}
    ${renderStatsTable([
      { key: 'label', label: statsUi('statsColumnMonth', 'Month'), longText: true },
      { key: 'newPointCount', label: statsUi('statsColumnNewPoints', 'New points') },
      { key: 'cumulativePointCount', label: statsUi('statsColumnCumulativePoints', 'Cumulative points') },
      { key: 'cumulativeSpeciesCount', label: statsUi('statsColumnCumulativeSpecies', 'Cumulative species') },
      { key: 'phenologyRecordCount', label: statsUi('statsColumnPhenologyRecords', 'Phenology records') },
      { key: 'imageRecordCount', label: statsUi('statsColumnImageRecords', 'Image records') }
    ], rows)}
  `, { groups: ['overview', 'phenology'] });
}

function renderQuality(stats) {
  const charts = renderChartGrid([
    renderOptionalChart('qualityIssueBar', renderChartCard(statsChartLabel('qualityIssueBar'), renderBarList(stats.dataQuality.issueRows, 'count', item => item.label, 'qualityIssueBar'), { chartId: 'qualityIssueBar', caption: statsUi('statsCaptionDataCompletion', 'Used for data completion review.') })),
    renderOptionalChart('zoneQualityScoreBar', renderChartCard(statsChartLabel('zoneQualityScoreBar'), renderBarList(stats.zoneSummaries.map(row => zoneChartRow(row, { count: row.qualityScore })), 'count', item => item.label, 'zoneQualityScoreBar'), { chartId: 'zoneQualityScoreBar', caption: statsUi('statsCaptionQualityScore', 'Quality scores indicate record completeness only.') })),
    renderOptionalChart('qualityHeatmap', renderHeatmapMatrix(stats.heatmapMatrices.zoneDataQuality, { chartId: 'qualityHeatmap' }))
  ], 'stats-chart-grid');
  return renderStatsPage(`
    <p class="stats-chart-note subtle stats-wide-panel">${escapeHtml(stats.dataQuality.note)}</p>
    ${renderKpiGrid([
      { label: statsUi('statsColumnQualityScore', 'Quality score'), value: stats.dataQuality.qualityScore },
      { label: statsUi('statsColumnQualityLevel', 'Quality level'), value: stats.dataQuality.qualityLevel },
      { label: statsUi('statsMissingRecordIssues', 'Missing-record issues'), value: stats.projectSummary.missingRecordCount },
      { label: statsUi('statsColumnDuplicateCandidates', 'Duplicate candidates'), value: stats.dataQuality.duplicateCandidates.length }
    ])}
    <div class="stats-wide-panel">${renderHeatmapPaletteControl()}</div>
    ${charts}
  `, { groups: ['quality'] });
}

function renderExportGroup(title, buttons) {
  return `<div class="stats-export-card"><h3>${escapeHtml(title)}</h3><div class="stats-export-grid">${buttons.join('')}</div></div>`;
}

function renderExport(stats) {
  const hasStats = stats.projectSummary.pointCount > 0 || stats.projectSummary.zoneCount > 0;
  return `<div class="stats-center-layout stats-export-panel">
    <p class="stats-chart-note subtle stats-wide-panel">${escapeHtml(statsUi('statsExportNote', 'Exports are saved through the protected save dialog. CSV files include a UTF-8 BOM.'))}</p>
    <div class="stats-export-layout">
      ${renderExportGroup(statsUi('statsExportGroupTables', 'Statistics tables'), [
        renderExportButton('project_statistics', 'statsExportProjectSummary', 'Project summary statistics', 'csv', !hasStats),
        renderExportButton('zone_statistics', 'statsExportZoneStats', 'Zone statistics table', 'csv', !stats.zoneSummaries.length),
        renderExportButton('zone_species_list', 'statsExportZoneSpecies', 'Zone species list', 'csv', !hasStats),
        renderExportButton('diversity_metrics', 'statsExportDiversity', 'Diversity metrics table', 'csv', !stats.zoneSummaries.length),
        renderExportButton('phenology_statistics', 'statsExportPhenology', 'Phenology statistics table', 'csv', !stats.phenologyStats.totalPhenologyRecords),
        renderExportButton('data_quality', 'statsExportQuality', 'Data quality report', 'csv', !hasStats)
      ])}
      ${renderExportGroup(statsUi('statsExportGroupMatrices', 'Similarity and heatmap data'), [
        renderExportButton('zone_jaccard_matrix', 'statsExportJaccard', 'Jaccard zone similarity matrix', 'csv', !stats.heatmapMatrices.jaccard.rows.length),
        renderExportButton('zone_sorensen_matrix', 'statsExportSorensen', 'Sørensen zone similarity matrix', 'csv', !stats.heatmapMatrices.sorensen.rows.length),
        renderExportButton('zone_bray_curtis_matrix', 'statsExportBrayCurtis', 'Bray-Curtis zone dissimilarity matrix', 'csv', !stats.heatmapMatrices.brayCurtis.rows.length)
      ])}
      ${renderExportGroup(statsUi('statsExportGroupReports', 'Full reports'), [
        renderExportButton('statistics_full', 'statsExportFullJson', 'Full statistics JSON', 'json', !hasStats),
        renderExportButton('statistics_summary', 'statsExportMarkdownSummary', 'Markdown statistics summary', 'md', !hasStats)
      ])}
    </div>
    <div id="statsExportStatus" class="stats-export-status subtle">${escapeHtml(hasStats ? statsUi('statsExportReady', 'Choose an export item.') : statsUi('statsExportDisabledEmpty', 'No statistics data is available. Export buttons are disabled.'))}</div>
  </div>`;
}

function renderNotes(stats) {
  const definitions = stats.metricDefinitions.map(item => `<li><strong>${escapeHtml(item.name)}</strong>: ${escapeHtml(item.formula)}</li>`).join('');
  const notes = stats.formulaNotes.map(item => `<li>${escapeHtml(item)}</li>`).join('');
  const scope = stats.dataScopeNotes.map(item => `<li>${escapeHtml(item)}</li>`).join('');
  return `<div class="stats-center-layout stats-notes-panel">
    ${renderChartCard(statsUi('statsNotesFormulaTitle', 'Metric formulas'), `<ul class="stats-notes-list">${definitions}</ul>`, { fullscreen: false })}
    ${renderChartCard(statsUi('statsNotesScopeTitle', 'Metric scope and limits'), `<ul class="stats-notes-list">${notes}</ul><ul class="stats-notes-list">${scope}</ul>`, { fullscreen: false })}
  </div>`;
}

function renderCustomChart() {
  ensureThemeSettings();
  const cfg = state.settings.statsCustom;
  const rows = statsCategoryRows(cfg.category);
  const entries = rows.map(row => [row.label, Number(row[cfg.barMetric] || 0)]);
  const title = `${categoryLabel(cfg.category)} - ${t('statsCustomChart')}`;
  let chart;
  if (cfg.chartType === 'combo') chart = renderChartCard(title, renderComboChart(rows, cfg.barMetric, cfg.lineMetric, 'customStats'), { chartId: 'customStats', caption: t('statsComboHint') });
  else if (cfg.chartType === 'bar') chart = renderChartCard(title, renderBarList(rows.map(row => ({ label: row.label, value: row[cfg.barMetric] })), 'value', item => item.label, 'customStats'), { chartId: 'customStats', caption: t('statsCaptionMetricCompare') });
  else if (cfg.chartType === 'line') chart = renderChartCard(title, renderComboChart(rows, cfg.lineMetric, cfg.lineMetric, 'customStats'), { chartId: 'customStats', caption: t('statsCaptionTrendCompare') });
  else chart = renderChartCard(title, renderPieLike(entries, cfg.chartType === 'donut', 'customStats'), { chartId: 'customStats', className: 'donut-card', caption: t('statsCaptionDistribution') });
  return `<div class="stats-center-layout">${renderStatControls(true)}<div class="stats-chart-grid">${chart}</div></div>`;
}

function renderStatsModal() {
  if (!ui.statsModalBody) return;
  ensureThemeSettings();
  ensureStatsChartPrefs();
  const stats = getResearchStats();
  document.querySelectorAll('.stats-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === state.statsTab));
  const tab = state.statsTab || 'overview';
  if (tab === 'overview') ui.statsModalBody.innerHTML = renderOverview(stats);
  else if (tab === 'zone') ui.statsModalBody.innerHTML = renderZoneAnalysis(stats);
  else if (tab === 'taxonomy') ui.statsModalBody.innerHTML = renderTaxonomy(stats);
  else if (tab === 'life') ui.statsModalBody.innerHTML = renderLifeOrigin(stats);
  else if (tab === 'diversity') ui.statsModalBody.innerHTML = renderDiversity(stats);
  else if (tab === 'similarity') ui.statsModalBody.innerHTML = renderSimilarity(stats);
  else if (tab === 'phenology') ui.statsModalBody.innerHTML = renderPhenology(stats);
  else if (tab === 'time') ui.statsModalBody.innerHTML = renderTimeTrend(stats);
  else if (tab === 'quality') ui.statsModalBody.innerHTML = renderQuality(stats);
  else if (tab === 'export') ui.statsModalBody.innerHTML = renderExport(stats);
  else if (tab === 'notes') ui.statsModalBody.innerHTML = renderNotes(stats);
  else ui.statsModalBody.innerHTML = renderCustomChart();
  bindStatsAfterRender();
}

function matrixByMetric(stats, metric) {
  return Object.values(stats.heatmapMatrices).find(matrix => matrix.metric === metric);
}

function projectSummaryLabel(key) {
  const labels = {
    zoneCount: ['statsKpiZones', 'Zones'],
    pointCount: ['statsKpiPoints', 'Points'],
    speciesRichness: ['statsKpiSpecies', 'Valid species'],
    familyRichness: ['statsColumnFamilyRichness', 'Families'],
    genusRichness: ['statsColumnGenusRichness', 'Genera'],
    imagePointCount: ['statsColumnImagePointCount', 'Image points'],
    imageCompleteness: ['statsMetricImageCompleteness', 'Image completeness (%)'],
    phenologyCount: ['statsColumnPhenologyCount', 'Phenology records'],
    phenologyPointCount: ['statsKpiPhenologyPoints', 'Phenology record points'],
    phenologyCoverage: ['statsMetricPhenologyCoverage', 'Phenology coverage (%)'],
    missingRecordCount: ['statsMissingRecordIssues', 'Missing-record issues'],
    unassociatedZonePointCount: ['statsTooltipUnassociatedPoints', 'Unassociated zone points'],
    duplicateCandidateCount: ['statsKpiDuplicates', 'Duplicate candidates'],
    generatedAt: ['statsGeneratedAt', 'Generated at']
  };
  const entry = labels[key] || [key, key];
  return statsUi(entry[0], entry[1]);
}

function rowsToLabeledCsv(columns, rows) {
  const headers = columns.map(column => column.label);
  const outputRows = rows.map(row => {
    const output = {};
    columns.forEach(column => {
      const raw = typeof column.value === 'function'
        ? column.value(row)
        : column.zone
          ? zoneDisplayFromRow(row, column.key)
          : row[column.key];
      output[column.label] = formatStatsValue(raw, column.digits ?? 3);
    });
    return output;
  });
  return window.StatsResearch.rowsToCsv(headers, outputRows);
}

function exportRowsForKey(stats, key) {
  const engine = window.StatsResearch;
  if (key === 'project_statistics') {
    const columns = Object.keys(stats.projectSummary).map(summaryKey => ({ key: summaryKey, label: projectSummaryLabel(summaryKey) }));
    return {
      defaultPath: engine.buildExportFileName('project_statistics', 'csv'),
      content: rowsToLabeledCsv(columns, [stats.projectSummary])
    };
  }
  if (key === 'zone_statistics') {
    const columns = [
      { key: 'label', label: statsUi('statsColumnZone', 'Zone'), zone: true },
      { key: 'pointCount', label: metricLabel('pointCount') },
      { key: 'speciesRichness', label: metricLabel('speciesRichness') },
      { key: 'familyRichness', label: statsUi('statsColumnFamilyRichness', 'Families') },
      { key: 'genusRichness', label: statsUi('statsColumnGenusRichness', 'Genera') },
      { key: 'phenologyCount', label: statsUi('statsColumnPhenologyCount', 'Phenology records') },
      { key: 'imageCompleteness', label: metricLabel('imageCompleteness'), digits: 1 },
      { key: 'qualityScore', label: metricLabel('qualityScore') },
      { key: 'qualityLevel', label: statsUi('statsColumnQualityLevel', 'Quality level') }
    ];
    return { defaultPath: engine.buildExportFileName('zone_statistics', 'csv'), content: rowsToLabeledCsv(columns, stats.zoneSummaries) };
  }
  if (key === 'zone_species_list') {
    const rows = stats.zoneSummaries.flatMap(zone => {
      const matrix = stats.heatmapMatrices.jaccard;
      const setCell = matrix.cells.find(cell => cell.rowId === zone.zoneId && cell.columnId === zone.zoneId);
      const species = setCell?.raw?.sharedSpecies || [];
      return species.map(item => ({ zone: zoneDisplayFromRow(zone), speciesKey: item }));
    });
    return {
      defaultPath: engine.buildExportFileName('zone_species_list', 'csv'),
      content: rowsToLabeledCsv([
        { key: 'zone', label: statsUi('statsColumnZone', 'Zone') },
        { key: 'speciesKey', label: statsUi('statsColumnSpeciesKey', 'Species key') }
      ], rows)
    };
  }
  if (key === 'diversity_metrics') {
    const rows = stats.diversityMetrics.byZone;
    const columns = [
      { key: 'label', label: statsUi('statsColumnZone', 'Zone'), zone: true },
      { key: 'speciesRichness', label: metricLabel('speciesRichness') },
      { key: 'totalAbundance', label: metricLabel('totalAbundance') },
      { key: 'shannon', label: metricLabel('shannon'), digits: 3 },
      { key: 'simpsonDiversity', label: metricLabel('simpsonDiversity'), digits: 3 },
      { key: 'pielou', label: metricLabel('pielou'), digits: 3 },
      { key: 'margalef', label: metricLabel('margalef'), digits: 3 },
      { key: 'menhinick', label: metricLabel('menhinick'), digits: 3 },
      { key: 'bergerParker', label: metricLabel('bergerParker'), digits: 3 },
      { key: 'hillQ0', label: metricLabel('hillQ0'), digits: 3 },
      { key: 'hillQ1', label: metricLabel('hillQ1'), digits: 3 },
      { key: 'hillQ2', label: metricLabel('hillQ2'), digits: 3 },
      { key: 'evenness', label: metricLabel('evenness'), digits: 3 }
    ];
    return { defaultPath: engine.buildExportFileName('diversity_metrics', 'csv'), content: rowsToLabeledCsv(columns, rows) };
  }
  if (key === 'phenology_statistics') {
    return {
      defaultPath: engine.buildExportFileName('phenology_statistics', 'csv'),
      content: rowsToLabeledCsv([
        { key: 'label', label: statsUi('statsMetricPhenologyState', 'Phenology state') },
        { key: 'count', label: metricLabel('count') },
        { key: 'percentage', label: metricLabel('phenologyStateShare'), digits: 1 }
      ], stats.phenologyStats.stateCounts)
    };
  }
  if (key === 'data_quality') {
    return {
      defaultPath: engine.buildExportFileName('data_quality', 'csv'),
      content: rowsToLabeledCsv([
        { key: 'id', label: 'ID' },
        { key: 'label', label: statsUi('statsMetricQualityIssue', 'Data quality issue') },
        { key: 'count', label: metricLabel('count') },
        { key: 'percentage', label: statsUi('statsMetricIssueShare', 'Issue share (%)'), digits: 1 }
      ], stats.dataQuality.issueRows)
    };
  }
  return null;
}

async function exportStatsByKey(key, format) {
  const engine = window.StatsResearch;
  const stats = getResearchStats();
  let payload = null;
  let api = null;
  if (key.startsWith('heatmap:')) {
    const [, metric, targetFormat] = key.split(':');
    const matrix = matrixByMetric(stats, metric);
    if (!matrix) return showAlert(statsUi('statsExportNoMatrix', 'No matrix data is available for export.'));
    const ext = targetFormat || format;
    if (ext === 'csv') {
      payload = { defaultPath: engine.buildExportFileName(`heatmap_${metric}`, 'csv'), content: engine.matrixToCsv(matrix) };
      api = window.plantApp.project.exportCsv;
    } else if (ext === 'json') {
      payload = { title: statsUi('statsExportHeatmapJsonTitle', 'Export heatmap JSON'), defaultPath: engine.buildExportFileName(`heatmap_${metric}`, 'json'), content: engine.matrixToJson(matrix) };
      api = window.plantApp.settings.exportJson;
    } else if (ext === 'md') {
      payload = { defaultPath: engine.buildExportFileName(`heatmap_${metric}`, 'md'), content: engine.matrixToMarkdown(matrix) };
      api = window.plantApp.project.exportMarkdown;
    } else {
      payload = { defaultPath: engine.buildExportFileName(`heatmap_${metric}`, 'svg'), content: engine.renderHeatmapSvg(matrix, { palette: statsHeatPalette }) };
      api = window.plantApp.project.exportSvg;
    }
  } else if (key === 'statistics_full') {
    payload = { title: statsUi('statsExportFullJsonTitle', 'Export statistics JSON'), defaultPath: engine.buildExportFileName('statistics_full', 'json'), content: engine.statisticsFullJson(stats) };
    api = window.plantApp.settings.exportJson;
  } else if (key === 'statistics_summary') {
    payload = { defaultPath: engine.buildExportFileName('statistics_summary', 'md'), content: engine.statisticsSummaryMarkdown(stats) };
    api = window.plantApp.project.exportMarkdown;
  } else if (key === 'zone_jaccard_matrix') {
    payload = { defaultPath: engine.buildExportFileName('zone_jaccard_matrix', 'csv'), content: engine.matrixToCsv(stats.heatmapMatrices.jaccard) };
    api = window.plantApp.project.exportCsv;
  } else if (key === 'zone_sorensen_matrix') {
    payload = { defaultPath: engine.buildExportFileName('zone_sorensen_matrix', 'csv'), content: engine.matrixToCsv(stats.heatmapMatrices.sorensen) };
    api = window.plantApp.project.exportCsv;
  } else if (key === 'zone_bray_curtis_matrix') {
    payload = { defaultPath: engine.buildExportFileName('zone_bray_curtis_matrix', 'csv'), content: engine.matrixToCsv(stats.heatmapMatrices.brayCurtis) };
    api = window.plantApp.project.exportCsv;
  } else {
    payload = exportRowsForKey(stats, key);
    api = window.plantApp.project.exportCsv;
  }
  if (!payload || !api) return showAlert(statsUi('statsExportUnavailable', 'This export item is unavailable.'));
  const result = await api(payload);
  if (result && !result.canceled) showAlert(t('exportSuccess'));
}

function bindStatsExportEvents() {
  document.querySelectorAll('[data-stats-export]').forEach(button => {
    button.addEventListener('click', async () => {
      if (button.disabled) return;
      button.disabled = true;
      button.classList.add('is-busy');
      const status = document.getElementById('statsExportStatus');
      if (status) status.textContent = statsUi('statsExportBusy', 'Exporting...');
      try {
        await exportStatsByKey(button.dataset.statsExport, button.dataset.exportFormat);
        if (status) status.textContent = statsUi('statsExportDone', 'Export completed or canceled.');
      } catch (error) {
        if (status) status.textContent = statsUi('statsExportFailed', 'Export failed. Check the save path or file permission.');
        showAlert(errorMessage(error));
      } finally {
        button.disabled = false;
        button.classList.remove('is-busy');
      }
    });
  });
}

function ensureStatsFullscreenLayer() {
  let layer = document.getElementById('statsFullscreenLayer');
  if (layer) {
    if (layer.parentElement !== document.body) document.body.appendChild(layer);
    return layer;
  }
  layer = document.createElement('div');
  layer.id = 'statsFullscreenLayer';
  layer.className = 'stats-fullscreen-layer hidden';
  layer.innerHTML = `
    <div class="stats-fullscreen-panel">
      <div class="stats-fullscreen-header">
        <h3 id="statsFullscreenTitle"></h3>
        <button type="button" id="btnCloseStatsFullscreen" class="btn btn-soft stats-fullscreen-close" title="${escapeHtml(statsUi('statsClose', 'Close'))}">X</button>
      </div>
      <div id="statsFullscreenBody" class="stats-fullscreen-body"></div>
    </div>
  `;
  document.body.appendChild(layer);
  layer.querySelector('#btnCloseStatsFullscreen').addEventListener('click', closeStatsFullscreen);
  if (!statsFullscreenBound) {
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeStatsFullscreen();
    });
    statsFullscreenBound = true;
  }
  return layer;
}

function openStatsFullscreen(button) {
  const card = button.closest('.chart-card');
  if (!card) return;
  const layer = ensureStatsFullscreenLayer();
  const title = card.querySelector('h3')?.textContent || statsUi('statsFullscreen', 'Fullscreen');
  const clone = card.cloneNode(true);
  clone.querySelectorAll('.stats-card-actions').forEach(node => node.remove());
  clone.classList.add('stats-fullscreen-card');
  layer.querySelector('#statsFullscreenTitle').textContent = title;
  const body = layer.querySelector('#statsFullscreenBody');
  body.innerHTML = '';
  body.appendChild(clone);
  layer.classList.remove('hidden');
}

function closeStatsFullscreen() {
  const layer = document.getElementById('statsFullscreenLayer');
  if (!layer) return;
  layer.classList.add('hidden');
  const body = layer.querySelector('#statsFullscreenBody');
  if (body) body.innerHTML = '';
}

function bindStatsFullscreenEvents() {
  document.querySelectorAll('[data-stats-fullscreen]').forEach(button => {
    button.addEventListener('click', () => openStatsFullscreen(button));
  });
}

function compactLabel(label, max = 12) {
  const text = String(label || t('notFilled'));
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function renderWorkspaceMiniDonut(entries, title, chartKey) {
  const usable = entries.filter(([, value]) => Number(value) > 0).slice(0, 5);
  const total = usable.reduce((sum, [, value]) => sum + Number(value || 0), 0);
  const palette = chartPalette(Math.max(usable.length, 1));
  let cursor = 0;
  const stops = total ? usable.map(([, value], index) => {
    const start = cursor;
    cursor += (Number(value || 0) / total) * 100;
    return `${palette[index]} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`;
  }).join(', ') : 'rgba(120, 138, 165, 0.16) 0% 100%';
  const legend = usable.length ? usable.map(([label, value], index) => `
    <span class="workspace-chart-legend-item" title="${escapeHtml(label)}">
      <i style="background:${palette[index]}"></i>${escapeHtml(compactLabel(label, 9))}<b>${escapeHtml(value)}</b>
    </span>
  `).join('') : `<span class="subtle">${escapeHtml(t('resultsEmpty'))}</span>`;
  return `
    <div class="workspace-mini-chart" data-chart-visual="${escapeHtml(chartKey)}">
      <div class="workspace-donut" style="background: conic-gradient(${stops});"><span>${escapeHtml(total)}</span></div>
      <div class="workspace-chart-meta">
        <strong>${escapeHtml(title)}</strong>
        <div class="workspace-chart-legend">${legend}</div>
      </div>
    </div>
  `;
}

function renderWorkspaceMiniBars(rows, title) {
  const topRows = rows.slice(0, 5);
  const max = Math.max(1, ...topRows.map(item => Number(item.pointCount || item.count || 0)));
  if (!topRows.length) {
    return `<div class="workspace-mini-bars"><strong>${escapeHtml(title)}</strong><div class="subtle">${escapeHtml(t('resultsEmpty'))}</div></div>`;
  }
  const bars = topRows.map(item => {
    const value = Number(item.pointCount || item.count || 0);
    const width = Math.max(4, Math.round((value / max) * 100));
    return `<div class="workspace-bar-row" title="${escapeHtml(item.label)} / ${value}"><span>${escapeHtml(compactLabel(item.label, 12))}</span><i><b style="width:${width}%"></b></i><strong>${value}</strong></div>`;
  }).join('');
  return `<div class="workspace-mini-bars"><strong>${escapeHtml(title)}</strong>${bars}</div>`;
}

function renderWorkspaceStatsSummary() {
  if (!ui.workspaceStatsSummary) return;
  ensureThemeSettings();
  const { stats } = computeStats();
  const growthCounts = stats.lifeFormComposition.overall.map(row => [row.label, row.count]);
  const phenologyCounts = stats.phenologyStats.stateCounts.map(row => [row.label, row.count]);
  const zoneRows = stats.zoneSummaries.map(row => zoneChartRow(row, { pointCount: row.pointCount, speciesCount: row.speciesRichness }));
  const kpis = [
    [t('statsZones'), stats.projectSummary.zoneCount],
    [t('statsPoints'), stats.projectSummary.pointCount],
    [t('statsSpecies'), stats.projectSummary.speciesRichness],
    [t('images'), stats.projectSummary.imagePointCount],
    [statsUi('statsKpiPhenologyCoverage', 'Phenology coverage'), `${stats.projectSummary.phenologyCoverage}%`],
    [statsUi('statsColumnQualityScore', 'Quality score'), stats.dataQuality.qualityScore]
  ];
  ui.workspaceStatsSummary.innerHTML = `
    <div class="workspace-kpi-grid">
      ${kpis.map(([label, value]) => `<div class="workspace-kpi"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('')}
    </div>
    <div class="workspace-mini-chart-grid">
      ${renderWorkspaceMiniDonut(growthCounts, t('statsSectionGrowth'), 'workspaceGrowthDonut')}
      ${renderWorkspaceMiniDonut(phenologyCounts, t('statsSectionPhenology'), 'workspacePhenologyDonut')}
      ${renderWorkspaceMiniBars(zoneRows, t('statsSectionZoneRank'))}
    </div>
  `;
}
