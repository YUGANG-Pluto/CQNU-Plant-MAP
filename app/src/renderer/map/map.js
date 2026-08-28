function initMap() {
  state.map = L.map('map', {
    center: MAP_DEFAULT_CENTER,
    zoom: MAP_DEFAULT_ZOOM,
    zoomControl: true
  });

  L.control.scale({ imperial: false }).addTo(state.map);
  ensureBusinessLayerGroups();
  observeMapContainerSize();
  scheduleMapResize();
  state.map.on('click', onMapClick);
  state.map.on('zoomend moveend', updateBasemapWorkStatus);
}

function scheduleMapResize() {
  if (!state.map) return;
  [0, 80, 220].forEach(delay => {
    window.setTimeout(() => {
      if (state.map) state.map.invalidateSize({ animate: false });
    }, delay);
  });
}

function observeMapContainerSize() {
  const mapNode = document.getElementById('map');
  if (!mapNode || !window.ResizeObserver) return;
  const observer = new ResizeObserver(() => scheduleMapResize());
  observer.observe(mapNode);
  if (mapNode.parentElement) observer.observe(mapNode.parentElement);
  window.addEventListener('resize', scheduleMapResize);
}

function disableDrawHandler() {
  if (!state.drawHandler) return;

  try {
    state.drawHandler.disable();
  } catch (error) {
    console.warn('[map] draw handler disable failed', error);
  }

  state.drawHandler = null;
}

function ensureBusinessLayerGroups() {
  if (!state.map || state.businessLayerGroups) return state.businessLayerGroups;

  state.businessLayerGroups = {
    zones: L.layerGroup(),
    points: L.layerGroup(),
    photoMarkers: L.layerGroup().addTo(state.map),
    labels: L.layerGroup().addTo(state.map),
    tempPreview: L.layerGroup().addTo(state.map)
  };

  ['zones', 'points'].forEach(key => {
    if (state.businessLayerVisibility?.[key] !== false) {
      state.businessLayerGroups[key].addTo(state.map);
    }
  });

  state.businessLayerRegistry = new Map();
  syncBusinessLayerVisibilityUi();
  return state.businessLayerGroups;
}

function businessLayerIsVisible(key) {
  return state.businessLayerVisibility?.[key] !== false;
}

function syncBusinessLayerVisibilityUi() {
  const definitions = [
    { key: 'zones', button: ui?.btnToggleZoneLayer, count: ui?.zoneLayerCount, total: state.zones.length },
    { key: 'points', button: ui?.btnTogglePointLayer, count: ui?.pointLayerCount, total: state.points.length }
  ];
  definitions.forEach(item => {
    const visible = businessLayerIsVisible(item.key);
    item.button?.setAttribute('aria-checked', visible ? 'true' : 'false');
    item.button?.classList.toggle('is-hidden-layer', !visible);
    const status = item.button?.querySelector('.layer-visibility-copy small');
    if (status) {
      status.textContent = typeof t === 'function' ? t(visible ? 'layerVisible' : 'layerHidden') : (visible ? '可见' : '已隐藏');
      status.dataset.i18n = visible ? 'layerVisible' : 'layerHidden';
    }
    if (item.count) item.count.textContent = String(item.total);
  });
}

function setBusinessLayerVisibility(key, visible) {
  if (!['zones', 'points'].includes(key)) return false;
  ensureBusinessLayerGroups();
  const group = state.businessLayerGroups?.[key];
  if (!group || !state.map) return false;
  state.businessLayerVisibility[key] = Boolean(visible);
  if (visible && !state.map.hasLayer(group)) group.addTo(state.map);
  if (!visible && state.map.hasLayer(group)) state.map.removeLayer(group);
  syncBusinessLayerVisibilityUi();
  return true;
}

function toggleBusinessLayerVisibility(key) {
  return setBusinessLayerVisibility(key, !businessLayerIsVisible(key));
}

function removeBusinessLayer(layer) {
  if (!state.map || !layer) return;
  Object.values(state.businessLayerGroups || {}).forEach(group => {
    if (group?.hasLayer?.(layer)) group.removeLayer(layer);
  });
  if (state.map.hasLayer(layer)) state.map.removeLayer(layer);
}

