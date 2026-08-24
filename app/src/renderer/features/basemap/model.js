const TILE_LAYER_TYPES = Object.freeze(['XYZ', 'WMTS', 'WMS']);
const BASEMAP_STATUS_ICONS = Object.freeze({
  ok: '✔',
  success: '✔',
  enabled: '✔',
  error: '❌',
  danger: '❌',
  disabled: '❌',
  warning: '⚠',
  unknown: '?',
  pending: '…',
  info: 'ⓘ'
});

const BUILTIN_BASEMAPS = Object.freeze([
  {
    id: 'osm-street',
    name: { zh: 'OpenMap 街道图', en: 'OpenMap Street' },
    type: 'XYZ',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: 'abc',
    attribution: '© OpenStreetMap contributors',
    sourceLabel: 'OpenStreetMap contributors',
    termsUrl: 'https://www.openstreetmap.org/copyright',
    reviewNumber: '',
    authorizationRequired: false,
    keyRequired: false,
    coordSystem: 'WGS84',
    maxNativeZoom: 19,
    maxZoom: 22,
    tileSize: 256,
    zoomOffset: 0,
    provider: 'OpenStreetMap',
    isOverlay: false,
    enabled: true,
    builtIn: true
  },
  {
    id: 'amap-satellite',
    name: { zh: '高德卫星图', en: 'Amap Satellite' },
    type: 'XYZ',
    url: 'https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}&key={key}',
    subdomains: '1234',
    attribution: '© 高德地图 / AutoNavi',
    sourceLabel: 'Amap / AutoNavi',
    termsUrl: 'https://lbs.amap.com/pages/terms/',
    reviewNumber: '',
    authorizationRequired: true,
    keyRequired: true,
    authorizationNote: 'Use only with an authorized Amap Web service key and required provider attribution.',
    coordSystem: 'GCJ02',
    maxNativeZoom: 18,
    maxZoom: 22,
    tileSize: 256,
    zoomOffset: 0,
    provider: 'Amap',
    isOverlay: false,
    enabled: true,
    builtIn: true
  },
  {
    id: 'amap-road-label',
    name: { zh: '高德路网注记覆盖层', en: 'Amap Road Label Overlay' },
    type: 'XYZ',
    url: 'https://webst0{s}.is.autonavi.com/appmaptile?style=8&x={x}&y={y}&z={z}&key={key}',
    subdomains: '1234',
    attribution: '© 高德地图 / AutoNavi',
    sourceLabel: 'Amap / AutoNavi',
    termsUrl: 'https://lbs.amap.com/pages/terms/',
    reviewNumber: '',
    authorizationRequired: true,
    keyRequired: true,
    authorizationNote: 'Use only with an authorized Amap Web service key and required provider attribution.',
    coordSystem: 'GCJ02',
    maxNativeZoom: 18,
    maxZoom: 22,
    tileSize: 256,
    zoomOffset: 0,
    opacity: 1,
    provider: 'Amap',
    transparent: true,
    isOverlay: true,
    enabled: true,
    attachToBaseMapIds: ['amap-satellite'],
    zIndex: 420,
    notes: '与高德卫星图配套的路网 / 道路名称 / 地名注记层。',
    builtIn: true
  }
]);

const BUILTIN_BASEMAP_IDS = Object.freeze(BUILTIN_BASEMAPS.map(item => item.id));
const BUILTIN_OVERLAY_IDS = Object.freeze(BUILTIN_BASEMAPS.filter(item => item.isOverlay).map(item => item.id));
const REMOVED_BUILTIN_BASEMAP_IDS = Object.freeze([
  'tdt_img_w', 'tdt_cia_w', 'tdt_vec_w', 'tdt_cva_w', 'esri_satellite', 'osm_standard',
  'tencent_map', 'tencent_satellite', 'baidu_map', 'baidu_satellite', 'osm'
]);
const FALLBACK_BASEMAP_ID = 'osm-street';
const DEFAULT_OVERLAY_ID = 'amap-road-label';

