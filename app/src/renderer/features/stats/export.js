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
    familyCompleteness: ['statsMetricFamilyCompleteness', 'Family completeness (%)'],
    genusCompleteness: ['statsMetricGenusCompleteness', 'Genus completeness (%)'],
    taxonomySuggestedCount: ['statsMetricTaxonomySuggested', 'Automatic suggestions'],
    taxonomyUnverifiedCount: ['statsMetricTaxonomyUnverified', 'Unverified taxonomy records'],
    manuallyVerifiedCount: ['statsMetricTaxonomyVerified', 'Manually verified records'],
    doubtfulTaxonomyCount: ['statsMetricTaxonomyDoubtful', 'Doubtful taxonomy records'],
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

function taxonomyReviewWarning(point) {
  const warnings = [];
  if (!String(point.family || '').trim()) warnings.push('missingFamily');
  if (!String(point.genus || '').trim()) warnings.push('missingGenus');
  if (['suggested', 'unverified'].includes(point.taxonomyVerificationStatus || 'unverified')) warnings.push('needsVerification');
  if (point.taxonomyVerificationStatus === 'doubtful') warnings.push('doubtful');
  return warnings.join('; ');
}

function taxonomyCompletionRows() {
  return (state.points || []).map(point => {
    const zoneId = point.zoneId || point.zoneRef || point.zone || '';
    const family = String(point.family || '').trim();
    const genus = String(point.genus || '').trim();
    const status = point.taxonomyVerificationStatus || 'unverified';
    return {
      pointId: point.pointId || point.id || '',
      zoneId,
      zoneName: formatZoneDisplayName({ zoneId, zoneRef: point.zoneRef, zoneName: point.zoneName }),
      chineseName: point.plantNameCn || point.chineseName || '',
      scientificName: point.plantNameSci || point.scientificName || '',
      family,
      genus,
      taxonomySource: point.taxonomySource || 'unknown',
      taxonomyMatchedName: point.taxonomyMatchedName || '',
      taxonomyConfidence: Number.isFinite(Number(point.taxonomyConfidence)) ? Number(point.taxonomyConfidence) : '',
      taxonomyConfidenceLabel: point.taxonomyConfidenceLabel || 'unknown',
      taxonomyVerificationStatus: status,
      taxonomyUpdatedAt: point.taxonomyUpdatedAt || '',
      hasFamily: family ? 'true' : 'false',
      hasGenus: genus ? 'true' : 'false',
      needsReview: status === 'manuallyVerified' ? 'false' : 'true',
      candidateCount: Array.isArray(point.taxonomyCandidatesSummary) ? point.taxonomyCandidatesSummary.length : 0,
      warning: taxonomyReviewWarning({ ...point, family, genus, taxonomyVerificationStatus: status })
    };
  });
}

function taxonomyCandidateRows() {
  return (state.points || []).flatMap(point => {
    const candidates = Array.isArray(point.taxonomyCandidatesSummary) ? point.taxonomyCandidatesSummary : [];
    const queryName = point.plantNameSci || point.plantNameCn || point.scientificName || point.chineseName || '';
    return candidates.map(candidate => ({
      pointId: point.pointId || point.id || '',
      queryName,
      provider: candidate.provider || '',
      matchedName: candidate.matchedName || '',
      scientificName: candidate.scientificName || '',
      canonicalName: candidate.canonicalName || '',
      family: candidate.family || '',
      genus: candidate.genus || '',
      rank: candidate.rank || '',
      score: Number.isFinite(Number(candidate.score)) ? Number(candidate.score) : '',
      matchType: candidate.matchType || '',
      occurrenceWeight: Number.isFinite(Number(candidate.occurrenceWeight)) ? Number(candidate.occurrenceWeight) : '',
      selected: (candidate.family && candidate.family === point.family) || (candidate.genus && candidate.genus === point.genus) ? 'true' : 'false'
    }));
  });
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
  if (key === 'taxonomy_completion_report') {
    const headers = [
      'pointId',
      'zoneId',
      'zoneName',
      'chineseName',
      'scientificName',
      'family',
      'genus',
      'taxonomySource',
      'taxonomyMatchedName',
      'taxonomyConfidence',
      'taxonomyConfidenceLabel',
      'taxonomyVerificationStatus',
      'taxonomyUpdatedAt',
      'hasFamily',
      'hasGenus',
      'needsReview',
      'candidateCount',
      'warning'
    ];
    return {
      defaultPath: engine.buildExportFileName('taxonomy_completion_report', 'csv'),
      content: engine.rowsToCsv(headers, taxonomyCompletionRows())
    };
  }
  if (key === 'taxonomy_candidates') {
    const headers = [
      'pointId',
      'queryName',
      'provider',
      'matchedName',
      'scientificName',
      'canonicalName',
      'family',
      'genus',
      'rank',
      'score',
      'matchType',
      'occurrenceWeight',
      'selected'
    ];
    return {
      defaultPath: engine.buildExportFileName('taxonomy_candidates', 'csv'),
      content: engine.rowsToCsv(headers, taxonomyCandidateRows())
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
      api = window.platformAdapter.project.exportCsv;
    } else if (ext === 'json') {
      payload = { title: statsUi('statsExportHeatmapJsonTitle', 'Export heatmap JSON'), defaultPath: engine.buildExportFileName(`heatmap_${metric}`, 'json'), content: engine.matrixToJson(matrix) };
      api = window.platformAdapter.settings.exportJson;
    } else if (ext === 'md') {
      payload = { defaultPath: engine.buildExportFileName(`heatmap_${metric}`, 'md'), content: engine.matrixToMarkdown(matrix) };
      api = window.platformAdapter.project.exportMarkdown;
    } else {
      payload = { defaultPath: engine.buildExportFileName(`heatmap_${metric}`, 'svg'), content: engine.renderHeatmapSvg(matrix, { palette: statsViewState.heatPalette }) };
      api = window.platformAdapter.project.exportSvg;
    }
  } else if (key === 'statistics_full') {
    payload = { title: statsUi('statsExportFullJsonTitle', 'Export statistics JSON'), defaultPath: engine.buildExportFileName('statistics_full', 'json'), content: engine.statisticsFullJson(stats) };
      api = window.platformAdapter.settings.exportJson;
  } else if (key === 'statistics_summary') {
    payload = { defaultPath: engine.buildExportFileName('statistics_summary', 'md'), content: engine.statisticsSummaryMarkdown(stats) };
      api = window.platformAdapter.project.exportMarkdown;
  } else if (key === 'zone_jaccard_matrix') {
    payload = { defaultPath: engine.buildExportFileName('zone_jaccard_matrix', 'csv'), content: engine.matrixToCsv(stats.heatmapMatrices.jaccard) };
      api = window.platformAdapter.project.exportCsv;
  } else if (key === 'zone_sorensen_matrix') {
    payload = { defaultPath: engine.buildExportFileName('zone_sorensen_matrix', 'csv'), content: engine.matrixToCsv(stats.heatmapMatrices.sorensen) };
      api = window.platformAdapter.project.exportCsv;
  } else if (key === 'zone_bray_curtis_matrix') {
    payload = { defaultPath: engine.buildExportFileName('zone_bray_curtis_matrix', 'csv'), content: engine.matrixToCsv(stats.heatmapMatrices.brayCurtis) };
      api = window.platformAdapter.project.exportCsv;
  } else {
    payload = exportRowsForKey(stats, key);
      api = window.platformAdapter.project.exportCsv;
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
  if (!statsViewState.fullscreenBound) {
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeStatsFullscreen();
    });
    statsViewState.fullscreenBound = true;
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
