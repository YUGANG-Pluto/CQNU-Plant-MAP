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
    url: 'https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
    subdomains: '1234',
    attribution: '© 高德地图',
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
    url: 'https://webst0{s}.is.autonavi.com/appmaptile?style=8&x={x}&y={y}&z={z}',
    subdomains: '1234',
    attribution: '© 高德地图',
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
      byId.set(item.id, normalizeBaseMapConfig({ ...item, ...existingItem, builtIn: true, isOverlay: item.isOverlay }));
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

function getActiveBaseMapConfig() {
  ensureStandardBaseMaps();
  return state.settings?.baseMaps.find(item => item.id === state.settings.activeBaseMapId) ||
    state.settings?.baseMaps.find(item => !item.isOverlay) || null;
}

function basemapLabel(bm) {
  const lang = state.settings?.language || 'zh';
  const name = typeof bm.name === 'string' ? bm.name : (bm.name?.[lang] || bm.name?.zh || bm.id);
  return `${name}${bm.builtIn ? ` · ${t('builtIn')}` : ''}`;
}

function renderBaseMapSelect() {
  if (!state.settings) return;
  ensureStandardBaseMaps();
  ui.baseMapSelect.innerHTML = '';
  state.settings.baseMaps.filter(bm => !normalizeBaseMapConfig(bm).isOverlay).forEach(bm => {
    const opt = document.createElement('option');
    opt.value = bm.id;
    opt.textContent = basemapLabel(normalizeBaseMapConfig(bm));
    ui.baseMapSelect.appendChild(opt);
  });
  ui.baseMapSelect.value = state.settings.activeBaseMapId || state.settings.baseMaps[0]?.id || '';
}

function renderBasemapEditTargetSelect() {
  if (!state.settings) return;
  ensureStandardBaseMaps();
  ui.bmEditTarget.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = '—';
  ui.bmEditTarget.appendChild(placeholder);
  state.settings.baseMaps.map(normalizeBaseMapConfig).filter(bm => !bm.isOverlay).forEach(bm => {
    const opt = document.createElement('option');
    opt.value = bm.id;
    opt.textContent = basemapLabel(bm);
    ui.bmEditTarget.appendChild(opt);
  });
  ui.bmEditTarget.value = state.currentBasemapEditId || '';
}

function tileZoomLimits(config) {
  const normalized = normalizeBaseMapConfig(config);
  const nativeZoom = Number.isFinite(normalized.maxNativeZoom) ? normalized.maxNativeZoom : 18;
  const displayZoom = Number.isFinite(normalized.maxZoom) ? Math.max(normalized.maxZoom, nativeZoom) : Math.max(nativeZoom, 22);
  return { maxNativeZoom: nativeZoom, maxZoom: displayZoom };
}

function getTileLayerOptions(normalized) {
  const limits = tileZoomLimits(normalized);
  const options = {
    attribution: normalized.attribution,
    maxNativeZoom: limits.maxNativeZoom,
    maxZoom: limits.maxZoom,
    updateWhenZooming: false,
    keepBuffer: 2,
    errorTileUrl: '',
    className: normalized.isOverlay ? 'campus-basemap-tile campus-overlay-tile' : 'campus-basemap-tile',
    opacity: normalized.opacity,
    zIndex: normalized.zIndex,
    token: normalized.token,
    key: normalized.key
  };
  if (!normalized.isOverlay) delete options.zIndex;
  return options;
}

function rememberTileError(layer, normalized, event) {
  const coords = event?.coords || {};
  state.lastBasemapTileError = {
    id: normalized.id,
    name: basemapLabel(normalized),
    z: Number(coords.z),
    x: Number(coords.x),
    y: Number(coords.y),
    at: Date.now()
  };
  updateBasemapWorkStatus();
}

function attachBasemapLayerDiagnostics(layer, normalized) {
  if (!layer?.on) return layer;
  layer.on('tileerror', event => rememberTileError(layer, normalized, event));
  return layer;
}

function createTileLayerFromConfig(config) {
  const normalized = normalizeBaseMapConfig(config);
  if (!normalized.url) return null;
  const baseOptions = getTileLayerOptions(normalized);
  let layer = null;
  if (normalized.type === 'WMS') {
    layer = L.tileLayer.wms(normalized.url, {
      ...baseOptions,
      layers: normalized.layerName || normalized.layers,
      format: normalized.format || 'image/png',
      transparent: String(normalized.transparent) !== 'false'
    });
  } else {
    layer = L.tileLayer(normalized.url, {
      ...baseOptions,
      subdomains: normalizeSubdomains(normalized.subdomains),
      tileSize: normalized.tileSize || 256,
      zoomOffset: normalized.zoomOffset || 0
    });
  }
  return attachBasemapLayerDiagnostics(layer, normalized);
}

function createLeafletBaseLayer(bm) {
  return createTileLayerFromConfig(bm);
}

