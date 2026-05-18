function getChartUiSettings() {
  return {
    scale: 1,
    height: 380,
    widthStrategy: 'scroll',
    density: 'standard',
    paddingMode: 'standard',
    labelStrategy: 'auto',
    labelSize: 12,
    nodeSize: 4,
    lineWidth: 2.4,
    barDensity: 0.72,
    chartDepth: 36,
    lineTension: 0.42
  };
}

function clampChartNumber(value, min, max) {
  const num = Number(value);
  if (!Number.isFinite(num)) return min;
  return Math.min(max, Math.max(min, num));
}

function getDensityMultiplier(mode) {
  if (mode === 'compact') return 0.86;
  if (mode === 'display') return 1.18;
  return 1;
}

function getPaddingByMode(mode) {
  if (mode === 'compact') return { left: 62, right: 56, top: 24, bottomBase: 86 };
  if (mode === 'loose') return { left: 86, right: 78, top: 38, bottomBase: 126 };
  return { left: 76, right: 68, top: 30, bottomBase: 104 };
}

function getChartDimensions(rows, options = {}) {
  const settings = getChartUiSettings(options.chartKey);
  const scale = clampChartNumber(settings.scale, 0.8, 1.4);
  const labels = rows.map(row => String(row.label || ''));
  const longest = labels.reduce((max, label) => Math.max(max, label.length), 0);
  const density = getDensityMultiplier(settings.density);
  const baseColumn = options.baseColumn || 126;
  const labelFactor = options.labelFactor || 11;
  const perColumn = Math.max(86, Math.min(230, (baseColumn + longest * labelFactor) / density));
  const minWidth = settings.widthStrategy === 'fit' ? 760 : 920;
  const wideFactor = settings.widthStrategy === 'wide' ? 1.18 : 1;
  const width = Math.ceil(Math.max(minWidth, rows.length * perColumn * wideFactor + 180) * scale);
  const height = Math.ceil(clampChartNumber(settings.height, 240, 680) * scale);
  const paddingBase = getPaddingByMode(settings.paddingMode);
  const bottom = Math.max(paddingBase.bottomBase, 64 + longest * 6);

  return {
    width,
    height,
    scale,
    padding: {
      left: Math.round(paddingBase.left * scale),
      right: Math.round(paddingBase.right * scale),
      top: Math.round(paddingBase.top * scale),
      bottom: Math.round(bottom * scale)
    },
    labelSize: settings.labelSize,
    nodeSize: settings.nodeSize,
    lineWidth: settings.lineWidth,
    barDensity: settings.barDensity,
    chartDepth: settings.chartDepth,
    lineTension: settings.lineTension,
    labelStrategy: settings.labelStrategy || 'auto'
  };
}
function getPlotArea(dimensions) {
  const { width, height, padding } = dimensions;
  return {
    width: width - padding.left - padding.right,
    height: height - padding.top - padding.bottom,
    x0: padding.left,
    y0: padding.top,
    x1: width - padding.right,
    y1: height - padding.bottom
  };
}

function getCategoryLayout(index, count, plot, barDensity) {
  const bandWidth = plot.width / Math.max(1, count);
  const centerX = plot.x0 + bandWidth * index + bandWidth / 2;
  const barWidth = Math.max(14, Math.min(72, bandWidth * clampChartNumber(barDensity, 0.45, 1)));
  return { bandWidth, centerX, barWidth, barX: centerX - barWidth / 2 };
}

function scaleY(value, top, plot) {
  return plot.y1 - (Number(value || 0) / Math.max(1, top)) * plot.height;
}

