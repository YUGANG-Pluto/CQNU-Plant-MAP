const UI_STYLE_PRESETS = Object.freeze({
  'scientific-white': {
    family: { zh: 'Clean Scientific', en: 'Clean Scientific' },
    label: { zh: 'Scientific White', en: 'Scientific White' },
    description: { zh: '科研白底、细线框、蓝灰主色', en: 'Readable scientific workspace' },
    tokens: {
      primary: '#526D86',
      secondary: '#4EA7B5',
      accent: '#7A8FB6',
      appBg: '#F7F8FA',
      appBgSoft: '#FFFFFF',
      panelBg: '#FFFFFF',
      panelBgSoft: '#FAFBFC',
      glassBase: '#EEF2F6',
      glassHighlight: '#FFFFFF',
      chartA: '#526D86',
      chartB: '#5E91B6',
      chartC: '#4EA7B5',
      chartD: '#7A8FB6',
      success: '#4D9B75',
      warning: '#C79A43',
      danger: '#C95C67',
      textMain: '#252B31',
      textSecondary: '#626E78'
    },
    effects: { glassOpacity: 34, glassBlur: 6, radius: 16, shadowStrength: 22, contrast: 80 }
  },
  'botanical-scientific': {
    family: { zh: 'Clean Scientific', en: 'Clean Scientific' },
    label: { zh: 'Botanical Scientific', en: 'Botanical Scientific' },
    description: { zh: '植物学低饱和绿与科研白底', en: 'Botanical scientific green' },
    tokens: {
      primary: '#4F7F68',
      secondary: '#5FA7A2',
      accent: '#7C8FA8',
      appBg: '#F3F7F4',
      appBgSoft: '#FBFCFA',
      panelBg: '#FFFFFF',
      panelBgSoft: '#F7FAF7',
      glassBase: '#E4ECE6',
      glassHighlight: '#FFFFFF',
      chartA: '#4F7F68',
      chartB: '#5FA7A2',
      chartC: '#89A96A',
      chartD: '#7C8FA8',
      success: '#3E9E6E',
      warning: '#C8A24F',
      danger: '#CF6068',
      textMain: '#25312C',
      textSecondary: '#61726A'
    },
    effects: { glassOpacity: 36, glassBlur: 8, radius: 18, shadowStrength: 24, contrast: 78 }
  },
  'field-notebook': {
    family: { zh: 'Field Operations', en: 'Field Operations' },
    label: { zh: 'Field Notebook', en: 'Field Notebook' },
    description: { zh: '野外记录本气质，地图优先、低装饰、清晰层级', en: 'Field notebook, map-first and low-noise' },
    tokens: {
      primary: '#365F4B',
      secondary: '#3E8C8A',
      accent: '#B46A3C',
      appBg: '#F4F1E8',
      appBgSoft: '#FBFAF4',
      panelBg: '#FFFFFF',
      panelBgSoft: '#F8F7EF',
      glassBase: '#EEE9D9',
      glassHighlight: '#FFFFFF',
      chartA: '#365F4B',
      chartB: '#3E8C8A',
      chartC: '#8B9D5A',
      chartD: '#B46A3C',
      success: '#3F8F63',
      warning: '#B98932',
      danger: '#B85B5B',
      textMain: '#24312C',
      textSecondary: '#657069'
    },
    effects: { glassOpacity: 24, glassBlur: 0, radius: 10, shadowStrength: 12, contrast: 88 }
  },
  'linear-minimal': {
    family: { zh: 'Modern Minimal', en: 'Modern Minimal' },
    label: { zh: 'Linear Minimal', en: 'Linear Minimal' },
    description: { zh: '线框化、低阴影、长期录入友好', en: 'Linear low-shadow interface' },
    tokens: {
      primary: '#536D89',
      secondary: '#5EA7B4',
      accent: '#8678A6',
      appBg: '#F8FAFC',
      appBgSoft: '#FFFFFF',
      panelBg: '#FFFFFF',
      panelBgSoft: '#FBFCFE',
      glassBase: '#F0F3F7',
      glassHighlight: '#FFFFFF',
      chartA: '#536D89',
      chartB: '#5EA7B4',
      chartC: '#7C90B3',
      chartD: '#8678A6',
      success: '#4FA67C',
      warning: '#C9A04C',
      danger: '#CD5E69',
      textMain: '#232A31',
      textSecondary: '#606B76'
    },
    effects: { glassOpacity: 22, glassBlur: 0, radius: 14, shadowStrength: 8, contrast: 86 }
  },
  'deep-slate': {
    family: { zh: 'Deep Professional', en: 'Deep Professional' },
    label: { zh: 'Deep Slate', en: 'Deep Slate' },
    description: { zh: '深雾蓝背景衬托浅色卡片', en: 'Deep slate shell with light cards' },
    tokens: {
      primary: '#6B7CF3',
      secondary: '#39BDD5',
      accent: '#9A7CE6',
      appBg: '#DCE4EF',
      appBgSoft: '#F6F8FC',
      panelBg: '#FFFFFF',
      panelBgSoft: '#F4F7FB',
      glassBase: '#D8E0EC',
      glassHighlight: '#FFFFFF',
      chartA: '#6B7CF3',
      chartB: '#4D9BFF',
      chartC: '#39BDD5',
      chartD: '#9A7CE6',
      success: '#35BA84',
      warning: '#E9AC43',
      danger: '#E75D6F',
      textMain: '#233047',
      textSecondary: '#627089'
    },
    effects: { glassOpacity: 44, glassBlur: 12, radius: 22, shadowStrength: 58, contrast: 68 }
  },
  'flow-data': {
    family: { zh: 'Data Visualization', en: 'Data Visualization' },
    label: { zh: 'Presentation Data', en: 'Presentation Data' },
    description: { zh: '图表表达更强，适合汇报和统计查看', en: 'Chart-forward workspace for reporting' },
    tokens: {
      primary: '#6962F0',
      secondary: '#32BBD6',
      accent: '#E06AAF',
      appBg: '#EEF3FB',
      appBgSoft: '#FAFCFF',
      panelBg: '#FFFFFF',
      panelBgSoft: '#F6F9FE',
      glassBase: '#E3EAF7',
      glassHighlight: '#FFFFFF',
      chartA: '#6962F0',
      chartB: '#4A97FF',
      chartC: '#32BBD6',
      chartD: '#E06AAF',
      success: '#33C98C',
      warning: '#F4B64E',
      danger: '#E95F72',
      textMain: '#253049',
      textSecondary: '#617089'
    },
    effects: { glassOpacity: 42, glassBlur: 12, radius: 24, shadowStrength: 48, contrast: 64 }
  }
});

