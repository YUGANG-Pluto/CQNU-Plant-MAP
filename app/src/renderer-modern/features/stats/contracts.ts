export type StatsRecord = Record<string, unknown>;
export type StatsMetricValue = number | null;

export interface StatsProjectSummary extends StatsRecord {
  zoneCount: number;
  pointCount: number;
  speciesRichness: number;
  generatedAt: string;
}

export interface StatsDiversityMetrics extends StatsRecord {
  speciesRichness: number;
  totalAbundance: number;
  shannon: StatsMetricValue;
  simpsonDominance: StatsMetricValue;
  simpsonDiversity: StatsMetricValue;
  pielou: StatsMetricValue;
  margalef: StatsMetricValue;
  menhinick: StatsMetricValue;
  bergerParker: StatsMetricValue;
  hillQ0: StatsMetricValue;
  hillQ1: StatsMetricValue;
  hillQ2: StatsMetricValue;
}

export interface StatsZoneSummary extends StatsRecord {
  zoneId: string;
  label: string;
  pointCount: number;
  speciesRichness: number;
  familyRichness: number;
  genusRichness: number;
  qualityScore: number;
  diversity: StatsDiversityMetrics;
}

export interface StatsMatrixAxisItem {
  id: string;
  label: string;
}

export interface StatsMatrixCell<TRaw extends StatsRecord = StatsRecord> {
  rowId: string;
  columnId: string;
  value: StatsMetricValue;
  displayValue: string;
  raw: TRaw;
}

export interface StatsMatrixModel<TRaw extends StatsRecord = StatsRecord> {
  id: string;
  title: string;
  metric: string;
  valueType: string;
  range: readonly [number, number] | number[];
  rows: StatsMatrixAxisItem[];
  columns: StatsMatrixAxisItem[];
  cells: Array<StatsMatrixCell<TRaw>>;
  notes: string[];
}

export interface StatsDiversityCollection extends StatsRecord {
  overall: StatsDiversityMetrics;
  byZone: Array<StatsDiversityMetrics & { zoneId: string; label: string }>;
  whittakerBeta: StatsMetricValue;
}

export interface ResearchStatsSnapshot extends StatsRecord {
  generatedAt: string;
  projectSummary: StatsProjectSummary;
  zoneSummaries: StatsZoneSummary[];
  diversityMetrics: StatsDiversityCollection;
  heatmapMatrices: Record<string, StatsMatrixModel>;
  metricDefinitions: unknown[];
  formulaNotes: unknown[];
  dataScopeNotes: unknown[];
  exportVersion: string;
}

export interface StatsExportDescriptor {
  defaultPath: string;
  content: string;
  title?: string;
}