function removeLegacyBusinessLayers() {
  if (!state.map?.eachLayer) return;
  const stale = [];
  state.map.eachLayer(layer => {
    if (!layer) return;
    const isBusinessLayer = Boolean(
      layer._businessLayerKey ||
      layer._businessKind ||
      layer._zoneId ||
      layer._pointId ||
      layer._pendingPointLayer
    );
    if (isBusinessLayer) stale.push(layer);
  });
  stale.forEach(removeBusinessLayer);
}

function clearBusinessLayers(options = {}) {
  const { clearPending = true, removeLegacy = true } = options;
  if (!state.map) return;
  ensureBusinessLayerGroups();

  state.zoneLayers.forEach(removeBusinessLayer);
  state.pointLayers.forEach(removeBusinessLayer);
  state.zoneLayers.clear();
  state.pointLayers.clear();

  Object.entries(state.businessLayerGroups || {}).forEach(([key, group]) => {
    if (key === 'tempPreview' && !clearPending) return;
    group.clearLayers();
  });

  if (removeLegacy) removeLegacyBusinessLayers();

  if (clearPending) {
    state.pendingPoint = null;
    if (typeof showPendingControls === 'function') showPendingControls(false);
  } else if (state.pendingPoint) {
    state.pendingPoint.layer = null;
  }

  state.businessLayerRegistry = new Map();
}

function nextMapRenderToken(reason = 'unknown') {
  state.mapRenderToken = (state.mapRenderToken || 0) + 1;
  state.lastBusinessLayerRender = {
    reason,
    token: state.mapRenderToken,
    coordSystem: activeCoordSystem(),
    at: Date.now()
  };
  return state.mapRenderToken;
}

function isCurrentMapRenderToken(token) {
  return !token || token === state.mapRenderToken;
}

function registerBusinessLayer(key, layer, groupKey, token = state.mapRenderToken) {
  if (!state.map || !layer || !key) return null;
  if (!isCurrentMapRenderToken(token)) return null;
  ensureBusinessLayerGroups();

  const previous = state.businessLayerRegistry?.get(key);
  if (previous && previous !== layer) removeBusinessLayer(previous);

  layer._businessLayerKey = key;
  layer._businessKind = groupKey;
  layer._mapRenderToken = token;

  const group = state.businessLayerGroups?.[groupKey];
  if (group?.addLayer) group.addLayer(layer);
  else layer.addTo(state.map);

  state.businessLayerRegistry.set(key, layer);
  return layer;
}

function rerenderBusinessLayers(reason = 'unknown', options = {}) {
  if (!state.map) return;
  const preservePending = options.preservePending === true && Boolean(state.pendingPoint);
  const pendingSnapshot = preservePending ? { ...state.pendingPoint } : null;
  const token = nextMapRenderToken(reason);

  clearBusinessLayers({ clearPending: !preservePending, removeLegacy: true });

  state.zones
    .filter(zone => zone.geometry)
    .forEach(zone => addZoneLayer(zone, { token }));

  state.points
    .filter(point => Number.isFinite(point.lat) && Number.isFinite(point.lng))
    .forEach(point => addPointLayer(point, { token }));

  if (preservePending && pendingSnapshot) {
    state.pendingPoint = pendingSnapshot;
    if (typeof redrawPendingPointLayer === 'function') redrawPendingPointLayer(token);
  }

  refreshZoneStyles();
  refreshPointStyles();
  state.lastBusinessLayerRender = {
    ...(state.lastBusinessLayerRender || {}),
    zoneCount: state.zoneLayers.size,
    pointCount: state.pointLayers.size,
    duplicateCount: countDuplicateBusinessLayers()
  };
  syncBusinessLayerVisibilityUi();
}