const THEME_COLOR_SLOTS = Object.freeze([
  ['primary', 'themeTokenPrimary'],
  ['secondary', 'themeTokenSecondary'],
  ['accent', 'themeTokenAccent'],
  ['appBg', 'themeTokenAppBg'],
  ['panelBg', 'themeTokenPanelBg'],
  ['glassBase', 'themeTokenGlassBase'],
  ['glassHighlight', 'themeTokenGlassHighlight'],
  ['chartA', 'themeTokenChartA'],
  ['chartB', 'themeTokenChartB'],
  ['chartC', 'themeTokenChartC'],
  ['chartD', 'themeTokenChartD'],
  ['success', 'themeTokenSuccess'],
  ['warning', 'themeTokenWarning'],
  ['danger', 'themeTokenDanger'],
  ['textMain', 'themeTokenTextMain'],
  ['textSecondary', 'themeTokenTextSecondary']
]);

const LEGACY_THEME_SLOT_MAP = Object.freeze({
  primary: 'primary',
  workspace: 'secondary',
  accent: 'accent',
  chartA: 'chartA',
  chartB: 'chartB'
});


const DEFAULT_GLASS_UI = Object.freeze({
  mode: 'light',
  opacity: 78,
  blur: 8,
  saturate: 116,
  highlight: 28,
  shadow: 8,
  brightness: 5,
  apply: {
    modules: true,
    controls: false,
    mapBadges: true,
    charts: false,
    settings: true
  }
});

