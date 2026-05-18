function pointStyle(selected = false, pending = false) {
  return {
    radius: pending ? 10 : (selected ? 9 : 7),
    color: '#ffffff',
    weight: 2,
    fillColor: pending ? '#ffb147' : (selected ? '#ff5e80' : '#30b7a0'),
    fillOpacity: 0.96
  };
}

function pointMeta(point) {
  const entry = getSelectedPhenologyEntry(point) || getPhenologyEntries(point)[0];
  const labels = getPhenologyEntries(point)
    .map(item => item.label)
    .filter(Boolean)
    .join(' / ');

  return [
    point.pointId,
    point.plantNameSci,
    labels || entry?.floweringState,
    entry?.habitat,
    entry?.cultivatedStatus
  ].filter(Boolean).join(' · ');
}

function totalPhenologyCount() {
  return state.points.reduce((sum, point) => sum + getPhenologyEntries(point).length, 0);
}

function popupRows(point, entry) {
  const labels = getPhenologyEntries(point).map(item => item.label).filter(Boolean);
  return [
    ['编号', point.pointId],
    ['中文名', point.plantNameCn],
    ['学名', point.plantNameSci],
    ['物候阶段', labels.join(' / ')],
    ['记录者', entry?.observer],
    ['调查日期', entry?.surveyDate],
    ['微生境', entry?.habitat],
    ['多度/数量', entry?.abundance],
    ['生活型', entry?.growthForm],
    ['物候状态', entry?.floweringState || entry?.label],
    ['来源属性', entry?.cultivatedStatus],
    ['备注', entry?.note]
  ].filter(([, value]) => value);
}

function renderPopupRows(rows) {
  return rows.map(([key, value]) => `
    <div class="pp-row">
      <span class="pp-key">${escapeHtml(key)}：</span>
      <span class="pp-val">${escapeHtml(value)}</span>
    </div>
  `).join('');
}

// 图片在项目目录内以相对路径保存，预览时才转换为本地 file URL。
function toFileUrl(relativePath) {
  if (!state.projectDir) return relativePath;
  const normalized = `${state.projectDir}/${relativePath}`.replaceAll('\\', '/');
  return `file:///${normalized}`;
}

function renderPopupImages(point, entry) {
  const images = normalizeImages(entry?.images);
  if (!images.length) {
    return `<div class="pp-empty">${escapeHtml(t('noImage'))}</div>`;
  }

  const imageSet = images.map(img => toFileUrl(img)).join('|');
  const caption = point.plantNameCn || point.plantNameSci || point.pointId || '';

  return `<div class="pp-images">${images.slice(0, 4).map(img => `
    <img class="pp-thumb"
      src="${escapeHtml(toFileUrl(img))}"
      data-full-image="${escapeHtml(toFileUrl(img))}"
      data-image-set="${escapeHtml(imageSet)}"
      data-caption="${escapeHtml(caption)}"
      alt="thumb" />
  `).join('')}</div>`;
}

function renderPointPopupHtml(point) {
  if (!point) {
    return '<div class="point-popup"><div class="pp-title">—</div></div>';
  }

  const entry = getSelectedPhenologyEntry(point) || getPhenologyEntries(point)[0] || null;
  const rowsHtml = renderPopupRows(popupRows(point, entry));
  const imagesHtml = renderPopupImages(point, entry);

  return `
    <div class="point-popup">
      <div class="pp-title">${escapeHtml(pointDisplayName(point))}</div>
      ${rowsHtml || '<div class="pp-empty">暂无详细信息</div>'}
      ${imagesHtml}
    </div>
  `;
}

function addPointLayer(point, options = {}) {
  if (!point?.id || !Number.isFinite(point.lat) || !Number.isFinite(point.lng) || !state.map) return null;
  const token = options.token || state.mapRenderToken || nextMapRenderToken('single-point-render');
  if (typeof isCurrentMapRenderToken === 'function' && !isCurrentMapRenderToken(token)) return null;

  const existing = state.pointLayers.get(point.id);
  if (existing && typeof removeBusinessLayer === 'function') removeBusinessLayer(existing);

  const displayLatLng = storagePointToDisplayLatLng(point);
  const marker = L.circleMarker(
    displayLatLng,
    pointStyle(point.id === state.selectedPointId, false)
  );

  marker._pointId = point.id;
  marker._businessLayerKey = `point:${point.id}`;
  marker._businessKind = 'points';
  marker._mapRenderToken = token;
  marker.on('click', event => handlePointLayerClick(event, point, marker));

  const meta = pointMeta(point);
  const tip = meta ? `${pointDisplayName(point)} · ${meta}` : pointDisplayName(point);
  marker.bindTooltip(escapeHtml(tip), { sticky: true, direction: 'top', opacity: 0.95 });
  marker.bindPopup(renderPointPopupHtml(point), {
    maxWidth: 360,
    className: 'point-detail-popup'
  });

  if (typeof registerBusinessLayer === 'function') registerBusinessLayer(`point:${point.id}`, marker, 'points', token);
  else marker.addTo(state.map);
  if (marker.bringToFront) marker.bringToFront();
  state.pointLayers.set(point.id, marker);
  return marker;
}

function handlePointLayerClick(event, point, marker) {
  L.DomEvent.stop(event);
  state.map.closePopup();

  if (state.currentMode === 'addPoint') return;
  if (state.pendingPoint) return showAlert(t('pendingPointBlocked'));

  selectPoint(point.id);
  marker.openPopup();
}

