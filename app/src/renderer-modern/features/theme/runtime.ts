import {
  DEFAULT_UI_STYLE_ID,
  MOTION_MODE_PRESETS,
  UI_STYLE_PRESETS,
  createMotionSettings,
  createThemeDefaults,
  normalizeHexColor,
  normalizeThemeSettings,
  syncLegacyThemeTokens,
  type MotionMode,
  type ThemeDensity,
  type ThemeSettings,
  type ThemeStyleId
} from './model';

interface LegacyState {
  settings: {
    language?: 'zh' | 'en';
    uiTheme?: unknown;
    statsCustom?: Record<string, unknown>;
  } | null;
}

type LegacyWindow = Window & typeof globalThis & {
  __CQNU_STATE__?: LegacyState;
  guardMaintenanceReadOnlyAction?: (action: string) => boolean;
  openLayerModal?: (element: HTMLElement | null) => void;
  closeLayerModal?: (element: HTMLElement | null) => void;
  persistProject?: () => Promise<void>;
  scheduleMapResize?: () => void;
  toast?: (message: string) => void;
  t?: (key: string) => string;
  [key: string]: unknown;
};

const legacyWindow = window as LegacyWindow;
const LEGACY_STYLE_CLASSES = [
  'scientific-white',
  'botanical-scientific',
  'field-notebook',
  'linear-minimal',
  'deep-slate',
  'flow-data',
  'cloud-soft',
  'lavender-soft',
  'nordic-minimal',
  'deep-indigo',
  'dimensional-chart',
  'soft-dashboard',
  'glass-blue',
  'academic-light',
  'pastel-data',
  'minimal-white',
  'liquid-glass'
].map(id => `theme-${id}`);
const GLASS_SCOPE_CLASSES = ['modules', 'controls', 'mapBadges', 'charts', 'settings']
  .map(scope => `glass-apply-${scope}`);

function getState(): LegacyState | null {
  return legacyWindow.__CQNU_STATE__ ?? null;
}

function getLanguage(): 'zh' | 'en' {
  return getState()?.settings?.language === 'en' ? 'en' : 'zh';
}

function translate(key: string, fallback: { zh: string; en: string }): string {
  const translated = typeof legacyWindow.t === 'function' ? legacyWindow.t(key) : '';
  if (translated && translated !== key) return translated;
  return fallback[getLanguage()];
}

function guard(action: string): boolean {
  return typeof legacyWindow.guardMaintenanceReadOnlyAction === 'function'
    ? legacyWindow.guardMaintenanceReadOnlyAction(action)
    : false;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = normalizeHexColor(hex, '#000000').slice(1);
  return {
    r: Number.parseInt(clean.slice(0, 2), 16),
    g: Number.parseInt(clean.slice(2, 4), 16),
    b: Number.parseInt(clean.slice(4, 6), 16)
  };
}

function hexToRgba(hex: string, alphaPercent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const alpha = clamp(alphaPercent / 100, 0, 1).toFixed(2);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const { r, g, b } = hexToRgb(hex);
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  let hue = 0;
  let saturation = 0;

  if (max !== min) {
    const delta = max - min;
    saturation = lightness > 0.5
      ? delta / (2 - max - min)
      : delta / (max + min);
    if (max === red) hue = (green - blue) / delta + (green < blue ? 6 : 0);
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue *= 60;
  }

  return {
    h: Math.round(hue),
    s: Math.round(saturation * 100),
    l: Math.round(lightness * 100)
  };
}

function hslToHex(h: number, s: number, l: number): string {
  const hue = ((Number(h) % 360) + 360) % 360;
  const saturation = clamp(Number(s), 0, 100) / 100;
  const lightness = clamp(Number(l), 0, 100) / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const segment = hue / 60;
  const x = chroma * (1 - Math.abs((segment % 2) - 1));
  const offset = lightness - chroma / 2;
  let red = 0;
  let green = 0;
  let blue = 0;

  if (segment < 1) [red, green] = [chroma, x];
  else if (segment < 2) [red, green] = [x, chroma];
  else if (segment < 3) [green, blue] = [chroma, x];
  else if (segment < 4) [green, blue] = [x, chroma];
  else if (segment < 5) [red, blue] = [x, chroma];
  else [red, blue] = [chroma, x];

  return `#${[red, green, blue]
    .map(channel => Math.round((channel + offset) * 255).toString(16).padStart(2, '0'))
    .join('')}`.toUpperCase();
}