function normalizeTileLayerType(value) {
  const text = String(value || 'XYZ').toUpperCase();
  if (text === 'WMS') return 'WMS';
  if (text === 'WMTS') return 'WMTS';
  return 'XYZ';
}

function normalizeSubdomains(value) {
  if (Array.isArray(value)) return value;
  const text = String(value || '').trim();
  return text ? text.split('') : undefined;
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function normalizeZoomPair(raw = {}) {
  const nativeZoom = clampNumber(raw.maxNativeZoom ?? raw.maxZoom ?? 18, 0, 24, 18);
  const displayZoom = clampNumber(raw.maxZoom ?? Math.max(nativeZoom, 22), nativeZoom, 24, Math.max(nativeZoom, 22));
  return {
    maxNativeZoom: Math.round(nativeZoom),
    maxZoom: Math.round(Math.max(displayZoom, nativeZoom))
  };
}

function normalizeOpacity(value) {
  return clampNumber(value ?? 1, 0, 1, 1);
}

function normalizeAttachBaseMapIds(value) {
  if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean);
  const text = String(value || '').trim();
  return text ? text.split(',').map(item => item.trim()).filter(Boolean) : [];
}

function isRemovedBuiltinBasemap(raw = {}) {
  const id = String(raw.id || '');
  return REMOVED_BUILTIN_BASEMAP_IDS.includes(id) || (raw.builtIn && !BUILTIN_BASEMAP_IDS.includes(id));
}

function getOverlayBaseMaps() {
  ensureStandardBaseMaps();
  return (state.settings?.baseMaps || []).map(normalizeBaseMapConfig).filter(item => item.isOverlay);
}

function getCompatibleOverlayBaseMaps(active) {
  const current = normalizeBaseMapConfig(active);
  return getOverlayBaseMaps().filter(item => {
    if (item.enabled === false) return false;
    const attached = normalizeAttachBaseMapIds(item.attachToBaseMapIds);
    if (attached.length && !attached.includes(current.id)) return false;
    return item.coordSystem === current.coordSystem;
  });
}

function normalizeBaseMapConfig(raw = {}) {
  const type = normalizeTileLayerType(raw.type);
  const overlay = Boolean(raw.isOverlay);
  const zoom = normalizeZoomPair(raw);
  const token = String(raw.token || raw.tk || raw.key || '').trim();
  return {
    id: String(raw.id || `${overlay ? 'overlay' : 'bm'}_${Date.now()}`),
    name: raw.name || { zh: String(raw.nameZh || raw.id || (overlay ? '未命名覆盖层' : '未命名底图')), en: String(raw.nameEn || raw.id || (overlay ? 'Overlay' : 'Base map')) },
    type,
    url: String(raw.url || ''),
    subdomains: raw.subdomains || '',
    attribution: String(raw.attribution || ''),
    coordSystem: normalizeCoordSystem(raw.coordSystem),
    maxNativeZoom: zoom.maxNativeZoom,
    maxZoom: zoom.maxZoom,
    tileSize: clampNumber(raw.tileSize ?? 256, 128, 512, 256),
    zoomOffset: clampNumber(raw.zoomOffset ?? 0, -4, 4, 0),
    opacity: normalizeOpacity(raw.opacity),
    transparent: overlay ? raw.transparent !== false && String(raw.transparent) !== 'false' : Boolean(raw.transparent),
    layerName: raw.layerName || raw.layers || '',
    layers: raw.layers || raw.layerName || '',
    format: raw.format || 'image/png',
    enabled: raw.enabled !== false,
    isOverlay: overlay,
    provider: raw.provider || inferBaseMapProvider(raw),
    attachToBaseMapIds: normalizeAttachBaseMapIds(raw.attachToBaseMapIds),
    zIndex: Math.round(clampNumber(raw.zIndex ?? (overlay ? 420 : 200), 1, 999, overlay ? 420 : 200)),
    allowLocalUpscale: raw.allowLocalUpscale !== false,
    token,
    key: String(raw.key || token || '').trim(),
    sourceLabel: String(raw.sourceLabel || raw.source || raw.provider || '').trim(),
    termsUrl: String(raw.termsUrl || raw.serviceTermsUrl || '').trim(),
    serviceTermsUrl: String(raw.serviceTermsUrl || raw.termsUrl || '').trim(),
    reviewNumber: String(raw.reviewNumber || raw.mapReviewNumber || '').trim(),
    mapReviewNumber: String(raw.mapReviewNumber || raw.reviewNumber || '').trim(),
    authorizationRequired: Boolean(raw.authorizationRequired || raw.requiresAuthorization),
    requiresAuthorization: Boolean(raw.requiresAuthorization || raw.authorizationRequired),
    keyRequired: Boolean(raw.keyRequired || raw.requiresKey),
    requiresKey: Boolean(raw.requiresKey || raw.keyRequired),
    authorizationNote: String(raw.authorizationNote || raw.termsNote || '').trim(),
    notes: raw.notes || '',
    builtIn: Boolean(raw.builtIn)
  };
}

