export type ThemeStyleId = 'scientific-white' | 'liquid-glass';
export type ThemeDensity = 'comfortable' | 'compact';
export type MotionMode = 'off' | 'minimal' | 'standard' | 'expressive';
export type MotionFeedback = 'soft' | 'balanced' | 'strong';
export type GlassMaterial = 'solid' | 'regular' | 'clear';

export interface ThemeTokens {
  primary: string;
  secondary: string;
  accent: string;
  appBg: string;
  appBgSoft: string;
  panelBg: string;
  panelBgSoft: string;
  glassBase: string;
  glassHighlight: string;
  chartA: string;
  chartB: string;
  chartC: string;
  chartD: string;
  success: string;
  warning: string;
  danger: string;
  textMain: string;
  textSecondary: string;
}

export interface ThemeEffects {
  glassOpacity: number;
  glassBlur: number;
  radius: number;
  shadowStrength: number;
  contrast: number;
}

export interface GlassSettings {
  mode: GlassMaterial;
  opacity: number;
  blur: number;
  saturate: number;
  highlight: number;
  shadow: number;
  brightness: number;
  apply: Record<'modules' | 'controls' | 'mapBadges' | 'charts' | 'settings', boolean>;
}

export interface MotionSettings {
  mode: MotionMode;
  speedMultiplier: number;
  fadeDuration: number;
  transitionDuration: number;
  modalDuration: number;
  stagger: number;
  scaleEnter: number;
  scalePress: number;
  hoverLift: number;
  easing: 'standard' | 'emphasized';
  hover: boolean;
  modal: boolean;
  layout: boolean;
  themeTransition: boolean;
  ambient: boolean;
  feedback: MotionFeedback;
  reduced: boolean;
  enabled: boolean;
}

export interface ProgressSettings {
  height: number;
  radius: number;
  speed: number;
  showPercent: boolean;
  showStage: boolean;
  mode: 'compact' | 'standard' | 'display';
  glass: boolean;
}

export interface ThemeSettings {
  styleId: ThemeStyleId;
  density: ThemeDensity;
  colorMode: 'preset' | 'custom';
  tokens: ThemeTokens;
  effects: ThemeEffects;
  layoutId: 'map-workbench';
  glass: GlassSettings;
  brand: {
    style: 'theme';
    display: 'auto';
    hue: number;
    saturation: number;
    lightness: number;
  };
  progress: ProgressSettings;
  motion: MotionSettings;
  statusColors: {
    success: string;
    danger: string;
    warning: string;
    unknown: string;
    enabled: string;
    disabled: string;
  };
  primary: string;
  workspace: string;
  accent: string;
  chartA: string;
  chartB: string;
}

interface ThemePreset {
  label: { zh: string; en: string };
  description: { zh: string; en: string };
  tokens: ThemeTokens;
  effects: ThemeEffects;
  glass: GlassSettings;
}

const GLASS_SCOPE_DEFAULTS = Object.freeze({
  modules: false,
  controls: true,
  mapBadges: true,
  charts: false,
  settings: true
});

const SCIENTIFIC_GLASS: GlassSettings = {
  mode: 'solid',
  opacity: 96,
  blur: 0,
  saturate: 100,
  highlight: 24,
  shadow: 6,
  brightness: 0,
  apply: { ...GLASS_SCOPE_DEFAULTS, controls: false, charts: false }
};

const LIQUID_GLASS: GlassSettings = {
  mode: 'regular',
  opacity: 78,
  blur: 22,
  saturate: 138,
  highlight: 58,
  shadow: 15,
  brightness: 3,
  apply: {
    modules: false,
    controls: true,
    mapBadges: true,
    charts: false,
    settings: true
  }
};

