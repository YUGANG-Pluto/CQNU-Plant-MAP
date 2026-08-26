function testStatisticsChartVisualContract() {
  const statsSource = readAppSources([
    'src/renderer/features/stats/config.js',
    'src/renderer/features/stats/view.js',
    'src/renderer/features/stats/export.js',
    'src/renderer/features/stats/index.js'
  ]);
  const statsResearchSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/features/stats/statsResearch.js'), 'utf8');
  const chartSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/features/stats/charts.js'), 'utf8');
  const statsRegistrySource = readAppSources([
    'src/renderer-modern/features/stats/registry.ts',
    'src/renderer-modern/features/stats/runtime.ts',
    'src/renderer-modern/main.tsx'
  ]);
  const loaderSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/legacy-loader.js'), 'utf8');
  const coreCss = readAppSources([
    'src/renderer/styles/12-research-stats.css',
    'src/renderer/styles/12-research-stats-fullscreen.css',
    'src/renderer/styles/12-research-stats-responsive.css'
  ]);
  const visualCss = fs.readFileSync(path.join(process.cwd(), 'src/renderer-modern/styles/research-charts.css'), 'utf8');
  assert.ok(statsSource.includes('function renderChartCard'), 'statistics cards should use a shared chart-card renderer');
  assert.ok(loaderSource.includes('./src/renderer/features/stats/statsResearch.js'));
  assert.ok(statsSource.includes('window.rendererStatsRegistry'), 'legacy statistics UI must consume the typed registry');
  assert.ok(statsRegistrySource.includes('stats-chart-registry-v1'), 'typed statistics registry must expose a versioned bridge');
  assert.ok(statsRegistrySource.includes('validateStatsChartRegistry'), 'typed statistics registry must validate chart coverage');
  assert.ok(statsRegistrySource.includes('installStatsChartRegistryBridge();'), 'modern renderer must install the statistics registry');
  [
    'normalizePointForStats',
    'calculateDiversityMetrics',
    'calculateJaccardMatrix',
    'calculateSorensenMatrix',
    'calculateBrayCurtisMatrix',
    'buildMatrixModel',
    'renderHeatmapSvg',
    'resolveZoneLabel',
    'formatZoneLabel',
    'getDisplayZoneName'
  ].forEach(fragment => assert.ok(statsResearchSource.includes(fragment), `stats research core missing ${fragment}`));
  [
    'STATS_CHART_GROUPS',
    'STATS_RECOMMENDED_CHARTS',
    'stats-heatmap-table',
    'data-stats-export',
    'data-stats-chart-toggle',
    'data-stats-chart-action',
    'data-stats-fullscreen',
    'statsFullscreenLayer',
    'document.body.appendChild(layer)',
    'zoneDisplayFromRow',
    'formatZoneDisplayName',
    'zoneChartRow',
    'metricAxisLabel',
    'metricDecimals',
    'rowsToLabeledCsv',
    'Escape',
    'statsViewState',
    'renderHeatmapMatrix',
    'matrixToCsv',
    'matrixToMarkdown',
    'renderHeatmapSvg'
  ].forEach(fragment => assert.ok(statsSource.includes(fragment) || statsResearchSource.includes(fragment), `research stats UI missing ${fragment}`));
  assert.ok(chartSource.includes('chart-bar-depth'));
  assert.ok(chartSource.includes('chartMetricLabel'), 'charts should use explicit metric labels for legends and tooltips');
  assert.ok(chartSource.includes('chartAxisLabel'), 'combo charts should label each y axis by metric semantics');
  assert.ok(chartSource.includes('axisLabels'), 'combo charts should render y-axis semantic labels');
  assert.ok(chartSource.includes('pathLength="1"'), 'line charts should expose a stable path length for draw animation');
  assert.ok(chartSource.includes('--chart-delay:'), 'chart marks should expose bounded stagger timing');
  assert.ok(chartSource.includes('chart-empty-state'));
  assert.ok(chartSource.includes('donutSvgFromCounts(entries, palette, settings, donut = true, chartKey = \'donut\')'));
  assert.ok(chartSource.includes('arcSlicePath(center, innerRadius, outerRadius, startAngle, endAngle)'));
  assert.ok(chartSource.includes('donut-svg-pie'));
  assert.ok(visualCss.includes('.chart-bar-depth'));
  assert.ok(visualCss.includes('.donut-center-plate'));
  assert.ok(visualCss.includes('.motion-disabled :where('));
  assert.ok(visualCss.includes('.chart-bar-group,'));
  ['researchBarGrow', 'researchLineDraw', 'researchAreaReveal', 'researchDonutIn', 'researchRowIn'].forEach(keyframe => {
    assert.ok(visualCss.includes(`@keyframes ${keyframe}`), `${keyframe} must stay available to normal and fullscreen charts`);
  });
  assert.ok(visualCss.includes(':where(#statsModal:not(.hidden), .stats-fullscreen-layer)'));
  assert.ok(!visualCss.includes('transform: scale(1.018)'), 'donut hover must not move its own hit target');
  assert.ok(!visualCss.includes('.motion-hover .donut-slice:hover {\n  filter:'), 'donut hover must not use per-slice hover filters');
  [
    '#statsModal .stats-control-card',
    '#statsModal .stats-chart-head',
    '#statsModal .stats-chart-caption',
    '.chart-scroll-area::-webkit-scrollbar',
    '.chart-empty-state',
    '.chart-value'
  ].forEach(selector => assert.ok(visualCss.includes(selector), `${selector} must stay in the final visual layer`));
  [
    '.stats-heatmap-table',
    '.stats-heatmap-scroll',
    '.stats-heatmap-cell',
    '.heat-level-5',
    '.stats-center-layout',
    '.stats-chart-grid',
    '.stats-card-grid',
    '.stats-fullscreen-layer',
    '.stats-text-cell',
    '.heat-palette-warm',
    '.heat-palette-default',
    '.stats-export-grid',
    '.stats-notes-list'
  ].forEach(selector => assert.ok(coreCss.includes(selector), `${selector} must support research stats UI`));
  assert.ok(coreCss.includes('z-index: var(--z-fullscreen, 30000)'), 'statistics fullscreen overlay must use the top-level fullscreen tier');
  assert.ok(coreCss.includes('z-index: 1'), 'statistics fullscreen dialog must stay above its overlay backdrop');
  ['zh.js', 'en.js'].forEach(name => {
    const source = readLocaleSource(name);
    [
      'statsChartDisplayControl',
      'statsChartGroupOverview',
      'statsChartGroupSimilarity',
      'statsChartRecommended',
      'statsChartHideAll',
      'statsFullscreen',
      'statsHeatPaletteWarm',
      'statsHeatPaletteDefault',
      'statsExportProjectSummary',
      'statsExportZoneStats',
      'statsExportJaccard',
      'statsExportMarkdownSummary',
      'statsExportHeatmapSvg',
      'statsMetricShannon',
      'statsMetricSimpsonDiversity',
      'statsMetricPielou',
      'statsMetricHillQ0',
      'statsMetricHillQ1',
      'statsMetricHillQ2',
      'statsAxisMetricValue',
      'statsAxisEffectiveSpecies',
      'statsColumnSpeciesKey'
    ].forEach(key => assert.ok(source.includes(key), `${name} missing ${key}`));
  });
  assert.ok(!statsSource.includes("label: zoneDisplayText(row.label)"), 'zone chart rows must reuse the shared zone display helper');
  assert.ok(!statsSource.includes("engine.rowsToCsv(headers, rows)"), 'diversity CSV export must not expose internal metric keys');
}