const GLASS_MODE_PRESETS = Object.freeze({
  off: { opacity: 0, blur: 0, saturate: 100, highlight: 0, shadow: 0, brightness: 0 },
  light: { opacity: 78, blur: 8, saturate: 116, highlight: 28, shadow: 8, brightness: 5 },
  liquid: { opacity: 50, blur: 24, saturate: 165, highlight: 62, shadow: 24, brightness: 3 }
});

const LEGACY_GLASS_MODE_MAP = Object.freeze({
  standard: 'light',
  bright: 'light',
  dark: 'liquid'
});

const GLASS_RANGE_LIMITS = Object.freeze({
  opacity: [35, 88],
  blur: [4, 28],
  saturate: [100, 180],
  highlight: [15, 75],
  shadow: [5, 30],
  brightness: [-12, 16]
});

const GLASS_SCOPE_KEYS = Object.freeze(['modules', 'controls', 'mapBadges', 'charts', 'settings']);
const GLASS_SCOPE_CLASSES = Object.freeze(GLASS_SCOPE_KEYS.map(key => 'glass-apply-' + key));
const GLASS_MODE_CLASSES = Object.freeze([
  ...new Set([...Object.keys(GLASS_MODE_PRESETS), ...Object.keys(LEGACY_GLASS_MODE_MAP)])
].map(id => 'glass-mode-' + id));

const DEFAULT_BRAND_ICON = Object.freeze({
  style: 'theme',
  display: 'auto',
  hue: 356,
  saturation: 72,
  lightness: 42
});

const BRAND_ICON_RANGES = Object.freeze({
  hue: [0, 360],
  saturation: [20, 95],
  lightness: [28, 72]
});

const BRAND_ICON_STYLES = Object.freeze(['theme', 'original', 'monochrome', 'contrast']);
const BRAND_ICON_DISPLAYS = Object.freeze(['auto', 'mark', 'full']);
const BRAND_STYLE_CLASSES = Object.freeze(BRAND_ICON_STYLES.map(id => 'brand-style-' + id));
const BRAND_DISPLAY_CLASSES = Object.freeze(BRAND_ICON_DISPLAYS.map(id => 'brand-display-' + id));

const DEFAULT_PROGRESS_UI = Object.freeze({
  height: 8,
  radius: 999,
  speed: 260,
  showPercent: true,
  showStage: true,
  mode: 'standard',
  glass: false
});

const DEFAULT_STATUS_COLORS = Object.freeze({
  success: '#4FA67C',
  danger: '#C86570',
  warning: '#C5A15A',
  unknown: '#8D94A8',
  enabled: '#5FA37A',
  disabled: '#C86570'
});

const MOTION_MODE_PRESETS = Object.freeze({
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
    themeTransition: false
  },
  minimal: {
    speedMultiplier: 1.15,
    fadeDuration: 110,
    transitionDuration: 130,
    modalDuration: 130,
    stagger: 8,
    scaleEnter: 0.995,
    scalePress: 0.99,
    hoverLift: 1,
    easing: 'standard',
    hover: true,
    modal: true,
    layout: false,
    themeTransition: false
  },
  standard: {
    speedMultiplier: 1,
    fadeDuration: 160,
    transitionDuration: 190,
    modalDuration: 220,
    stagger: 24,
    scaleEnter: 0.985,
    scalePress: 0.975,
    hoverLift: 2,
    easing: 'emphasized',
    hover: true,
    modal: true,
    layout: true,
    themeTransition: true
  },
  rich: {
    speedMultiplier: 0.9,
    fadeDuration: 240,
    transitionDuration: 280,
    modalDuration: 340,
    stagger: 40,
    scaleEnter: 0.972,
    scalePress: 0.965,
    hoverLift: 4,
    easing: 'spring',
    hover: true,
    modal: true,
    layout: true,
    themeTransition: true
  }
});

