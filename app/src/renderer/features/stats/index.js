// 统计以物候记录为基本口径，分区排行同时保留点位数和物种数。
function computeStats(){
  const zoneRank = state.zones.map(zone => ({ zone, speciesCount: uniqueSpeciesInZone(zone.id), pointCount: state.points.filter(p=>p.zoneRef===zone.id).length })).sort((a,b)=>b.speciesCount-a.speciesCount || b.pointCount-a.pointCount);
  const countMap = key => {
    const map = new Map();
    state.points.forEach(point => getPhenologyEntries(point).forEach(entry => { const label = entry[key] || (key==='floweringState' ? entry.label : '') || t('notFilled'); map.set(label, (map.get(label)||0)+1); }));
    return [...map.entries()].sort((a,b)=>b[1]-a[1]);
  };
  const sourceCounts = countMap('cultivatedStatus');
  const growthCounts = countMap('growthForm');
  const phenologyCounts = countMap('floweringState');
  const weekAdded = state.points.reduce((sum, point)=>sum + getPhenologyEntries(point).filter(entry => entry.surveyDate && daysBetween(entry.surveyDate, 7)).length, 0);
  const monthAdded = state.points.reduce((sum, point)=>sum + getPhenologyEntries(point).filter(entry => entry.surveyDate && daysBetween(entry.surveyDate, 31)).length, 0);
  return { zoneRank, sourceCounts, growthCounts, phenologyCounts, weekAdded, monthAdded };
}
// 自由统计统一转成 label/count/percentage 行，便于不同图表复用。
function statsCategoryRows(category){
  const { zoneRank, sourceCounts, growthCounts, phenologyCounts, weekAdded, monthAdded } = computeStats();
  if(category==='zone') return zoneRank.map(item=>({ label: zoneDisplayName(item.zone), count:item.pointCount, pointCount:item.pointCount, speciesCount:item.speciesCount, percentage: state.points.length? Number((item.pointCount/state.points.length*100).toFixed(1)) : 0 }));
  const toRows = entries => {
    const total = entries.reduce((s,[,v])=>s+v,0) || 1;
    return entries.map(([label, value]) => ({ label, count:value, pointCount:value, speciesCount:value, percentage:Number((value/total*100).toFixed(1)) }));
  };
  if(category==='source') return toRows(sourceCounts);
  if(category==='growth') return toRows(growthCounts);
  if(category==='phenology') return toRows(phenologyCounts);
  if(category==='recent') return [
    { label:t('statsWeek'), count:weekAdded, pointCount:weekAdded, speciesCount:weekAdded, percentage: monthAdded?Number((weekAdded/(monthAdded||1)*100).toFixed(1)):0 },
    { label:t('statsMonth'), count:monthAdded, pointCount:monthAdded, speciesCount:monthAdded, percentage:100 }
  ];
  return [];
}
function metricLabel(metric){
  return t(metric==='count'?'statsMetricCount':metric==='pointCount'?'statsMetricPointCount':metric==='speciesCount'?'statsMetricSpeciesCount':metric==='weekAdded'?'statsMetricWeek':metric==='monthAdded'?'statsMetricMonth':'statsMetricPercentage');
}
function categoryLabel(category){
  return t(category==='zone'?'statsCategoryZone':category==='growth'?'statsCategoryGrowth':category==='source'?'statsCategorySource':category==='phenology'?'statsCategoryPhenology':'statsSectionRecent');
}
function renderStatControls(customOnly=false){
  ensureThemeSettings();
  const cfg = state.settings.statsCustom;
  const categoryOptions = ['zone','growth','source','phenology'].map(k=>`<option value="${k}" ${cfg.category===k?'selected':''}>${escapeHtml(categoryLabel(k))}</option>`).join('');
  const metricOptions = ['count','pointCount','speciesCount','percentage'].map(k=>`<option value="${k}">${escapeHtml(metricLabel(k))}</option>`).join('');
  const typeOptions = [['combo',t('statsChartCombo')],['bar',t('statsChartBar')],['line',t('statsChartLine')],['pie',t('statsChartPie')],['donut',t('statsChartDonut')]].map(([v,l])=>`<option value="${v}" ${cfg.chartType===v?'selected':''}>${escapeHtml(l)}</option>`).join('');
  return `<div class="stats-control-card ${customOnly?'stats-control-card-wide':''}"><div class="field"><label>${escapeHtml(t('statsCategory'))}</label><select id="statsCategorySelect" class="input">${categoryOptions}</select></div><div class="field"><label>${escapeHtml(t('statsBarMetric'))}</label><select id="statsBarMetricSelect" class="input">${metricOptions}</select></div><div class="field"><label>${escapeHtml(t('statsLineMetric'))}</label><select id="statsLineMetricSelect" class="input">${metricOptions}</select></div><div class="field"><label>${escapeHtml(t('statsChartType'))}</label><select id="statsChartTypeSelect" class="input">${typeOptions}</select></div></div>`;
}
function resolveMetricsForCategory(category){
  return category==='zone' ? ['speciesCount','pointCount','percentage'] : ['count','percentage'];
}
function bindStatsControlEvents(){
  ['statsCategorySelect','statsBarMetricSelect','statsLineMetricSelect','statsChartTypeSelect'].forEach(id=>{ const node=document.getElementById(id); if(node) node.addEventListener('change', async ()=>{ ensureThemeSettings(); const cfg=state.settings.statsCustom; cfg.category=document.getElementById('statsCategorySelect')?.value || cfg.category; const valid=resolveMetricsForCategory(cfg.category); cfg.barMetric=document.getElementById('statsBarMetricSelect')?.value || cfg.barMetric; cfg.lineMetric=document.getElementById('statsLineMetricSelect')?.value || cfg.lineMetric; cfg.chartType=document.getElementById('statsChartTypeSelect')?.value || cfg.chartType; if(!valid.includes(cfg.barMetric)) cfg.barMetric=valid[0]; if(!valid.includes(cfg.lineMetric)) cfg.lineMetric=valid[Math.min(1, valid.length-1)] || valid[0]; renderStatsModal(); await persistProject(); }); });
  const cat=document.getElementById('statsCategorySelect'); const bar=document.getElementById('statsBarMetricSelect'); const line=document.getElementById('statsLineMetricSelect');
  if(cat&&bar&&line){ const valid=resolveMetricsForCategory(cat.value); [bar,line].forEach(sel=>{ const current=sel.value; sel.innerHTML=valid.map(k=>`<option value="${k}" ${current===k?'selected':''}>${escapeHtml(metricLabel(k))}</option>`).join(''); if(!valid.includes(sel.value)) sel.value=valid[0]; }); }
}
function bindStatsAfterRender() {
  bindStatsControlEvents();
}

