import type {
  GlassSettings,
  MotionMode,
  MotionSettings,
  ProgressSettings,
  ThemePreset,
  ThemeStyleId
} from './contracts';

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

export const DEFAULT_PROGRESS: ProgressSettings = {
  height: 8,
  radius: 999,
  speed: 260,
  showPercent: true,
  showStage: true,
  mode: 'standard',
  glass: false
};

export const LEGACY_STYLE_MAP: Readonly<Record<string, ThemeStyleId>> = Object.freeze({
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
});
