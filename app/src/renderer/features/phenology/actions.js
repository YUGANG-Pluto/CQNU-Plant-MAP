async function applyZoneInfo() {
  if (typeof guardMaintenanceReadOnlyAction === 'function' && guardMaintenanceReadOnlyAction('apply-zone')) return;
  const zone = getEditableZone();
  if (!zone) return showAlert(t('noZoneSelected'));
  const edit = typeof beginProjectEdit === 'function' ? beginProjectEdit('historyEditZone') : null;

  if (window.objectSelectionStore) window.objectSelectionStore.selectZone(zone.id);
  else state.selectedZoneId = zone.id;
  zone.zoneId = ui.zoneId.value.trim();
  zone.name = ui.zoneName.value.trim();
  zone.description = ui.zoneDescription.value.trim();

  updateZoneTooltip(zone);
  renderAllDerived();
  if (typeof commitProjectEdit === 'function') commitProjectEdit(edit);
  if (typeof refreshProjectDraftState === 'function') refreshProjectDraftState();
  await persistProject();
}

async function applyPointInfo() {
  if (typeof guardMaintenanceReadOnlyAction === 'function' && guardMaintenanceReadOnlyAction('apply-point')) return;
  const point = getEditablePoint();
  if (!point) return showAlert(t('noPointSelected'));

  const entry = getSelectedPhenologyEntry(point);
  if (!entry) return showAlert(t('noPhenologySelected'));
  const edit = typeof beginProjectEdit === 'function' ? beginProjectEdit('historyEditPoint') : null;

  pointEditorSaving = true;
  setPointEditorSaveState('saving');
  try {
    if (window.objectSelectionStore) {
      window.objectSelectionStore.selectPoint({
        pointId: point.id,
        zoneId: point.zoneRef,
        phenologyId: entry.id
      });
    } else {
      state.selectedPointId = point.id;
      state.selectedZoneId = point.zoneRef;
    }
    readPointFormIntoEntry(point, entry);
    syncPointSummary(point);
    updatePointTooltip(point);
    renderAllDerived();
    if (typeof commitProjectEdit === 'function') commitProjectEdit(edit);
    await persistProject();
    setPointEditorDraftBaseline();
    toast(t('pointEditorSavedToast'));
  } catch (error) {
    pointEditorSaving = false;
    setPointEditorSaveState('error');
    throw error;
  }
}

function openPointEditor() {
  if (typeof guardMaintenanceReadOnlyAction === 'function' && guardMaintenanceReadOnlyAction('open-point-editor'))
    return;
  const point = getSelectedPoint();
  if (!point) return showAlert(t('noPointSelected'));
  populatePointForm();
  openLayerModal(ui.pointEditorModal, { focusTarget: ui.pointId });
}

async function closePointEditor() {
  if (!(await confirmDiscardPointEditorDraft())) return false;
  closeLayerModal(ui.pointEditorModal);
  return true;
}

function openSmallPrompt(title, initial = '') {
  ui.smallPromptTitle.textContent = title;
  ui.smallPromptInput.value = initial;
  openLayerModal(ui.smallPromptModal);
  ui.smallPromptInput.focus();
  return new Promise(resolve => {
    state.promptResolver = resolve;
  });
}

function settleSmallPrompt(value) {
  closeLayerModal(ui.smallPromptModal);
  if (state.promptResolver) state.promptResolver(value);
  state.promptResolver = null;
}

async function addPhenologyEntry() {
  if (typeof guardMaintenanceReadOnlyAction === 'function' && guardMaintenanceReadOnlyAction('add-phenology')) return;
  const point = getSelectedPoint();
  if (!point) return showAlert(t('noPointSelected'));
  if (!(await confirmDiscardPointEditorDraft())) return;

  const value = await openSmallPrompt(t('addPhenologyPrompt'));
  if (!value) return;

  const label = mapLegacyPhenology(String(value).trim());
  const edit = typeof beginProjectEdit === 'function' ? beginProjectEdit('historyAddPhenology') : null;
  const entry = makePhenologyEntry({ label, floweringState: label });
  point.phenologyEntries.push(entry);
  if (window.objectSelectionStore) window.objectSelectionStore.selectPhenology(entry.id);
  else state.selectedPhenologyId = entry.id;

  syncPointSummary(point);
  populatePointForm();
  renderAllDerived();
  if (typeof commitProjectEdit === 'function') commitProjectEdit(edit);
  await persistProject();
}

async function deletePhenologyEntry() {
  if (typeof guardMaintenanceReadOnlyAction === 'function' && guardMaintenanceReadOnlyAction('delete-phenology'))
    return;
  const point = getSelectedPoint();
  const entry = getSelectedPhenologyEntry(point);
  if (!point || !entry) return showAlert(t('noPhenologySelected'));
  if (!(await confirmDiscardPointEditorDraft())) return;

  if (point.phenologyEntries.length <= 1) {
    point.phenologyEntries[0] = makePhenologyEntry({ label: '不明', floweringState: '不明' });
    if (window.objectSelectionStore) window.objectSelectionStore.selectPhenology(point.phenologyEntries[0].id);
    else state.selectedPhenologyId = point.phenologyEntries[0].id;
    syncPointSummary(point);
    populatePointForm();
    renderAllDerived();
    await persistProject();
    return;
  }

  const ok = await openConfirmDialog({
    title: t('deletePhenology'),
    message: t('deletePhenologyPrompt')
  });
  if (!ok) return;

  point.phenologyEntries = point.phenologyEntries.filter(item => item.id !== entry.id);
  if (window.objectSelectionStore) window.objectSelectionStore.selectPhenology(point.phenologyEntries[0]?.id || '');
  else state.selectedPhenologyId = point.phenologyEntries[0]?.id || '';
  syncPointSummary(point);
  populatePointForm();
  renderAllDerived();
  await persistProject();
}
