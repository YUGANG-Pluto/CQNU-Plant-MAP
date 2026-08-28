let lastRenderedWorkspaceListTab = '';

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
  const activeTab = state.activeListTab === 'points' ? 'points' : 'zones';
  const tabChanged = lastRenderedWorkspaceListTab !== activeTab;
  const activePanel = activeTab === 'zones' ? ui.zoneListPanel : ui.pointListPanel;
  ui.btnTabZones?.classList.toggle('active', activeTab === 'zones');
  ui.btnTabPoints?.classList.toggle('active', activeTab === 'points');
  ui.btnTabZones?.setAttribute('aria-selected', activeTab === 'zones' ? 'true' : 'false');
  ui.btnTabPoints?.setAttribute('aria-selected', activeTab === 'points' ? 'true' : 'false');
  ui.btnTabZones && (ui.btnTabZones.tabIndex = activeTab === 'zones' ? 0 : -1);
  ui.btnTabPoints && (ui.btnTabPoints.tabIndex = activeTab === 'points' ? 0 : -1);
  ui.zoneListPanel.classList.toggle('hidden', activeTab !== 'zones');
  ui.pointListPanel.classList.toggle('hidden', activeTab !== 'points');
  if (tabChanged) {
    ui.zoneListPanel.classList.remove('is-entering');
    ui.pointListPanel.classList.remove('is-entering');
  }
  clearNode(ui.zoneListPanel);
  clearNode(ui.pointListPanel);
  ui.listSummaryCount && (ui.listSummaryCount.textContent = String(activeTab === 'zones' ? state.zones.length : state.points.length));
  if (!state.zones.length) renderObjectListEmpty(ui.zoneListPanel, 'objectListEmptyZones', 'objectWorkflowNoObjects');
  else state.zones.forEach(zone => {
    ui.zoneListPanel.appendChild(createObjectListButton(
      zoneDisplayName(zone),
      zone.zoneId || '',
      { type: 'zone', id: zone.id }
    ));
  });
  if (!state.points.length) renderObjectListEmpty(ui.pointListPanel, 'objectListEmptyPoints', 'objectWorkflowNoObjects');
  else state.points.forEach(point => {
    ui.pointListPanel.appendChild(createObjectListButton(
      pointDisplayName(point),
      pointMeta(point) || point.pointId || '',
      { type: 'point', id: point.id }
    ));
  });
  syncObjectSelectionUi('workspace-list-render');
  if (tabChanged) {
    window.requestAnimationFrame(() => {
      activePanel.classList.add('is-entering');
      window.setTimeout(() => activePanel.classList.remove('is-entering'), 1200);
    });
  }
  lastRenderedWorkspaceListTab = activeTab;
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
  if (typeof syncBusinessLayerVisibilityUi === 'function') syncBusinessLayerVisibilityUi();
  if (typeof refreshRightPanelDisplayMode === 'function') refreshRightPanelDisplayMode('derived-render');
  if (typeof syncMaintenanceSafeModeUi === 'function') syncMaintenanceSafeModeUi();
  if (typeof refreshReviewWorkbench === 'function') refreshReviewWorkbench();
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
  if (typeof guardMaintenanceReadOnlyAction === 'function' && guardMaintenanceReadOnlyAction('delete-point')) return;
  const point = getSelectedPoint();
  if (!point) return showAlert(t('noPointSelected'));
  const ok = await openConfirmDialog({ title: t('confirmDeletePointTitle'), message: t('confirmDeletePoint') });
  if (!ok) return;
  if (softDeletePointById(point.id)) await persistProject();
}

async function deleteCurrentZone() {
  if (typeof guardMaintenanceReadOnlyAction === 'function' && guardMaintenanceReadOnlyAction('delete-zone')) return;
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
  if (typeof guardMaintenanceReadOnlyAction === 'function' && guardMaintenanceReadOnlyAction('restore-trash')) return;
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
  if (typeof guardMaintenanceReadOnlyAction === 'function' && guardMaintenanceReadOnlyAction('delete-trash-forever')) return;
  const item = getTrashSelection();
  if (!item) return;
  const ok = await openConfirmDialog({ title: t('confirmDeleteForeverTitle'), message: t('deleteForeverSelected') });
  if (!ok) return;
  if (item.type === 'image' && item.payload?.relativePath) {
    await callIpc(window.platformAdapter.image.delete({
      projectDir: state.projectDir,
      relativePath: item.payload.relativePath
    }));
  }
  state.settings.recycleBin = getRecycleBin().filter(entry => entry.id !== item.id);
  state.trashSelectedId = '';
  renderAllDerived();
  await persistProject();
}