function fillBasemapForm(bm) {
  if (!bm) return;
  const normalized = normalizeBaseMapConfig(bm);
  state.currentBasemapEditId = normalized.id;
  ui.bmEditTarget.value = normalized.id;
  ui.bmNameZh.value = typeof normalized.name === 'string' ? normalized.name : (normalized.name?.zh || '');
  ui.bmNameEn.value = typeof normalized.name === 'string' ? normalized.name : (normalized.name?.en || '');
  ui.bmType.value = normalized.type.toLowerCase();
  ui.bmUrl.value = normalized.url;
  ui.bmAttribution.value = normalized.attribution;
  ui.bmMaxZoom.value = normalized.maxZoom;
  if (ui.bmMaxNativeZoom) ui.bmMaxNativeZoom.value = normalized.maxNativeZoom;
  if (ui.bmCoordSystem) ui.bmCoordSystem.value = normalized.coordSystem;
  if (ui.bmProvider) ui.bmProvider.value = normalized.provider || '';
  if (ui.bmTileSize) ui.bmTileSize.value = normalized.tileSize || 256;
  if (ui.bmZoomOffset) ui.bmZoomOffset.value = normalized.zoomOffset || 0;
  ui.bmSubdomains.value = normalized.subdomains || '';
  ui.bmLayers.value = normalized.layerName || normalized.layers || '';
  ui.bmFormat.value = normalized.format || 'image/png';
  ui.bmTransparent.value = String(normalized.transparent ?? true);
}

function mapCenterToCoordSystem(center, from, to) {
  const [lng, lat] = convertLngLat(center.lng, center.lat, from, to);
  return L.latLng(lat, lng);
}

function rerenderSpatialLayers(reason = 'basemap-change') {
  if (typeof rerenderBusinessLayers === 'function') {
    rerenderBusinessLayers(reason, { preservePending: true });
    return;
  }
  if (!state.map) return;
  state.zoneLayers.forEach(layer => state.map.removeLayer(layer));
  state.zoneLayers.clear();
  state.pointLayers.forEach(layer => state.map.removeLayer(layer));
  state.pointLayers.clear();
  state.zones.filter(zone => zone.geometry).forEach(addZoneLayer);
  state.points.filter(point => Number.isFinite(point.lat) && Number.isFinite(point.lng)).forEach(addPointLayer);
  refreshZoneStyles();
  refreshPointStyles();
}

function applyOverlayLayers(active) {
  state.currentOverlayLayers.forEach(layer => state.map.removeLayer(layer));
  state.currentOverlayLayers = [];
  const overlays = getCompatibleOverlayBaseMaps(active);
  overlays.forEach(item => {
    const layer = createTileLayerFromConfig(item);
    if (layer) {
      if (typeof layer.setZIndex === 'function') layer.setZIndex(item.zIndex || 420);
      layer.addTo(state.map);
      state.currentOverlayLayers.push(layer);
    }
  });
}

function applyActiveBaseMap() {
  if (!state.settings || !state.map) return;
  ensureStandardBaseMaps();
  const oldCoord = state.currentBaseMapCoordSystem || 'WGS84';
  const oldCenter = state.map?.getCenter?.();
  const bm = getActiveBaseMapConfig();
  if (!bm) return;
  const active = normalizeBaseMapConfig(bm);

  if (state.currentBaseLayer) state.map.removeLayer(state.currentBaseLayer);
  state.currentOverlayLayers.forEach(layer => state.map.removeLayer(layer));
  state.currentOverlayLayers = [];

  state.currentBaseMapCoordSystem = active.coordSystem;
  state.currentBaseLayer = createLeafletBaseLayer(active);
  if (typeof state.map.setMaxZoom === 'function') state.map.setMaxZoom(active.maxZoom);
  if (state.currentBaseLayer) state.currentBaseLayer.addTo(state.map);
  applyOverlayLayers(active);

  if (oldCenter) {
    const nextCenter = mapCenterToCoordSystem(oldCenter, oldCoord, active.coordSystem);
    state.map.setView(nextCenter, state.map.getZoom(), { animate: false });
  }

  rerenderSpatialLayers('basemap-change');
  renderBaseMapSelect();
  renderBasemapEditTargetSelect();
  updateBasemapWorkStatus();
  if (typeof scheduleMapResize === 'function') scheduleMapResize();
  const editing = state.settings.baseMaps.find(x => x.id === state.currentBasemapEditId);
  if (editing) fillBasemapForm(editing);
  else fillBasemapForm(active);
}

function newBasemapForm() {
  state.currentBasemapEditId = null;
  ui.bmEditTarget.value = '';
  ui.bmNameZh.value = '';
  ui.bmNameEn.value = '';
  ui.bmType.value = 'xyz';
  ui.bmUrl.value = '';
  ui.bmAttribution.value = '';
  ui.bmMaxZoom.value = 22;
  if (ui.bmMaxNativeZoom) ui.bmMaxNativeZoom.value = 18;
  if (ui.bmCoordSystem) ui.bmCoordSystem.value = 'WGS84';
  if (ui.bmProvider) ui.bmProvider.value = 'Custom';
  if (ui.bmTileSize) ui.bmTileSize.value = 256;
  if (ui.bmZoomOffset) ui.bmZoomOffset.value = 0;
  ui.bmSubdomains.value = '';
  ui.bmLayers.value = '';
  ui.bmFormat.value = 'image/png';
  ui.bmTransparent.value = 'true';
}