function countDuplicateBusinessLayers() {
  if (!state.map?.eachLayer) return 0;
  const counts = new Map();
  state.map.eachLayer(layer => {
    const key = layer?._businessLayerKey ||
      (layer?._zoneId ? `zone:${layer._zoneId}` : '') ||
      (layer?._pointId ? `point:${layer._pointId}` : '') ||
      (layer?._pendingPointLayer ? 'temp:pending-point' : '');
    if (!key) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return [...counts.values()].filter(count => count > 1).reduce((sum, count) => sum + count - 1, 0);
}

function getBusinessLayerDiagnostics() {
  return {
    coordSystem: activeCoordSystem(),
    storageCoordSystem: 'WGS84',
    token: state.mapRenderToken || 0,
    reason: state.lastBusinessLayerRender?.reason || 'init',
    zoneCount: state.zoneLayers.size,
    pointCount: state.pointLayers.size,
    duplicateCount: countDuplicateBusinessLayers()
  };
}

function setActiveModeButton(mode) {
  document.querySelectorAll('.mode-btn').forEach(button => {
    button.classList.remove('active');
  });

  if (mode === 'browse') ui.btnModeBrowse.classList.add('active');
  if (mode === 'drawZone') ui.btnModeDrawZone.classList.add('active');
  if (mode === 'addPoint') ui.btnModeAddPoint.classList.add('active');
}

function createZoneFromDraw(layer) {
  return {
    id: makeUid('zone'),
    zoneId: '',
    name: '',
    description: '',
    geometry: layer.toGeoJSON().geometry
  };
}

function startDrawZoneMode() {
  if (typeof guardMaintenanceReadOnlyAction === 'function' && guardMaintenanceReadOnlyAction('draw-zone')) return;
  state.drawHandler = new L.Draw.Polygon(state.map, {
    allowIntersection: false,
    showArea: true,
    shapeOptions: zoneStyle(false)
  });

  state.drawHandler.enable();
  state.map.once(L.Draw.Event.CREATED, async event => {
    if (typeof guardMaintenanceReadOnlyAction === 'function' && guardMaintenanceReadOnlyAction('draw-zone-created')) return;
    const edit = typeof beginProjectEdit === 'function' ? beginProjectEdit('historyCreateZone') : null;
    const zone = createZoneFromDraw(event.layer);
    state.zones.push(zone);
    addZoneLayer(zone);
    selectZone(zone.id);
    setMode('browse');
    if (typeof commitProjectEdit === 'function') commitProjectEdit(edit);
    await persistProject();
    renderAllDerived();
    toast(t('zoneCreated'));
  });
}

function setMode(mode) {
  if (typeof isMaintenanceReadOnlyMode === 'function' && isMaintenanceReadOnlyMode() && mode !== 'browse') {
    guardMaintenanceReadOnlyAction('set-mode');
    mode = 'browse';
  }
  disableDrawHandler();
  state.currentMode = mode;
  setActiveModeButton(mode);
  state.map.dragging.enable();
  updateStatusBar();

  if (mode === 'drawZone') {
    startDrawZoneMode();
  }
  if (typeof syncProjectHistoryUi === 'function') syncProjectHistoryUi();
}

function clearAllLayers() {
  clearBusinessLayers({ clearPending: true, removeLegacy: true });
}

async function onMapClick(event) {
  if (typeof guardMaintenanceReadOnlyAction === 'function' && state.currentMode === 'addPoint' && guardMaintenanceReadOnlyAction('map-add-point')) return;
  if (state.currentMode !== 'addPoint') return;
  if (!state.projectDir) return showAlert(t('noProject'));
  createPendingPointAt(event.latlng);
}

function fitMapToProjectData() {
  const latLngs = [];

  state.zones.forEach(zone => {
    geometryToLatLngs(zone.geometry).forEach(([lat, lng]) => {
      latLngs.push(L.latLng(lat, lng));
    });
  });

  state.points.forEach(point => {
    if (Number.isFinite(point.lat) && Number.isFinite(point.lng)) {
      latLngs.push(storagePointToDisplayLatLng(point));
    }
  });

  if (!latLngs.length) return;

  const bounds = L.latLngBounds(latLngs);
  if (bounds.isValid()) {
    state.map.fitBounds(bounds.pad(0.15), { animate: false, maxZoom: MAP_FOCUS_ZOOM });
  }
}
