export type {
  GlassMaterial,
  GlassSettings,
  MotionFeedback,
  MotionMode,
  MotionSettings,
  ProgressSettings,
  ThemeDensity,
  ThemeEffects,
  ThemeSettings,
  ThemeStyleId,
  ThemeTokens
} from './contracts';
export {
  DEFAULT_UI_STYLE_ID,
  MOTION_MODE_PRESETS,
  UI_STYLE_PRESETS
} from './presets';
export {
  createMotionSettings,
  createThemeDefaults,
  normalizeHexColor,
  normalizeMotionSettings,
  normalizeThemeSettings,
  normalizeThemeStyleId,
  syncLegacyThemeTokens
} from './normalization';