async function saveBasemap() {
  if (typeof guardMaintenanceReadOnlyAction === 'function' && guardMaintenanceReadOnlyAction('save-basemap')) return;
  const id = state.currentBasemapEditId || `bm_${Date.now()}`;
  const existing = state.settings.baseMaps.find(b => b.id === id);
  const raw = {
    id,
    name: {
      zh: ui.bmNameZh.value.trim(),
      en: ui.bmNameEn.value.trim() || ui.bmNameZh.value.trim()
    },
    type: ui.bmType.value,
    url: ui.bmUrl.value.trim(),
    attribution: ui.bmAttribution.value.trim(),
    maxZoom: Number(ui.bmMaxZoom.value || 22),
    maxNativeZoom: Number(ui.bmMaxNativeZoom?.value || ui.bmMaxZoom.value || 18),
    coordSystem: ui.bmCoordSystem?.value || 'WGS84',
    provider: ui.bmProvider?.value.trim() || 'Custom',
    tileSize: Number(ui.bmTileSize?.value || 256),
    zoomOffset: Number(ui.bmZoomOffset?.value || 0),
    subdomains: ui.bmSubdomains.value.trim(),
    layers: ui.bmLayers.value.trim(),
    format: ui.bmFormat.value.trim() || 'image/png',
    transparent: ui.bmTransparent.value,
    isOverlay: false,
    enabled: true,
    builtIn: existing?.builtIn || false
  };
  if (!raw.url) return;
  if (raw.maxNativeZoom < 0 || raw.maxZoom < raw.maxNativeZoom || raw.maxZoom > 24) return showAlert(t('basemapZoomInvalid'));
  const bm = isAutoNormalizeBasemapEnabled() ? normalizeBaseMapConfig(raw) : raw;
  if (existing) Object.assign(existing, bm);
  else {
    state.settings.baseMaps.push(bm);
    state.settings.activeBaseMapId = bm.id;
  }
  state.currentBasemapEditId = id;
  renderBasemapEditTargetSelect();
  applyActiveBaseMap();
  detectBasemapStatus();
  await persistProject();
  toast(t('basemapSaved'));
}

async function deleteBasemap() {
  if (typeof guardMaintenanceReadOnlyAction === 'function' && guardMaintenanceReadOnlyAction('delete-basemap')) return;
  const bm = state.settings.baseMaps.find(b => b.id === state.currentBasemapEditId);
  if (!bm) return;
  if (bm.builtIn) return showAlert(t('cannotDeleteBuiltin'));
  state.settings.baseMaps = state.settings.baseMaps.filter(b => b.id !== bm.id);
  if (state.settings.activeBaseMapId === bm.id) {
    state.settings.activeBaseMapId = state.settings.baseMaps.find(item => !normalizeBaseMapConfig(item).isOverlay)?.id || FALLBACK_BASEMAP_ID;
  }
  newBasemapForm();
  applyActiveBaseMap();
  await persistProject();
  toast(t('basemapDeleted'));
}


function renderOverlaySettingsPanel() {
  if (!ui.bmOverlayTarget) return;
  ensureStandardBaseMaps();
  const overlays = getOverlayBaseMaps();
  ui.bmOverlayTarget.innerHTML = '';
  overlays.forEach(overlay => {
    const opt = document.createElement('option');
    opt.value = overlay.id;
    opt.textContent = basemapLabel(overlay);
    ui.bmOverlayTarget.appendChild(opt);
  });
  if (!state.currentOverlayEditId || !overlays.some(item => item.id === state.currentOverlayEditId)) {
    state.currentOverlayEditId = overlays[0]?.id || null;
  }
  ui.bmOverlayTarget.value = state.currentOverlayEditId || '';
  const overlay = overlays.find(item => item.id === state.currentOverlayEditId);
  if (overlay) fillOverlayForm(overlay);
  else newOverlayForm();
  renderOverlayStatusPanel();
}

function fillOverlayForm(overlay) {
  if (!overlay || !ui.bmOverlayTarget) return;
  const normalized = normalizeBaseMapConfig(overlay);
  state.currentOverlayEditId = normalized.id;
  ui.bmOverlayTarget.value = normalized.id;
  ui.bmOverlayNameZh.value = typeof normalized.name === 'string' ? normalized.name : (normalized.name?.zh || '');
  ui.bmOverlayNameEn.value = typeof normalized.name === 'string' ? normalized.name : (normalized.name?.en || '');
  ui.bmOverlayEnabled.value = String(normalized.enabled !== false);
  ui.bmOverlayType.value = normalized.type.toLowerCase();
  ui.bmOverlayProvider.value = normalized.provider || 'Custom';
  ui.bmOverlayUrl.value = normalized.url;
  ui.bmOverlaySubdomains.value = normalized.subdomains || '';
  ui.bmOverlayCoordSystem.value = normalized.coordSystem || 'GCJ02';
  ui.bmOverlayMaxNativeZoom.value = normalized.maxNativeZoom;
  ui.bmOverlayMaxZoom.value = normalized.maxZoom;
  ui.bmOverlayOpacity.value = normalized.opacity;
  ui.bmOverlayOpacityValue.textContent = `${Math.round(normalized.opacity * 100)}%`;
  ui.bmOverlayZIndex.value = normalized.zIndex || 420;
  ui.bmOverlayAttach.value = normalizeAttachBaseMapIds(normalized.attachToBaseMapIds).join(',');
  ui.bmOverlayToken.value = normalized.token || '';
  ui.bmOverlayNotes.value = normalized.notes || '';
}

