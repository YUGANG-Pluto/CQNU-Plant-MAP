function zoneStyle(selected = false) {
  return {
    color: selected ? '#4b6bff' : '#6e8cff',
    weight: selected ? 3 : 2,
    fillColor: selected ? '#5b7dff' : '#92a6ff',
    fillOpacity: selected ? 0.26 : 0.16
  };
}

// 渲染分区前将 GeoJSON 坐标顺序转换为 Leaflet 坐标顺序。
function geometryToLatLngs(geometry) {
  if (!geometry || geometry.type !== 'Polygon') return [];
  if (!Array.isArray(geometry.coordinates?.[0])) return [];
  return geometry.coordinates[0].map(pair => {
    const decoded = decodeCoordPair(pair);
    if (!decoded) return null;
    const [lat, lng] = decoded;
    const display = storageLngLatToDisplayLatLng(lng, lat);
    return [display.lat, display.lng];
  }).filter(Boolean);
}

function pointInPolygonStorage(latlng, polygonCoords) {
  const ring = polygonCoords?.[0];
  if (!Array.isArray(ring) || ring.length < 3) return false;

  const x = latlng.lng;
  const y = latlng.lat;
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const denominator = yj - yi || 1e-12;
    const intersects = ((yi > y) !== (yj > y)) &&
      (x < ((xj - xi) * (y - yi)) / denominator + xi);

    if (intersects) inside = !inside;
  }

  return inside;
}

// 点位创建沿用射线法，确保新增点仍受当前分区边界约束。
function pointInPolygon(latlng, polygonCoords) {
  return pointInPolygonStorage(displayLatLngToStorageLatLng(latlng), polygonCoords);
}

function zoneBounds(zone) {
  const coords = geometryToLatLngs(zone?.geometry);
  return coords.length ? L.latLngBounds(coords) : null;
}

function focusZoneOnMap(zoneId) {
  const zone = state.zones.find(item => item.id === zoneId);
  if (!zone) return;

  const bounds = zoneBounds(zone);
  if (bounds && bounds.isValid()) {
    state.map.fitBounds(bounds.pad(0.18), { animate: true, maxZoom: MAP_FOCUS_ZOOM });
  }
}

function addZoneLayer(zone, options = {}) {
  if (!zone?.id || !zone.geometry || !state.map) return null;
  const token = options.token || state.mapRenderToken || nextMapRenderToken('single-zone-render');
  if (typeof isCurrentMapRenderToken === 'function' && !isCurrentMapRenderToken(token)) return null;

  const existing = state.zoneLayers.get(zone.id);
  if (existing && typeof removeBusinessLayer === 'function') removeBusinessLayer(existing);

  const layer = L.polygon(
    geometryToLatLngs(zone.geometry),
    zoneStyle(zone.id === state.selectedZoneId)
  );

  layer._zoneId = zone.id;
  layer._businessLayerKey = `zone:${zone.id}`;
  layer._businessKind = 'zones';
  layer._mapRenderToken = token;
  layer.on('click', event => handleZoneLayerClick(event, zone));
  layer.bindTooltip(escapeHtml(zoneDisplayName(zone)), {
    sticky: true,
    direction: 'top',
    opacity: 0.92
  });

  if (typeof registerBusinessLayer === 'function') registerBusinessLayer(`zone:${zone.id}`, layer, 'zones', token);
  else layer.addTo(state.map);
  state.zoneLayers.set(zone.id, layer);
  return layer;
}

function handleZoneLayerClick(event, zone) {
  L.DomEvent.stop(event);
  state.map.closePopup();

  if (state.currentMode === 'addPoint') {
    if (state.pendingPoint) return showAlert(t('pendingPointBlocked'));
    if (state.selectedZoneId !== zone.id) selectZone(zone.id);
    createPendingPointAt(event.latlng);
    return;
  }

  if (state.pendingPoint) return showAlert(t('pendingPointBlocked'));
  selectZone(zone.id);
}

function refreshZoneStyles() {
  state.zones.forEach(zone => {
    const layer = state.zoneLayers.get(zone.id);
    if (layer) layer.setStyle(zoneStyle(zone.id === state.selectedZoneId));
  });
}

function updateZoneTooltip(zone) {
  const layer = state.zoneLayers.get(zone.id);
  if (layer?.setTooltipContent) {
    layer.setTooltipContent(escapeHtml(zoneDisplayName(zone)));
  }
}

function selectZone(zoneId) {
  state.selectedZoneId = zoneId;
  state.selectedPointId = null;
  state.selectedPhenologyId = '';

  refreshZoneStyles();
  refreshPointStyles();
  populateZoneForm();
  clearPointForm();
  renderZonePointList();
  renderLists();
  updateStatusBar();
  state.map.closePopup();
  updatePointSummaryBox();
  if (typeof scheduleRightPanelDisplayMode === 'function') scheduleRightPanelDisplayMode('zone-change');
}

function uniqueSpeciesInZone(zoneId) {
  const species = state.points
    .filter(point => point.zoneRef === zoneId)
    .map(point => (point.plantNameSci || point.plantNameCn || '').trim())
    .filter(Boolean);

  return new Set(species).size;
}

function overallSpeciesCount() {
  const species = state.points
    .map(point => (point.plantNameSci || point.plantNameCn || '').trim())
    .filter(Boolean);

  return new Set(species).size;
}
