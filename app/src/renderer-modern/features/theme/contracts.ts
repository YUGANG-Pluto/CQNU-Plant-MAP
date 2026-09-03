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

export interface ThemePreset {
  label: { zh: string; en: string };
  description: { zh: string; en: string };
  tokens: ThemeTokens;
  effects: ThemeEffects;
  glass: GlassSettings;
}