function newOverlayForm() {
  state.currentOverlayEditId = null;
  if (!ui.bmOverlayTarget) return;
  ui.bmOverlayTarget.value = '';
  ui.bmOverlayNameZh.value = '';
  ui.bmOverlayNameEn.value = '';
  ui.bmOverlayEnabled.value = 'true';
  ui.bmOverlayType.value = 'xyz';
  ui.bmOverlayProvider.value = 'Custom';
  ui.bmOverlayUrl.value = '';
  ui.bmOverlaySubdomains.value = '';
  ui.bmOverlayCoordSystem.value = 'GCJ02';
  ui.bmOverlayMaxNativeZoom.value = 18;
  ui.bmOverlayMaxZoom.value = 22;
  ui.bmOverlayOpacity.value = 1;
  ui.bmOverlayOpacityValue.textContent = '100%';
  ui.bmOverlayZIndex.value = 420;
  ui.bmOverlayAttach.value = 'amap-satellite';
  ui.bmOverlayToken.value = '';
  ui.bmOverlayNotes.value = '';
}

function readOverlayForm() {
  const id = state.currentOverlayEditId || `overlay_${Date.now()}`;
  const existing = state.settings.baseMaps.find(item => item.id === id);
  return normalizeBaseMapConfig({
    id,
    name: {
      zh: ui.bmOverlayNameZh.value.trim() || t('basemapOverlayUnnamed'),
      en: ui.bmOverlayNameEn.value.trim() || ui.bmOverlayNameZh.value.trim() || 'Overlay'
    },
    enabled: ui.bmOverlayEnabled.value === 'true',
    type: ui.bmOverlayType.value,
    provider: ui.bmOverlayProvider.value.trim() || 'Custom',
    url: ui.bmOverlayUrl.value.trim(),
    subdomains: ui.bmOverlaySubdomains.value.trim(),
    coordSystem: ui.bmOverlayCoordSystem.value,
    maxNativeZoom: Number(ui.bmOverlayMaxNativeZoom.value || 18),
    maxZoom: Number(ui.bmOverlayMaxZoom.value || 22),
    opacity: Number(ui.bmOverlayOpacity.value || 1),
    zIndex: Number(ui.bmOverlayZIndex.value || 420),
    attachToBaseMapIds: ui.bmOverlayAttach.value.trim(),
    token: ui.bmOverlayToken.value.trim(),
    notes: ui.bmOverlayNotes.value.trim(),
    transparent: true,
    isOverlay: true,
    builtIn: existing?.builtIn || false
  });
}

function validateOverlayConfig(overlay, active = getActiveBaseMapConfig()) {
  const normalized = normalizeBaseMapConfig({ ...overlay, isOverlay: true });
  const checks = validateBaseMapConfig(normalized).filter(item => item.text !== t('autoNormalizeBasemap'));
  checks.push({ level: normalized.isOverlay ? 'ok' : 'error', text: t('basemapOverlayCheckSeparated'), detail: normalized.isOverlay ? t('basemapOverlaySeparated') : t('basemapOverlayMixed') });
  checks.push({ level: normalized.transparent ? 'ok' : 'warning', text: t('basemapOverlayCheckTransparent'), detail: normalized.transparent ? t('enabled') : t('disabled') });
  checks.push({ level: normalized.opacity >= 0 && normalized.opacity <= 1 ? 'ok' : 'error', text: t('basemapOverlayOpacity'), detail: `${Math.round(normalized.opacity * 100)}%` });
  const attached = normalizeAttachBaseMapIds(normalized.attachToBaseMapIds);
  checks.push({ level: attached.length ? 'ok' : 'warning', text: t('basemapOverlayAttach'), detail: attached.join(', ') || t('basemapOverlayAttachAny') });
  if (active) {
    const current = normalizeBaseMapConfig(active);
    const attachedOk = !attached.length || attached.includes(current.id);
    checks.push({ level: attachedOk ? 'ok' : 'warning', text: t('basemapOverlayAttachCurrent'), detail: attachedOk ? basemapLabel(current) : t('basemapOverlayNotRecommended') });
    checks.push({ level: normalized.coordSystem === current.coordSystem ? 'ok' : 'warning', text: t('basemapOverlayCoordMatch'), detail: `${normalized.coordSystem} / ${current.coordSystem}` });
  }
  if (normalized.url.includes('{token}') || normalized.url.includes('{key}')) {
    checks.push({ level: normalized.token || normalized.key ? 'ok' : 'warning', text: t('basemapOverlayToken'), detail: normalized.token || normalized.key ? t('configured') : t('notFilled') });
  }
  return checks;
}

