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
  if (ui.bmSourceLabel) ui.bmSourceLabel.value = normalized.sourceLabel || normalized.provider || '';
  if (ui.bmToken) ui.bmToken.value = normalized.token || normalized.key || '';
  if (ui.bmTermsUrl) ui.bmTermsUrl.value = normalized.termsUrl || normalized.serviceTermsUrl || '';
  if (ui.bmReviewNumber) ui.bmReviewNumber.value = normalized.reviewNumber || normalized.mapReviewNumber || '';
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
  if (ui.bmSourceLabel) ui.bmSourceLabel.value = '';
  if (ui.bmToken) ui.bmToken.value = '';
  if (ui.bmTermsUrl) ui.bmTermsUrl.value = '';
  if (ui.bmReviewNumber) ui.bmReviewNumber.value = '';
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
  const sourceLabel = ui.bmSourceLabel?.value.trim() || '';
  const token = ui.bmToken?.value.trim() || '';
  const termsUrl = ui.bmTermsUrl?.value.trim() || '';
  const reviewNumber = ui.bmReviewNumber?.value.trim() || '';
  const inferredAuthorizationRequired = isProviderAuthorizationScoped({
    provider: ui.bmProvider?.value,
    sourceLabel,
    url: ui.bmUrl.value
  });
  const inferredKeyRequired = hasKeyPlaceholder(ui.bmUrl.value) || inferredAuthorizationRequired;
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
    sourceLabel,
    token,
    key: token,
    termsUrl,
    serviceTermsUrl: termsUrl,
    reviewNumber,
    mapReviewNumber: reviewNumber,
    tileSize: Number(ui.bmTileSize?.value || 256),
    zoomOffset: Number(ui.bmZoomOffset?.value || 0),
    subdomains: ui.bmSubdomains.value.trim(),
    layers: ui.bmLayers.value.trim(),
    format: ui.bmFormat.value.trim() || 'image/png',
    transparent: ui.bmTransparent.value,
    isOverlay: false,
    enabled: true,
    builtIn: existing?.builtIn || false,
    authorizationRequired: Boolean(existing?.authorizationRequired || inferredAuthorizationRequired),
    requiresAuthorization: Boolean(existing?.requiresAuthorization || existing?.authorizationRequired || inferredAuthorizationRequired),
    keyRequired: Boolean(existing?.keyRequired || inferredKeyRequired),
    requiresKey: Boolean(existing?.requiresKey || existing?.keyRequired || inferredKeyRequired),
    authorizationNote: existing?.authorizationNote || ''
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