const DEFAULT_MOTION_UI = Object.freeze({
  mode: 'standard',
  speedMultiplier: 1,
  fadeDuration: 160,
  transitionDuration: 190,
  modalDuration: 220,
  stagger: 24,
  scaleEnter: 0.985,
  scalePress: 0.975,
  hoverLift: 2,
  easing: 'emphasized',
  hover: true,
  modal: true,
  layout: true,
  themeTransition: true,
  reduced: false
});

const MOTION_MODES = Object.freeze(['off', 'minimal', 'standard', 'rich', 'custom']);
const MOTION_EASINGS = Object.freeze(['standard', 'emphasized', 'spring']);


const DEFAULT_UI_STYLE_ID = 'field-notebook';
const DEFAULT_UI_LAYOUT_ID = 'map-workbench';
const UI_LAYOUT_PRESETS = Object.freeze({
  'map-workbench': { label: { zh: '地图工作台', en: 'Map Workbench' }, description: { zh: '地图最大化，左侧工具轨与右侧检查器配合现场标注。', en: 'Map-first workspace with compact tools and inspector.' } },
  'dashboard-map': { label: { zh: '仪表盘 + 地图', en: 'Dashboard + Map' }, description: { zh: '项目状态、快捷入口和地图并重，适合日常管理。', en: 'Project status and map share focus for routine management.' } },
  'layered-workspace': { label: { zh: '分层工作区', en: 'Layered Workspace' }, description: { zh: '顶部工具、中央地图、右侧上下分层，适合多模块维护。', en: 'Layered toolbar, map, and split inspector.' } },
  'compact-ops': { label: { zh: '紧凑运维', en: 'Compact Ops' }, description: { zh: '信息密度更高，适合小屏和快速操作。', en: 'Dense controls for small screens and fast operation.' } },
  'analysis-focus': { label: { zh: '分析优先', en: 'Analysis Focus' }, description: { zh: '为统计中心和图表查看预留更宽松空间。', en: 'More room for statistics and visual analysis.' } },
  'data-review': { label: { zh: '数据审核', en: 'Data Review' }, description: { zh: '强化右侧详情区与列表核对，适合批量校正记录。', en: 'Emphasizes inspector and lists for record review.' } },
  'full-map-canvas': { label: { zh: '全地图画布', en: 'Full Map Canvas' }, description: { zh: '压缩辅助面板，优先保证地图连续覆盖。', en: 'Compresses side panels to prioritize an uninterrupted map canvas.' } },
  'presentation-layout': { label: { zh: '展示汇报', en: 'Presentation Layout' }, description: { zh: '放大地图与统计摘要，适合演示项目进度。', en: 'Enlarges map and summary widgets for presentation.' } }
});
const LEGACY_UI_STYLE_MAP = Object.freeze({
  'cloud-soft': 'field-notebook',
  'lavender-soft': 'flow-data',
  'nordic-minimal': 'linear-minimal',
  'deep-indigo': 'deep-slate',
  'dimensional-chart': 'flow-data',
  'soft-dashboard': 'field-notebook',
  'glass-blue': 'field-notebook',
  'academic-light': 'scientific-white',
  'pastel-data': 'flow-data',
  'minimal-white': 'linear-minimal'
});

const THEME_STYLE_CLASSES = Object.freeze([
  ...new Set([...Object.keys(UI_STYLE_PRESETS), ...Object.keys(LEGACY_UI_STYLE_MAP)])
].map(id => `theme-${id}`));
const THEME_LAYOUT_CLASSES = Object.freeze(Object.keys(UI_LAYOUT_PRESETS).map(id => `layout-${id}`));