function chartPalette(count = 6) {
  const base = ['chartA', 'chartB', 'chartC', 'chartD'].map(getThemeColor);
  if (count <= base.length) return base.slice(0, Math.max(1, count));
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const left = base[i % base.length];
    const right = base[(i + 1) % base.length];
    const lh = hexToHsl(left);
    const rh = hexToHsl(right);
    const frac = (i % base.length) / Math.max(1, base.length - 1);
    out.push(hslToHex(
      Math.round(lh.h + (rh.h - lh.h) * frac),
      Math.round(lh.s + (rh.s - lh.s) * frac),
      Math.round(lh.l + (rh.l - lh.l) * frac)
    ));
  }
  return out;
}

function niceTicks(maxValue, count = 5) {
  const max = Number(maxValue || 0);
  if (!Number.isFinite(max) || max <= 0) return [0, 1, 2, 3, 4, 5];
  const rough = max / Math.max(1, count);
  const mag = Math.pow(10, Math.floor(Math.log10(rough || 1)));
  const norm = rough / mag;
  let step = 1;
  if (norm > 5) step = 10;
  else if (norm > 2) step = 5;
  else if (norm > 1) step = 2;
  step *= mag;
  const top = Math.ceil(max / step) * step;
  const ticks = [];
  for (let value = 0; value <= top + step * 0.001; value += step) {
    ticks.push(Number(value.toFixed(6)));
  }
  return ticks;
}

function renderScrollableChart(innerHtml, contentWidth, contentHeight, extraClass = '', chartKey = '', scale = 1) {
  const width = Math.ceil(contentWidth);
  const height = Math.ceil(contentHeight);
  const safeScale = Math.max(0.1, Number(scale) || 1);
  const logicalWidth = Math.ceil(width / safeScale);
  const logicalHeight = Math.ceil(height / safeScale);
  return `<div class="chart-scroll-wrap ${extraClass}" data-chart-visual="${escapeHtml(chartKey)}"><div class="chart-scroll-hint">拖动滚动条可查看完整图表</div><div class="chart-scroll-area"><div class="chart-scroll-inner" data-chart-logical-width="${logicalWidth}" data-chart-logical-height="${logicalHeight}" style="width:${width}px;min-width:${width}px;min-height:${height}px">${innerHtml}</div></div></div>`;
}

function smoothLinePath(points, tension = 0.42) {
  if (!points.length) return '';
  if (points.length === 1) return `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  let path = `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  for (let index = 1; index < points.length; index += 1) {
    const prev = points[index - 1];
    const curr = points[index];
    const distanceX = curr.x - prev.x;
    const controlOffset = distanceX * clampChartNumber(tension, 0.12, 0.5);
    path += ` C${(prev.x + controlOffset).toFixed(1)},${prev.y.toFixed(1)} ${(curr.x - controlOffset).toFixed(1)},${curr.y.toFixed(1)} ${curr.x.toFixed(1)},${curr.y.toFixed(1)}`;
  }
  return path;
}

function renderGridAndTicks(ticks, top, plot, padding, width, side = 'left', labelSize = 12) {
  return ticks.map(value => {
    const y = scaleY(value, top, plot);
    const fontStyle = `style="font-size:${labelSize}px"`;
    if (side === 'right') {
      return `<g><line x1="${plot.x1.toFixed(1)}" y1="${y.toFixed(1)}" x2="${(plot.x1 + 6).toFixed(1)}" y2="${y.toFixed(1)}" class="chart-axis-tick"></line><text x="${(plot.x1 + 10).toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="start" class="axis-tick-label" ${fontStyle}>${escapeHtml(value)}</text></g>`;
    }
    return `<g><line x1="${padding.left}" y1="${y.toFixed(1)}" x2="${width - padding.right}" y2="${y.toFixed(1)}" class="chart-grid"></line><line x1="${(padding.left - 6).toFixed(1)}" y1="${y.toFixed(1)}" x2="${padding.left}" y2="${y.toFixed(1)}" class="chart-axis-tick"></line><text x="${(padding.left - 10).toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="end" class="axis-tick-label" ${fontStyle}>${escapeHtml(value)}</text></g>`;
  }).join('');
}