function withLightness(hex: string, amount: number): string {
  const hsl = hexToHsl(hex);
  return hslToHex(hsl.h, hsl.s, clamp(hsl.l + amount, 0, 100));
}

function readableTextColor(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  return (r * 299 + g * 587 + b * 114) / 1000 >= 145 ? '#1D2926' : '#FFFFFF';
}

function setCssVariable(name: string, value: string): void {
  document.documentElement.style.setProperty(name, value);
}

function ensureThemeSettings(): void {
  const state = getState();
  if (!state?.settings) return;
  state.settings.uiTheme = normalizeThemeSettings(state.settings.uiTheme);
  state.settings.statsCustom = {
    category: 'zone',
    chartType: 'combo',
    barMetric: 'speciesCount',
    lineMetric: 'pointCount',
    ...(state.settings.statsCustom ?? {})
  };
}

function getCurrentTheme(): ThemeSettings {
  ensureThemeSettings();
  const state = getState();
  if (!state?.settings) return createThemeDefaults();
  return state.settings.uiTheme as ThemeSettings;
}

function getThemeColor(slot: string): string {
  const theme = getCurrentTheme();
  const aliases: Record<string, keyof ThemeSettings['tokens']> = {
    workspace: 'secondary',
    primary: 'primary',
    accent: 'accent',
    chartA: 'chartA',
    chartB: 'chartB',
    chartC: 'chartC',
    chartD: 'chartD'
  };
  const token = aliases[slot] ?? slot as keyof ThemeSettings['tokens'];
  return theme.tokens[token] ?? theme.tokens.primary;
}

