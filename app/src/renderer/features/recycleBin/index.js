function renderTrashList() {
  if (!ui.trashList) return;
  const trash = getRecycleBin();
  ui.trashCount.textContent = String(trash.length);
  clearNode(ui.trashList);
  if (!trash.length) {
    ui.trashList.appendChild(listTextItem(t('trashEmpty')));
    return;
  }
  trash.forEach(item => {
    const typeLabel = item.type === 'zone'
      ? t('itemTypeZone')
      : item.type === 'point'
        ? t('itemTypePoint')
        : t('itemTypeImage');
    const card = listTextItem(
      item.label || typeLabel,
      `${typeLabel} / ${t('deletedAt')} ${formatDateTimeLabel(item.deletedAt)}`
    );
    if (state.trashSelectedId === item.id) card.style.borderColor = '#9d8f82';
    card.addEventListener('click', () => {
      state.trashSelectedId = item.id;
      renderTrashList();
    });
    ui.trashList.appendChild(card);
  });
}

function renderLists() {
  if (!ui.zoneListPanel || !ui.pointListPanel) return;
  ui.btnTabZones?.classList.toggle('active', state.activeListTab === 'zones');
  ui.btnTabPoints?.classList.toggle('active', state.activeListTab === 'points');
  ui.zoneListPanel.classList.toggle('hidden', state.activeListTab !== 'zones');
  ui.pointListPanel.classList.toggle('hidden', state.activeListTab !== 'points');
  clearNode(ui.zoneListPanel);
  clearNode(ui.pointListPanel);
  ui.listSummaryCount && (ui.listSummaryCount.textContent = String(state.activeListTab === 'zones' ? state.zones.length : state.points.length));
  state.zones.forEach(zone => {
    const card = listTextItem(zoneDisplayName(zone), zone.zoneId || '');
    card.addEventListener('click', () => {
      selectZone(zone.id);
      focusZoneOnMap(zone.id);
    });
    ui.zoneListPanel.appendChild(card);
  });
  state.points.forEach(point => {
    const card = listTextItem(pointDisplayName(point), pointMeta(point) || point.pointId || '');
    card.addEventListener('click', () => {
      selectPoint(point.id);
      focusPointOnMap(point.id);
    });
    ui.pointListPanel.appendChild(card);
  });
}

function renderAllDerived() {
  renderCounters();
  renderZonePointList();
  renderLists();
  renderStatsModal();
  if (typeof renderWorkspaceStatsSummary === 'function') renderWorkspaceStatsSummary();
  renderTrashList();
  populateQueryFilters();
  renderQueryResults();
  updateStatusBar();
  updatePointSummaryBox();
  if (typeof updateBasemapWorkStatus === 'function') updateBasemapWorkStatus();
  if (typeof refreshRightPanelDisplayMode === 'function') refreshRightPanelDisplayMode('derived-render');
}

function removePointLayer(pointId) {
  const marker = state.pointLayers.get(pointId);
  if (marker) {
    if (typeof removeBusinessLayer === 'function') removeBusinessLayer(marker);
    else state.map.removeLayer(marker);
    state.pointLayers.delete(pointId);
    state.businessLayerRegistry?.delete?.(`point:${pointId}`);
  }
}

function removeZoneLayer(zoneId) {
  const layer = state.zoneLayers.get(zoneId);
  if (layer) {
    if (typeof removeBusinessLayer === 'function') removeBusinessLayer(layer);
    else state.map.removeLayer(layer);
    state.zoneLayers.delete(zoneId);
    state.businessLayerRegistry?.delete?.(`zone:${zoneId}`);
  }
}

function softDeletePointById(pointId) {
  const point = state.points.find(p => p.id === pointId);
  if (!point) return false;
  pushToRecycleBin(buildTrashItem('point', pointDisplayName(point), { point: structuredClone(point) }));
  removePointLayer(point.id);
  state.points = state.points.filter(p => p.id !== point.id);
  if (state.selectedPointId === point.id) state.selectedPointId = null;
  if (ui.pointId.dataset.targetId === point.id) clearPointForm();
  state.map.closePopup();
  populatePointForm();
  renderAllDerived();
  updateStatusBar();
  return true;
}