function renderCustomChart(){
  ensureThemeSettings();
  const cfg=state.settings.statsCustom;
  const rows=statsCategoryRows(cfg.category);
  const entries=rows.map(r=>[r.label, Number(r[cfg.barMetric]||0)]);
  if(cfg.chartType==='combo') return `${renderStatControls(true)}<div class="subtle">${escapeHtml(t('statsComboHint'))}</div><div class="chart-card">${renderComboChart(rows, cfg.barMetric, cfg.lineMetric, 'customStats')}</div>`;
  if(cfg.chartType==='bar') return `${renderStatControls(true)}<div class="chart-card">${renderBarList(rows.map(r=>({label:r.label,value:r[cfg.barMetric]})), 'value', item=>item.label, 'customStats')}</div>`;
  if(cfg.chartType==='line') return `${renderStatControls(true)}<div class="chart-card">${renderComboChart(rows, cfg.lineMetric, cfg.lineMetric, 'customStats')}</div>`;
  return `${renderStatControls(true)}<div class="chart-card donut-card">${renderPieLike(entries, cfg.chartType==='donut', 'customStats')}</div>`;
}
function renderStatsModal(){
  if(!ui.statsModalBody) return;
  ensureThemeSettings();
  const { zoneRank, sourceCounts, growthCounts, phenologyCounts, weekAdded, monthAdded } = computeStats();
  const palette = chartPalette(8);
  const topZones = zoneRank.slice(0, 8);
  document.querySelectorAll('.stats-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === state.statsTab));
  if(state.statsTab === 'overview'){
    const rows = statsCategoryRows(state.settings.statsCustom.category || 'zone');
    const overviewEntries = rows.slice(0,6).map(item => [item.label, Number(item[state.settings.statsCustom.barMetric] || item.count || 0)]);
    ui.statsModalBody.innerHTML = `
      <div class="stats-summary-grid">
        <div class="stat-chip morandi-surface"><span class="stat-label">${escapeHtml(t('statsZones'))}</span><strong>${state.zones.length}</strong></div>
        <div class="stat-chip morandi-surface"><span class="stat-label">${escapeHtml(t('statsPoints'))}</span><strong>${state.points.length}</strong></div>
        <div class="stat-chip morandi-surface"><span class="stat-label">${escapeHtml(t('statsSpecies'))}</span><strong>${overallSpeciesCount()}</strong></div>
        <div class="stat-chip morandi-surface"><span class="stat-label">${escapeHtml(t('statsWeek'))}</span><strong>${weekAdded}</strong></div>
        <div class="stat-chip morandi-surface"><span class="stat-label">${escapeHtml(t('statsMonth'))}</span><strong>${monthAdded}</strong></div>
      </div>
      ${renderStatControls(false)}
      <div class="stats-two-col">
        <div class="chart-card"><h3>${escapeHtml(categoryLabel(state.settings.statsCustom.category || 'zone'))}</h3><p class="subtle">${escapeHtml(t('statsOverviewHint'))}</p>${renderComboChart(rows, state.settings.statsCustom.barMetric, state.settings.statsCustom.lineMetric, 'overviewCombo')}</div>
        <div class="chart-card donut-card"><h3>${escapeHtml(metricLabel(state.settings.statsCustom.barMetric))}</h3>${renderPieLike(overviewEntries, true, 'overviewDonut')}</div>
      </div>`;
      bindStatsAfterRender();
    return;
  }
  if(state.statsTab === 'zone'){
    ui.statsModalBody.innerHTML = `<div class="stats-two-col"><div class="chart-card"><h3>${escapeHtml(t('statsSectionZoneRank'))}</h3>${renderComboChart(topZones.map(item=>({label:zoneDisplayName(item.zone), speciesCount:item.speciesCount, pointCount:item.pointCount, percentage: state.points.length?Number((item.pointCount/state.points.length*100).toFixed(1)):0})), 'speciesCount', 'pointCount', 'zoneRankCombo')}</div><div class="chart-card donut-card"><h3>${escapeHtml(t('statsSectionZoneRank'))}</h3>${renderPieLike(topZones.slice(0,5).map(item=>[zoneDisplayName(item.zone), item.speciesCount]), true, 'zoneRankDonut')}</div></div>`;
    bindStatsAfterRender();
    return;
  }
  if(state.statsTab === 'species'){
    const sourceEntries = sourceCounts.length?sourceCounts:[[t('resultsEmpty'),0]];
    const growthEntries = growthCounts.length?growthCounts:[[t('resultsEmpty'),0]];
    const phenologyEntries = phenologyCounts.length?phenologyCounts:[[t('resultsEmpty'),0]];
    ui.statsModalBody.innerHTML = `
      <div class="stats-three-col">
        <div class="chart-card donut-card"><h3>${escapeHtml(t('statsSectionSource'))}</h3>${renderPieLike(sourceEntries, true, 'sourceDonut')}</div>
        <div class="chart-card donut-card"><h3>${escapeHtml(t('statsSectionGrowth'))}</h3>${renderPieLike(growthEntries, true, 'growthDonut')}</div>
        <div class="chart-card donut-card"><h3>${escapeHtml(t('statsSectionPhenology'))}</h3>${renderPieLike(phenologyEntries, true, 'phenologyDonut')}</div>
      </div>`;
    bindStatsAfterRender();
    return;
  }
  if(state.statsTab === 'time'){
    ui.statsModalBody.innerHTML = `<div class="stats-two-col"><div class="chart-card"><h3>${escapeHtml(t('statsSectionRecent'))}</h3>${renderComboChart([{label:t('statsWeek'), count:weekAdded, percentage: monthAdded?Number((weekAdded/(monthAdded||1)*100).toFixed(1)):0},{label:t('statsMonth'), count:monthAdded, percentage:100}], 'count', 'percentage', 'timeCombo')}</div><div class="chart-card donut-card"><h3>${escapeHtml(t('statsSectionSource'))}</h3>${renderPieLike((sourceCounts.length?sourceCounts:[[t('resultsEmpty'),0]]), false, 'timeSourcePie')}</div></div>`;
    bindStatsAfterRender();
    return;
  }
  ui.statsModalBody.innerHTML = renderCustomChart();
  bindStatsAfterRender();
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
    return `<div class="workspace-bar-row" title="${escapeHtml(item.label)} · ${value}"><span>${escapeHtml(compactLabel(item.label, 12))}</span><i><b style="width:${width}%"></b></i><strong>${value}</strong></div>`;
  }).join('');
  return `<div class="workspace-mini-bars"><strong>${escapeHtml(title)}</strong>${bars}</div>`;
}

function renderWorkspaceStatsSummary() {
  if (!ui.workspaceStatsSummary) return;
  ensureThemeSettings();
  const { zoneRank, growthCounts, phenologyCounts, weekAdded, monthAdded } = computeStats();
  const imageCount = state.points.reduce((sum, point) => sum + (Array.isArray(point.images) ? point.images.length : 0), 0);
  const zoneRows = zoneRank.map(item => ({ label: zoneDisplayName(item.zone), pointCount: item.pointCount, speciesCount: item.speciesCount }));
  const kpis = [
    [t('statsZones'), state.zones.length],
    [t('statsPoints'), state.points.length],
    [t('statsSpecies'), overallSpeciesCount()],
    [t('images'), imageCount],
    [t('statsWeek'), weekAdded],
    [t('statsMonth'), monthAdded]
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