function applyThemeVariables(): void {
  const state = getState();
  if (!state?.settings) return;
  const theme = getCurrentTheme();
  const { tokens, effects, glass, motion, progress, statusColors } = theme;
  const root = document.documentElement;
  const radius = effects.radius;
  const glassAlpha = glass.mode === 'off' ? 0 : glass.opacity;
  const shadowAlpha = (0.04 + effects.shadowStrength / 1000).toFixed(3);
  const floatAlpha = (0.08 + effects.shadowStrength / 850).toFixed(3);
  const motionEnabled = motion.enabled && !motion.reduced;
  const easing = motion.easing === 'emphasized'
    ? 'cubic-bezier(0.16, 1, 0.3, 1)'
    : 'cubic-bezier(0.2, 0.8, 0.2, 1)';

  root.dataset.uiStyle = theme.styleId;
  root.dataset.uiLayout = 'map-workbench';
  root.dataset.uiDensity = theme.density;
  root.classList.remove(...LEGACY_STYLE_CLASSES);
  root.classList.remove('density-comfortable', 'density-compact');
  root.classList.remove('glass-mode-off', 'glass-mode-light', 'glass-mode-liquid');
  root.classList.remove(...GLASS_SCOPE_CLASSES);
  root.classList.remove('motion-mode-off', 'motion-mode-minimal', 'motion-mode-standard', 'motion-mode-rich', 'motion-mode-custom');
  root.classList.add(`theme-${theme.styleId}`, `density-${theme.density}`, `glass-mode-${glass.mode}`, `motion-mode-${motion.mode}`);
  Object.entries(glass.apply).forEach(([scope, enabled]) => {
    if (enabled) root.classList.add(`glass-apply-${scope}`);
  });
  root.classList.toggle('motion-disabled', !motionEnabled);
  root.classList.toggle('motion-hover', motionEnabled && motion.hover);
  root.classList.toggle('motion-modal', motionEnabled && motion.modal);
  root.classList.toggle('motion-layout', motionEnabled && motion.layout);
  root.classList.toggle('motion-theme', motionEnabled && motion.themeTransition);
  root.classList.toggle('progress-mode-compact', progress.mode === 'compact');
  root.classList.toggle('progress-mode-display', progress.mode === 'display');
  root.classList.toggle('progress-glass', progress.glass);

  setCssVariable('--ui-style-id', theme.styleId);
  setCssVariable('--ui-layout-id', 'map-workbench');
  setCssVariable('--app-bg', tokens.appBg);
  setCssVariable('--app-bg-soft', tokens.appBgSoft);
  setCssVariable('--panel-bg', tokens.panelBg);
  setCssVariable('--panel-bg-soft', tokens.panelBgSoft);
  setCssVariable('--glass-base', tokens.glassBase);
  setCssVariable('--glass-bg', hexToRgba(tokens.glassBase, glassAlpha));
  setCssVariable('--glass-bg-strong', hexToRgba(tokens.glassBase, Math.min(96, glassAlpha + 14)));
  setCssVariable('--glass-highlight', hexToRgba(tokens.glassHighlight, glass.highlight));
  setCssVariable('--glass-border', hexToRgba(tokens.glassHighlight, Math.max(18, glass.highlight)));
  setCssVariable('--glass-border-soft', hexToRgba(tokens.glassHighlight, Math.max(12, glass.highlight - 18)));
  setCssVariable('--glass-blur', `${glass.blur}px`);
  setCssVariable('--glass-opacity', (glassAlpha / 100).toFixed(2));
  setCssVariable('--glass-saturation', `${glass.saturate}%`);
  setCssVariable('--glass-effect-shadow-alpha', (glass.shadow / 100).toFixed(2));
  setCssVariable('--glass-brightness', `${glass.brightness}%`);
  setCssVariable('--primary', tokens.primary);
  setCssVariable('--primary-hover', withLightness(tokens.primary, -10));
  setCssVariable('--primary-soft', hexToRgba(tokens.primary, 14));
  setCssVariable('--primary-contrast', readableTextColor(tokens.primary));
  setCssVariable('--secondary', tokens.secondary);
  setCssVariable('--secondary-soft', hexToRgba(tokens.secondary, 14));
  setCssVariable('--accent', tokens.accent);
  setCssVariable('--accent-soft', hexToRgba(tokens.accent, 13));
  setCssVariable('--success', tokens.success);
  setCssVariable('--success-soft', hexToRgba(tokens.success, 13));
  setCssVariable('--warning', tokens.warning);
  setCssVariable('--warning-soft', hexToRgba(tokens.warning, 15));
  setCssVariable('--danger', tokens.danger);
  setCssVariable('--danger-hover', withLightness(tokens.danger, -10));
  setCssVariable('--danger-soft', hexToRgba(tokens.danger, 14));
  setCssVariable('--danger-contrast', readableTextColor(tokens.danger));
  setCssVariable('--text-main', tokens.textMain);
  setCssVariable('--text-secondary', tokens.textSecondary);
  setCssVariable('--text-muted', hexToRgba(tokens.textSecondary, 74));
  setCssVariable('--text-inverse', '#FFFFFF');
  setCssVariable('--chart-a', tokens.chartA);
  setCssVariable('--chart-b', tokens.chartB);
  setCssVariable('--chart-c', tokens.chartC);
  setCssVariable('--chart-d', tokens.chartD);
  setCssVariable('--chart-grid', hexToRgba(tokens.textSecondary, 18));
  setCssVariable('--chart-axis', hexToRgba(tokens.textSecondary, 52));
  setCssVariable('--chart-label', tokens.textSecondary);
  setCssVariable('--status-success', statusColors.success);
  setCssVariable('--status-danger', statusColors.danger);
  setCssVariable('--status-warning', statusColors.warning);
  setCssVariable('--status-unknown', statusColors.unknown);
  setCssVariable('--toggle-on', statusColors.enabled);
  setCssVariable('--toggle-off', statusColors.disabled);
  setCssVariable('--progress-height', `${progress.height}px`);
  setCssVariable('--progress-radius', `${progress.radius}px`);
  setCssVariable('--progress-speed', `${progress.speed}ms`);
  setCssVariable('--motion-speed', String(motion.speedMultiplier));
  setCssVariable('--motion-duration-fast', `${motionEnabled ? motion.fadeDuration : 0}ms`);
  setCssVariable('--motion-duration', `${motionEnabled ? motion.transitionDuration : 0}ms`);
  setCssVariable('--motion-duration-modal', `${motionEnabled ? motion.modalDuration : 0}ms`);
  setCssVariable('--motion-duration-reveal', `${motionEnabled ? Math.max(motion.modalDuration, motion.transitionDuration) : 0}ms`);
  setCssVariable('--motion-stagger', `${motionEnabled ? motion.stagger : 0}ms`);
  setCssVariable('--motion-scale-enter', String(motionEnabled ? motion.scaleEnter : 1));
  setCssVariable('--motion-scale-press', String(motionEnabled ? motion.scalePress : 1));
  setCssVariable('--motion-hover-lift', `${motionEnabled ? motion.hoverLift : 0}px`);
  setCssVariable('--motion-ease', easing);
  setCssVariable('--motion-ease-standard', 'cubic-bezier(0.2, 0.8, 0.2, 1)');
  setCssVariable('--motion-ease-emphasized', 'cubic-bezier(0.16, 1, 0.3, 1)');
  setCssVariable('--motion-dialog-translate-y', `${motionEnabled ? (motion.mode === 'standard' ? 22 : 12) : 0}px`);
  setCssVariable('--motion-panel-translate-x', `${motionEnabled ? (motion.mode === 'standard' ? 30 : 18) : 0}px`);
  setCssVariable('--motion-subpanel-translate', `${motionEnabled ? (motion.mode === 'standard' ? 18 : 10) : 0}px`);
  setCssVariable('--motion-surface-translate-y', `${motionEnabled ? (motion.mode === 'standard' ? 18 : 10) : 0}px`);
  setCssVariable('--motion-overlay-opacity', motionEnabled ? '0.34' : '0');
  setCssVariable('--radius-sm', `${Math.max(6, radius - 2)}px`);
  setCssVariable('--radius-md', `${radius}px`);
  setCssVariable('--radius-lg', `${radius}px`);
  setCssVariable('--radius-xl', `${radius}px`);
  setCssVariable('--radius-control', `${radius}px`);
  setCssVariable('--shadow-soft', `0 8px 24px rgba(31, 52, 47, ${shadowAlpha})`);
  setCssVariable('--shadow-card', `0 14px 36px rgba(31, 52, 47, ${floatAlpha})`);
  setCssVariable('--shadow-float', `0 20px 52px rgba(31, 52, 47, ${Math.min(0.18, Number(floatAlpha) + 0.04)})`);
  setCssVariable('--glass-shadow', `0 18px 44px rgba(31, 72, 64, ${Math.max(Number(floatAlpha), glass.shadow / 100).toFixed(2)})`);
  setCssVariable('--theme-primary', tokens.primary);
  setCssVariable('--theme-primary-soft', hexToRgba(tokens.primary, 16));
  setCssVariable('--theme-workspace', tokens.secondary);
  setCssVariable('--theme-workspace-soft', hexToRgba(tokens.secondary, 16));
  setCssVariable('--theme-accent-ui', tokens.accent);
  setCssVariable('--theme-accent-ui-soft', hexToRgba(tokens.accent, 14));
  setCssVariable('--theme-chart-a', tokens.chartA);
  setCssVariable('--theme-chart-a-soft', hexToRgba(tokens.chartA, 16));
  setCssVariable('--theme-chart-b', tokens.chartB);
  setCssVariable('--theme-chart-b-soft', hexToRgba(tokens.chartB, 16));
  setCssVariable('--brand-logo-color', tokens.primary);
  setCssVariable('--brand-logo-shadow', `0 8px 18px ${hexToRgba(tokens.primary, 24)}`);

  legacyWindow.scheduleMapResize?.();
}