function refreshPointStyles() {
  state.points.forEach(point => {
    const marker = state.pointLayers.get(point.id);
    if (marker) marker.setStyle(pointStyle(point.id === state.selectedPointId, false));
  });
}

function updatePointTooltip(point) {
  const marker = state.pointLayers.get(point.id);
  if (!marker) return;

  const meta = pointMeta(point);
  const tip = meta ? `${pointDisplayName(point)} · ${meta}` : pointDisplayName(point);
  if (marker.setTooltipContent) marker.setTooltipContent(escapeHtml(tip));
  if (marker.setPopupContent) marker.setPopupContent(renderPointPopupHtml(point));
}

function selectPoint(pointId) {
  state.selectedPointId = pointId;
  const point = getSelectedPoint();

  if (point) {
    state.selectedZoneId = point.zoneRef;
    const hasSelected = getPhenologyEntries(point)
      .some(entry => entry.id === state.selectedPhenologyId);
    if (!state.selectedPhenologyId || !hasSelected) {
      state.selectedPhenologyId = getPhenologyEntries(point)[0]?.id || '';
    }
  }

  refreshZoneStyles();
  refreshPointStyles();
  populateZoneForm();
  populatePointForm();
  renderZonePointList();
  renderLists();
  updateStatusBar();

  const marker = point ? state.pointLayers.get(point.id) : null;
  if (marker?.openPopup) marker.openPopup();
  if (typeof scheduleRightPanelDisplayMode === 'function') scheduleRightPanelDisplayMode('point-change');
}

function showPendingControls(show) {
  ui.btnConfirmPoint.classList.toggle('hidden', !show);
  ui.btnCancelPoint.classList.toggle('hidden', !show);
  ui.pendingPointHint.classList.toggle('hidden', !show);
}

function clearPendingPoint() {
  if (state.pendingPoint?.layer) {
    if (typeof removeBusinessLayer === 'function') removeBusinessLayer(state.pendingPoint.layer);
    else state.map.removeLayer(state.pendingPoint.layer);
  }
  state.pendingPoint = null;
  showPendingControls(false);
}

function redrawPendingPointLayer(token = state.mapRenderToken) {
  if (!state.pendingPoint || !state.map) return null;
  if (state.pendingPoint.layer) {
    if (typeof removeBusinessLayer === 'function') removeBusinessLayer(state.pendingPoint.layer);
    else state.map.removeLayer(state.pendingPoint.layer);
  }
  const displayLatLng = storageLngLatToDisplayLatLng(state.pendingPoint.lng, state.pendingPoint.lat);
  const layer = L.circleMarker(displayLatLng, pointStyle(false, true));
  layer._pendingPointLayer = true;
  layer._businessLayerKey = 'temp:pending-point';
  layer._businessKind = 'tempPreview';
  layer._mapRenderToken = token;
  if (typeof registerBusinessLayer === 'function') registerBusinessLayer('temp:pending-point', layer, 'tempPreview', token);
  else layer.addTo(state.map);
  state.pendingPoint.layer = layer;
  showPendingControls(true);
  return layer;
}

// 临时点必须先落入选中分区，确认前不写入 points.json。
function createPendingPointAt(latlng) {
  const zone = getSelectedZone();
  if (!zone) return showAlert(t('chooseZoneThenAddPoint'));
  if (state.pendingPoint) return showAlert(t('pendingPointBlocked'));
  if (!pointInPolygon(latlng, zone.geometry.coordinates)) {
    return showAlert(t('pointMustBeInZone'));
  }

  const storageLatLng = displayLatLngToStorageLatLng(latlng);
  const layer = L.circleMarker(latlng, pointStyle(false, true));
  layer._pendingPointLayer = true;
  layer._businessLayerKey = 'temp:pending-point';
  layer._businessKind = 'tempPreview';
  if (typeof registerBusinessLayer === 'function') registerBusinessLayer('temp:pending-point', layer, 'tempPreview', state.mapRenderToken || 0);
  else layer.addTo(state.map);

  state.pendingPoint = {
    zoneId: zone.id,
    lat: storageLatLng.lat,
    lng: storageLatLng.lng,
    layer
  };
  state.selectedPointId = null;

  clearPointForm();
  showPendingControls(true);
  updateStatusBar();
  toast(t('pendingPointHint'));
}

async function confirmPendingPoint() {
  if (!state.pendingPoint) return;

  const pending = { ...state.pendingPoint };
  const point = normalizePointRecord({
    id: makeUid('point'),
    pointId: `P${String(state.points.length + 1).padStart(3, '0')}`,
    zoneRef: pending.zoneId,
    lat: pending.lat,
    lng: pending.lng,
    plantNameCn: '',
    plantNameSci: '',
    phenologyEntries: [makePhenologyEntry({ label: '不明', floweringState: '不明' })]
  });

  clearPendingPoint();
  state.points.push(point);
  addPointLayer(point);
  selectPoint(point.id);
  setMode('browse');
  await persistProject();
  renderAllDerived();

  const marker = state.pointLayers.get(point.id);
  if (marker?.openPopup) marker.openPopup();
  toast(t('pointCreated'));
}

function cancelPendingPoint() {
  clearPendingPoint();
  setMode('browse');
  toast(t('pointCreateCancelled'));
}

function focusPointOnMap(pointId) {
  const point = state.points.find(item => item.id === pointId);
  if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return;
  const displayLatLng = storagePointToDisplayLatLng(point);
  state.map.setView(displayLatLng, Math.max(state.map.getZoom(), MAP_FOCUS_ZOOM), {
    animate: true
  });
}
