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
import {
  researchStatsSnapshot,
  statsExportDescriptor
} from './contractsRuntime';
import type { ResearchStatsSnapshot, StatsExportDescriptor } from './contracts';

export interface StatsChartRegistryBridge {
  readonly version: 'stats-chart-registry-v1';
  readonly chartIds: readonly StatsChartId[];
  readonly groups: readonly StatsChartGroup[];
  readonly labels: Readonly<Record<StatsChartId, StatsChartLabel>>;
  readonly presets: Readonly<Record<StatsChartPresetId, readonly StatsChartId[]>>;
  readonly snapshot: (value: unknown) => ResearchStatsSnapshot;
  readonly exportDescriptor: (value: unknown) => StatsExportDescriptor;
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
    presets: STATS_CHART_PRESETS,
    snapshot: researchStatsSnapshot,
    exportDescriptor: statsExportDescriptor
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