function applyThemePreset(styleId: ThemeStyleId): void {
  if (guard('theme-preset')) return;
  const state = getState();
  if (!state?.settings) return;
  const current = getCurrentTheme();
  const next = createThemeDefaults(styleId);
  next.density = current.density;
  next.motion = current.motion;
  next.progress = current.progress;
  state.settings.uiTheme = next;
  applyThemeVariables();
  renderThemePanel();
}

function setAccentColor(color: string): void {
  if (guard('theme-color')) return;
  const theme = getCurrentTheme();
  theme.tokens.primary = normalizeHexColor(color, theme.tokens.primary);
  theme.tokens.chartA = theme.tokens.primary;
  theme.colorMode = 'custom';
  syncLegacyThemeTokens(theme);
  applyThemeVariables();
  renderThemePanel();
}

function setDensity(density: ThemeDensity): void {
  if (guard('theme-density')) return;
  const theme = getCurrentTheme();
  theme.density = density;
  applyThemeVariables();
  renderThemePanel();
}

function setMotionMode(mode: MotionMode): void {
  if (guard('theme-motion')) return;
  const theme = getCurrentTheme();
  theme.motion = createMotionSettings(mode, theme.motion.reduced);
  applyThemeVariables();
  renderThemePanel();
}

function setReducedMotion(reduced: boolean): void {
  if (guard('theme-motion')) return;
  const theme = getCurrentTheme();
  theme.motion = createMotionSettings(theme.motion.mode, reduced);
  applyThemeVariables();
  renderThemePanel();
}

function resetAllThemes(): void {
  if (guard('reset-theme-all')) return;
  const state = getState();
  if (!state?.settings) return;
  state.settings.uiTheme = createThemeDefaults();
  applyThemeVariables();
  renderThemePanel();
}

