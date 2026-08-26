import type {
  ResearchStatsSnapshot,
  StatsExportDescriptor,
  StatsMatrixModel,
  StatsRecord
} from './contracts';

function record(value: unknown): StatsRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as StatsRecord
    : {};
}

function finiteMetric(value: unknown): boolean {
  return value === null || typeof value === 'number' && Number.isFinite(value);
}

function assertArray(value: unknown, label: string): asserts value is unknown[] {
  if (!Array.isArray(value)) throw new Error(`Statistics contract requires ${label} to be an array.`);
}

function assertMatrix(value: unknown, key: string): asserts value is StatsMatrixModel {
  const matrix = record(value);
  if (!String(matrix.id || '') || !String(matrix.metric || '')) {
    throw new Error(`Statistics matrix ${key} is missing its stable identity.`);
  }
  assertArray(matrix.rows, `${key}.rows`);
  assertArray(matrix.columns, `${key}.columns`);
  assertArray(matrix.cells, `${key}.cells`);
  for (const cellValue of matrix.cells) {
    const cell = record(cellValue);
    if (!String(cell.rowId || '') || !String(cell.columnId || '') || !finiteMetric(cell.value)) {
      throw new Error(`Statistics matrix ${key} contains an invalid cell.`);
    }
  }
}

export function assertResearchStatsSnapshot(value: unknown): asserts value is ResearchStatsSnapshot {
  const snapshot = record(value);
  if (!String(snapshot.generatedAt || '') || !String(snapshot.exportVersion || '')) {
    throw new Error('Statistics snapshot is missing generation or export metadata.');
  }
  const summary = record(snapshot.projectSummary);
  for (const key of ['zoneCount', 'pointCount', 'speciesRichness']) {
    if (!Number.isFinite(Number(summary[key]))) {
      throw new Error(`Statistics project summary contains an invalid ${key}.`);
    }
  }
  assertArray(snapshot.zoneSummaries, 'zoneSummaries');
  const diversity = record(snapshot.diversityMetrics);
  assertArray(diversity.byZone, 'diversityMetrics.byZone');
  const matrices = record(snapshot.heatmapMatrices);
  Object.entries(matrices).forEach(([key, matrix]) => assertMatrix(matrix, key));
  if (!Array.isArray(snapshot.metricDefinitions) || !Array.isArray(snapshot.formulaNotes)
    || !Array.isArray(snapshot.dataScopeNotes)) {
    throw new Error('Statistics snapshot is missing metric notes.');
  }
}

export function researchStatsSnapshot(value: unknown): ResearchStatsSnapshot {
  assertResearchStatsSnapshot(value);
  return value;
}

export function statsExportDescriptor(value: unknown): StatsExportDescriptor {
  const descriptor = record(value);
  const defaultPath = String(descriptor.defaultPath || '').trim();
  const content = descriptor.content;
  if (!defaultPath || typeof content !== 'string') {
    throw new Error('Statistics export descriptor requires a file name and text content.');
  }
  return {
    defaultPath,
    content,
    ...(descriptor.title ? { title: String(descriptor.title) } : {})
  };
}
