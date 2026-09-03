import type { ThemeSettings } from './contracts';
import { hexToRgba, readableTextColor, withLightness } from './color';

export interface ThemeDocumentSnapshot {
  datasets: Readonly<Record<string, string>>;
  classes: readonly string[];
  variables: Readonly<Record<string, string>>;
}

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
const MANAGED_CLASSES = [
  ...LEGACY_STYLE_CLASSES,
  'density-comfortable',
  'density-compact',
  'glass-mode-off',
  'glass-mode-light',
  'glass-mode-liquid',
  'glass-mode-solid',
  'glass-mode-regular',
  'glass-mode-clear',
  ...GLASS_SCOPE_CLASSES,
  'motion-mode-off',
  'motion-mode-minimal',
  'motion-mode-standard',
  'motion-mode-expressive',
  'motion-mode-rich',
  'motion-mode-custom',
  'motion-disabled',
  'motion-hover',
  'motion-modal',
  'motion-layout',
  'motion-theme',
  'motion-ambient',
  'progress-mode-compact',
  'progress-mode-display',
  'progress-glass'
];

export function createThemeDocumentSnapshot(theme: ThemeSettings): ThemeDocumentSnapshot {
  const { tokens, effects, glass, motion, progress, statusColors } = theme;
  const radius = effects.radius;
  const glassAlpha = glass.mode === 'solid' ? 100 : glass.opacity;
  const shadowAlpha = (0.04 + effects.shadowStrength / 1000).toFixed(3);
  const floatAlpha = (0.08 + effects.shadowStrength / 850).toFixed(3);
  const motionEnabled = motion.enabled && !motion.reduced;
  const motionDistance = motion.mode === 'expressive' ? 30 : motion.mode === 'standard' ? 22 : 12;
  const easing = motion.easing === 'emphasized'
    ? 'cubic-bezier(0.16, 1, 0.3, 1)'
    : 'cubic-bezier(0.2, 0.8, 0.2, 1)';
  const classes = [
    `theme-${theme.styleId}`,
    `density-${theme.density}`,
    `glass-mode-${glass.mode}`,
    `motion-mode-${motion.mode}`,
    ...Object.entries(glass.apply).filter(([, enabled]) => enabled).map(([scope]) => `glass-apply-${scope}`),
    ...(!motionEnabled ? ['motion-disabled'] : []),
    ...(motionEnabled && motion.hover ? ['motion-hover'] : []),
    ...(motionEnabled && motion.modal ? ['motion-modal'] : []),
    ...(motionEnabled && motion.layout ? ['motion-layout'] : []),
    ...(motionEnabled && motion.themeTransition ? ['motion-theme'] : []),
    ...(motionEnabled && motion.ambient ? ['motion-ambient'] : []),
    ...(progress.mode === 'compact' ? ['progress-mode-compact'] : []),
    ...(progress.mode === 'display' ? ['progress-mode-display'] : []),
    ...(progress.glass ? ['progress-glass'] : [])
  ];
  const variables: Record<string, string> = {
    '--ui-style-id': theme.styleId,
    '--ui-layout-id': 'map-workbench',
    '--app-bg': tokens.appBg,
    '--app-bg-soft': tokens.appBgSoft,
    '--panel-bg': tokens.panelBg,
    '--panel-bg-soft': tokens.panelBgSoft,
    '--glass-base': tokens.glassBase,
    '--glass-bg': hexToRgba(tokens.glassBase, glassAlpha),
    '--glass-bg-strong': hexToRgba(tokens.glassBase, Math.min(96, glassAlpha + 14)),
    '--glass-control-bg': hexToRgba(tokens.glassBase, glass.mode === 'solid' ? 96 : 82),
    '--glass-floating-bg': hexToRgba(tokens.glassBase, glass.mode === 'clear' ? 48 : Math.min(92, glassAlpha)),
    '--glass-highlight': hexToRgba(tokens.glassHighlight, glass.highlight),
    '--glass-border': hexToRgba(tokens.glassHighlight, Math.max(18, glass.highlight)),
    '--glass-border-soft': hexToRgba(tokens.glassHighlight, Math.max(12, glass.highlight - 18)),
    '--glass-blur': `${glass.blur}px`,
    '--glass-opacity': (glassAlpha / 100).toFixed(2),
    '--glass-saturation': `${glass.saturate}%`,
    '--glass-effect-shadow-alpha': (glass.shadow / 100).toFixed(2),
    '--glass-brightness': `${glass.brightness}%`,
    '--primary': tokens.primary,
    '--primary-hover': withLightness(tokens.primary, -10),
    '--primary-soft': hexToRgba(tokens.primary, 14),
    '--primary-contrast': readableTextColor(tokens.primary),
    '--secondary': tokens.secondary,
    '--secondary-soft': hexToRgba(tokens.secondary, 14),
    '--accent': tokens.accent,
    '--accent-soft': hexToRgba(tokens.accent, 13),
    '--success': tokens.success,
    '--success-soft': hexToRgba(tokens.success, 13),
    '--warning': tokens.warning,
    '--warning-soft': hexToRgba(tokens.warning, 15),
    '--danger': tokens.danger,
    '--danger-hover': withLightness(tokens.danger, -10),
    '--danger-soft': hexToRgba(tokens.danger, 14),
    '--danger-contrast': readableTextColor(tokens.danger),
    '--text-main': tokens.textMain,
    '--text-secondary': tokens.textSecondary,
    '--text-muted': hexToRgba(tokens.textSecondary, 74),
    '--text-inverse': '#FFFFFF',
    '--chart-a': tokens.chartA,
    '--chart-b': tokens.chartB,
    '--chart-c': tokens.chartC,
    '--chart-d': tokens.chartD,
    '--chart-grid': hexToRgba(tokens.textSecondary, 18),
    '--chart-axis': hexToRgba(tokens.textSecondary, 52),
    '--chart-label': tokens.textSecondary,
    '--status-success': statusColors.success,
    '--status-danger': statusColors.danger,
    '--status-warning': statusColors.warning,
    '--status-unknown': statusColors.unknown,
    '--toggle-on': statusColors.enabled,
    '--toggle-off': statusColors.disabled,
    '--progress-height': `${progress.height}px`,
    '--progress-radius': `${progress.radius}px`,
    '--progress-speed': `${progress.speed}ms`,
    '--motion-speed': String(motion.speedMultiplier),
    '--motion-duration-fast': `${motionEnabled ? motion.fadeDuration : 0}ms`,
    '--motion-duration': `${motionEnabled ? motion.transitionDuration : 0}ms`,
    '--motion-duration-modal': `${motionEnabled ? motion.modalDuration : 0}ms`,
    '--motion-duration-reveal': `${motionEnabled ? Math.max(motion.modalDuration, motion.transitionDuration) : 0}ms`,
    '--motion-stagger': `${motionEnabled ? motion.stagger : 0}ms`,
    '--motion-scale-enter': String(motionEnabled ? motion.scaleEnter : 1),
    '--motion-scale-press': String(motionEnabled ? motion.scalePress : 1),
    '--motion-hover-lift': `${motionEnabled ? motion.hoverLift : 0}px`,
    '--motion-ease': easing,
    '--motion-ease-standard': 'cubic-bezier(0.2, 0.8, 0.2, 1)',
    '--motion-ease-emphasized': 'cubic-bezier(0.16, 1, 0.3, 1)',
    '--motion-dialog-translate-y': `${motionEnabled ? motionDistance : 0}px`,
    '--motion-panel-translate-x': `${motionEnabled ? motionDistance + 8 : 0}px`,
    '--motion-subpanel-translate': `${motionEnabled ? Math.max(10, motionDistance - 4) : 0}px`,
    '--motion-surface-translate-y': `${motionEnabled ? Math.max(10, motionDistance - 6) : 0}px`,
    '--motion-overlay-opacity': motionEnabled ? '0.34' : '0',
    '--motion-feedback-strength': motion.feedback === 'strong' ? '1' : motion.feedback === 'balanced' ? '0.65' : '0.35',
    '--radius-sm': `${Math.max(6, radius - 2)}px`,
    '--radius-md': `${radius}px`,
    '--radius-lg': `${radius}px`,
    '--radius-xl': `${radius}px`,
    '--radius-control': `${radius}px`,
    '--radius-functional': `${Math.max(12, radius + 2)}px`,
    '--radius-window': `${Math.max(16, radius + 6)}px`,
    '--shadow-soft': `0 8px 24px rgba(31, 52, 47, ${shadowAlpha})`,
    '--shadow-card': `0 14px 36px rgba(31, 52, 47, ${floatAlpha})`,
    '--shadow-float': `0 20px 52px rgba(31, 52, 47, ${Math.min(0.18, Number(floatAlpha) + 0.04)})`,
    '--glass-shadow': `0 18px 44px rgba(31, 72, 64, ${Math.max(Number(floatAlpha), glass.shadow / 100).toFixed(2)})`,
    '--theme-primary': tokens.primary,
    '--theme-primary-soft': hexToRgba(tokens.primary, 16),
    '--theme-workspace': tokens.secondary,
    '--theme-workspace-soft': hexToRgba(tokens.secondary, 16),
    '--theme-accent-ui': tokens.accent,
    '--theme-accent-ui-soft': hexToRgba(tokens.accent, 14),
    '--theme-chart-a': tokens.chartA,
    '--theme-chart-a-soft': hexToRgba(tokens.chartA, 16),
    '--theme-chart-b': tokens.chartB,
    '--theme-chart-b-soft': hexToRgba(tokens.chartB, 16),
    '--brand-logo-color': tokens.primary,
    '--brand-logo-shadow': `0 8px 18px ${hexToRgba(tokens.primary, 24)}`
  };

  return {
    datasets: {
      uiStyle: theme.styleId,
      uiLayout: 'map-workbench',
      uiDensity: theme.density,
      motionProfile: motion.mode,
      motionFeedback: motion.feedback,
      motionAmbient: String(motionEnabled && motion.ambient)
    },
    classes,
    variables
  };
}

export function applyThemeToDocument(root: HTMLElement, theme: ThemeSettings): ThemeDocumentSnapshot {
  const snapshot = createThemeDocumentSnapshot(theme);
  Object.entries(snapshot.datasets).forEach(([name, value]) => {
    root.dataset[name] = value;
  });
  root.classList.remove(...MANAGED_CLASSES);
  root.classList.add(...snapshot.classes);
  Object.entries(snapshot.variables).forEach(([name, value]) => {
    root.style.setProperty(name, value);
  });
  return snapshot;
}