function renderOverlayStatusPanel() {
  if (!ui.basemapOverlayStatusPanel) return;
  const active = getActiveBaseMapConfig();
  const overlay = getOverlayBaseMaps().find(item => item.id === state.currentOverlayEditId);
  if (!overlay) {
    ui.basemapOverlayStatusPanel.innerHTML = `<div class="hint-box">${escapeHtml(t('basemapOverlayEmpty'))}</div>`;
    return;
  }
  const tile = basemapTileStatus(overlay);
  const checks = validateOverlayConfig(overlay, active);
  ui.basemapOverlayStatusPanel.innerHTML = `
    <div class="basemap-overlay-status-head">
      <span>${renderStatusIcon(overlay.enabled ? 'enabled' : 'disabled')}${escapeHtml(overlay.enabled ? t('enabled') : t('disabled'))}</span>
      <span>${renderStatusIcon(tile.level)}${escapeHtml(tile.localUpscale ? t('basemapStatusClientUpscale') : t('basemapStatusNativeTiles'))}</span>
    </div>
    <div class="basemap-check-list">
      ${checks.map(item => `<div class="basemap-check-row status-${normalizeStatusLevel(item.level)}"><span>${renderStatusIcon(item.level)}${escapeHtml(item.text)}</span><strong title="${escapeHtml(item.detail || '')}">${escapeHtml(item.detail || '')}</strong></div>`).join('')}
    </div>
  `;
}

async function saveOverlayConfig() {
  if (typeof guardMaintenanceReadOnlyAction === 'function' && guardMaintenanceReadOnlyAction('save-overlay')) return;
  if (!state.settings) return;
  const overlay = readOverlayForm();
  if (!overlay.url) return showAlert(t('basemapOverlayUrlRequired'));
  const invalidZoom = overlay.maxZoom < overlay.maxNativeZoom || overlay.maxZoom > 24 || overlay.maxNativeZoom < 0;
  if (invalidZoom) return showAlert(t('basemapZoomInvalid'));
  const existing = state.settings.baseMaps.find(item => item.id === overlay.id);
  if (existing) Object.assign(existing, overlay);
  else state.settings.baseMaps.push(overlay);
  state.currentOverlayEditId = overlay.id;
  renderOverlaySettingsPanel();
  applyActiveBaseMap();
  detectBasemapStatus();
  await persistProject();
  toast(t('basemapOverlaySaved'));
}

function testOverlayConfig() {
  const overlay = readOverlayForm();
  state.currentOverlayEditId = overlay.id;
  const checks = validateOverlayConfig(overlay, getActiveBaseMapConfig());
  if (ui.basemapOverlayStatusPanel) {
    ui.basemapOverlayStatusPanel.innerHTML = `
      <div class="basemap-report-head"><span>${renderStatusIcon(checks.some(item => normalizeStatusLevel(item.level) === 'error') ? 'error' : checks.some(item => normalizeStatusLevel(item.level) === 'warning') ? 'warning' : 'ok')}${escapeHtml(t('basemapOverlayStaticCheck'))}</span></div>
      <div class="basemap-check-list">
        ${checks.map(item => `<div class="basemap-check-row status-${normalizeStatusLevel(item.level)}"><span>${renderStatusIcon(item.level)}${escapeHtml(item.text)}</span><strong title="${escapeHtml(item.detail || '')}">${escapeHtml(item.detail || '')}</strong></div>`).join('')}
      </div>`;
  }
}

async function resetBuiltinOverlays() {
  if (typeof guardMaintenanceReadOnlyAction === 'function' && guardMaintenanceReadOnlyAction('reset-overlays')) return;
  if (!state.settings) return;
  const byId = new Map((state.settings.baseMaps || []).filter(item => !BUILTIN_OVERLAY_IDS.includes(item.id)).map(item => [item.id, item]));
  BUILTIN_BASEMAPS.filter(item => item.isOverlay).forEach(item => byId.set(item.id, normalizeBaseMapConfig(item)));
  state.settings.baseMaps = [...byId.values()];
  state.currentOverlayEditId = DEFAULT_OVERLAY_ID;
  renderOverlaySettingsPanel();
  applyActiveBaseMap();
  detectBasemapStatus();
  await persistProject();
  toast(t('basemapOverlayDefaultRestored'));
}

function basemapTileStatus(bm) {
  const zoom = state.map?.getZoom?.() ?? 0;
  if (!bm) return { level: 'error', text: t('basemapStatusNoLayer') };
  if (!Number.isFinite(bm.maxNativeZoom)) return { level: 'warning', text: t('basemapStatusNeedNativeZoom') };
  if (zoom > bm.maxZoom) return { level: 'error', text: t('basemapStatusZoomExceeded') };
  if (zoom > bm.maxNativeZoom) {
    return {
      level: 'ok',
      text: t('basemapStatusClientUpscale'),
      localUpscale: true,
      detail: `${t('basemapStatusNativeZoom')}: z=${bm.maxNativeZoom}`
    };
  }
  return { level: 'ok', text: t('basemapStatusOk'), localUpscale: false };
}

