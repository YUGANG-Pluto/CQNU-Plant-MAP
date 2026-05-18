const THEME_DEFAULTS = createThemeDefaults(DEFAULT_UI_STYLE_ID);
const MORANDI_PRESETS = ['#9ca9b1', '#b6a7b2', '#c9b39f', '#aab5a0', '#c2b7ab', '#8f9ca6'];
const MACARON_PRESETS = ['#f2c8c6', '#f6d9b8', '#d6e6c3', '#c9dcf2', '#d8c9ea', '#f2d0e0'];

function normalizeThemeStyleId(styleId) {
  const mapped = LEGACY_UI_STYLE_MAP[styleId] || styleId;
  return UI_STYLE_PRESETS[mapped] ? mapped : DEFAULT_UI_STYLE_ID;
}

function normalizeThemeLayoutId(layoutId) {
  return UI_LAYOUT_PRESETS[layoutId] ? layoutId : DEFAULT_UI_LAYOUT_ID;
}

function createThemeDefaults(styleId) {
  const resolvedStyleId = normalizeThemeStyleId(styleId);
  const preset = UI_STYLE_PRESETS[resolvedStyleId];
  return {
    styleId: resolvedStyleId,
    colorMode: 'preset',
    tokens: { ...preset.tokens },
    effects: { ...preset.effects },
    layoutId: DEFAULT_UI_LAYOUT_ID,
    glass: cloneDefaultGlassSettings(),
    brand: cloneDefaultBrandIcon(),
    progress: { ...DEFAULT_PROGRESS_UI },
    motion: { ...DEFAULT_MOTION_UI },
    statusColors: { ...DEFAULT_STATUS_COLORS }
  };
}

function normalizeHexColor(value, fallback = '#000000') {
  const text = String(value || '').trim();
  if (/^#[0-9a-f]{6}$/i.test(text)) {
    return text.toUpperCase();
  }

  if (/^#[0-9a-f]{3}$/i.test(text)) {
    return `#${text[1]}${text[1]}${text[2]}${text[2]}${text[3]}${text[3]}`.toUpperCase();
  }

  return fallback.toUpperCase();
}

function hexToRgb(hex) {
  const clean = normalizeHexColor(hex).slice(1);
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16)
  };
}

function rgbToHex(r, g, b) {
  return `#${[r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('')}`
    .toUpperCase();
}

function hexToRgba(hex, alphaPercent) {
  const { r, g, b } = hexToRgb(hex);
  const alpha = clamp(Number(alphaPercent) / 100, 0, 1).toFixed(2);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function hexToHsl(hex) {
  const { r, g, b } = hexToRgb(hex);
  const rp = r / 255;
  const gp = g / 255;
  const bp = b / 255;
  const max = Math.max(rp, gp, bp);
  const min = Math.min(rp, gp, bp);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rp) h = (gp - bp) / d + (gp < bp ? 6 : 0);
    if (max === gp) h = (bp - rp) / d + 2;
    if (max === bp) h = (rp - gp) / d + 4;
    h *= 60;
  }

  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

