import {
  DEFAULT_UI_STYLE_ID,
  MOTION_MODE_PRESETS,
  UI_STYLE_PRESETS,
  createThemeDefaults
} from './model';
import { hexToHsl, hslToHex, withLightness } from './color';
import {
  applyThemeVariables,
  bindThemePanelEvents,
  ensureThemeSettings,
  getCurrentTheme,
  getThemeColor,
  openThemeCenter,
  renderThemePanel,
  saveThemeSettings
} from './controller';
import { legacyWindow } from './legacyEnvironment';

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
