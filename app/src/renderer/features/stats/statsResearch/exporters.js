(function initStatsResearchExporters(root, factory) {
  const shared = typeof module !== 'undefined' && module.exports
    ? require('./shared')
    : root.StatsResearchShared;
  const builders = typeof module !== 'undefined' && module.exports
    ? require('./builders')
    : root.StatsResearchBuilders;
  const api = factory(shared, builders);
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.StatsResearchExporters = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createStatsResearchExporters(shared, builders) {
  const { MISSING_LABEL, MISSING_SPECIES, UNASSOCIATED_ZONE_ID, UNASSOCIATED_ZONE_LABEL, EXPORT_VERSION, QUALITY_ISSUES, METRIC_DEFINITIONS, FORMULA_NOTES, DATA_SCOPE_NOTES, isBlank, cleanString, toFiniteNumber, roundNumber, percent, normalizeDate, monthKeyFromDate, firstValue, firstText, uniqueValues, formatZoneLabel, resolveZoneLabel, getDisplayZoneName, normalizeZoneForStats, getZoneId, normalizeSpeciesKey, getSpeciesMeta, getAbundanceValue, normalizeImagesArray, getPointImages, copyPhenologyEntry, getPointPhenologyEntries, normalizeTaxonomyStatus, normalizeTaxonomySource, pointNeedsTaxonomyReview, normalizePointForStats, normalizedZonesWithUnassociated, buildZoneAliasMap, groupPointsByZone, buildMatrixModel, heatLevel, formatMetricValue } = shared;
  const { buildZoneSpeciesSets, buildZoneSpeciesCounts, buildProjectSummary, buildZoneSummaries, buildTaxonomicComposition, buildCategoryComposition, buildTaxonomyCompleteness, buildLifeFormComposition, buildOriginComposition, buildCompositionByZone, buildPhenologyStats, buildTimeTrendStats, buildPhenologyMonthMatrix, buildQualityMatrix, buildChartDataFromStats, buildStatistics } = builders;

  function csvEscape(value) {
    if (value === null || value === undefined) return '';
    const text = String(value).replace(/\r?\n/g, ' ');
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function rowsToCsv(headers, rows) {
    const lines = [headers.map(csvEscape).join(',')];
    rows.forEach(row => {
      lines.push(headers.map(header => csvEscape(row[header])).join(','));
    });
    return `\uFEFF${lines.join('\r\n')}`;
  }

  function matrixToCsv(matrix) {
    const header = ['', ...matrix.columns.map(column => column.label)];
    const cellMap = new Map(matrix.cells.map(cell => [`${cell.rowId}::${cell.columnId}`, cell]));
    const lines = [header.map(csvEscape).join(',')];
    matrix.rows.forEach(row => {
      const values = [row.label];
      matrix.columns.forEach(column => {
        const cell = cellMap.get(`${row.id}::${column.id}`);
        values.push(cell ? cell.displayValue : '');
      });
      lines.push(values.map(csvEscape).join(','));
    });
    return `\uFEFF${lines.join('\r\n')}`;
  }

  function matrixToJson(matrix) {
    return JSON.stringify({
      generatedAt: new Date().toISOString(),
      title: matrix.title,
      metric: matrix.metric,
      valueType: matrix.valueType,
      range: matrix.range,
      rows: matrix.rows,
      columns: matrix.columns,
      cells: matrix.cells,
      notes: matrix.notes
    }, null, 2);
  }

  function matrixToMarkdown(matrix) {
    const validValues = matrix.cells.map(cell => cell.value).filter(value => Number.isFinite(value));
    const maxValue = validValues.length ? Math.max(...validValues) : null;
    const minValue = validValues.length ? Math.min(...validValues) : null;
    return [
      `# ${matrix.title}`,
      '',
      `- 指标：${matrix.metric}`,
      `- 类型：${matrix.valueType}`,
      `- 行数：${matrix.rows.length}`,
      `- 列数：${matrix.columns.length}`,
      maxValue === null ? '- 主要结果：暂无有效数值。' : `- 主要结果：最小值 ${formatMetricValue(minValue, 3)}，最大值 ${formatMetricValue(maxValue, 3)}。`,
      '',
      '## 公式与口径',
      ...matrix.notes.map(note => `- ${note}`),
      '',
      '## 局限性',
      '- 大矩阵请以 CSV 或 JSON 附件复核完整单元格数据。',
      '- 热力颜色仅辅助展示，不替代原始记录。'
    ].join('\n');
  }

  function statisticsFullJson(stats) {
    return JSON.stringify(stats, null, 2);
  }

  function statisticsSummaryMarkdown(stats) {
    const summary = stats.projectSummary;
    const topZones = stats.zoneSummaries.slice(0, 8);
    return [
      '# 项目统计摘要',
      '',
      '## 项目总览',
      `- 分区总数：${summary.zoneCount}`,
      `- 点位总数：${summary.pointCount}`,
      `- 有效物种数：${summary.speciesRichness}`,
      `- 科数：${summary.familyRichness}`,
      `- 属数：${summary.genusRichness}`,
      `- 图片完整率：${summary.imageCompleteness}%`,
      `- 物候覆盖率：${summary.phenologyCoverage}%`,
      '',
      '## 分区统计简表',
      '| 分区 | 点位数 | 物种数 | 图片完整率 | 质量评分 |',
      '|---|---:|---:|---:|---:|',
      ...topZones.map(row => `| ${row.label} | ${row.pointCount} | ${row.speciesRichness} | ${row.imageCompleteness}% | ${row.qualityScore} |`),
      '',
      '## 多样性指数简表',
      '| 分区 | 物种丰富度 S | Shannon 多样性 H′ | Simpson 多样性 1-D | Pielou 均匀度 J |',
      '|---|---:|---:|---:|---:|',
      ...topZones.map(row => `| ${row.label} | ${row.diversity.speciesRichness} | ${formatMetricValue(row.diversity.shannon)} | ${formatMetricValue(row.diversity.simpsonDiversity)} | ${formatMetricValue(row.diversity.pielou)} |`),
      '',
      '## 相似性分析摘要',
      '- Jaccard 和 Sørensen 用于比较分区间物种记录集合相似性。',
      `- Whittaker beta：${formatMetricValue(stats.diversityMetrics.whittakerBeta) || 'NA'}`,
      '',
      '## 物候统计摘要',
      `- 物候记录总数：${stats.phenologyStats.totalPhenologyRecords}`,
      `- 有物候记录点位数：${stats.phenologyStats.phenologyPointCount}`,
      '',
      '## 科属完整率摘要',
      `- 科完整率：${stats.taxonomyCompleteness?.familyCompleteness ?? 0}%`,
      `- 属完整率：${stats.taxonomyCompleteness?.genusCompleteness ?? 0}%`,
      `- 自动建议数量：${stats.taxonomyCompleteness?.taxonomySuggestedCount ?? 0}`,
      `- 未核验科属记录：${stats.taxonomyCompleteness?.taxonomyUnverifiedCount ?? 0}`,
      `- 存疑科属记录：${stats.taxonomyCompleteness?.doubtfulTaxonomyCount ?? 0}`,
      '- 科属由第三方物种参考服务自动建议，并需经人工核验后用于正式统计。',
      '',
      '## 数据质量摘要',
      `- 质量评分：${stats.dataQuality.qualityScore}`,
      `- 质量等级：${stats.dataQuality.qualityLevel}`,
      `- 疑似重复点位：${stats.dataQuality.duplicateCandidates.length}`,
      '',
      '## 公式说明',
      ...stats.formulaNotes.map(note => `- ${note}`),
      '',
      '## 数据口径说明',
      ...stats.dataScopeNotes.map(note => `- ${note}`),
      '',
      '## 局限性说明',
      '- 本摘要可用于调研报告或论文初稿的描述性统计支撑，正式研究结论仍需结合采样设计和原始记录复核。'
    ].join('\n');
  }

  function chartRowsToCsv(rows, headers) {
    return rowsToCsv(headers, rows);
  }

  function xmlEscape(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function truncateLabel(label, maxLength = 16) {
    const text = String(label || '');
    return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
  }

  function renderHeatmapSvg(matrix, options = {}) {
    const cellSize = Number(options.cellSize || 36);
    const rowLabelWidth = Number(options.rowLabelWidth || 150);
    const columnLabelHeight = Number(options.columnLabelHeight || 110);
    const padding = Number(options.padding || 22);
    const titleHeight = 44;
    const legendHeight = 54;
    const noteHeight = 60;
    const matrixWidth = Math.max(1, matrix.columns.length) * cellSize;
    const matrixHeight = Math.max(1, matrix.rows.length) * cellSize;
    const width = padding * 2 + rowLabelWidth + matrixWidth;
    const height = padding * 2 + titleHeight + columnLabelHeight + matrixHeight + legendHeight + noteHeight;
    const startX = padding + rowLabelWidth;
    const startY = padding + titleHeight + columnLabelHeight;
    const palettes = {
      warm: ['#fff7ed', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#dc2626'],
      default: ['#f3f6fb', '#d8ecf2', '#add8df', '#79becb', '#459cac', '#167284']
    };
    const colors = palettes[options.palette] || palettes.warm;
    const cellMap = new Map(matrix.cells.map(cell => [`${cell.rowId}::${cell.columnId}`, cell]));
    const columnLabels = matrix.columns.map((column, index) => {
      const x = startX + index * cellSize + cellSize / 2;
      const y = startY - 8;
      return `<g transform="translate(${x},${y}) rotate(-45)"><text text-anchor="start" font-size="11" fill="#4b5563">${xmlEscape(truncateLabel(column.label, 18))}</text></g>`;
    }).join('');
    const rowLabels = matrix.rows.map((row, index) => {
      const x = padding + rowLabelWidth - 8;
      const y = startY + index * cellSize + cellSize / 2 + 4;
      return `<text x="${x}" y="${y}" text-anchor="end" font-size="12" fill="#4b5563">${xmlEscape(truncateLabel(row.label, 18))}</text>`;
    }).join('');
    const cells = matrix.rows.map((row, rowIndex) => matrix.columns.map((column, columnIndex) => {
      const cell = cellMap.get(`${row.id}::${column.id}`);
      const level = heatLevel(cell ? cell.value : null, matrix);
      const fill = level === null ? '#f9fafb' : colors[level];
      const x = startX + columnIndex * cellSize;
      const y = startY + rowIndex * cellSize;
      const display = cell ? cell.displayValue : '';
      const text = display && cellSize >= 34 ? `<text x="${x + cellSize / 2}" y="${y + cellSize / 2 + 4}" text-anchor="middle" font-size="10" fill="#111827">${xmlEscape(display)}</text>` : '';
      return `<g><rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${fill}" stroke="#ffffff" stroke-width="1"></rect>${text}</g>`;
    }).join('')).join('');
    const legendX = padding + rowLabelWidth;
    const legendY = startY + matrixHeight + 22;
    const legend = colors.map((color, index) => {
      const x = legendX + index * 42;
      return `<g><rect x="${x}" y="${legendY}" width="34" height="14" rx="3" fill="${color}"></rect><text x="${x + 17}" y="${legendY + 30}" text-anchor="middle" font-size="10" fill="#4b5563">${index}</text></g>`;
    }).join('');
    const note = matrix.notes[0] || '';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="100%" height="100%" fill="#ffffff"></rect>
  <text x="${padding}" y="${padding + 26}" font-size="20" font-weight="700" fill="#111827">${xmlEscape(matrix.title)}</text>
  ${columnLabels}
  ${rowLabels}
  ${cells}
  <text x="${padding}" y="${legendY + 12}" font-size="12" fill="#4b5563">色阶</text>
  ${legend}
  <text x="${padding}" y="${height - padding - 26}" font-size="12" fill="#4b5563">${xmlEscape(note)}</text>
  <text x="${padding}" y="${height - padding - 8}" font-size="11" fill="#6b7280">矩阵值与 CSV / JSON 导出数据一致。</text>
  </svg>`;
    return svg.replace(/NaN|undefined|null/g, '');
  }

  function buildExportFileName(prefix, ext, date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${prefix}_${y}${m}${d}.${ext}`;
  }

  return {
    rowsToCsv,
    matrixToCsv,
    matrixToJson,
    matrixToMarkdown,
    statisticsFullJson,
    statisticsSummaryMarkdown,
    chartRowsToCsv,
    renderHeatmapSvg,
    buildExportFileName
  };
});