function hslToHex(h, s, l) {
  const hue = ((Number(h) % 360) + 360) % 360;
  const sat = clamp(Number(s), 0, 100) / 100;
  const light = clamp(Number(l), 0, 100) / 100;
  const chroma = (1 - Math.abs(2 * light - 1)) * sat;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = light - chroma / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (hue < 60) [r, g, b] = [chroma, x, 0];
  else if (hue < 120) [r, g, b] = [x, chroma, 0];
  else if (hue < 180) [r, g, b] = [0, chroma, x];
  else if (hue < 240) [r, g, b] = [0, x, chroma];
  else if (hue < 300) [r, g, b] = [x, 0, chroma];
  else [r, g, b] = [chroma, 0, x];

  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

function clamp(value, min, max) {
  const num = Number(value);
  if (!Number.isFinite(num)) return min;
  return Math.min(max, Math.max(min, num));
}

function withLightness(hex, amount) {
  const hsl = hexToHsl(hex);
  return hslToHex(hsl.h, hsl.s, clamp(hsl.l + amount, 0, 100));
}

function getReadableTextColor(hex) {
  const { r, g, b } = hexToRgb(hex);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 145 ? '#253047' : '#FFFFFF';
}

function getLocalizedPresetLabel(preset) {
  const lang = state.settings?.language || 'zh';
  return preset.label?.[lang] || preset.label?.zh || preset.label?.en || '';
}

function getTokenLabel(slot) {
  const key = THEME_COLOR_SLOTS.find(([name]) => name === slot)?.[1];
  return key ? t(key) : slot;
}

function canonicalThemeSlot(slot) {
  return LEGACY_THEME_SLOT_MAP[slot] || slot || 'primary';
}

function collectLegacyThemeTokens(theme) {
  const legacy = {};
  Object.entries(LEGACY_THEME_SLOT_MAP).forEach(([legacyKey, tokenKey]) => {
    if (theme && typeof theme[legacyKey] === 'string') {
      legacy[tokenKey] = normalizeHexColor(theme[legacyKey], UI_STYLE_PRESETS[DEFAULT_UI_STYLE_ID].tokens[tokenKey]);
    }
  });
  return legacy;
}

function syncLegacyThemeSlots(theme) {
  theme.primary = theme.tokens.primary;
  theme.workspace = theme.tokens.secondary;
  theme.accent = theme.tokens.accent;
  theme.chartA = theme.tokens.chartA;
  theme.chartB = theme.tokens.chartB;
}

function ensureThemeSettings() {
  if (!state.settings) return;

  const incoming = state.settings.uiTheme || {};
  const styleId = normalizeThemeStyleId(incoming.styleId);
  const preset = UI_STYLE_PRESETS[styleId];
  const legacyTokens = collectLegacyThemeTokens(incoming);
  const incomingTokens = incoming.tokens || {};
  const incomingEffects = incoming.effects || {};
  const incomingGlass = incoming.glass || {};
  const incomingBrand = incoming.brand || {};
  const incomingProgress = incoming.progress || {};
  const incomingMotion = incoming.motion || {};
  const incomingStatusColors = incoming.statusColors || {};
  const layoutId = normalizeThemeLayoutId(incoming.layoutId);

  const tokens = { ...preset.tokens, ...legacyTokens };
  Object.keys(tokens).forEach(key => {
    if (typeof incomingTokens[key] === 'string') {
      tokens[key] = normalizeHexColor(incomingTokens[key], tokens[key]);
    }
  });

  const effects = {
    ...preset.effects,
    glassOpacity: clamp(incomingEffects.glassOpacity ?? preset.effects.glassOpacity, 20, 90),
    glassBlur: clamp(incomingEffects.glassBlur ?? preset.effects.glassBlur, 0, 40),
    radius: clamp(incomingEffects.radius ?? preset.effects.radius, 8, 36),
    shadowStrength: clamp(incomingEffects.shadowStrength ?? preset.effects.shadowStrength, 0, 100),
    contrast: clamp(incomingEffects.contrast ?? preset.effects.contrast, 0, 100)
  };

  state.settings.uiTheme = {
    styleId,
    colorMode: incoming.colorMode || 'custom',
    tokens,
    effects,
    layoutId,
    glass: normalizeGlassSettings(incomingGlass),
    brand: normalizeBrandIconSettings(incomingBrand),
    progress: normalizeProgressSettings(incomingProgress),
    motion: normalizeMotionSettings(incomingMotion),
    statusColors: normalizeStatusColors(incomingStatusColors, tokens)
  };
  syncLegacyThemeSlots(state.settings.uiTheme);

  state.settings.statsCustom = Object.assign({
    category: 'zone',
    chartType: 'combo',
    barMetric: 'speciesCount',
    lineMetric: 'pointCount'
  }, state.settings.statsCustom || {});
}

function getCurrentTheme() {
  ensureThemeSettings();
  return state.settings.uiTheme;
}

function getThemeColor(slot) {
  const theme = getCurrentTheme();
  const token = canonicalThemeSlot(slot);
  return theme.tokens[token] || UI_STYLE_PRESETS[DEFAULT_UI_STYLE_ID].tokens[token] || '#6C63FF';
}

function setThemeColor(slot, color) {
  const theme = getCurrentTheme();
  const token = canonicalThemeSlot(slot);
  if (!theme.tokens[token]) return;

  theme.tokens[token] = normalizeHexColor(color, theme.tokens[token]);
  theme.colorMode = 'custom';
  syncLegacyThemeSlots(theme);
  applyThemeVariables();
}

function setThemeEffect(name, value) {
  const theme = getCurrentTheme();
  const ranges = {
    glassOpacity: [20, 90],
    glassBlur: [0, 40],
    radius: [8, 36],
    shadowStrength: [0, 100],
    contrast: [0, 100]
  };
  const range = ranges[name];
  if (!range) return;

  theme.effects[name] = clamp(value, range[0], range[1]);
  theme.colorMode = 'custom';
  applyThemeVariables();
}


function cloneDefaultGlassSettings() {
  return {
    ...DEFAULT_GLASS_UI,
    apply: { ...DEFAULT_GLASS_UI.apply }
  };
}

function normalizeGlassMode(value) {
  const mapped = LEGACY_GLASS_MODE_MAP[value] || value;
  return GLASS_MODE_PRESETS[mapped] ? mapped : DEFAULT_GLASS_UI.mode;
}

function normalizeGlassSettings(value) {
  const incoming = value || {};
  const mode = normalizeGlassMode(incoming.mode);
  const preset = GLASS_MODE_PRESETS[mode] || GLASS_MODE_PRESETS[DEFAULT_GLASS_UI.mode];
  const next = cloneDefaultGlassSettings();
  next.mode = mode;
  Object.entries(GLASS_RANGE_LIMITS).forEach(([key, range]) => {
    next[key] = clamp(incoming[key] ?? preset[key] ?? DEFAULT_GLASS_UI[key], range[0], range[1]);
  });
  next.apply = { ...DEFAULT_GLASS_UI.apply };
  GLASS_SCOPE_KEYS.forEach(key => {
    if (typeof incoming.apply?.[key] === 'boolean') {
      next.apply[key] = incoming.apply[key];
    }
  });
  if (mode === 'off') {
    next.apply = Object.fromEntries(GLASS_SCOPE_KEYS.map(key => [key, false]));
  }
  return next;
}

function getThemeGlassSettings() {
  const theme = getCurrentTheme();
  theme.glass = normalizeGlassSettings(theme.glass);
  return theme.glass;
}

function setThemeGlassSetting(name, value) {
  const theme = getCurrentTheme();
  const glass = normalizeGlassSettings(theme.glass);

  if (name === 'mode') {
    theme.glass = normalizeGlassSettings({ ...glass, mode: normalizeGlassMode(value) });
  } else if (GLASS_RANGE_LIMITS[name]) {
    const [min, max] = GLASS_RANGE_LIMITS[name];
    theme.glass = normalizeGlassSettings({ ...glass, [name]: clamp(value, min, max) });
  } else if (name && name.startsWith('apply.')) {
    const scope = name.slice('apply.'.length);
    if (GLASS_SCOPE_KEYS.includes(scope)) {
      theme.glass = normalizeGlassSettings({
        ...glass,
        apply: { ...glass.apply, [scope]: Boolean(value) }
      });
    }
  } else {
    return;
  }

  theme.colorMode = 'custom';
  applyThemeVariables();
  syncGlassControls();
}

function resetThemeGlassSettings() {
  const theme = getCurrentTheme();
  theme.glass = cloneDefaultGlassSettings();
  theme.colorMode = 'custom';
  applyThemeVariables();
  syncGlassControls();
}


function cloneDefaultBrandIcon() {
  return { ...DEFAULT_BRAND_ICON };
}

function normalizeBrandIconSettings(value) {
  const incoming = value || {};
  const next = cloneDefaultBrandIcon();
  next.style = BRAND_ICON_STYLES.includes(incoming.style) ? incoming.style : DEFAULT_BRAND_ICON.style;
  next.display = BRAND_ICON_DISPLAYS.includes(incoming.display) ? incoming.display : DEFAULT_BRAND_ICON.display;

  Object.entries(BRAND_ICON_RANGES).forEach(([key, range]) => {
    next[key] = clamp(incoming[key] ?? DEFAULT_BRAND_ICON[key], range[0], range[1]);
  });

  return next;
}

function getThemeBrandIconSettings() {
  const theme = getCurrentTheme();
  theme.brand = normalizeBrandIconSettings(theme.brand);
  return theme.brand;
}

function getBrandLogoColor(theme, brand) {
  if (brand.style === 'original') {
    return hslToHex(DEFAULT_BRAND_ICON.hue, DEFAULT_BRAND_ICON.saturation, DEFAULT_BRAND_ICON.lightness);
  }

  if (brand.style === 'monochrome') {
    return theme.tokens.primary;
  }

  if (brand.style === 'contrast') {
    return getReadableTextColor(theme.tokens.panelBg);
  }

  return hslToHex(brand.hue, brand.saturation, brand.lightness);
}

function setThemeBrandIconSetting(name, value) {
  const theme = getCurrentTheme();
  const brand = normalizeBrandIconSettings(theme.brand);

  if (name === 'style') {
    brand.style = BRAND_ICON_STYLES.includes(value) ? value : DEFAULT_BRAND_ICON.style;
  } else if (name === 'display') {
    brand.display = BRAND_ICON_DISPLAYS.includes(value) ? value : DEFAULT_BRAND_ICON.display;
  } else if (BRAND_ICON_RANGES[name]) {
    const [min, max] = BRAND_ICON_RANGES[name];
    brand[name] = clamp(value, min, max);
  } else {
    return;
  }

  theme.brand = normalizeBrandIconSettings(brand);
  theme.colorMode = 'custom';
  applyThemeVariables();
  syncBrandIconControls();
}

function resetThemeBrandIconSettings() {
  const theme = getCurrentTheme();
  theme.brand = cloneDefaultBrandIcon();
  theme.colorMode = 'custom';
  applyThemeVariables();
  syncBrandIconControls();
}

function normalizeProgressSettings(value = {}) {
  return {
    height: clamp(value.height ?? DEFAULT_PROGRESS_UI.height, 4, 16),
    radius: clamp(value.radius ?? DEFAULT_PROGRESS_UI.radius, 2, 999),
    speed: clamp(value.speed ?? DEFAULT_PROGRESS_UI.speed, 120, 900),
    showPercent: typeof value.showPercent === 'boolean' ? value.showPercent : DEFAULT_PROGRESS_UI.showPercent,
    showStage: typeof value.showStage === 'boolean' ? value.showStage : DEFAULT_PROGRESS_UI.showStage,
    mode: ['compact', 'standard', 'display'].includes(value.mode) ? value.mode : DEFAULT_PROGRESS_UI.mode,
    glass: typeof value.glass === 'boolean' ? value.glass : DEFAULT_PROGRESS_UI.glass
  };
}

function normalizeStatusColors(value = {}, tokens = {}) {
  return {
    success: normalizeHexColor(value.success, tokens.success || DEFAULT_STATUS_COLORS.success),
    danger: normalizeHexColor(value.danger, tokens.danger || DEFAULT_STATUS_COLORS.danger),
    warning: normalizeHexColor(value.warning, tokens.warning || DEFAULT_STATUS_COLORS.warning),
    unknown: normalizeHexColor(value.unknown, DEFAULT_STATUS_COLORS.unknown),
    enabled: normalizeHexColor(value.enabled, value.success || tokens.success || DEFAULT_STATUS_COLORS.enabled),
    disabled: normalizeHexColor(value.disabled, value.danger || tokens.danger || DEFAULT_STATUS_COLORS.disabled)
  };
}

function legacyMotionMode(value = {}) {
  if (MOTION_MODES.includes(value.mode)) return value.mode;
  if (value.enabled === false) return 'off';
  if (value.strength === 'light') return 'minimal';
  if (value.strength === 'rich') return 'rich';
  return DEFAULT_MOTION_UI.mode;
}

function legacySpeedMultiplier(value = {}) {
  if (typeof value.speedMultiplier !== 'undefined') return value.speedMultiplier;
  if (value.speed === 'fast') return 1.25;
  if (value.speed === 'slow') return 0.75;
  return undefined;
}

function normalizeMotionSettings(value = {}) {
  const mode = legacyMotionMode(value);
  const preset = mode === 'custom' ? DEFAULT_MOTION_UI : MOTION_MODE_PRESETS[mode];
  const speedSource = legacySpeedMultiplier(value) ?? preset.speedMultiplier;
  const normalized = {
    mode,
    speedMultiplier: clamp(speedSource, 0.5, 1.5),
    fadeDuration: clamp(value.fadeDuration ?? preset.fadeDuration, 0, 360),
    transitionDuration: clamp(value.transitionDuration ?? preset.transitionDuration, 0, 420),
    modalDuration: clamp(value.modalDuration ?? preset.modalDuration, 0, 480),
    stagger: clamp(value.stagger ?? preset.stagger, 0, 120),
    scaleEnter: clamp(value.scaleEnter ?? preset.scaleEnter, 0.94, 1),
    scalePress: clamp(value.scalePress ?? preset.scalePress, 0.94, 1),
    hoverLift: clamp(value.hoverLift ?? preset.hoverLift, 0, 6),
    easing: MOTION_EASINGS.includes(value.easing) ? value.easing : preset.easing,
    hover: typeof value.hover === 'boolean' ? value.hover : preset.hover,
    modal: typeof value.modal === 'boolean' ? value.modal : preset.modal,
    layout: typeof value.layout === 'boolean' ? value.layout : preset.layout,
    themeTransition: typeof value.themeTransition === 'boolean' ? value.themeTransition : preset.themeTransition,
    reduced: typeof value.reduced === 'boolean' ? value.reduced : false
  };
  normalized.enabled = normalized.mode !== 'off' && !normalized.reduced;
  return normalized;
}

function setProgressSetting(name, value) {
  const theme = getCurrentTheme();
  const progress = normalizeProgressSettings(theme.progress);
  if (['showPercent', 'showStage', 'glass'].includes(name)) progress[name] = Boolean(value);
  else if (name === 'height') progress.height = clamp(value, 4, 16);
  else if (name === 'mode') progress.mode = ['compact', 'standard', 'display'].includes(value) ? value : 'standard';
  else return;
  theme.progress = progress;
  applyThemeVariables();
  syncProgressControls();
}

function setMotionSetting(name, value) {
  const theme = getCurrentTheme();
  const motion = normalizeMotionSettings(theme.motion);

  if (name === 'mode') {
    if (!MOTION_MODES.includes(value)) return;
    const preset = value === 'custom' ? normalizeMotionSettings(motion) : MOTION_MODE_PRESETS[value];
    theme.motion = normalizeMotionSettings({ ...preset, mode: value, reduced: value === 'off' ? false : motion.reduced });
  } else if (['hover', 'modal', 'layout', 'themeTransition', 'reduced'].includes(name)) {
    motion[name] = value === true || value === 'true';
    if (name !== 'reduced' && motion.mode !== 'off') motion.mode = 'custom';
    theme.motion = normalizeMotionSettings(motion);
  } else if (name === 'easing' && MOTION_EASINGS.includes(value)) {
    motion.easing = value;
    if (motion.mode !== 'off') motion.mode = 'custom';
    theme.motion = normalizeMotionSettings(motion);
  } else if (['speedMultiplier', 'fadeDuration', 'transitionDuration', 'modalDuration', 'stagger', 'hoverLift', 'scaleEnter', 'scalePress'].includes(name)) {
    motion[name] = Number(value);
    if (motion.mode !== 'off') motion.mode = 'custom';
    theme.motion = normalizeMotionSettings(motion);
  } else {
    return;
  }

  theme.colorMode = 'custom';
  applyThemeVariables();
  syncMotionControls();
}

function setStatusColor(name, value) {
  const theme = getCurrentTheme();
  if (!Object.prototype.hasOwnProperty.call(DEFAULT_STATUS_COLORS, name)) return;
  theme.statusColors = normalizeStatusColors({ ...theme.statusColors, [name]: value }, theme.tokens);
  theme.colorMode = 'custom';
  applyThemeVariables();
  syncStatusColorControls();
}

function resetStatusColors() {
  const theme = getCurrentTheme();
  theme.statusColors = normalizeStatusColors({}, theme.tokens);
  theme.colorMode = 'custom';
  applyThemeVariables();
  syncStatusColorControls();
}


function applyThemePreset(styleId) {
  const current = getCurrentTheme();
  const resolvedStyleId = normalizeThemeStyleId(styleId);
  const next = createThemeDefaults(resolvedStyleId);
  next.layoutId = normalizeThemeLayoutId(current.layoutId);
  next.glass = normalizeGlassSettings(current.glass);
  next.brand = normalizeBrandIconSettings(current.brand);
  next.statusColors = normalizeStatusColors(current.statusColors, next.tokens);
  state.settings.uiTheme = next;
  syncLegacyThemeSlots(state.settings.uiTheme);
  applyThemeVariables();
  renderThemePanel();
}

function resetThemeSlot() {
  const theme = getCurrentTheme();
  const preset = UI_STYLE_PRESETS[theme.styleId] || UI_STYLE_PRESETS[DEFAULT_UI_STYLE_ID];
  const token = canonicalThemeSlot(state.themeSlot);
  setThemeColor(token, preset.tokens[token] || UI_STYLE_PRESETS[DEFAULT_UI_STYLE_ID].tokens[token]);
  syncThemeControls();
}

function resetAllThemes() {
  state.settings.uiTheme = createThemeDefaults(DEFAULT_UI_STYLE_ID);
  syncLegacyThemeSlots(state.settings.uiTheme);
  applyThemeVariables();
  renderThemePanel();
}

async function saveThemeSettings() {
  applyThemeVariables();
  await persistProject();
  closeLayerModal(ui.themeModal);
}

function applyThemeVariables() {
  if (!state.settings) return;
  const theme = getCurrentTheme();
  const { tokens, effects } = theme;
  const root = document.documentElement;
  const style = root.style;
  const radius = effects.radius;
  const shadowAlpha = (0.06 + effects.shadowStrength / 1000).toFixed(3);
  const floatAlpha = (0.1 + effects.shadowStrength / 850).toFixed(3);

  const styleId = theme.styleId || DEFAULT_UI_STYLE_ID;
  const layoutId = normalizeThemeLayoutId(theme.layoutId);
  const glass = normalizeGlassSettings(theme.glass);
  const brand = normalizeBrandIconSettings(theme.brand);
  const glassBase = tokens.glassBase;
  const glassAlpha = glass.mode === 'off' ? 0 : glass.opacity;
  const glassStrongAlpha = Math.min(92, glassAlpha + 14);
  const glassShadowAlpha = (glass.shadow / 100).toFixed(2);

  root.dataset.uiStyle = styleId;
  root.dataset.uiLayout = layoutId;
  THEME_STYLE_CLASSES.forEach(className => root.classList.remove(className));
  THEME_LAYOUT_CLASSES.forEach(className => root.classList.remove(className));
  GLASS_MODE_CLASSES.forEach(className => root.classList.remove(className));
  GLASS_SCOPE_CLASSES.forEach(className => root.classList.remove(className));
  BRAND_STYLE_CLASSES.forEach(className => root.classList.remove(className));
  BRAND_DISPLAY_CLASSES.forEach(className => root.classList.remove(className));
  root.classList.add(`theme-${styleId}`);
  root.classList.add(`layout-${layoutId}`);
  root.classList.add(`glass-mode-${glass.mode}`);
  root.classList.add(`brand-style-${brand.style}`);
  root.classList.add(`brand-display-${brand.display}`);
  GLASS_SCOPE_KEYS.forEach(key => {
    if (glass.apply[key]) root.classList.add(`glass-apply-${key}`);
  });
  root.style.setProperty('--ui-style-id', styleId);
  root.style.setProperty('--ui-layout-id', layoutId);
  style.setProperty('--app-bg', tokens.appBg);
  style.setProperty('--app-bg-soft', tokens.appBgSoft || withLightness(tokens.appBg, 4));
  style.setProperty('--panel-bg', tokens.panelBg);
  style.setProperty('--panel-bg-soft', tokens.panelBgSoft || withLightness(tokens.panelBg, -2));
  style.setProperty('--glass-base', glassBase);
  style.setProperty('--glass-bg', hexToRgba(glassBase, glassAlpha));
  style.setProperty('--glass-bg-strong', hexToRgba(glassBase, glassStrongAlpha));
  style.setProperty('--glass-highlight', hexToRgba(tokens.glassHighlight, glass.highlight));
  style.setProperty('--glass-border', hexToRgba(tokens.glassHighlight, Math.max(18, glass.highlight)));
  style.setProperty('--glass-border-soft', hexToRgba(tokens.glassHighlight, Math.max(12, glass.highlight - 18)));
  style.setProperty('--glass-blur', `${glass.blur}px`);
  style.setProperty('--glass-opacity', String((glassAlpha / 100).toFixed(2)));
  style.setProperty('--glass-saturation', `${glass.saturate}%`);
  style.setProperty('--glass-effect-shadow-alpha', glassShadowAlpha);
  style.setProperty('--glass-brightness', `${glass.brightness}%`);
  style.setProperty('--primary', tokens.primary);
  style.setProperty('--primary-hover', withLightness(tokens.primary, -8));
  style.setProperty('--primary-soft', hexToRgba(tokens.primary, 14));
  style.setProperty('--primary-contrast', getReadableTextColor(tokens.primary));
  style.setProperty('--secondary', tokens.secondary);
  style.setProperty('--secondary-soft', hexToRgba(tokens.secondary, 14));
  style.setProperty('--accent', tokens.accent);
  style.setProperty('--accent-soft', hexToRgba(tokens.accent, 13));
  style.setProperty('--success', tokens.success);
  style.setProperty('--success-soft', hexToRgba(tokens.success, 13));
  style.setProperty('--warning', tokens.warning);
  style.setProperty('--warning-soft', hexToRgba(tokens.warning, 15));
  style.setProperty('--danger', tokens.danger);
  style.setProperty('--danger-hover', withLightness(tokens.danger, -8));
  style.setProperty('--danger-soft', hexToRgba(tokens.danger, 14));
  style.setProperty('--danger-contrast', getReadableTextColor(tokens.danger));
  style.setProperty('--text-main', tokens.textMain);
  style.setProperty('--text-secondary', tokens.textSecondary);
  style.setProperty('--text-muted', hexToRgba(tokens.textSecondary, 74));
  style.setProperty('--text-inverse', '#FFFFFF');
  style.setProperty('--brand-logo-hue', String(brand.hue));
  style.setProperty('--brand-logo-saturation', `${brand.saturation}%`);
  style.setProperty('--brand-logo-lightness', `${brand.lightness}%`);
  style.setProperty('--brand-logo-color', getBrandLogoColor(theme, brand));
  style.setProperty('--brand-logo-shadow', `0 8px 18px ${hexToRgba(getBrandLogoColor(theme, brand), 24)}`);
  const progress = normalizeProgressSettings(theme.progress);
  const motion = normalizeMotionSettings(theme.motion);
  const statusColors = normalizeStatusColors(theme.statusColors, tokens);
  style.setProperty('--progress-height', `${progress.height}px`);
  style.setProperty('--progress-radius', `${progress.radius}px`);
  style.setProperty('--progress-speed', `${progress.speed}ms`);
  const speed = clamp(motion.speedMultiplier, 0.5, 1.5);
  const fastDuration = Math.round(Math.max(0, motion.fadeDuration / speed));
  const normalDuration = Math.round(Math.max(0, motion.transitionDuration / speed));
  const modalDuration = Math.round(Math.max(0, motion.modalDuration / speed));
  const easing = motion.easing === 'spring'
    ? 'cubic-bezier(0.2, 1.08, 0.32, 1)'
    : motion.easing === 'emphasized'
      ? 'cubic-bezier(0.16, 1, 0.3, 1)'
      : 'cubic-bezier(0.2, 0.8, 0.2, 1)';
  style.setProperty('--motion-speed', String(speed));
  style.setProperty('--motion-duration-fast', `${fastDuration}ms`);
  style.setProperty('--motion-duration', `${normalDuration}ms`);
  style.setProperty('--motion-duration-modal', `${modalDuration}ms`);
  style.setProperty('--motion-stagger', `${motion.stagger}ms`);
  style.setProperty('--motion-scale-enter', String(motion.scaleEnter));
  style.setProperty('--motion-scale-press', String(motion.scalePress));
  style.setProperty('--motion-hover-lift', `${motion.hoverLift}px`);
  const richnessProfiles = {
    off: { y: 0, x: 0, overlay: 0, subpanel: 0 },
    minimal: { y: 6, x: 10, overlay: 0.16, subpanel: 8 },
    standard: { y: 12, x: 20, overlay: 0.28, subpanel: 14 },
    rich: { y: 18, x: 28, overlay: 0.34, subpanel: 20 },
    custom: { y: Math.round((1 - motion.scaleEnter) * 600), x: Math.max(8, motion.hoverLift * 7), overlay: 0.26, subpanel: Math.max(8, motion.hoverLift * 5) }
  };
  const motionProfile = motion.enabled && !motion.reduced ? richnessProfiles[motion.mode] || richnessProfiles.standard : richnessProfiles.off;
  style.setProperty('--motion-dialog-translate-y', `${motionProfile.y}px`);
  style.setProperty('--motion-panel-translate-x', `${motionProfile.x}px`);
  style.setProperty('--motion-subpanel-translate', `${motionProfile.subpanel}px`);
  style.setProperty('--motion-overlay-opacity', String(motionProfile.overlay));
  style.setProperty('--motion-ease', easing);
  style.setProperty('--motion-ease-standard', 'cubic-bezier(0.2, 0.8, 0.2, 1)');
  style.setProperty('--motion-ease-emphasized', 'cubic-bezier(0.16, 1, 0.3, 1)');
  style.setProperty('--status-success', statusColors.success);
  style.setProperty('--status-danger', statusColors.danger);
  style.setProperty('--status-warning', statusColors.warning);
  style.setProperty('--status-unknown', statusColors.unknown);
  style.setProperty('--toggle-on', statusColors.enabled);
  style.setProperty('--toggle-off', statusColors.disabled);
  root.classList.remove(...MOTION_MODES.map(id => `motion-mode-${id}`));
  root.classList.add(`motion-mode-${motion.mode}`);
  root.classList.toggle('motion-disabled', !motion.enabled || motion.reduced || motion.mode === 'off');
  root.classList.toggle('motion-hover', !!motion.hover && motion.enabled && !motion.reduced);
  root.classList.toggle('motion-modal', !!motion.modal && motion.enabled && !motion.reduced);
  root.classList.toggle('motion-layout', !!motion.layout && motion.enabled && !motion.reduced);
  root.classList.toggle('motion-theme', !!motion.themeTransition && motion.enabled && !motion.reduced);
  root.classList.toggle('progress-mode-compact', progress.mode === 'compact');
  root.classList.toggle('progress-mode-display', progress.mode === 'display');
  root.classList.toggle('progress-glass', !!progress.glass);
  style.setProperty('--chart-a', tokens.chartA);
  style.setProperty('--chart-b', tokens.chartB);
  style.setProperty('--chart-c', tokens.chartC);
  style.setProperty('--chart-d', tokens.chartD);
  style.setProperty('--chart-grid', hexToRgba(tokens.textSecondary, 18));
  style.setProperty('--chart-axis', hexToRgba(tokens.textSecondary, 52));
  style.setProperty('--chart-label', tokens.textSecondary);
  style.setProperty('--radius-sm', `${Math.max(8, radius - 12)}px`);
  style.setProperty('--radius-md', `${Math.max(12, radius - 6)}px`);
  style.setProperty('--radius-lg', `${radius}px`);
  style.setProperty('--radius-xl', `${Math.min(36, radius + 8)}px`);
  style.setProperty('--radius-control', `${Math.max(12, radius - 8)}px`);
  style.setProperty('--shadow-soft', `0 10px 28px rgba(31, 41, 55, ${shadowAlpha})`);
  style.setProperty('--shadow-card', `0 16px 40px rgba(31, 41, 55, ${floatAlpha})`);
  style.setProperty('--shadow-float', `0 22px 58px rgba(31, 41, 55, ${Math.min(0.22, Number(floatAlpha) + 0.04)})`);
  style.setProperty('--glass-shadow', `0 18px 44px rgba(86, 95, 128, ${Math.max(Number(floatAlpha), Number(glassShadowAlpha)).toFixed(2)})`);
  style.setProperty('--theme-primary', tokens.primary);
  style.setProperty('--theme-primary-soft', hexToRgba(tokens.primary, 16));
  style.setProperty('--theme-workspace', tokens.secondary);
  style.setProperty('--theme-workspace-soft', hexToRgba(tokens.secondary, 16));
  style.setProperty('--theme-accent-ui', tokens.accent);
  style.setProperty('--theme-accent-ui-soft', hexToRgba(tokens.accent, 14));
  style.setProperty('--theme-chart-a', tokens.chartA);
  style.setProperty('--theme-chart-a-soft', hexToRgba(tokens.chartA, 16));
  style.setProperty('--theme-chart-b', tokens.chartB);
  style.setProperty('--theme-chart-b-soft', hexToRgba(tokens.chartB, 16));
  if (typeof scheduleMapResize === 'function') scheduleMapResize();
}

function renderStylePresets() {
  if (!ui.themeStylePresets) return;
  const theme = getCurrentTheme();
  ui.themeStylePresets.innerHTML = Object.entries(UI_STYLE_PRESETS).map(([id, preset]) => {
    const tokens = preset.tokens;
    const lang = state.settings?.language || 'zh';
    const family = preset.family?.[lang] || preset.family?.zh || '';
    const description = preset.description?.[lang] || preset.description?.zh || '';
    return `
      <button type="button" class="theme-style-btn ${id === theme.styleId ? 'active' : ''}" data-style="${id}">
        <span class="theme-style-name">${escapeHtml(getLocalizedPresetLabel(preset))}</span>
        <small>${escapeHtml(family)} · ${escapeHtml(description)}</small>
        <b class="theme-style-swatches">
          <i style="background:${tokens.primary}"></i>
          <i style="background:${tokens.secondary}"></i>
          <i style="background:${tokens.accent}"></i>
        </b>
      </button>`;
  }).join('');
}

function getLocalizedLayoutLabel(preset) {
  const lang = state.settings?.language || 'zh';
  return preset.label?.[lang] || preset.label?.zh || preset.label?.en || '';
}

function renderLayoutPresets() {
  if (!ui.themeLayoutPresets) return;
  const theme = getCurrentTheme();
  const layoutId = normalizeThemeLayoutId(theme.layoutId);
  ui.themeLayoutPresets.innerHTML = Object.entries(UI_LAYOUT_PRESETS).map(([id, preset]) => {
    const lang = state.settings?.language || 'zh';
    const description = preset.description?.[lang] || preset.description?.zh || '';
    const active = id === layoutId ? 'active' : '';
    return '<button type="button" class="theme-layout-btn ' + active + '" data-layout="' + id + '">' +
      '<span class="theme-style-name">' + escapeHtml(getLocalizedLayoutLabel(preset)) + '</span>' +
      '<small>' + escapeHtml(description) + '</small>' +
      '</button>';
  }).join('');
}

function applyLayoutPreset(layoutId) {
  const theme = getCurrentTheme();
  theme.layoutId = normalizeThemeLayoutId(layoutId);
  applyThemeVariables();
  renderLayoutPresets();
  if (typeof scheduleMapResize === 'function') scheduleMapResize();
}

function renderThemeTokenTabs() {
  if (!ui.themeTokenTabs) return;
  ui.themeTokenTabs.innerHTML = THEME_COLOR_SLOTS.map(([slot]) => `
    <button type="button" class="theme-token-btn ${slot === state.themeSlot ? 'active' : ''}" data-slot="${slot}">
      ${escapeHtml(getTokenLabel(slot))}
    </button>`).join('');
}

function renderThemeColorGrid() {
  if (!ui.themeTokenColorGrid) return;
  const theme = getCurrentTheme();
  ui.themeTokenColorGrid.innerHTML = THEME_COLOR_SLOTS.map(([slot]) => `
    <label class="theme-color-control">
      <span>${escapeHtml(getTokenLabel(slot))}</span>
      <input type="color" data-token="${slot}" value="${theme.tokens[slot]}" />
    </label>`).join('');
}

function renderPresetPalette(container, colors) {
  if (!container) return;
  container.innerHTML = colors.map(color => `
    <button type="button" class="preset-swatch" data-color="${color}" style="background:${color}"></button>
  `).join('');
}

function updateEffectLabel(id, value, suffix = '') {
  const node = document.getElementById(id);
  if (node) node.textContent = `${value}${suffix}`;
}

function syncEffectControls() {
  const effects = getCurrentTheme().effects;
  const entries = [
    ['themeGlassOpacity', effects.glassOpacity, '%', 'themeGlassOpacityValue'],
    ['themeGlassBlur', effects.glassBlur, 'px', 'themeGlassBlurValue'],
    ['themeRadius', effects.radius, 'px', 'themeRadiusValue'],
    ['themeShadowStrength', effects.shadowStrength, '', 'themeShadowStrengthValue'],
    ['themeContrast', effects.contrast, '', 'themeContrastValue']
  ];

  entries.forEach(([inputId, value, suffix, labelId]) => {
    if (ui[inputId]) ui[inputId].value = value;
    updateEffectLabel(labelId, value, suffix);
  });
}

function syncGlassControls() {
  const glass = getThemeGlassSettings();
  if (ui.themeGlassMode) ui.themeGlassMode.value = glass.mode;

  const entries = [
    ['themeGlassEffectOpacity', glass.opacity, '%', 'themeGlassEffectOpacityValue'],
    ['themeGlassEffectBlur', glass.blur, 'px', 'themeGlassEffectBlurValue'],
    ['themeGlassEffectSaturate', glass.saturate, '%', 'themeGlassEffectSaturateValue'],
    ['themeGlassEffectHighlight', glass.highlight, '', 'themeGlassEffectHighlightValue'],
    ['themeGlassEffectShadow', glass.shadow, '', 'themeGlassEffectShadowValue'],
    ['themeGlassEffectBrightness', glass.brightness, '', 'themeGlassEffectBrightnessValue']
  ];

  entries.forEach(([inputId, value, suffix, labelId]) => {
    if (ui[inputId]) ui[inputId].value = value;
    updateEffectLabel(labelId, value, suffix);
  });

  GLASS_SCOPE_KEYS.forEach(scope => {
    const id = 'themeGlassApply' + scope.charAt(0).toUpperCase() + scope.slice(1);
    if (ui[id]) ui[id].checked = Boolean(glass.apply[scope]);
  });
}


function syncBrandIconControls() {
  const brand = getThemeBrandIconSettings();

  if (ui.brandIconStyle) ui.brandIconStyle.value = brand.style;
  if (ui.brandIconDisplay) ui.brandIconDisplay.value = brand.display;

  const entries = [
    ['brandIconHue', brand.hue, '', 'brandIconHueValue'],
    ['brandIconSaturation', brand.saturation, '%', 'brandIconSaturationValue'],
    ['brandIconLightness', brand.lightness, '%', 'brandIconLightnessValue']
  ];

  entries.forEach(([inputId, value, suffix, labelId]) => {
    if (ui[inputId]) ui[inputId].value = value;
    updateEffectLabel(labelId, value, suffix);
  });
}

function updateBrandIconSettingFromControl(control) {
  const field = control?.dataset?.brand;
  if (!field) return;
  setThemeBrandIconSetting(field, control.value);
}


function syncProgressControls() {
  const progress = normalizeProgressSettings(getCurrentTheme().progress);
  if (ui.progressHeight) ui.progressHeight.value = String(progress.height);
  if (ui.progressMode) ui.progressMode.value = progress.mode;
  if (ui.progressShowPercent) ui.progressShowPercent.checked = progress.showPercent;
  if (ui.progressShowStage) ui.progressShowStage.checked = progress.showStage;
  if (ui.progressGlass) ui.progressGlass.checked = progress.glass;
}

function updateControlLabel(labelId, value, suffix = '') {
  if (ui[labelId]) ui[labelId].textContent = `${value}${suffix}`;
}

function syncMotionControls() {
  const motion = normalizeMotionSettings(getCurrentTheme().motion);
  if (ui.motionMode) ui.motionMode.value = motion.mode;
  if (ui.motionSpeedMultiplier) ui.motionSpeedMultiplier.value = String(motion.speedMultiplier);
  if (ui.motionFadeDuration) ui.motionFadeDuration.value = String(motion.fadeDuration);
  if (ui.motionTransitionDuration) ui.motionTransitionDuration.value = String(motion.transitionDuration);
  if (ui.motionModalDuration) ui.motionModalDuration.value = String(motion.modalDuration);
  if (ui.motionStagger) ui.motionStagger.value = String(motion.stagger);
  if (ui.motionHoverLift) ui.motionHoverLift.value = String(motion.hoverLift);
  if (ui.motionScaleEnter) ui.motionScaleEnter.value = String(motion.scaleEnter);
  if (ui.motionScalePress) ui.motionScalePress.value = String(motion.scalePress);
  if (ui.motionEasing) ui.motionEasing.value = motion.easing;
  if (ui.motionHover) ui.motionHover.checked = motion.hover;
  if (ui.motionModal) ui.motionModal.checked = motion.modal;
  if (ui.motionLayout) ui.motionLayout.checked = motion.layout;
  if (ui.motionTheme) ui.motionTheme.checked = motion.themeTransition;
  if (ui.motionReduced) ui.motionReduced.checked = motion.reduced;
  updateControlLabel('motionSpeedMultiplierValue', motion.speedMultiplier.toFixed(2), 'x');
  updateControlLabel('motionFadeDurationValue', motion.fadeDuration, 'ms');
  updateControlLabel('motionTransitionDurationValue', motion.transitionDuration, 'ms');
  updateControlLabel('motionModalDurationValue', motion.modalDuration, 'ms');
  updateControlLabel('motionStaggerValue', motion.stagger, 'ms');
  updateControlLabel('motionHoverLiftValue', motion.hoverLift, 'px');
  updateControlLabel('motionScaleEnterValue', motion.scaleEnter.toFixed(3));
  updateControlLabel('motionScalePressValue', motion.scalePress.toFixed(3));
  if (ui.motionSpecNote) {
    ui.motionSpecNote.textContent = `${t('motionSpecCurrent')}：fade ${motion.fadeDuration}ms / transition ${motion.transitionDuration}ms / modal ${motion.modalDuration}ms / stagger ${motion.stagger}ms / speed ${motion.speedMultiplier.toFixed(2)}x`;
  }
}

function syncStatusColorControls() {
  const theme = getCurrentTheme();
  const colors = normalizeStatusColors(theme.statusColors, theme.tokens);
  const mapping = {
    statusColorSuccess: 'success',
    statusColorDanger: 'danger',
    statusColorWarning: 'warning',
    statusColorUnknown: 'unknown',
    statusColorEnabled: 'enabled',
    statusColorDisabled: 'disabled'
  };
  Object.entries(mapping).forEach(([id, key]) => {
    if (ui[id]) ui[id].value = colors[key];
  });
}

function syncThemeControls() {
  const theme = getCurrentTheme();
  const token = canonicalThemeSlot(state.themeSlot);
  if (!theme.tokens[token]) state.themeSlot = 'primary';
  const color = getThemeColor(state.themeSlot);
  const hsl = hexToHsl(color);

  if (ui.themeHue) ui.themeHue.value = hsl.h;
  if (ui.themeSaturation) ui.themeSaturation.value = hsl.s;
  if (ui.themeLightness) ui.themeLightness.value = hsl.l;
  if (ui.themeAlpha) ui.themeAlpha.value = theme.effects.glassOpacity;
  if (ui.themePreviewSwatch) ui.themePreviewSwatch.style.background = color;
  if (ui.themeCurrentTokenLabel) ui.themeCurrentTokenLabel.textContent = getTokenLabel(state.themeSlot);
  if (ui.themeCurrentTokenValue) ui.themeCurrentTokenValue.textContent = color;

  document.querySelectorAll('.theme-token-btn').forEach(button => {
    button.classList.toggle('active', button.dataset.slot === state.themeSlot);
  });

  document.querySelectorAll('.theme-style-btn').forEach(button => {
    button.classList.toggle('active', button.dataset.style === theme.styleId);
  });

  document.querySelectorAll('[data-token]').forEach(input => {
    input.value = theme.tokens[input.dataset.token] || '#000000';
  });

  syncEffectControls();
  syncGlassControls();
  syncBrandIconControls();
  syncProgressControls();
  syncMotionControls();
  syncStatusColorControls();
  updateThemePreview();
}

function updateThemePreview() {
  if (!ui.themePreviewCard) return;
  const theme = getCurrentTheme();
  ui.themePreviewCard.innerHTML = `
    <div class="theme-preview-mini-card">
      <span>${escapeHtml(t('themePreviewMetric'))}</span>
      <strong>128</strong>
    </div>
    <div class="theme-preview-bars">
      <i style="height:72%;background:${theme.tokens.chartA}"></i>
      <i style="height:48%;background:${theme.tokens.chartB}"></i>
      <i style="height:64%;background:${theme.tokens.chartC}"></i>
      <i style="height:38%;background:${theme.tokens.chartD}"></i>
    </div>
    <button type="button" class="btn btn-primary theme-preview-button">${escapeHtml(t('themeApply'))}</button>`;
}

function renderThemePanel() {
  renderStylePresets();
  renderLayoutPresets();
  renderThemeTokenTabs();
  renderThemeColorGrid();
  renderPresetPalette(ui.themeMorandiPresets, MORANDI_PRESETS);
  renderPresetPalette(ui.themeMacaronPresets, MACARON_PRESETS);
  syncThemeControls();
}

function openThemeCenter() {
  ensureThemeSettings();
  applyThemeVariables();
  renderThemePanel();
  openLayerModal(ui.themeModal);
}

function setThemeSlot(slot) {
  if (!slot) return;
  state.themeSlot = canonicalThemeSlot(slot);
  syncThemeControls();
}

function updateThemeFromControls() {
  const h = Number(ui.themeHue?.value || 0);
  const s = Number(ui.themeSaturation?.value || 0);
  const l = Number(ui.themeLightness?.value || 50);
  setThemeColor(state.themeSlot, hslToHex(h, s, l));
  syncThemeControls();
}

function updateThemeAlphaFromControls() {
  if (!ui.themeAlpha) return;
  setThemeEffect('glassOpacity', ui.themeAlpha.value);
  syncThemeControls();
}

function updateThemeEffectFromControl(input) {
  const effect = input?.dataset?.effect;
  if (!effect) return;
  setThemeEffect(effect, input.value);
  if (effect === 'glassOpacity') setThemeGlassSetting('opacity', input.value);
  if (effect === 'glassBlur') setThemeGlassSetting('blur', input.value);
  syncThemeControls();
}

function updateGlassSettingFromControl(control) {
  const field = control?.dataset?.glass;
  if (!field) return;

  if (control.type === 'checkbox') {
    setThemeGlassSetting(field, control.checked);
    return;
  }

  setThemeGlassSetting(field, control.value);
}

function generateThemeChartPalette() {
  const theme = getCurrentTheme();
  const primaryHsl = hexToHsl(theme.tokens.primary);
  const secondaryHsl = hexToHsl(theme.tokens.secondary);
  const accentHsl = hexToHsl(theme.tokens.accent);
  theme.tokens.chartA = hslToHex(primaryHsl.h, Math.min(78, primaryHsl.s + 8), clamp(primaryHsl.l, 48, 68));
  theme.tokens.chartB = hslToHex(secondaryHsl.h, Math.min(76, secondaryHsl.s + 5), clamp(secondaryHsl.l, 50, 70));
  theme.tokens.chartC = hslToHex((secondaryHsl.h + 42) % 360, 62, 58);
  theme.tokens.chartD = hslToHex(accentHsl.h, Math.min(72, accentHsl.s + 4), clamp(accentHsl.l, 52, 72));
  theme.colorMode = 'custom';
  syncLegacyThemeSlots(theme);
  applyThemeVariables();
  renderThemePanel();
}

function bindThemePanelEvents() {
  ui.themeStylePresets?.addEventListener('click', event => {
    const button = event.target.closest('[data-style]');
    if (button) applyThemePreset(button.dataset.style);
  });

  ui.themeLayoutPresets?.addEventListener('click', event => {
    const button = event.target.closest('[data-layout]');
    if (button) applyLayoutPreset(button.dataset.layout);
  });

  ui.themeTokenTabs?.addEventListener('click', event => {
    const button = event.target.closest('[data-slot]');
    if (button) setThemeSlot(button.dataset.slot);
  });

  ui.themeTokenColorGrid?.addEventListener('input', event => {
    const input = event.target.closest('[data-token]');
    if (!input) return;
    setThemeColor(input.dataset.token, input.value);
    state.themeSlot = input.dataset.token;
    syncThemeControls();
  });

  ui.themeHue?.addEventListener('input', updateThemeFromControls);
  ui.themeSaturation?.addEventListener('input', updateThemeFromControls);
  ui.themeLightness?.addEventListener('input', updateThemeFromControls);
  ui.themeAlpha?.addEventListener('input', updateThemeAlphaFromControls);

  ['themeGlassOpacity', 'themeGlassBlur', 'themeRadius', 'themeShadowStrength', 'themeContrast']
    .forEach(id => ui[id]?.addEventListener('input', event => updateThemeEffectFromControl(event.target)));


  document.querySelectorAll('[data-glass]').forEach(control => {
    if (control.dataset.glassBound === '1') return;
    control.dataset.glassBound = '1';
    const eventName = control.type === 'checkbox' || control.tagName === 'SELECT' ? 'change' : 'input';
    control.addEventListener(eventName, event => updateGlassSettingFromControl(event.currentTarget));
  });
  ui.btnResetGlassSettings?.addEventListener('click', resetThemeGlassSettings);

  document.querySelectorAll('[data-brand]').forEach(control => {
    if (control.dataset.brandBound === '1') return;
    control.dataset.brandBound = '1';
    const eventName = control.tagName === 'SELECT' ? 'change' : 'input';
    control.addEventListener(eventName, event => updateBrandIconSettingFromControl(event.currentTarget));
  });

  ui.btnResetBrandIcon?.addEventListener('click', resetThemeBrandIconSettings);

  document.querySelectorAll('[data-progress]').forEach(control => {
    if (control.dataset.progressBound === '1') return;
    control.dataset.progressBound = '1';
    const eventName = control.type === 'checkbox' || control.tagName === 'SELECT' ? 'change' : 'input';
    control.addEventListener(eventName, event => {
      const target = event.currentTarget;
      setProgressSetting(target.dataset.progress, target.type === 'checkbox' ? target.checked : target.value);
    });
  });

  document.querySelectorAll('[data-motion]').forEach(control => {
    if (control.dataset.motionBound === '1') return;
    control.dataset.motionBound = '1';
    const eventName = control.type === 'checkbox' || control.tagName === 'SELECT' ? 'change' : 'input';
    control.addEventListener(eventName, event => {
      const target = event.currentTarget;
      setMotionSetting(target.dataset.motion, target.type === 'checkbox' ? target.checked : target.value);
    });
  });

  document.querySelectorAll('[data-status-color]').forEach(control => {
    if (control.dataset.statusColorBound === '1') return;
    control.dataset.statusColorBound = '1';
    control.addEventListener('input', event => {
      const target = event.currentTarget;
      setStatusColor(target.dataset.statusColor, target.value);
    });
  });
  ui.btnResetStatusColors?.addEventListener('click', resetStatusColors);

  ui.themeMorandiPresets?.addEventListener('click', event => {
    const button = event.target.closest('[data-color]');
    if (!button) return;
    setThemeColor(state.themeSlot, button.dataset.color);
    syncThemeControls();
  });

  ui.themeMacaronPresets?.addEventListener('click', event => {
    const button = event.target.closest('[data-color]');
    if (!button) return;
    setThemeColor(state.themeSlot, button.dataset.color);
    syncThemeControls();
  });

  ui.btnGenerateChartPalette?.addEventListener('click', generateThemeChartPalette);
  ui.btnResetThemeSlot?.addEventListener('click', resetThemeSlot);
  ui.btnResetThemeAll?.addEventListener('click', resetAllThemes);
  ui.btnSaveTheme?.addEventListener('click', saveThemeSettings);
}