function validateBaseMapConfig(bm) {
  const normalized = normalizeBaseMapConfig(bm);
  const checks = [];
  checks.push({ level: normalized.coordSystem ? 'ok' : 'error', text: t('basemapCheckCoordSystem'), detail: normalized.coordSystem || t('notFilled') });
  checks.push({ level: TILE_LAYER_TYPES.includes(normalized.type) ? 'ok' : 'error', text: t('basemapCheckType'), detail: normalized.type });
  checks.push({ level: Number.isFinite(normalized.maxNativeZoom) ? 'ok' : 'warning', text: t('basemapCheckNativeZoom'), detail: Number.isFinite(normalized.maxNativeZoom) ? `z=${normalized.maxNativeZoom}` : t('notFilled') });
  checks.push({ level: normalized.maxZoom >= normalized.maxNativeZoom && normalized.maxZoom <= 24 ? 'ok' : 'error', text: t('basemapCheckZoom'), detail: `${normalized.maxNativeZoom} / ${normalized.maxZoom}` });
  checks.push({ level: normalized.maxZoom > normalized.maxNativeZoom ? 'ok' : 'pending', text: t('basemapCheckLocalUpscale'), detail: normalized.maxZoom > normalized.maxNativeZoom ? t('basemapLocalUpscaleReady') : t('basemapLocalUpscaleNotNeeded') });
  const hasTiles = normalized.type === 'WMS' || (/\{x\}/.test(normalized.url) && /\{y\}/.test(normalized.url) && /\{z\}/.test(normalized.url));
  checks.push({ level: hasTiles ? 'ok' : 'error', text: t('basemapCheckUrl'), detail: hasTiles ? t('basemapStatusOk') : t('basemapCheckUrlMissing') });
  if (normalized.type === 'WMS') checks.push({ level: normalized.layerName || normalized.layers ? 'ok' : 'error', text: t('basemapCheckWmsLayers'), detail: normalized.layerName || normalized.layers || t('notFilled') });
  checks.push({ level: isAutoNormalizeBasemapEnabled() ? 'enabled' : 'disabled', text: t('autoNormalizeBasemap'), detail: isAutoNormalizeBasemapEnabled() ? t('enabled') : t('disabled') });
  return checks;
}

function detectBasemapStatus() {
  const activeRaw = getActiveBaseMapConfig();
  const active = activeRaw ? normalizeBaseMapConfig(activeRaw) : null;
  const checks = active ? validateBaseMapConfig(activeRaw) : [];
  const overlays = getOverlayBaseMaps();
  const enabledOverlays = overlays.filter(item => item.enabled !== false);
  checks.push({ level: overlays.length ? 'ok' : 'warning', text: t('basemapOverlayConfiguredCount'), detail: String(overlays.length) });
  enabledOverlays.forEach(overlay => {
    const tile = basemapTileStatus(overlay);
    checks.push({ level: tile.level, text: `${t('basemapOverlayLayer')}: ${basemapLabel(overlay)}`, detail: tile.localUpscale ? t('basemapStatusClientUpscale') : t('basemapStatusNativeTiles') });
    validateOverlayConfig(overlay, active).forEach(item => checks.push(item));
  });
  const overlayMismatch = enabledOverlays.filter(item => active && item.coordSystem !== active.coordSystem);
  if (overlayMismatch.length) {
    checks.push({ level: 'warning', text: t('basemapOverlayMismatch'), detail: String(overlayMismatch.length) });
  }
  const layerDiag = typeof getBusinessLayerDiagnostics === 'function' ? getBusinessLayerDiagnostics() : null;
  if (layerDiag) {
    checks.push({ level: layerDiag.duplicateCount ? 'warning' : 'ok', text: t('businessLayerStatus'), detail: layerDiag.duplicateCount ? t('businessLayerDuplicateFound') : t('businessLayerSingleInstance') });
    checks.push({ level: 'ok', text: t('businessLayerDisplayCoord'), detail: layerDiag.coordSystem });
    checks.push({ level: 'ok', text: t('businessLayerStorageCoord'), detail: layerDiag.storageCoordSystem });
    checks.push({ level: 'ok', text: t('businessLayerZoneCount'), detail: String(layerDiag.zoneCount) });
    checks.push({ level: 'ok', text: t('businessLayerPointCount'), detail: String(layerDiag.pointCount) });
    checks.push({ level: 'ok', text: t('businessLayerRenderToken'), detail: `#${layerDiag.token} · ${layerDiag.reason}` });
  }
  const hasError = checks.some(item => normalizeStatusLevel(item.level) === 'error');
  const hasWarning = checks.some(item => normalizeStatusLevel(item.level) === 'warning');
  state.lastBasemapCheck = {
    status: !active ? 'error' : hasError ? 'error' : hasWarning ? 'warning' : 'ok',
    checks,
    checkedAt: new Date().toLocaleString('zh-CN', { hour12: false })
  };
  updateBasemapWorkStatus();
  renderOverlayStatusPanel();
  return state.lastBasemapCheck;
}

function renderStatusIcon(level) {
  const normalized = normalizeStatusLevel(level);
  return `<span class="status-icon status-${normalized}" aria-hidden="true">${getStatusIcon(level)}</span>`;
}

function renderBasemapDetailPanel(active, tile, overlays, mismatchCount, check) {
  if (!ui.basemapDetailPanel) return;
  const checks = check?.checks?.length ? check.checks : validateBaseMapConfig(active);
  const checkHtml = checks.map(item => {
    const level = normalizeStatusLevel(item.level);
    return `<div class="basemap-check-row status-${level}">
      <span>${renderStatusIcon(item.level)}${escapeHtml(item.text)}</span>
      <strong>${escapeHtml(item.detail || '')}</strong>
    </div>`;
  }).join('');
  ui.basemapDetailPanel.innerHTML = `
    <div class="basemap-detail-summary">
      <span>${renderStatusIcon(tile.level)}${escapeHtml(tile.text)}${tile.detail ? ` · ${escapeHtml(tile.detail)}` : ''}</span>
      <span>${renderStatusIcon(mismatchCount ? 'warning' : 'ok')}${escapeHtml(t('basemapStatusOverlays'))}: ${overlays.length}</span>
      <span>${renderStatusIcon(isAutoNormalizeBasemapEnabled() ? 'enabled' : 'disabled')}${escapeHtml(t('autoNormalizeBasemap'))}</span>
    </div>
    <div class="basemap-check-list">${checkHtml}</div>
  `;
}