function renderCategoryLabel(label, centerX, y, labelSize) {
  return `<g transform="translate(${centerX.toFixed(1)},${y.toFixed(1)}) rotate(-32)"><text text-anchor="end" class="axis-label axis-label-long" style="font-size:${labelSize}px">${escapeHtml(String(label))}</text></g>`;
}

function estimateLabelBox(text, x, y, labelSize) {
  const width = String(text).length * labelSize * 0.62 + 10;
  const height = labelSize + 6;
  return { left: x - width / 2, right: x + width / 2, top: y - height, bottom: y + 2 };
}

function labelBoxesOverlap(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function formatChartValue(value, decimals = 0) {
  const number = Number(value || 0);
  return Number.isInteger(number) || decimals === 0 ? number.toFixed(0) : number.toFixed(decimals);
}

function svgTitle(seriesName, categoryLabel, value) {
  return `<title>${escapeHtml(seriesName)} · ${escapeHtml(categoryLabel)}：${escapeHtml(value)}</title>`;
}

function sanitizeSvgId(value) {
  return String(value || 'chart')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'chart';
}

function polarPoint(center, radius, angle) {
  const rad = angle * Math.PI / 180;
  return {
    x: center + radius * Math.cos(rad),
    y: center + radius * Math.sin(rad)
  };
}

function formatPoint(point) {
  return `${point.x.toFixed(2)},${point.y.toFixed(2)}`;
}

function fullRingPath(center, outerRadius, innerRadius) {
  const topOuter = { x: center, y: center - outerRadius };
  const bottomOuter = { x: center, y: center + outerRadius };
  const topInner = { x: center, y: center - innerRadius };
  const bottomInner = { x: center, y: center + innerRadius };
  return [
    `M ${formatPoint(topOuter)}`,
    `A ${outerRadius.toFixed(2)} ${outerRadius.toFixed(2)} 0 1 1 ${formatPoint(bottomOuter)}`,
    `A ${outerRadius.toFixed(2)} ${outerRadius.toFixed(2)} 0 1 1 ${formatPoint(topOuter)}`,
    `M ${formatPoint(topInner)}`,
    `A ${innerRadius.toFixed(2)} ${innerRadius.toFixed(2)} 0 1 0 ${formatPoint(bottomInner)}`,
    `A ${innerRadius.toFixed(2)} ${innerRadius.toFixed(2)} 0 1 0 ${formatPoint(topInner)}`,
    'Z'
  ].join(' ');
}

function arcSlicePath(center, innerRadius, outerRadius, startAngle, endAngle) {
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  const outerStart = polarPoint(center, outerRadius, startAngle);
  const outerEnd = polarPoint(center, outerRadius, endAngle);
  if (innerRadius <= 0) {
    return [
      `M ${center.toFixed(2)},${center.toFixed(2)}`,
      `L ${formatPoint(outerStart)}`,
      `A ${outerRadius.toFixed(2)} ${outerRadius.toFixed(2)} 0 ${largeArc} 1 ${formatPoint(outerEnd)}`,
      'Z'
    ].join(' ');
  }
  const innerStart = polarPoint(center, innerRadius, startAngle);
  const innerEnd = polarPoint(center, innerRadius, endAngle);
  return [
    `M ${formatPoint(outerStart)}`,
    `A ${outerRadius.toFixed(2)} ${outerRadius.toFixed(2)} 0 ${largeArc} 1 ${formatPoint(outerEnd)}`,
    `L ${formatPoint(innerEnd)}`,
    `A ${innerRadius.toFixed(2)} ${innerRadius.toFixed(2)} 0 ${largeArc} 0 ${formatPoint(innerStart)}`,
    'Z'
  ].join(' ');
}

function resolveComboLabelState(item, dimensions) {
  const barText = formatChartValue(item.barValue, 0);
  const lineText = item.barMetric === item.lineMetric ? barText : formatChartValue(item.lineValue, 1);
  const barY = Math.max(dimensions.padding.top + 14, item.barY - 8);
  const lineY = Math.max(dimensions.padding.top + 14, item.lineY - dimensions.nodeSize - 8);
  const overlap = labelBoxesOverlap(
    estimateLabelBox(barText, item.centerX, barY, dimensions.labelSize),
    estimateLabelBox(lineText, item.centerX, lineY, dimensions.labelSize)
  );
  if (dimensions.labelStrategy === 'hover') return { barText, lineText, barY, lineY, mode: 'deferred' };
  if (dimensions.labelStrategy === 'key-values' && !item.isKeyValue) return { barText, lineText, barY, lineY, mode: 'hidden' };
  if (!overlap || dimensions.labelStrategy === 'always') return { barText, lineText, barY, lineY, mode: 'both' };
  if (barText === lineText || dimensions.labelStrategy === 'merge-same') {
    return { barText, lineText, barY: Math.min(barY, lineY), lineY, mode: 'merged' };
  }
  return { barText, lineText, barY, lineY, mode: dimensions.labelStrategy === 'hide-conflict' ? 'hidden' : 'deferred' };
}

function chartGradientDefs(palette) {
  return `<defs>${palette.map((color, index) => `
    <linearGradient id="barGrad${index}" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="${withLightness(color, 8)}"></stop>
      <stop offset="100%" stop-color="${color}"></stop>
    </linearGradient>
  `).join('')}
  <linearGradient id="barGloss" x1="0" x2="0" y1="0" y2="1">
    <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.36"></stop>
    <stop offset="44%" stop-color="#FFFFFF" stop-opacity="0.08"></stop>
    <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"></stop>
  </linearGradient>
  <linearGradient id="lineAreaGrad" x1="0" x2="0" y1="0" y2="1">
    <stop offset="0%" stop-color="var(--theme-accent-ui)" stop-opacity="0.22"></stop>
    <stop offset="100%" stop-color="var(--theme-accent-ui)" stop-opacity="0"></stop>
  </linearGradient>
  <filter id="chartSoftShadow" x="-20%" y="-20%" width="140%" height="150%">
    <feDropShadow dx="0" dy="7" stdDeviation="4" flood-color="#1F2937" flood-opacity="0.13"></feDropShadow>
  </filter></defs>`;
}

function renderBarList(items, valueKey, labelBuilder, chartKey = 'barList') {
  if (!items.length) return `<div class="chart-empty-state"><span>${escapeHtml(t('resultsEmpty'))}</span></div>`;
  const rows = items.map(item => ({ label: labelBuilder(item), value: Number(item[valueKey] || 0) }));
  const dimensions = getChartDimensions(rows, { baseColumn: 116, labelFactor: 9, chartKey });
  const plot = getPlotArea(dimensions);
  const max = Math.max(1, ...rows.map(item => item.value));
  const ticks = niceTicks(max, 5);
  const top = Math.max(...ticks);
  const palette = chartPalette(rows.length);
  let bars = '';
  let labels = '';
  let axes = '';
  const grid = renderGridAndTicks(ticks, top, plot, dimensions.padding, dimensions.width, 'left', dimensions.labelSize);
  rows.forEach((row, index) => {
    const layout = getCategoryLayout(index, rows.length, plot, dimensions.barDensity);
    const barHeight = plot.height * (row.value / top);
    const y = plot.y1 - barHeight;
    const valueY = Math.max(dimensions.padding.top + 14, y - 8);
    const label = dimensions.labelStrategy === 'hover' ? '' : `<text x="${layout.centerX.toFixed(1)}" y="${valueY.toFixed(1)}" text-anchor="middle" class="chart-value" style="font-size:${dimensions.labelSize}px">${escapeHtml(row.value)}</text>`;
    bars += `<g class="chart-bar-group" style="--chart-index:${index};"><rect class="chart-bar-depth" x="${(layout.barX + 4).toFixed(1)}" y="${(y + 7).toFixed(1)}" width="${layout.barWidth.toFixed(1)}" height="${Math.max(0, barHeight - 2).toFixed(1)}" rx="10"></rect><rect class="chart-bar-rect" data-center-x="${layout.centerX.toFixed(1)}" data-band-width="${layout.bandWidth.toFixed(1)}" x="${layout.barX.toFixed(1)}" y="${y.toFixed(1)}" width="${layout.barWidth.toFixed(1)}" height="${barHeight.toFixed(1)}" rx="10" fill="url(#barGrad${index % palette.length})">${svgTitle(t('statsMetricCount'), row.label, row.value)}</rect><rect class="chart-bar-highlight" data-center-x="${layout.centerX.toFixed(1)}" data-band-width="${layout.bandWidth.toFixed(1)}" x="${layout.barX.toFixed(1)}" y="${y.toFixed(1)}" width="${layout.barWidth.toFixed(1)}" height="${Math.min(14, Math.max(0, barHeight)).toFixed(1)}" rx="10" fill="url(#barGloss)"></rect>${label}</g>`;
    labels += renderCategoryLabel(row.label, layout.centerX, dimensions.height - dimensions.padding.bottom + 28, dimensions.labelSize);
    axes += `<line x1="${layout.centerX.toFixed(1)}" y1="${plot.y1.toFixed(1)}" x2="${layout.centerX.toFixed(1)}" y2="${(plot.y1 + 6).toFixed(1)}" class="chart-axis-tick"></line>`;
  });
  const svg = `<svg viewBox="0 0 ${dimensions.width} ${dimensions.height}" class="combo-chart-svg">${chartGradientDefs(palette)}${grid}<line x1="${plot.x0}" y1="${plot.y0}" x2="${plot.x0}" y2="${plot.y1}" class="chart-axis"></line><line x1="${plot.x0}" y1="${plot.y1}" x2="${plot.x1}" y2="${plot.y1}" class="chart-axis"></line>${axes}${bars}${labels}</svg>`;
  return renderScrollableChart(svg, dimensions.width, dimensions.height, 'bar-chart-scroller', chartKey, dimensions.scale);
}

function renderComboChart(rows, barMetric = 'count', lineMetric = 'percentage', chartKey = 'combo') {
  if (!rows.length) return `<div class="chart-empty-state"><span>${escapeHtml(t('resultsEmpty'))}</span></div>`;
  const dimensions = getChartDimensions(rows, { baseColumn: 128, labelFactor: 10, chartKey });
  const plot = getPlotArea(dimensions);
  const maxBar = Math.max(1, ...rows.map(row => Number(row[barMetric] || 0)));
  const maxLine = Math.max(1, ...rows.map(row => Number(row[lineMetric] || 0)));
  const barTicks = niceTicks(maxBar, 5);
  const lineTicks = niceTicks(maxLine, 5);
  const barTop = Math.max(...barTicks);
  const lineTop = Math.max(...lineTicks);
  const palette = chartPalette(rows.length);
  const categories = [];
  let labels = '';
  let axes = '';
  rows.forEach((row, index) => {
    const layout = getCategoryLayout(index, rows.length, plot, dimensions.barDensity);
    const barValue = Number(row[barMetric] || 0);
    const lineValue = Number(row[lineMetric] || 0);
    const barHeight = plot.height * (barValue / barTop);
    const barY = plot.y1 - barHeight;
    const lineY = scaleY(lineValue, lineTop, plot);
    const label = row.label || '';
    categories.push({ index, label, layout, centerX: layout.centerX, barValue, lineValue, barHeight, barY, lineY, barMetric, lineMetric, isKeyValue: barValue === maxBar || lineValue === maxLine || index === rows.length - 1 });
    labels += renderCategoryLabel(label, layout.centerX, dimensions.height - dimensions.padding.bottom + 28, dimensions.labelSize);
    axes += `<line x1="${layout.centerX.toFixed(1)}" y1="${plot.y1.toFixed(1)}" x2="${layout.centerX.toFixed(1)}" y2="${(plot.y1 + 6).toFixed(1)}" class="chart-axis-tick"></line>`;
  });
  const linePoints = categories.map(item => ({ x: item.centerX, y: item.lineY, value: item.lineValue, label: item.label }));
  const linePath = smoothLinePath(linePoints, dimensions.lineTension);
  const areaPath = linePoints.length > 1 ? `${linePath} L${linePoints[linePoints.length - 1].x.toFixed(1)},${plot.y1.toFixed(1)} L${linePoints[0].x.toFixed(1)},${plot.y1.toFixed(1)} Z` : '';
  const barLabel = metricLabel(barMetric);
  const lineLabel = metricLabel(lineMetric);
  const categoryGroups = categories.map(item => {
    const labelState = resolveComboLabelState(item, dimensions);
    const barLabelClass = labelState.mode === 'deferred' ? 'chart-value chart-value-deferred' : 'chart-value';
    const lineLabelClass = labelState.mode === 'deferred' ? 'chart-line-value chart-value-deferred' : 'chart-line-value';
    const barValueLabel = labelState.mode === 'merged' || labelState.mode === 'hidden' ? '' : `<text x="${item.centerX.toFixed(1)}" y="${labelState.barY.toFixed(1)}" text-anchor="middle" class="${barLabelClass}" style="font-size:${dimensions.labelSize}px">${escapeHtml(labelState.barText)}</text>`;
    const lineValueLabel = labelState.mode === 'merged' || labelState.mode === 'hidden' ? '' : `<text x="${item.centerX.toFixed(1)}" y="${labelState.lineY.toFixed(1)}" text-anchor="middle" class="${lineLabelClass}" style="font-size:${dimensions.labelSize}px">${escapeHtml(labelState.lineText)}</text>`;
    const mergedValueLabel = labelState.mode === 'merged' ? `<text x="${item.centerX.toFixed(1)}" y="${labelState.barY.toFixed(1)}" text-anchor="middle" class="chart-value chart-value-merged" style="font-size:${dimensions.labelSize}px">${escapeHtml(labelState.barText)}</text>` : '';
    return `<g class="chart-combo-category" data-category-index="${item.index}" style="--chart-index:${item.index};">
      <rect class="chart-hover-band" x="${(item.centerX - item.layout.bandWidth / 2).toFixed(1)}" y="${plot.y0.toFixed(1)}" width="${item.layout.bandWidth.toFixed(1)}" height="${plot.height.toFixed(1)}"></rect>
      <g class="chart-bar-group"><rect class="chart-bar-depth" x="${(item.layout.barX + 4).toFixed(1)}" y="${(item.barY + 7).toFixed(1)}" width="${item.layout.barWidth.toFixed(1)}" height="${Math.max(0, item.barHeight - 2).toFixed(1)}" rx="10"></rect><rect class="chart-bar-rect" data-center-x="${item.centerX.toFixed(1)}" data-band-width="${item.layout.bandWidth.toFixed(1)}" x="${item.layout.barX.toFixed(1)}" y="${item.barY.toFixed(1)}" width="${item.layout.barWidth.toFixed(1)}" height="${item.barHeight.toFixed(1)}" rx="10" fill="url(#barGrad${item.index % palette.length})">${svgTitle(barLabel, item.label, labelState.barText)}</rect><rect class="chart-bar-highlight" data-center-x="${item.centerX.toFixed(1)}" data-band-width="${item.layout.bandWidth.toFixed(1)}" x="${item.layout.barX.toFixed(1)}" y="${item.barY.toFixed(1)}" width="${item.layout.barWidth.toFixed(1)}" height="${Math.min(14, Math.max(0, item.barHeight)).toFixed(1)}" rx="10" fill="url(#barGloss)"></rect>${barValueLabel}</g>
      <g class="chart-line-point-group"><circle class="chart-line-point-halo" cx="${item.centerX.toFixed(1)}" cy="${item.lineY.toFixed(1)}" r="${(dimensions.nodeSize + 3).toFixed(1)}"></circle><circle class="chart-line-point" cx="${item.centerX.toFixed(1)}" cy="${item.lineY.toFixed(1)}" r="${dimensions.nodeSize.toFixed(1)}">${svgTitle(lineLabel, item.label, labelState.lineText)}</circle>${lineValueLabel}</g>${mergedValueLabel}
    </g>`;
  }).join('');
  const leftTicks = renderGridAndTicks(barTicks, barTop, plot, dimensions.padding, dimensions.width, 'left', dimensions.labelSize);
  const rightTicks = renderGridAndTicks(lineTicks, lineTop, plot, dimensions.padding, dimensions.width, 'right', dimensions.labelSize);
  const axisLines = `<line x1="${plot.x0}" y1="${plot.y0}" x2="${plot.x0}" y2="${plot.y1}" class="chart-axis"></line><line x1="${plot.x0}" y1="${plot.y1}" x2="${plot.x1}" y2="${plot.y1}" class="chart-axis"></line><line x1="${plot.x1}" y1="${plot.y0}" x2="${plot.x1}" y2="${plot.y1}" class="chart-axis chart-axis-secondary"></line>`;
  const legend = `<div class="chart-legend-inline"><span><i class="legend-dot" style="background:var(--theme-chart-a)"></i>${escapeHtml(barLabel)}</span><span><i class="legend-dot" style="background:var(--theme-accent-ui)"></i>${escapeHtml(lineLabel)}</span></div>`;
  const svg = `<svg viewBox="0 0 ${dimensions.width} ${dimensions.height}" class="combo-chart-svg">${chartGradientDefs(palette)}${leftTicks}${rightTicks}${axisLines}${axes}${areaPath ? `<path d="${areaPath}" class="chart-line-area"></path>` : ''}${categoryGroups}<path d="${linePath}" class="chart-line-path" style="stroke-width:${dimensions.lineWidth}"></path>${labels}</svg>`;
  return `${legend}${renderScrollableChart(svg, dimensions.width, dimensions.height, 'combo-chart-scroller', chartKey, dimensions.scale)}`;
}

function donutSvgFromCounts(entries, palette, settings, donut = true, chartKey = 'donut') {
  const safeEntries = entries.length ? entries : [[t('resultsEmpty'), 0]];
  const total = safeEntries.reduce((sum, [, value]) => sum + value, 0) || 1;
  const size = Math.round(Math.min(280, Math.max(150, settings.height * 0.52 * settings.scale)));
  const center = size / 2;
  const radius = Math.max(42, Math.min(82, size * 0.31));
  const strokeWidth = donut ? Math.max(14, Math.min(28, radius * 0.36)) : radius * 2;
  const outerRadius = donut ? radius + strokeWidth / 2 : radius;
  const innerRadius = donut ? Math.max(12, radius - strokeWidth / 2) : 0;
  const idPrefix = `donut-${sanitizeSvgId(chartKey)}`;
  let offset = 0;
  const gradients = safeEntries.map(([, value], index) => {
    const color = palette[index % palette.length];
    return `<radialGradient id="${idPrefix}Grad${index}" cx="35%" cy="28%" r="72%"><stop offset="0%" stop-color="${withLightness(color, 12)}"></stop><stop offset="70%" stop-color="${color}"></stop><stop offset="100%" stop-color="${withLightness(color, -7)}"></stop></radialGradient>`;
  }).join('');
  const slices = safeEntries.map(([label, value], index) => {
    const fraction = value / total;
    const percent = `${(fraction * 100).toFixed(1)}%`;
    const startAngle = offset * 360 - 90;
    const endAngle = (offset + fraction) * 360 - 90;
    const path = fraction >= 0.999 && donut
      ? fullRingPath(center, outerRadius, innerRadius)
      : arcSlicePath(center, innerRadius, outerRadius, startAngle, endAngle);
    const slice = fraction >= 0.999 && !donut
      ? `<circle class="donut-slice donut-slice-full" data-slice-index="${index}" style="--slice-index:${index};" cx="${center}" cy="${center}" r="${outerRadius.toFixed(2)}" fill="url(#${idPrefix}Grad${index})"><title>${escapeHtml(label)}：${escapeHtml(value)} / ${percent}</title></circle>`
      : `<path class="donut-slice" data-slice-index="${index}" style="--slice-index:${index};" d="${path}" fill="url(#${idPrefix}Grad${index})" fill-rule="evenodd"><title>${escapeHtml(label)}：${escapeHtml(value)} / ${percent}</title></path>`;
    offset += fraction;
    return slice;
  }).join('');
  const labelSize = Math.max(11, settings.labelSize);
  const totalValue = safeEntries.reduce((sum, [, value]) => sum + value, 0);
  const centerPlateRadius = donut ? Math.max(30, innerRadius * 0.92) : Math.max(30, radius * 0.44);
  return `<svg viewBox="0 0 ${size} ${size}" class="donut-svg ${donut ? 'donut-svg-ring' : 'donut-svg-pie'}" style="width:${size}px;height:${size}px"><defs>${gradients}<filter id="${idPrefix}SoftShadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="9" stdDeviation="5" flood-color="#1F2937" flood-opacity="0.13"></feDropShadow></filter></defs><circle class="donut-depth-ring" cx="${center}" cy="${(center + 6).toFixed(1)}" r="${radius}" fill="none" stroke="rgba(31,41,55,0.08)" stroke-width="${strokeWidth}"></circle><circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="var(--chart-grid)" stroke-width="${strokeWidth}"></circle><g class="donut-slice-layer" filter="url(#${idPrefix}SoftShadow)">${slices}</g><circle cx="${center}" cy="${center}" r="${centerPlateRadius.toFixed(1)}" class="donut-center-plate"></circle><circle cx="${(center - radius * 0.22).toFixed(1)}" cy="${(center - radius * 0.36).toFixed(1)}" r="${(radius * 0.36).toFixed(1)}" class="donut-highlight"></circle><text x="${center}" y="${(center - 3).toFixed(1)}" text-anchor="middle" class="donut-total" style="font-size:${labelSize + 8}px">${totalValue}</text><text x="${center}" y="${(center + labelSize + 10).toFixed(1)}" text-anchor="middle" class="donut-sub" style="font-size:${labelSize}px">${escapeHtml(t('recordCount'))}</text></svg>`;
}
function renderMiniLegend(entries, palette) {
  return entries.map(([label, value], index) => `<div class="legend-item" style="--legend-index:${index};"><span class="legend-dot" style="background:${palette[index % palette.length]}"></span><span>${escapeHtml(label)}</span><strong>${value}</strong></div>`).join('');
}

function renderPieLike(entries, donut = false, chartKey = 'pie') {
  const safeEntries = entries.length ? entries : [[t('resultsEmpty'), 0]];
  const settings = getChartUiSettings(chartKey);
  const palette = chartPalette(safeEntries.length || 1);
  const chart = donutSvgFromCounts(safeEntries, palette, settings, donut, chartKey);
  const minHeight = Math.ceil(settings.height * settings.scale);
  return `<div class="pie-chart-stage" style="min-height:${minHeight}px">${chart}</div><div class="legend-grid" style="font-size:${settings.labelSize}px">${renderMiniLegend(safeEntries, palette)}</div>`;
}
