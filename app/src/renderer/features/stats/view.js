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
      statsViewState.heatPalette = select.value === 'default' ? 'default' : 'warm';
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
  animateStatsCounters();
  if (typeof syncMaintenanceSafeModeUi === 'function') syncMaintenanceSafeModeUi();
}

function statsMotionIsEnabled() {
  if (document.documentElement.classList.contains('motion-disabled')) return false;
  return !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function animateStatsCounters() {
  if (!statsMotionIsEnabled() || !ui.statsModalBody) return;
  const nodes = [...ui.statsModalBody.querySelectorAll('.stat-chip strong')];
  nodes.forEach((node, index) => {
    const finalText = String(node.textContent || '').trim();
    const match = finalText.match(/^(-?\d+(?:\.\d+)?)(%)?$/);
    if (!match) return;
    const target = Number(match[1]);
    if (!Number.isFinite(target)) return;
    const decimals = (match[1].split('.')[1] || '').length;
    const suffix = match[2] || '';
    const duration = 760;
    const delay = Math.min(index * 52, 312);
    node.setAttribute('aria-label', finalText);
    node.textContent = `${(0).toFixed(decimals)}${suffix}`;
    window.setTimeout(() => {
      const startedAt = performance.now();
      const draw = now => {
        if (!node.isConnected) return;
        const progress = Math.min(1, (now - startedAt) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = target * eased;
        node.textContent = `${value.toFixed(decimals)}${suffix}`;
        if (progress < 1) window.requestAnimationFrame(draw);
        else node.textContent = finalText;
      };
      window.requestAnimationFrame(draw);
    }, delay);
  });
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
      <option value="warm" ${statsViewState.heatPalette === 'warm' ? 'selected' : ''}>${escapeHtml(statsUi('statsHeatPaletteWarm', 'Warm: orange-red'))}</option>
      <option value="default" ${statsViewState.heatPalette === 'default' ? 'selected' : ''}>${escapeHtml(statsUi('statsHeatPaletteDefault', 'Default'))}</option>
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
    return renderChartCard(matrix.title, `${note}${renderStatsEmpty(matrix.emptyMessage)}${renderMatrixExportButtons(matrix)}`, { chartId, className: `stats-heatmap-panel heat-palette-${statsViewState.heatPalette}` });
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
  return renderChartCard(matrix.title, bodyHtml, { chartId, className: `stats-heatmap-panel heat-palette-${statsViewState.heatPalette}`, caption: statsUi('statsHeatCaption', 'Table heatmap; CSV export follows the current row and column order.') });
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
  const completeness = stats.taxonomyCompleteness || {};
  const kpis = renderKpiGrid([
    { label: metricLabel('familyCompleteness'), value: completeness.familyCompleteness || 0, digits: 1 },
    { label: metricLabel('genusCompleteness'), value: completeness.genusCompleteness || 0, digits: 1 },
    { label: metricLabel('taxonomySuggestedCount'), value: completeness.taxonomySuggestedCount || 0, digits: 0 },
    { label: metricLabel('taxonomyUnverifiedCount'), value: completeness.taxonomyUnverifiedCount || 0, digits: 0 },
    { label: metricLabel('manuallyVerifiedCount'), value: completeness.manuallyVerifiedCount || 0, digits: 0 },
    { label: metricLabel('doubtfulTaxonomyCount'), value: completeness.doubtfulTaxonomyCount || 0, digits: 0 }
  ]);
  const taxonomyTables = renderChartGrid([
    renderChartCard(
      statsUi('statsTaxonomySourceTitle', 'Taxonomy source distribution'),
      renderStatsTable([
        { key: 'label', label: statsUi('taxonomySource', 'Taxonomy source') },
        { key: 'count', label: metricLabel('count') },
        { key: 'percentage', label: metricLabel('percentage'), digits: 1 }
      ], completeness.taxonomySourceSummary || []),
      { fullscreen: false }
    ),
    renderChartCard(
      statsUi('statsTaxonomyVerificationTitle', 'Taxonomy verification distribution'),
      renderStatsTable([
        { key: 'label', label: statsUi('taxonomyVerificationStatus', 'Taxonomy verification') },
        { key: 'count', label: metricLabel('count') },
        { key: 'percentage', label: metricLabel('percentage'), digits: 1 }
      ], completeness.taxonomyVerificationSummary || []),
      { fullscreen: false }
    )
  ]);
  const charts = renderChartGrid([
    renderOptionalChart('topFamilyBar', renderChartCard(statsChartLabel('topFamilyBar'), renderBarList(taxonomy.topFamilies, 'count', item => item.label, 'topFamilyBar'), { chartId: 'topFamilyBar', caption: taxonomy.note })),
    renderOptionalChart('topGenusBar', renderChartCard(statsChartLabel('topGenusBar'), renderBarList(taxonomy.topGenera, 'count', item => item.label, 'topGenusBar'), { chartId: 'topGenusBar', caption: taxonomy.note })),
    renderOptionalChart('topSpeciesBar', renderChartCard(statsChartLabel('topSpeciesBar'), renderBarList(taxonomy.topSpecies, 'count', item => item.label, 'topSpeciesBar'), { chartId: 'topSpeciesBar', caption: taxonomy.note })),
    renderOptionalChart('familyDonut', renderChartCard(statsChartLabel('familyDonut'), renderPieLike(taxonomy.familyComposition.slice(0, 8).map(row => [row.label, row.count]), true, 'familyDonut'), { chartId: 'familyDonut', className: 'donut-card', caption: statsUi('statsCaptionDistribution', 'Distribution based on current records.') })),
    renderOptionalChart('genusDonut', renderChartCard(statsChartLabel('genusDonut'), renderPieLike(taxonomy.genusComposition.slice(0, 8).map(row => [row.label, row.count]), true, 'genusDonut'), { chartId: 'genusDonut', className: 'donut-card', caption: statsUi('statsCaptionDistribution', 'Distribution based on current records.') }))
  ]);
  return renderStatsPage(`${renderChartCard(statsUi('statsTaxonomyCompletenessTitle', 'Taxonomy completeness and verification'), `${kpis}<p class="stats-chart-note subtle">${escapeHtml(completeness.note || '')}</p>`, { fullscreen: false })}<p class="stats-chart-note subtle stats-wide-panel">${escapeHtml(taxonomy.note)}</p>${taxonomyTables}${charts}`, { groups: ['taxonomy'] });
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
        renderExportButton('data_quality', 'statsExportQuality', 'Data quality report', 'csv', !hasStats),
        renderExportButton('taxonomy_completion_report', 'statsExportTaxonomyCompletion', 'Taxonomy completion report', 'csv', !hasStats),
        renderExportButton('taxonomy_candidates', 'statsExportTaxonomyCandidates', 'Taxonomy candidate summary', 'csv', !hasStats)
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