function renderBasemapReport() {
  if (!ui.basemapReportPanel) return;
  const check = state.lastBasemapCheck || detectBasemapStatus();
  if (!check?.checks?.length) {
    ui.basemapReportPanel.innerHTML = `<div class="hint-box">${escapeHtml(t('basemapReportEmpty'))}</div>`;
    return;
  }
  const groups = ['error', 'warning', 'ok', 'pending', 'unknown'].map(level => {
    const items = check.checks.filter(item => normalizeStatusLevel(item.level) === level);
    if (!items.length) return '';
    const rows = items.map(item => `
      <div class="basemap-check-row status-${level}">
        <span>${renderStatusIcon(item.level)}${escapeHtml(item.text)}</span>
        <strong title="${escapeHtml(item.detail || '')}">${escapeHtml(item.detail || '')}</strong>
      </div>
    `).join('');
    return `<details class="basemap-report-group" open><summary>${renderStatusIcon(level)}${escapeHtml(t('basemapCheck' + level))} · ${items.length}</summary><div class="basemap-check-list">${rows}</div></details>`;
  }).join('');
  ui.basemapReportPanel.innerHTML = `
    <div class="basemap-report-head">
      <span>${renderStatusIcon(check.status)}${escapeHtml(t('basemapDetectDone'))}</span>
      <strong>${escapeHtml(check.checkedAt || '')}</strong>
    </div>
    ${groups}
  `;
}

function updateBasemapWorkStatus() {
  const activeRaw = getActiveBaseMapConfig();
  if (!activeRaw) return;
  const active = normalizeBaseMapConfig(activeRaw);
  const tile = basemapTileStatus(active);
  const overlays = getCompatibleOverlayBaseMaps(active);
  const allEnabledOverlays = getOverlayBaseMaps().filter(item => item.enabled !== false);
  const mismatchCount = allEnabledOverlays.filter(item => item.coordSystem !== active.coordSystem).length;
  const check = state.lastBasemapCheck;
  const checkLevel = check ? check.status : 'pending';
  const layerDiag = typeof getBusinessLayerDiagnostics === 'function' ? getBusinessLayerDiagnostics() : null;
  const compactItems = [
    { key: t('basemapStatusName'), value: basemapLabel(active), level: 'ok' },
    { key: t('basemapStatusCoord'), value: active.coordSystem, level: active.coordSystem === 'WGS84' ? 'ok' : 'warning' },
    { key: t('basemapStatusZoom'), value: `${state.map?.getZoom?.() ?? '—'} / ${active.maxNativeZoom}/${active.maxZoom}`, level: tile.level },
    { key: t('basemapStatusDisplayMode'), value: tile.localUpscale ? t('basemapStatusClientUpscale') : t('basemapStatusNativeTiles'), level: tile.level },
    { key: t('businessLayerStatus'), value: layerDiag ? (layerDiag.duplicateCount ? t('businessLayerDuplicateFound') : t('businessLayerSingleInstance')) : '—', level: layerDiag?.duplicateCount ? 'warning' : 'ok' },
    { key: t('businessLayerDisplayCoord'), value: layerDiag?.coordSystem || active.coordSystem, level: 'ok' }
  ];
  if (ui.basemapStatusPanel) {
    ui.basemapStatusPanel.innerHTML = compactItems.map(item => `
      <div class="basemap-status-row status-${normalizeStatusLevel(item.level)}">
        <span>${renderStatusIcon(item.level)}${escapeHtml(item.key)}</span><strong title="${escapeHtml(item.value)}">${escapeHtml(item.value)}</strong>
      </div>
    `).join('');
  }
  const summary = `${basemapLabel(active)} / ${active.coordSystem} / z=${state.map?.getZoom?.() ?? '—'}/${active.maxNativeZoom}/${active.maxZoom} / ${mismatchCount ? t('basemapMismatch') : tile.text}`;
  if (ui.basemapQuickSummary) {
    ui.basemapQuickSummary.innerHTML = `${escapeHtml(basemapLabel(active))} / ${escapeHtml(active.coordSystem)} / z=${state.map?.getZoom?.() ?? '—'}/${active.maxNativeZoom}/${active.maxZoom} / ${renderStatusIcon(mismatchCount ? 'warning' : tile.level)}${escapeHtml(mismatchCount ? t('basemapMismatch') : tile.text)}`;
    ui.basemapQuickSummary.title = summary;
  }
  if (ui.basemapModalSummary) {
    ui.basemapModalSummary.innerHTML = `${renderStatusIcon(mismatchCount ? 'warning' : tile.level)}${escapeHtml(summary)}`;
    ui.basemapModalSummary.title = summary;
  }
  if (ui.basemapCoordRuleCurrent) {
    ui.basemapCoordRuleCurrent.textContent = `${active.coordSystem} → WGS84`;
  }
  if (ui.basemapStatusBadge) {
    const badgeLevel = normalizeStatusLevel(checkLevel === 'pending' ? tile.level : checkLevel);
    ui.basemapStatusBadge.className = `status-badge status-${badgeLevel}`;
    ui.basemapStatusBadge.textContent = getStatusIcon(badgeLevel);
  }
  updateAutoNormalizeSwitch();
  renderBasemapDetailPanel(active, tile, overlays, mismatchCount, check);
  renderBasemapReport();
}