function renderThemePanel(): void {
  const theme = getCurrentTheme();
  document.querySelectorAll<HTMLElement>('[data-style]').forEach(button => {
    button.classList.toggle('active', button.dataset.style === theme.styleId);
    button.setAttribute('aria-pressed', String(button.dataset.style === theme.styleId));
  });
  document.querySelectorAll<HTMLElement>('[data-density]').forEach(button => {
    button.classList.toggle('active', button.dataset.density === theme.density);
    button.setAttribute('aria-pressed', String(button.dataset.density === theme.density));
  });

  const accent = document.getElementById('themeAccentColor') as HTMLInputElement | null;
  const accentValue = document.getElementById('themeAccentValue');
  const motionMode = document.getElementById('motionMode') as HTMLSelectElement | null;
  const reducedMotion = document.getElementById('motionReduced') as HTMLInputElement | null;
  const preview = document.getElementById('themePreviewCard');
  if (accent) accent.value = theme.tokens.primary;
  if (accentValue) accentValue.textContent = theme.tokens.primary;
  if (motionMode) motionMode.value = theme.motion.mode;
  if (reducedMotion) reducedMotion.checked = theme.motion.reduced;
  if (preview) {
    preview.dataset.previewStyle = theme.styleId;
    preview.style.setProperty('--preview-primary', theme.tokens.primary);
    preview.style.setProperty('--preview-secondary', theme.tokens.secondary);
  }
}

function openThemeCenter(): void {
  ensureThemeSettings();
  applyThemeVariables();
  renderThemePanel();
  const modal = document.getElementById('themeModal');
  if (typeof legacyWindow.openLayerModal === 'function') {
    legacyWindow.openLayerModal(modal);
  } else {
    modal?.classList.remove('hidden');
  }
}

async function saveThemeSettings(): Promise<void> {
  if (guard('save-theme')) return;
  applyThemeVariables();
  if (typeof legacyWindow.persistProject === 'function') {
    await legacyWindow.persistProject();
  }
  const modal = document.getElementById('themeModal');
  if (typeof legacyWindow.closeLayerModal === 'function') {
    legacyWindow.closeLayerModal(modal);
  } else {
    modal?.classList.add('hidden');
  }
}

function bindThemePanelEvents(): void {
  const panel = document.getElementById('themeModal');
  if (!panel || panel.dataset.modernThemeBound === '1') return;
  panel.dataset.modernThemeBound = '1';

  document.getElementById('themeStylePresets')?.addEventListener('click', event => {
    const button = (event.target as Element).closest<HTMLElement>('[data-style]');
    if (button?.dataset.style === 'scientific-white' || button?.dataset.style === 'liquid-glass') {
      applyThemePreset(button.dataset.style);
    }
  });
  document.getElementById('themeDensityControls')?.addEventListener('click', event => {
    const button = (event.target as Element).closest<HTMLElement>('[data-density]');
    if (button?.dataset.density === 'comfortable' || button?.dataset.density === 'compact') {
      setDensity(button.dataset.density);
    }
  });
  document.getElementById('themeAccentColor')?.addEventListener('input', event => {
    setAccentColor((event.currentTarget as HTMLInputElement).value);
  });
  document.getElementById('motionMode')?.addEventListener('change', event => {
    const mode = (event.currentTarget as HTMLSelectElement).value;
    if (mode === 'off' || mode === 'minimal' || mode === 'standard') setMotionMode(mode);
  });
  document.getElementById('motionReduced')?.addEventListener('change', event => {
    setReducedMotion((event.currentTarget as HTMLInputElement).checked);
  });
  document.getElementById('btnResetThemeAll')?.addEventListener('click', resetAllThemes);
  document.getElementById('btnSaveTheme')?.addEventListener('click', () => {
    void saveThemeSettings().catch(() => {
      legacyWindow.toast?.(translate('themeSaveFailed', {
        zh: '界面设置保存失败，请稍后重试。',
        en: 'Could not save appearance settings. Please try again.'
      }));
    });
  });
}

export function installLegacyThemeBridge(): void {
  Object.assign(legacyWindow, {
    DEFAULT_UI_STYLE_ID,
    MOTION_MODE_PRESETS,
    THEME_DEFAULTS: createThemeDefaults(DEFAULT_UI_STYLE_ID),
    UI_STYLE_PRESETS,
    createThemeDefaults,
    ensureThemeSettings,
    getCurrentTheme,
    getThemeColor,
    hexToHsl,
    hslToHex,
    withLightness,
    applyThemeVariables,
    renderThemePanel,
    openThemeCenter,
    bindThemePanelEvents,
    saveThemeSettings
  });
}