export const UI_STYLE_PRESETS: Readonly<Record<ThemeStyleId, ThemePreset>> = Object.freeze({
  'scientific-white': {
    label: { zh: '科研白底', en: 'Scientific White' },
    description: {
      zh: '清晰、低干扰，适合长期录入与研究核对',
      en: 'Clear and restrained for research review and daily records'
    },
    tokens: {
      primary: '#2F6F62',
      secondary: '#4D8E91',
      accent: '#5B7FA3',
      appBg: '#F4F7F6',
      appBgSoft: '#FBFCFC',
      panelBg: '#FFFFFF',
      panelBgSoft: '#F7FAF9',
      glassBase: '#F1F5F4',
      glassHighlight: '#FFFFFF',
      chartA: '#2F6F62',
      chartB: '#4D8E91',
      chartC: '#7D9D63',
      chartD: '#5B7FA3',
      success: '#3F8C68',
      warning: '#B48632',
      danger: '#BA525D',
      textMain: '#1F2A27',
      textSecondary: '#5E6B67'
    },
    effects: {
      glassOpacity: 92,
      glassBlur: 8,
      radius: 8,
      shadowStrength: 12,
      contrast: 88
    },
    glass: SCIENTIFIC_GLASS
  },
  'liquid-glass': {
    label: { zh: '液态玻璃', en: 'Liquid Glass' },
    description: {
      zh: '明亮通透，强化空间层级与操作反馈',
      en: 'Bright translucent surfaces with stronger spatial depth'
    },
    tokens: {
      primary: '#167A70',
      secondary: '#368A9A',
      accent: '#557FA6',
      appBg: '#EAF3F1',
      appBgSoft: '#F6FAF9',
      panelBg: '#F8FCFB',
      panelBgSoft: '#EEF6F4',
      glassBase: '#E8F3F1',
      glassHighlight: '#FFFFFF',
      chartA: '#167A70',
      chartB: '#368A9A',
      chartC: '#72A15D',
      chartD: '#557FA6',
      success: '#278761',
      warning: '#B47E25',
      danger: '#B94D59',
      textMain: '#18302C',
      textSecondary: '#526B66'
    },
    effects: {
      glassOpacity: 58,
      glassBlur: 24,
      radius: 12,
      shadowStrength: 26,
      contrast: 78
    },
    glass: LIQUID_GLASS
  }
});

export const DEFAULT_UI_STYLE_ID: ThemeStyleId = 'scientific-white';

export const MOTION_MODE_PRESETS: Readonly<Record<MotionMode, Omit<MotionSettings, 'mode' | 'reduced' | 'enabled'>>> =
  Object.freeze({
    off: {
      speedMultiplier: 1,
      fadeDuration: 0,
      transitionDuration: 0,
      modalDuration: 0,
      stagger: 0,
      scaleEnter: 1,
      scalePress: 1,
      hoverLift: 0,
      easing: 'standard',
      hover: false,
      modal: false,
      layout: false,
      themeTransition: false,
      ambient: false,
      feedback: 'soft'
    },
    minimal: {
      speedMultiplier: 1,
      fadeDuration: 320,
      transitionDuration: 400,
      modalDuration: 500,
      stagger: 48,
      scaleEnter: 0.992,
      scalePress: 0.99,
      hoverLift: 1,
      easing: 'standard',
      hover: true,
      modal: true,
      layout: false,
      themeTransition: false,
      ambient: false,
      feedback: 'soft'
    },
    standard: {
      speedMultiplier: 1,
      fadeDuration: 440,
      transitionDuration: 580,
      modalDuration: 720,
      stagger: 72,
      scaleEnter: 0.97,
      scalePress: 0.975,
      hoverLift: 2,
      easing: 'emphasized',
      hover: true,
      modal: true,
      layout: true,
      themeTransition: true,
      ambient: true,
      feedback: 'balanced'
    },
    expressive: {
      speedMultiplier: 1,
      fadeDuration: 620,
      transitionDuration: 860,
      modalDuration: 1040,
      stagger: 92,
      scaleEnter: 0.955,
      scalePress: 0.965,
      hoverLift: 3,
      easing: 'emphasized',
      hover: true,
      modal: true,
      layout: true,
      themeTransition: true,
      ambient: true,
      feedback: 'strong'
    }
  });

const DEFAULT_PROGRESS: ProgressSettings = {
  height: 8,
  radius: 999,
  speed: 260,
  showPercent: true,
  showStage: true,
  mode: 'standard',
  glass: false
};

const LEGACY_STYLE_MAP: Record<string, ThemeStyleId> = {
  'scientific-white': 'scientific-white',
  'botanical-scientific': 'scientific-white',
  'field-notebook': 'scientific-white',
  'linear-minimal': 'scientific-white',
  'academic-light': 'scientific-white',
  'minimal-white': 'scientific-white',
  'nordic-minimal': 'scientific-white',
  'liquid-glass': 'liquid-glass',
  'glass-blue': 'liquid-glass',
  'deep-slate': 'liquid-glass',
  'flow-data': 'liquid-glass',
  'lavender-soft': 'liquid-glass',
  'dimensional-chart': 'liquid-glass',
  'pastel-data': 'liquid-glass'
};

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function cloneGlass(value: GlassSettings): GlassSettings {
  return { ...value, apply: { ...value.apply } };
}