function assertClose(actual, expected, tolerance, message) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: expected ${expected}, got ${actual}`);
}

function testResearchStatsFormulaContract() {
  const diversity = statsResearch.calculateDiversityMetrics({ A: 5, B: 5 });
  assertClose(diversity.shannon, 0.693147, 0.00001, 'Shannon must match expected value');
  assert.strictEqual(diversity.simpsonDominance, 0.5);
  assert.strictEqual(diversity.simpsonDiversity, 0.5);
  assertClose(diversity.pielou, 1, 0.00001, 'Pielou must match expected value');
  assertClose(diversity.margalef, 1 / Math.log(10), 0.00001, 'Margalef must match expected value');
  assertClose(diversity.menhinick, 2 / Math.sqrt(10), 0.00001, 'Menhinick must match expected value');
  assert.strictEqual(statsResearch.calculateDiversityMetrics({ A: 7, B: 3 }).bergerParker, 0.7);
  const hill = statsResearch.calculateHillNumbers({ A: 5, B: 5 });
  assert.strictEqual(hill.q0, 2);
  assertClose(hill.q1, 2, 0.00001, 'Hill q1 must match expected value');
  assert.strictEqual(hill.q2, 2);

  const sets = {
    A: new Set(['a', 'b', 'c']),
    B: new Set(['b', 'c', 'd'])
  };
  const jaccard = statsResearch.calculateJaccardMatrix(sets);
  const sorensen = statsResearch.calculateSorensenMatrix(sets);
  assert.strictEqual(jaccard.cells.find(cell => cell.rowId === 'A' && cell.columnId === 'B').value, 0.5);
  assertClose(sorensen.cells.find(cell => cell.rowId === 'A' && cell.columnId === 'B').value, 0.666667, 0.000001, 'Sorensen must match expected value');

  const bray = statsResearch.calculateBrayCurtisMatrix({
    A: new Map([['a', 5], ['b', 5]]),
    B: new Map([['a', 5], ['b', 0]])
  });
  assertClose(bray.cells.find(cell => cell.rowId === 'A' && cell.columnId === 'B').value, 0.333333, 0.000001, 'Bray-Curtis must match expected value');

  const twoByTwo = statsResearch.calculateJaccardMatrix({
    'Zone A': new Set(['a', 'b']),
    'Zone B': new Set(['b', 'c'])
  });
  assertClose(twoByTwo.cells.find(cell => cell.rowId === 'Zone A' && cell.columnId === 'Zone B').value, 1 / 3, 0.001, 'Jaccard 2x2 must match expected value');
  assert.strictEqual(twoByTwo.cells.find(cell => cell.rowId === 'Zone A' && cell.columnId === 'Zone A').value, 1);
  assert.strictEqual(statsResearch.calculateJaccardMatrix({ A: new Set(), B: new Set() }).cells.find(cell => cell.rowId === 'A' && cell.columnId === 'B').value, null);
  assert.strictEqual(statsResearch.calculateJaccardMatrix({ A: new Set(['a']), B: new Set() }).cells.find(cell => cell.rowId === 'A' && cell.columnId === 'B').value, 0);

  const countMatrix = statsResearch.buildMatrixModel({
    rows: [{ id: 'r', label: 'R' }],
    columns: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }],
    cells: [
      { rowId: 'r', columnId: 'a', value: 0 },
      { rowId: 'r', columnId: 'b', value: 5 },
      { rowId: 'r', columnId: 'c', value: 10 }
    ],
    valueType: 'count'
  });
  assert.strictEqual(statsResearch.heatLevel(0, countMatrix), 0);
  assert.ok(statsResearch.heatLevel(5, countMatrix) >= 2);
  assert.strictEqual(statsResearch.heatLevel(10, countMatrix), 5);
  assert.strictEqual(statsResearch.resolveZoneLabel('z1', [{ id: 'z1', name: 'Main Zone' }]), 'Main Zone');
  assert.strictEqual(statsResearch.formatZoneLabel('N/A', { language: 'en' }), 'Unassigned zone');
  assert.notStrictEqual(statsResearch.resolveZoneLabel('missing-zone', [], { language: 'en' }), 'N/A');

  const zones = [{ id: 'z1', zoneId: 'Z1', name: 'Zone 1' }, { id: 'z2', zoneId: 'Z2', name: 'Zone 2' }];
  const points = [
    { id: 'p1', pointId: 'P1', zoneRef: 'z1', lat: 29, lng: 106, plantNameSci: 'A', plantNameCn: '甲', family: 'F', genus: 'G', images: ['information/images/a.jpg'], phenologyEntries: [{ id: 'e1', floweringState: '开花', surveyDate: '2026-04-01' }] },
    { id: 'p2', pointId: 'P2', zoneRef: 'z1', lat: 29.000001, lng: 106.000001, plantNameSci: 'A', plantNameCn: '甲', phenologyEntries: [] },
    { id: 'p3', pointId: 'P3', zoneRef: 'z2', lat: '', lng: '', plantNameCn: '', phenologyEntries: [] }
  ];
  const original = JSON.stringify({ zones, points });
  const built = statsResearch.buildStatistics(zones, points);
  assert.strictEqual(JSON.stringify({ zones, points }), original, 'statistics functions must not mutate input data');
  assert.strictEqual(built.projectSummary.zoneCount, 2);
  assert.strictEqual(built.zoneSummaries.length, 2);
  assert.ok(built.dataQuality.issues.missingScientificName >= 1);
  assert.ok(built.dataQuality.issues.missingCoordinate >= 1);
  assert.ok(built.dataQuality.duplicateCandidates.length >= 1);
  assert.ok(built.taxonomyCompleteness.familyCompleteness > 0);
  assert.ok(Array.isArray(built.taxonomySourceSummary));
  assert.ok(Array.isArray(built.taxonomyVerificationSummary));
  assert.ok(built.heatmapMatrices.jaccard.cells.length > 0);

  const csv = statsResearch.matrixToCsv(built.heatmapMatrices.jaccard);
  assert.ok(csv.charCodeAt(0) === 0xFEFF, 'CSV export must include UTF-8 BOM');
  const json = JSON.parse(statsResearch.statisticsFullJson(built));
  assert.ok(json.generatedAt);
  assert.ok(json.metricDefinitions.length);
  assert.ok(json.formulaNotes.length);
  assert.ok(json.taxonomyCompleteness);
  assert.ok(json.familyComposition);
  assert.ok(json.genusComposition);
  const svg = statsResearch.renderHeatmapSvg(built.heatmapMatrices.jaccard);
  assert.ok(svg.includes('<svg'));
  assert.ok(svg.includes('<rect'));
  assert.ok(!/(href|src)=["']https?:\/\//.test(svg), 'SVG must not reference external resources');
  assert.ok(!/NaN|undefined|null/.test(svg), 'SVG must not contain invalid display strings');
  const warmSvg = statsResearch.renderHeatmapSvg(built.heatmapMatrices.jaccard, { palette: 'warm' });
  const defaultSvg = statsResearch.renderHeatmapSvg(built.heatmapMatrices.jaccard, { palette: 'default' });
  assert.ok(warmSvg.includes('#dc2626'), 'warm heatmap SVG must use orange-red palette');
  assert.ok(defaultSvg.includes('#167284'), 'default heatmap SVG must keep the legacy palette');
}

function testReducedInnerHtmlSurface() {
  const querySource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/features/query/index.js'), 'utf8');
  const recycleSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/features/recycleBin/index.js'), 'utf8');
  const maintenanceSource = readMaintenanceRuntimeSource();
  assert.ok(!querySource.includes('innerHTML'));
  assert.ok(!recycleSource.includes('innerHTML'));
  assert.ok(!maintenanceSource.includes('innerHTML'));
}