async function deleteCurrentPoint() {
  const point = getSelectedPoint();
  if (!point) return showAlert(t('noPointSelected'));
  const ok = await openConfirmDialog({ title: t('confirmDeletePointTitle'), message: t('confirmDeletePoint') });
  if (!ok) return;
  if (softDeletePointById(point.id)) await persistProject();
}

async function deleteCurrentZone() {
  const zone = getEditableZone();
  if (!zone) return showAlert(t('noZoneSelected'));
  const ok = await openConfirmDialog({ title: t('confirmDeleteZoneTitle'), message: t('confirmDeleteZone') });
  if (!ok) return;
  const linkedPoints = state.points.filter(p => p.zoneRef === zone.id).map(p => structuredClone(p));
  pushToRecycleBin(buildTrashItem('zone', zoneDisplayName(zone), { zone: structuredClone(zone), points: linkedPoints }));
  linkedPoints.forEach(p => removePointLayer(p.id));
  state.points = state.points.filter(p => p.zoneRef !== zone.id);
  removeZoneLayer(zone.id);
  state.zones = state.zones.filter(z => z.id !== zone.id);
  if (state.selectedZoneId === zone.id) state.selectedZoneId = null;
  if (linkedPoints.some(p => p.id === state.selectedPointId)) state.selectedPointId = null;
  clearZoneForm();
  clearPointForm();
  renderAllDerived();
  setMode('browse');
  await persistProject();
}

async function restoreSelectedTrash() {
  const item = getTrashSelection();
  if (!item) return;
  const trash = getRecycleBin();
  if (item.type === 'zone') {
    const zone = item.payload?.zone;
    const points = item.payload?.points || [];
    if (zone && !state.zones.some(z => z.id === zone.id)) {
      state.zones.push(zone);
      addZoneLayer(zone);
    }
    points.forEach(point => {
      if (!state.points.some(p => p.id === point.id)) {
        state.points.push(normalizePointRecord(point));
        addPointLayer(point);
      }
    });
  } else if (item.type === 'point') {
    const point = item.payload?.point;
    if (point && !state.points.some(p => p.id === point.id)) {
      state.points.push(normalizePointRecord(point));
      addPointLayer(point);
    }
  } else if (item.type === 'image') {
    const { pointId, phenologyId, relativePath } = item.payload || {};
    const point = state.points.find(p => p.id === pointId);
    const entry = point ? (getPhenologyEntries(point).find(candidate => candidate.id === phenologyId) || getPhenologyEntries(point)[0]) : null;
    if (point && entry && relativePath && !(entry.images || []).includes(relativePath)) {
      entry.images = entry.images || [];
      entry.images.push(relativePath);
      syncPointSummary(point);
      if (state.selectedPointId === point.id) renderImageList(entry.images);
      updatePointTooltip(point);
    }
  }
  state.settings.recycleBin = trash.filter(entry => entry.id !== item.id);
  state.trashSelectedId = '';
  renderAllDerived();
  await persistProject();
}

async function deleteTrashForever() {
  const item = getTrashSelection();
  if (!item) return;
  const ok = await openConfirmDialog({ title: t('confirmDeleteForeverTitle'), message: t('deleteForeverSelected') });
  if (!ok) return;
  if (item.type === 'image' && item.payload?.relativePath) {
    await callIpc(window.plantApp.image.delete({
      projectDir: state.projectDir,
      relativePath: item.payload.relativePath
    }));
  }
  state.settings.recycleBin = getRecycleBin().filter(entry => entry.id !== item.id);
  state.trashSelectedId = '';
  renderAllDerived();
  await persistProject();
}