function inferBaseMapProvider(raw = {}) {
  const text = `${raw.id || ''} ${raw.url || ''}`.toLowerCase();
  if (text.includes('tianditu')) return 'Tianditu';
  if (text.includes('arcgisonline') || text.includes('esri')) return 'Esri';
  if (text.includes('openstreetmap')) return 'OpenStreetMap';
  if (text.includes('amap') || text.includes('autonavi')) return 'Amap';
  if (text.includes('bdimg') || text.includes('baidu')) return 'Baidu';
  return raw.provider || 'Custom';
}

function isProviderAuthorizationScoped(config = {}) {
  const text = `${config.provider || ''} ${config.sourceLabel || ''} ${config.url || ''}`.toLowerCase();
  return text.includes('amap') || text.includes('autonavi');
}

function hasKeyPlaceholder(url = '') {
  return String(url || '').includes('{token}') || String(url || '').includes('{key}');
}

function getStatusIcon(level) {
  return BASEMAP_STATUS_ICONS[level] || BASEMAP_STATUS_ICONS.unknown;
}

function normalizeStatusLevel(level) {
  if (level === 'success' || level === 'enabled') return 'ok';
  if (level === 'danger' || level === 'disabled') return 'error';
  if (level === 'warning') return 'warning';
  if (level === 'pending') return 'pending';
  if (level === 'info') return 'ok';
  if (level === 'ok' || level === 'error') return level;
  return 'unknown';
}

function isAutoNormalizeBasemapEnabled() {
  if (!state.settings) return true;
  if (typeof state.settings.autoNormalizeBasemap !== 'boolean') {
    state.settings.autoNormalizeBasemap = true;
  }
  return state.settings.autoNormalizeBasemap !== false;
}

function updateAutoNormalizeSwitch() {
  if (!ui.autoNormalizeBasemapSwitch) return;
  const enabled = isAutoNormalizeBasemapEnabled();
  ui.autoNormalizeBasemapSwitch.classList.toggle('is-on', enabled);
  ui.autoNormalizeBasemapSwitch.setAttribute('aria-checked', String(enabled));
  ui.autoNormalizeBasemapSwitch.title = enabled ? t('enabled') : t('disabled');
}

async function toggleAutoNormalizeBasemap() {
  if (typeof guardMaintenanceReadOnlyAction === 'function' && guardMaintenanceReadOnlyAction('toggle-basemap-normalize')) return;
  if (!state.settings) return;
  state.settings.autoNormalizeBasemap = !isAutoNormalizeBasemapEnabled();
  updateAutoNormalizeSwitch();
  if (state.settings.autoNormalizeBasemap) {
    standardizeCurrentBasemapConfig({ silent: true });
  } else {
    detectBasemapStatus();
  }
  renderBasemapReport();
  await persistProject();
}

