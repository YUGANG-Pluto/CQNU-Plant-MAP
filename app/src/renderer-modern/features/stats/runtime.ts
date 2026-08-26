import {
  STATS_CHART_GROUPS,
  STATS_CHART_IDS,
  STATS_CHART_LABELS,
  STATS_CHART_PRESETS,
  validateStatsChartRegistry,
  type StatsChartGroup,
  type StatsChartId,
  type StatsChartLabel,
  type StatsChartPresetId
} from './registry';

export interface StatsChartRegistryBridge {
  readonly version: 'stats-chart-registry-v1';
  readonly chartIds: readonly StatsChartId[];
  readonly groups: readonly StatsChartGroup[];
  readonly labels: Readonly<Record<StatsChartId, StatsChartLabel>>;
  readonly presets: Readonly<Record<StatsChartPresetId, readonly StatsChartId[]>>;
}

declare global {
  interface Window {
    rendererStatsRegistry?: StatsChartRegistryBridge;
  }
}

export function createStatsChartRegistryBridge(): StatsChartRegistryBridge {
  validateStatsChartRegistry();
  return Object.freeze({
    version: 'stats-chart-registry-v1' as const,
    chartIds: STATS_CHART_IDS,
    groups: STATS_CHART_GROUPS,
    labels: STATS_CHART_LABELS,
    presets: STATS_CHART_PRESETS
  });
}

export function installStatsChartRegistryBridge(): StatsChartRegistryBridge {
  if (window.rendererStatsRegistry) return window.rendererStatsRegistry;
  const bridge = createStatsChartRegistryBridge();
  Object.defineProperty(window, 'rendererStatsRegistry', {
    configurable: false,
    enumerable: false,
    writable: false,
    value: bridge
  });
  return bridge;
}
