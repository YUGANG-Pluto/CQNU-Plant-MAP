import {
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
import { applyThemeToDocument } from './document';
import { getState, guard, legacyWindow, translate } from './legacyEnvironment';

export function ensureThemeSettings(): void {
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

export function getCurrentTheme(): ThemeSettings {
  ensureThemeSettings();
  const state = getState();
  if (!state?.settings) return createThemeDefaults();
  return state.settings.uiTheme as ThemeSettings;
}

export function getThemeColor(slot: string): string {
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

export function applyThemeVariables(): void {
  const state = getState();
  if (!state?.settings) return;
  applyThemeToDocument(document.documentElement, getCurrentTheme());
  legacyWindow.cqnuMotionKernel?.refresh?.();
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

function setGlassMode(mode: ThemeSettings['glass']['mode']): void {
  if (guard('theme-glass')) return;
  const theme = getCurrentTheme();
  const base = UI_STYLE_PRESETS['liquid-glass'].glass;
  const preset = mode === 'clear'
    ? { ...base, mode, opacity: 50, blur: 28, saturate: 150, highlight: 68, shadow: 18 }
    : mode === 'regular'
      ? { ...base, mode }
      : { ...UI_STYLE_PRESETS['scientific-white'].glass, mode };
  theme.glass = {
    ...preset,
    mode,
    apply: { ...preset.apply }
  };
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

function setMotionFeedback(feedback: ThemeSettings['motion']['feedback']): void {
  if (guard('theme-motion')) return;
  const theme = getCurrentTheme();
  theme.motion.feedback = feedback;
  applyThemeVariables();
  renderThemePanel();
}

function setMotionAmbient(ambient: boolean): void {
  if (guard('theme-motion')) return;
  const theme = getCurrentTheme();
  theme.motion.ambient = ambient;
  applyThemeVariables();
  renderThemePanel();
}

function setReducedMotion(reduced: boolean): void {
  if (guard('theme-motion')) return;
  const theme = getCurrentTheme();
  theme.motion = {
    ...createMotionSettings(theme.motion.mode, reduced),
    ambient: theme.motion.ambient,
    feedback: theme.motion.feedback
  };
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

export function renderThemePanel(): void {
  const theme = getCurrentTheme();
  document.querySelectorAll<HTMLElement>('[data-style]').forEach(button => {
    button.classList.toggle('active', button.dataset.style === theme.styleId);
    button.setAttribute('aria-pressed', String(button.dataset.style === theme.styleId));
  });
  document.querySelectorAll<HTMLElement>('[data-density]').forEach(button => {
    button.classList.toggle('active', button.dataset.density === theme.density);
    button.setAttribute('aria-pressed', String(button.dataset.density === theme.density));
  });
  document.querySelectorAll<HTMLElement>('[data-glass-mode]').forEach(button => {
    const active = button.dataset.glassMode === theme.glass.mode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  document.querySelectorAll<HTMLElement>('[data-motion-mode]').forEach(button => {
    const active = button.dataset.motionMode === theme.motion.mode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  document.querySelectorAll<HTMLElement>('[data-motion-feedback]').forEach(button => {
    const active = button.dataset.motionFeedback === theme.motion.feedback;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });

  const accent = document.getElementById('themeAccentColor') as HTMLInputElement | null;
  const accentValue = document.getElementById('themeAccentValue');
  const motionAmbient = document.getElementById('motionAmbient') as HTMLInputElement | null;
  const reducedMotion = document.getElementById('motionReduced') as HTMLInputElement | null;
  if (accent) accent.value = theme.tokens.primary;
  if (accentValue) accentValue.textContent = theme.tokens.primary;
  if (motionAmbient) motionAmbient.checked = theme.motion.ambient;
  if (reducedMotion) reducedMotion.checked = theme.motion.reduced;
}

export function openThemeCenter(): void {
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

export async function saveThemeSettings(): Promise<void> {
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

export function bindThemePanelEvents(): void {
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
  document.getElementById('themeGlassControls')?.addEventListener('click', event => {
    const button = (event.target as Element).closest<HTMLElement>('[data-glass-mode]');
    const mode = button?.dataset.glassMode;
    if (mode === 'solid' || mode === 'regular' || mode === 'clear') setGlassMode(mode);
  });
  document.getElementById('themeAccentColor')?.addEventListener('input', event => {
    setAccentColor((event.currentTarget as HTMLInputElement).value);
  });
  document.getElementById('motionModeControls')?.addEventListener('click', event => {
    const button = (event.target as Element).closest<HTMLElement>('[data-motion-mode]');
    const mode = button?.dataset.motionMode;
    if (mode === 'off' || mode === 'minimal' || mode === 'standard' || mode === 'expressive') setMotionMode(mode);
  });
  document.getElementById('motionFeedbackControls')?.addEventListener('click', event => {
    const button = (event.target as Element).closest<HTMLElement>('[data-motion-feedback]');
    const feedback = button?.dataset.motionFeedback;
    if (feedback === 'soft' || feedback === 'balanced' || feedback === 'strong') setMotionFeedback(feedback);
  });
  document.getElementById('motionAmbient')?.addEventListener('change', event => {
    setMotionAmbient((event.currentTarget as HTMLInputElement).checked);
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