function setBasemapWorkspaceTab(tab = 'source') {
  const next = tab || 'source';
  document.querySelectorAll('.basemap-tab').forEach(button => {
    const active = button.dataset.basemapTab === next;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  document.querySelectorAll('.basemap-tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.dataset.basemapPanel === next);
  });
  if (next === 'overlay') renderOverlaySettingsPanel();
  if (next === 'status' || next === 'report' || next === 'zoom') detectBasemapStatus();
}

function openBasemapWorkspacePanel() {
  renderBasemapEditTargetSelect();
  renderOverlaySettingsPanel();
  const editing = state.settings?.baseMaps.find(item => item.id === state.currentBasemapEditId)
    || state.settings?.baseMaps.find(item => item.id === state.settings.activeBaseMapId);
  if (editing) fillBasemapForm(editing);
  detectBasemapStatus();
  setBasemapWorkspaceTab('source');
  openLayerModal(ui.basemapWorkspaceModal);
}

function closeBasemapWorkspacePanel() {
  closeLayerModal(ui.basemapWorkspaceModal);
  if (typeof scheduleMapResize === 'function') scheduleMapResize();
}


function ensureStandardBaseMaps() {
  if (!state.settings) return;
  const existing = Array.isArray(state.settings.baseMaps) ? state.settings.baseMaps : [];
  const kept = [];
  existing.forEach(item => {
    if (!item || isRemovedBuiltinBasemap(item)) return;
    const normalized = normalizeBaseMapConfig(item);
    if (normalized.builtIn && !BUILTIN_BASEMAP_IDS.includes(normalized.id)) return;
    kept.push(normalized);
  });

  const byId = new Map(kept.map(item => [item.id, item]));
  BUILTIN_BASEMAPS.forEach(item => {
    const existingItem = byId.get(item.id);
    if (existingItem) {
      byId.set(item.id, normalizeBaseMapConfig({
        ...existingItem,
        ...item,
        token: existingItem.token || existingItem.key || item.token || '',
        key: existingItem.key || existingItem.token || item.key || '',
        reviewNumber: existingItem.reviewNumber || existingItem.mapReviewNumber || item.reviewNumber || '',
        mapReviewNumber: existingItem.mapReviewNumber || existingItem.reviewNumber || item.mapReviewNumber || '',
        builtIn: true,
        isOverlay: item.isOverlay
      }));
    } else {
      byId.set(item.id, normalizeBaseMapConfig(item));
    }
  });

  const autoNormalize = isAutoNormalizeBasemapEnabled();
  state.settings.baseMaps = [...byId.values()].map(item =>
    autoNormalize || item.builtIn ? normalizeBaseMapConfig(item) : item
  );

  const active = state.settings.baseMaps.find(item => item.id === state.settings.activeBaseMapId);
  if (!active || normalizeBaseMapConfig(active).isOverlay || isRemovedBuiltinBasemap(active)) {
    state.settings.activeBaseMapId = state.settings.baseMaps.find(item => !normalizeBaseMapConfig(item).isOverlay && item.id === FALLBACK_BASEMAP_ID)?.id
      || state.settings.baseMaps.find(item => !normalizeBaseMapConfig(item).isOverlay)?.id
      || FALLBACK_BASEMAP_ID;
    if (typeof toast === 'function') toast(t('basemapFallbackApplied'));
  }

  if (!state.currentOverlayEditId || !state.settings.baseMaps.some(item => item.id === state.currentOverlayEditId && normalizeBaseMapConfig(item).isOverlay)) {
    state.currentOverlayEditId = state.settings.baseMaps.find(item => item.id === DEFAULT_OVERLAY_ID)?.id
      || state.settings.baseMaps.find(item => normalizeBaseMapConfig(item).isOverlay)?.id
      || null;
  }
}