function finiteNumber(value: unknown, fallback: number, min: number, max: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export function normalizeHexColor(value: unknown, fallback: string): string {
  const candidate = String(value ?? '').trim();
  return HEX_COLOR.test(candidate) ? candidate.toUpperCase() : fallback.toUpperCase();
}

export function normalizeThemeStyleId(value: unknown): ThemeStyleId {
  return LEGACY_STYLE_MAP[String(value ?? '')] ?? DEFAULT_UI_STYLE_ID;
}

export function normalizeMotionSettings(value: Record<string, unknown> = {}): MotionSettings {
  const legacyMode = value.enabled === false
    ? 'off'
    : value.strength === 'light'
      ? 'minimal'
      : value.strength === 'rich'
      ? 'expressive'
        : value.mode;
  const mode: MotionMode = legacyMode === 'off'
    || legacyMode === 'minimal'
    || legacyMode === 'standard'
    || legacyMode === 'expressive'
    ? legacyMode
    : 'expressive';
  const preset = MOTION_MODE_PRESETS[mode];
  const reduced = booleanValue(value.reduced, false);
  const durationFloor = mode === 'expressive'
    ? { fade: 560, transition: 720, modal: 880 }
    : mode === 'standard'
      ? { fade: 440, transition: 580, modal: 720 }
    : mode === 'minimal'
      ? { fade: 300, transition: 360, modal: 440 }
      : { fade: 0, transition: 0, modal: 0 };
  return {
    mode,
    speedMultiplier: finiteNumber(value.speedMultiplier, preset.speedMultiplier, 0.5, 1.5),
    fadeDuration: mode === 'off' ? 0 : finiteNumber(value.fadeDuration, preset.fadeDuration, durationFloor.fade, 900),
    transitionDuration: mode === 'off' ? 0 : finiteNumber(value.transitionDuration, preset.transitionDuration, durationFloor.transition, 1100),
    modalDuration: mode === 'off' ? 0 : finiteNumber(value.modalDuration, preset.modalDuration, durationFloor.modal, 1400),
    stagger: finiteNumber(value.stagger, preset.stagger, 0, 180),
    scaleEnter: finiteNumber(value.scaleEnter, preset.scaleEnter, 0.94, 1),
    scalePress: finiteNumber(value.scalePress, preset.scalePress, 0.94, 1),
    hoverLift: finiteNumber(value.hoverLift, preset.hoverLift, 0, 6),
    easing: value.easing === 'standard' || value.easing === 'emphasized' ? value.easing : preset.easing,
    hover: booleanValue(value.hover, preset.hover),
    modal: booleanValue(value.modal, preset.modal),
    layout: booleanValue(value.layout, preset.layout),
    themeTransition: booleanValue(value.themeTransition, preset.themeTransition),
    ambient: booleanValue(value.ambient, preset.ambient),
    feedback: value.feedback === 'soft' || value.feedback === 'balanced' || value.feedback === 'strong'
      ? value.feedback
      : preset.feedback,
    reduced,
    enabled: mode !== 'off' && !reduced
  };
}

export function createMotionSettings(mode: MotionMode, reduced = false): MotionSettings {
  return normalizeMotionSettings({ ...MOTION_MODE_PRESETS[mode], mode, reduced });
}

export function createThemeDefaults(styleId: unknown = DEFAULT_UI_STYLE_ID): ThemeSettings {
  const resolvedStyleId = normalizeThemeStyleId(styleId);
  const preset = UI_STYLE_PRESETS[resolvedStyleId];
  const theme: ThemeSettings = {
    styleId: resolvedStyleId,
    density: 'comfortable',
    colorMode: 'preset',
    tokens: { ...preset.tokens },
    effects: { ...preset.effects },
    layoutId: 'map-workbench',
    glass: cloneGlass(preset.glass),
    brand: {
      style: 'theme',
      display: 'auto',
      hue: 356,
      saturation: 72,
      lightness: 42
    },
    progress: { ...DEFAULT_PROGRESS },
    motion: createMotionSettings('expressive'),
    statusColors: {
      success: preset.tokens.success,
      danger: preset.tokens.danger,
      warning: preset.tokens.warning,
      unknown: '#7D8985',
      enabled: preset.tokens.success,
      disabled: preset.tokens.danger
    },
    primary: preset.tokens.primary,
    workspace: preset.tokens.secondary,
    accent: preset.tokens.accent,
    chartA: preset.tokens.chartA,
    chartB: preset.tokens.chartB
  };
  return theme;
}

export function normalizeThemeSettings(value: unknown): ThemeSettings {
  const incoming = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const defaults = createThemeDefaults(incoming.styleId);
  const incomingTokens = incoming.tokens && typeof incoming.tokens === 'object'
    ? incoming.tokens as Record<string, unknown>
    : {};
  const legacyTokenMap: Record<string, keyof ThemeTokens> = {
    primary: 'primary',
    workspace: 'secondary',
    accent: 'accent',
    chartA: 'chartA',
    chartB: 'chartB'
  };
  const tokens = { ...defaults.tokens };
  (Object.keys(tokens) as Array<keyof ThemeTokens>).forEach(key => {
    tokens[key] = normalizeHexColor(incomingTokens[key], tokens[key]);
  });
  Object.entries(legacyTokenMap).forEach(([legacyKey, tokenKey]) => {
    if (typeof incoming[legacyKey] === 'string') {
      tokens[tokenKey] = normalizeHexColor(incoming[legacyKey], tokens[tokenKey]);
    }
  });

  const effectsInput = incoming.effects && typeof incoming.effects === 'object'
    ? incoming.effects as Record<string, unknown>
    : {};
  const glassInput = incoming.glass && typeof incoming.glass === 'object'
    ? incoming.glass as Record<string, unknown>
    : {};
  const progressInput = incoming.progress && typeof incoming.progress === 'object'
    ? incoming.progress as Record<string, unknown>
    : {};
  const statusInput = incoming.statusColors && typeof incoming.statusColors === 'object'
    ? incoming.statusColors as Record<string, unknown>
    : {};

  const legacyGlassModes: Record<string, GlassMaterial> = {
    off: 'solid',
    light: 'regular',
    standard: 'regular',
    liquid: 'clear',
    dark: 'regular',
    bright: 'regular',
    solid: 'solid',
    regular: 'regular',
    clear: 'clear'
  };
  const glassMode = legacyGlassModes[String(glassInput.mode ?? '')] ?? defaults.glass.mode;
  const glassApply = glassInput.apply && typeof glassInput.apply === 'object'
    ? glassInput.apply as Record<string, unknown>
    : {};
  const glass: GlassSettings = {
    mode: glassMode,
    opacity: finiteNumber(glassInput.opacity, defaults.glass.opacity, 0, 96),
    blur: finiteNumber(glassInput.blur, defaults.glass.blur, 0, 32),
    saturate: finiteNumber(glassInput.saturate, defaults.glass.saturate, 90, 180),
    highlight: finiteNumber(glassInput.highlight, defaults.glass.highlight, 0, 80),
    shadow: finiteNumber(glassInput.shadow, defaults.glass.shadow, 0, 32),
    brightness: finiteNumber(glassInput.brightness, defaults.glass.brightness, -12, 16),
    apply: {
      modules: booleanValue(glassApply.modules, defaults.glass.apply.modules),
      controls: booleanValue(glassApply.controls, defaults.glass.apply.controls),
      mapBadges: booleanValue(glassApply.mapBadges, defaults.glass.apply.mapBadges),
      charts: booleanValue(glassApply.charts, defaults.glass.apply.charts),
      settings: booleanValue(glassApply.settings, defaults.glass.apply.settings)
    }
  };

  const theme: ThemeSettings = {
    ...defaults,
    density: incoming.density === 'compact' ? 'compact' : 'comfortable',
    colorMode: incoming.colorMode === 'custom' ? 'custom' : 'preset',
    tokens,
    effects: {
      glassOpacity: finiteNumber(effectsInput.glassOpacity, defaults.effects.glassOpacity, 0, 96),
      glassBlur: finiteNumber(effectsInput.glassBlur, defaults.effects.glassBlur, 0, 40),
      radius: finiteNumber(effectsInput.radius, defaults.effects.radius, 6, 12),
      shadowStrength: finiteNumber(effectsInput.shadowStrength, defaults.effects.shadowStrength, 0, 60),
      contrast: finiteNumber(effectsInput.contrast, defaults.effects.contrast, 50, 100)
    },
    glass,
    progress: {
      height: finiteNumber(progressInput.height, defaults.progress.height, 4, 16),
      radius: finiteNumber(progressInput.radius, defaults.progress.radius, 2, 999),
      speed: finiteNumber(progressInput.speed, defaults.progress.speed, 120, 900),
      showPercent: booleanValue(progressInput.showPercent, defaults.progress.showPercent),
      showStage: booleanValue(progressInput.showStage, defaults.progress.showStage),
      mode: progressInput.mode === 'compact' || progressInput.mode === 'display'
        ? progressInput.mode
        : 'standard',
      glass: booleanValue(progressInput.glass, defaults.progress.glass)
    },
    motion: normalizeMotionSettings(
      incoming.motion && typeof incoming.motion === 'object'
        ? incoming.motion as Record<string, unknown>
        : {}
    ),
    statusColors: {
      success: normalizeHexColor(statusInput.success, tokens.success),
      danger: normalizeHexColor(statusInput.danger, tokens.danger),
      warning: normalizeHexColor(statusInput.warning, tokens.warning),
      unknown: normalizeHexColor(statusInput.unknown, defaults.statusColors.unknown),
      enabled: normalizeHexColor(statusInput.enabled, tokens.success),
      disabled: normalizeHexColor(statusInput.disabled, tokens.danger)
    }
  };
  syncLegacyThemeTokens(theme);
  return theme;
}

export function syncLegacyThemeTokens(theme: ThemeSettings): void {
  theme.primary = theme.tokens.primary;
  theme.workspace = theme.tokens.secondary;
  theme.accent = theme.tokens.accent;
  theme.chartA = theme.tokens.chartA;
  theme.chartB = theme.tokens.chartB;
}