function standardizeCurrentBasemapConfig(options = {}) {
  ensureStandardBaseMaps();
  state.settings.baseMaps = state.settings.baseMaps.map(normalizeBaseMapConfig);
  renderBasemapEditTargetSelect();
  renderBaseMapSelect();
  detectBasemapStatus();
  if (!options.silent) toast(t('basemapStandardized'));
}


async function runBasemapStatusCheck() {
  const progressId = createProgressTask({ type: 'basemap', title: t('basemapDetectTitle'), stage: t('progressPreparing'), total: 4 });
  updateProgressTask(progressId, { completed: 1, total: 4, stage: t('basemapDetectConfigStage') });
  await yieldToUi();
  updateProgressTask(progressId, { completed: 2, total: 4, stage: t('basemapDetectZoomStage') });
  await yieldToUi();
  detectBasemapStatus();
  updateProgressTask(progressId, { completed: 3, total: 4, stage: t('basemapDetectReportStage') });
  await yieldToUi();
  finishProgressTask(progressId, t('basemapDetectDone'));
}

async function runBasemapStandardize() {
  if (typeof guardMaintenanceReadOnlyAction === 'function' && guardMaintenanceReadOnlyAction('standardize-basemap')) return;
  const ok = await openConfirmDialog({
    title: t('basemapStandardizeTitle'),
    message: t('basemapStandardizeConfirm'),
    acceptLabel: t('confirmAction')
  });
  if (!ok) return;
  const total = Math.max(1, state.settings.baseMaps.length + 2);
  const progressId = createProgressTask({ type: 'basemap', title: t('basemapStandardizeTitle'), total });
  updateProgressTask(progressId, { completed: 1, total, stage: t('basemapStandardizeRunning') });
  state.settings.baseMaps = state.settings.baseMaps.map((item, index) => {
    updateProgressTask(progressId, { completed: Math.min(total - 1, index + 1), total, stage: t('basemapStandardizeRunning') });
    return normalizeBaseMapConfig(item);
  });
  renderBasemapEditTargetSelect();
  renderBaseMapSelect();
  detectBasemapStatus();
  await persistProject();
  updateProgressTask(progressId, { completed: total, total, stage: t('basemapStandardizeDone') });
  finishProgressTask(progressId, t('basemapStandardizeDone'));
}

async function correctSelectedGeometry(fromSystem) {
  if (typeof guardMaintenanceReadOnlyAction === 'function' && guardMaintenanceReadOnlyAction('correct-geometry')) return;
  const source = normalizeCoordSystem(fromSystem);
  if (source === 'WGS84') return showAlert(t('basemapCorrectionNoop'));
  const target = getSelectedPoint() || getSelectedZone();
  if (!target) return showAlert(t('basemapCorrectionNeedSelection'));
  const ok = await openConfirmDialog({
    title: t('basemapCorrectionTitle'),
    message: t('basemapCorrectionConfirm'),
    acceptLabel: t('confirmAction')
  });
  if (!ok) return;

  const snapshot = JSON.parse(JSON.stringify({ points: state.points, zones: state.zones }));
  const vertices = target.geometry?.coordinates?.[0] || [];
  const total = target.pointId !== undefined ? 1 : Math.max(1, vertices.length);
  const progressId = createProgressTask({ type: 'migration', title: t('basemapCorrectionTitle'), total });
  updateProgressTask(progressId, { completed: 0, total, stage: t('basemapCorrectionRunning') });

  if (target.pointId !== undefined) {
    const [lng, lat] = convertLngLat(target.lng, target.lat, source, 'WGS84');
    target.lng = lng;
    target.lat = lat;
    updateProgressTask(progressId, { completed: 1, total, stage: t('basemapCorrectionRunning') });
  } else if (target.geometry?.coordinates?.[0]) {
    target.geometry.coordinates[0] = vertices.map(([lng, lat], index) => {
      const next = convertLngLat(lng, lat, source, 'WGS84');
      updateProgressTask(progressId, { completed: index + 1, total, stage: t('basemapCorrectionRunning') });
      return next;
    });
  }

  state.lastCoordinateCorrection = snapshot;
  rerenderSpatialLayers('coordinate-correction');
  await persistProject();
  renderAllDerived();
  finishProgressTask(progressId, t('basemapCorrectionDone'));
}

async function undoLastCoordinateCorrection() {
  if (typeof guardMaintenanceReadOnlyAction === 'function' && guardMaintenanceReadOnlyAction('undo-coordinate-correction')) return;
  if (!state.lastCoordinateCorrection) return showAlert(t('basemapCorrectionNoUndo'));
  state.points = state.lastCoordinateCorrection.points.map(normalizePointRecord);
  state.zones = state.lastCoordinateCorrection.zones.map(normalizeZoneRecord);
  state.lastCoordinateCorrection = null;
  rerenderSpatialLayers('coordinate-correction-undo');
  await persistProject();
  renderAllDerived();
  toast(t('basemapCorrectionUndone'));
}
