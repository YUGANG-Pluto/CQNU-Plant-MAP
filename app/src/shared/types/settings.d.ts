export interface ProjectSettings {
  language?: 'zh' | 'en' | string;
  mapCenter?: [number, number];
  mapZoom?: number;
  activeBaseMapId?: string;
  baseMaps?: unknown[];
  uiTheme?: Record<string, unknown>;
  statsCustom?: Record<string, unknown>;
  recycleBin?: unknown[];
  [key: string]: unknown;
}
