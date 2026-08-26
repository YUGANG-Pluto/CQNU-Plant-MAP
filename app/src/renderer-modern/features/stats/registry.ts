export const STATS_CHART_IDS = Object.freeze([
  'overviewCombo',
  'overviewLifeDonut',
  'zonePointBar',
  'zoneQualityBar',
  'topFamilyBar',
  'topGenusBar',
  'topSpeciesBar',
  'familyDonut',
  'genusDonut',
  'lifeDonut',
  'originDonut',
  'lifeMissingBar',
  'originMissingBar',
  'diversityCombo',
  'richnessShannonCombo',
  'hillCombo',
  'bergerParkerBar',
  'jaccardHeatmap',
  'sorensenHeatmap',
  'brayCurtisHeatmap',
  'phenologyStateDonut',
  'phenologyZoneBar',
  'phenologyMonthTrend',
  'phenologyHeatmap',
  'qualityIssueBar',
  'zoneQualityScoreBar',
  'qualityHeatmap'
] as const);

export type StatsChartId = (typeof STATS_CHART_IDS)[number];
export type StatsChartPresetId = 'recommended' | 'paper' | 'quality';

export interface StatsChartGroup {
  readonly id: string;
  readonly labelKey: string;
  readonly charts: readonly StatsChartId[];
}

export type StatsChartLabel = readonly [translationKey: string, englishFallback: string];

function group(id: string, labelKey: string, charts: readonly StatsChartId[]): StatsChartGroup {
  return Object.freeze({ id, labelKey, charts: Object.freeze([...charts]) });
}

function label(translationKey: string, englishFallback: string): StatsChartLabel {
  return Object.freeze([translationKey, englishFallback]) as StatsChartLabel;
}

function preset(charts: readonly StatsChartId[]): readonly StatsChartId[] {
  return Object.freeze([...charts]);
}

export const STATS_CHART_GROUPS: readonly StatsChartGroup[] = Object.freeze([
  group('overview', 'statsChartGroupOverview', ['overviewCombo', 'overviewLifeDonut']),
  group('zone', 'statsChartGroupZone', ['zonePointBar', 'zoneQualityBar']),
  group('taxonomy', 'statsChartGroupTaxonomy', [
    'topFamilyBar',
    'topGenusBar',
    'topSpeciesBar',
    'familyDonut',
    'genusDonut'
  ]),
  group('life', 'statsChartGroupLife', [
    'lifeDonut',
    'originDonut',
    'lifeMissingBar',
    'originMissingBar'
  ]),
  group('diversity', 'statsChartGroupDiversity', [
    'diversityCombo',
    'richnessShannonCombo',
    'hillCombo',
    'bergerParkerBar'
  ]),
  group('similarity', 'statsChartGroupSimilarity', [
    'jaccardHeatmap',
    'sorensenHeatmap',
    'brayCurtisHeatmap'
  ]),
  group('phenology', 'statsChartGroupPhenology', [
    'phenologyStateDonut',
    'phenologyZoneBar',
    'phenologyMonthTrend',
    'phenologyHeatmap'
  ]),
  group('quality', 'statsChartGroupQuality', [
    'qualityIssueBar',
    'zoneQualityScoreBar',
    'qualityHeatmap'
  ])
]);

export const STATS_CHART_LABELS: Readonly<Record<StatsChartId, StatsChartLabel>> = Object.freeze({
  overviewCombo: label('statsChartOverviewCombo', 'Zone points + species combo'),
  overviewLifeDonut: label('statsChartOverviewLifeDonut', 'Life form completeness donut'),
  zonePointBar: label('statsChartZonePointBar', 'Zone point count bar chart'),
  zoneQualityBar: label('statsChartZoneQualityBar', 'Zone quality score bar chart'),
  topFamilyBar: label('statsChartTopFamilyBar', 'Top family bar chart'),
  topGenusBar: label('statsChartTopGenusBar', 'Top genus bar chart'),
  topSpeciesBar: label('statsChartTopSpeciesBar', 'Frequent species bar chart'),
  familyDonut: label('statsChartFamilyDonut', 'Family composition donut'),
  genusDonut: label('statsChartGenusDonut', 'Genus composition donut'),
  lifeDonut: label('statsChartLifeDonut', 'Life form donut'),
  originDonut: label('statsChartOriginDonut', 'Origin attribute donut'),
  lifeMissingBar: label('statsChartLifeMissingBar', 'Life form missing bar chart'),
  originMissingBar: label('statsChartOriginMissingBar', 'Origin missing bar chart'),
  diversityCombo: label('statsChartDiversityCombo', 'Zone Shannon / Simpson / Pielou metrics'),
  richnessShannonCombo: label(
    'statsChartRichnessShannonCombo',
    'Species richness S + Shannon diversity H\u2032'
  ),
  hillCombo: label('statsChartHillCombo', 'Hill effective species numbers'),
  bergerParkerBar: label('statsChartBergerParkerBar', 'Berger-Parker bar chart'),
  jaccardHeatmap: label('statsChartJaccardHeatmap', 'Jaccard heatmap'),
  sorensenHeatmap: label('statsChartSorensenHeatmap', 'Sorensen heatmap'),
  brayCurtisHeatmap: label('statsChartBrayCurtisHeatmap', 'Bray-Curtis heatmap'),
  phenologyStateDonut: label('statsChartPhenologyStateDonut', 'Phenology state donut'),
  phenologyZoneBar: label('statsChartPhenologyZoneBar', 'Zone phenology bar chart'),
  phenologyMonthTrend: label('statsChartPhenologyMonthTrend', 'Monthly phenology trend'),
  phenologyHeatmap: label('statsChartPhenologyHeatmap', 'Month by phenology heatmap'),
  qualityIssueBar: label('statsChartQualityIssueBar', 'Data quality issue bar chart'),
  zoneQualityScoreBar: label('statsChartZoneQualityScoreBar', 'Zone quality score chart'),
  qualityHeatmap: label('statsChartQualityHeatmap', 'Zone by data quality heatmap')
});

export const STATS_CHART_PRESETS: Readonly<Record<StatsChartPresetId, readonly StatsChartId[]>> =
  Object.freeze({
    recommended: preset([
      'overviewCombo',
      'overviewLifeDonut',
      'diversityCombo',
      'jaccardHeatmap',
      'qualityIssueBar',
      'qualityHeatmap'
    ]),
    paper: preset([
      'overviewCombo',
      'diversityCombo',
      'richnessShannonCombo',
      'jaccardHeatmap',
      'sorensenHeatmap',
      'phenologyHeatmap'
    ]),
    quality: preset(['qualityIssueBar', 'zoneQualityScoreBar', 'qualityHeatmap'])
  });

export function validateStatsChartRegistry(): void {
  const groupedIds = STATS_CHART_GROUPS.flatMap((item) => item.charts);
  const uniqueIds = new Set(groupedIds);
  if (groupedIds.length !== STATS_CHART_IDS.length || uniqueIds.size !== STATS_CHART_IDS.length) {
    throw new Error('Statistics chart groups must contain every chart exactly once.');
  }
  for (const chartId of STATS_CHART_IDS) {
    if (!uniqueIds.has(chartId) || !STATS_CHART_LABELS[chartId]) {
      throw new Error(`Statistics chart registry is incomplete: ${chartId}`);
    }
  }
  for (const preset of Object.values(STATS_CHART_PRESETS)) {
    if (preset.some((chartId) => !uniqueIds.has(chartId))) {
      throw new Error('Statistics chart preset contains an unknown chart.');
    }
  }
}
