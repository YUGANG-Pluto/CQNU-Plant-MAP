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
