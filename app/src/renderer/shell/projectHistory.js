const projectEditSession = {
  applying: false,
  saveRequests: 0,
  saveError: false,
  lastSavedAt: 0,
  draftSources: new Set(),
  trackedDataFingerprint: ''
};

function getProjectEditHistoryBridge() {
  return window.projectEditHistory || null;
}

function cloneProjectEditValue(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function captureProjectEditSnapshot() {
  return {
    zones: cloneProjectEditValue(state.zones || []),
    points: cloneProjectEditValue(state.points || []),
    selectedZoneId: state.selectedZoneId || null,
    selectedPointId: state.selectedPointId || null,
    selectedPhenologyId: state.selectedPhenologyId || ''
  };
}

function projectEditSnapshotFingerprint(snapshot = captureProjectEditSnapshot()) {
  return JSON.stringify({ zones: snapshot.zones, points: snapshot.points });
}

function projectEditSnapshotsEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function beginProjectEdit(labelKey) {
  if (projectEditSession.applying || !getProjectEditHistoryBridge()) return null;
  return {
    id: makeUid('edit'),
    labelKey,
    createdAt: new Date().toISOString(),
    before: captureProjectEditSnapshot()
  };
}

function commitProjectEdit(transaction) {
  const bridge = getProjectEditHistoryBridge();
  if (!transaction || !bridge || projectEditSession.applying) return false;
  const after = captureProjectEditSnapshot();
  projectEditSession.trackedDataFingerprint = projectEditSnapshotFingerprint(after);
  if (projectEditSnapshotsEqual(transaction.before, after)) {
    syncProjectHistoryUi();
    return false;
  }
  bridge.push({ ...transaction, after });
  syncProjectHistoryUi();
  return true;
}

function clearProjectEditHistory(options = {}) {
  getProjectEditHistoryBridge()?.clear();
  if (options.trackCurrent !== false) {
    projectEditSession.trackedDataFingerprint = projectEditSnapshotFingerprint();
  }
  syncProjectHistoryUi();
}

function normalizeProjectSaveTime(value) {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function resetProjectEditHistory(options = {}) {
  projectEditSession.applying = false;
  projectEditSession.saveRequests = 0;
  projectEditSession.saveError = false;
  projectEditSession.lastSavedAt = normalizeProjectSaveTime(
    options.lastSavedAt || state.projectModifiedTime || Date.now()
  );
  projectEditSession.draftSources.clear();
  clearProjectEditHistory({ trackCurrent: true });
  refreshProjectDraftState();
}

function prepareProjectEditHistoryForSave() {
  const currentFingerprint = projectEditSnapshotFingerprint();
  if (
    projectEditSession.trackedDataFingerprint &&
    currentFingerprint !== projectEditSession.trackedDataFingerprint &&
    !projectEditSession.applying
  ) {
    getProjectEditHistoryBridge()?.clear();
  }
  projectEditSession.trackedDataFingerprint = currentFingerprint;
  syncProjectHistoryUi();
}

function setProjectDraftSource(source, active) {
  if (!source) return;
  if (active) projectEditSession.draftSources.add(source);
  else projectEditSession.draftSources.delete(source);
  syncProjectSaveStatusUi();
  syncProjectHistoryUi();
}

function projectHasUnappliedDraft() {
  return projectEditSession.draftSources.size > 0;
}

function projectZoneFormHasUnsavedChanges() {
  const targetId = ui.zoneId?.dataset.targetId || '';
  if (!targetId) return false;
  const zone = state.zones.find(item => item.id === targetId);
  if (!zone) return false;
  return (
    String(ui.zoneId?.value || '').trim() !== String(zone.zoneId || '').trim() ||
    String(ui.zoneName?.value || '').trim() !== String(zone.name || '').trim() ||
    String(ui.zoneDescription?.value || '').trim() !== String(zone.description || '').trim()
  );
}

function refreshProjectDraftState() {
  setProjectDraftSource('zone-editor', projectZoneFormHasUnsavedChanges());
  if (typeof pointEditorHasUnsavedChanges === 'function') {
    setProjectDraftSource('point-editor', pointEditorHasUnsavedChanges());
  }
}

function projectSaveStatusName() {
  if (!state.projectDir) return 'no-project';
  if (projectEditSession.saveError) return 'error';
  if (projectEditSession.saveRequests > 0) return 'saving';
  if (projectHasUnappliedDraft()) return 'draft';
  return 'saved';
}

function formatProjectSaveTime(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return '';
  const locale = (state.settings?.language || 'zh') === 'zh' ? 'zh-CN' : 'en-US';
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
}

function syncProjectSaveStatusUi() {
  if (!ui.projectSaveStatus || !ui.projectSaveStatusText) return;
  const status = projectSaveStatusName();
  const labelKeys = {
    'no-project': 'saveStateNoProject',
    saved: 'saveStateSaved',
    saving: 'saveStateSaving',
    draft: 'saveStateDraft',
    error: 'saveStateError'
  };
  const labelKey = labelKeys[status];
  ui.projectSaveStatus.dataset.status = status;
  ui.projectSaveStatus.classList.remove('is-no-project', 'is-saved', 'is-saving', 'is-draft', 'is-error');
  ui.projectSaveStatus.classList.add(`is-${status}`);
  ui.projectSaveStatusText.dataset.i18n = labelKey;
  ui.projectSaveStatusText.textContent = t(labelKey);

  const savedAt = projectEditSession.lastSavedAt || state.projectModifiedTime;
  const savedTime = status === 'saved' && savedAt ? formatProjectSaveTime(savedAt) : '';
  if (ui.projectSaveTimestamp) {
    ui.projectSaveTimestamp.textContent = savedTime;
    if (savedAt) ui.projectSaveTimestamp.dateTime = new Date(savedAt).toISOString();
    else ui.projectSaveTimestamp.removeAttribute('datetime');
  }
  ui.projectSaveStatus.title = savedTime
    ? `${t('saveStateLastSaved')} ${savedTime}`
    : t(labelKey);
}

function projectHistoryBlockedReason() {
  if (!state.projectDir) return t('commandRequiresProject');
  if (projectHasUnappliedDraft()) return t('historyBlockedByDraft');
  if (projectEditSession.applying || projectEditSession.saveRequests > 0) return t('historyBlockedBySaving');
  if (state.pendingPoint || state.currentMode !== 'browse') return t('historyBlockedByWorkflow');
  if (typeof isMaintenanceReadOnlyMode === 'function' && isMaintenanceReadOnlyMode()) {
    return t('commandUnavailable');
  }
  return '';
}

function syncProjectHistoryUi() {
  const bridge = getProjectEditHistoryBridge();
  const status = bridge?.inspect() || {
    canUndo: false,
    canRedo: false,
    undoLabelKey: '',
    redoLabelKey: ''
  };
  const blockedReason = projectHistoryBlockedReason();
  const undoDisabled = Boolean(blockedReason) || !status.canUndo;
  const redoDisabled = Boolean(blockedReason) || !status.canRedo;
  if (ui.btnUndoProjectEdit) {
    ui.btnUndoProjectEdit.disabled = undoDisabled;
    ui.btnUndoProjectEdit.title = undoDisabled
      ? (blockedReason || t('historyNothingToUndo'))
      : `${t('undoProjectEdit')}: ${t(status.undoLabelKey)}`;
  }
  if (ui.btnRedoProjectEdit) {
    ui.btnRedoProjectEdit.disabled = redoDisabled;
    ui.btnRedoProjectEdit.title = redoDisabled
      ? (blockedReason || t('historyNothingToRedo'))
      : `${t('redoProjectEdit')}: ${t(status.redoLabelKey)}`;
  }
  syncProjectSaveStatusUi();
  if (typeof refreshCommandPaletteI18n === 'function' && typeof isCommandPaletteOpen === 'function' && isCommandPaletteOpen()) {
    refreshCommandPaletteI18n();
  }
}

function notifyProjectSaveStarted() {
  projectEditSession.saveRequests += 1;
  projectEditSession.saveError = false;
  syncProjectSaveStatusUi();
  syncProjectHistoryUi();
}

function notifyProjectSaveSucceeded(modifiedTime) {
  projectEditSession.saveRequests = Math.max(0, projectEditSession.saveRequests - 1);
  projectEditSession.saveError = false;
  projectEditSession.lastSavedAt = normalizeProjectSaveTime(modifiedTime || Date.now());
  syncProjectSaveStatusUi();
  syncProjectHistoryUi();
}

function notifyProjectSaveFailed() {
  projectEditSession.saveRequests = Math.max(0, projectEditSession.saveRequests - 1);
  projectEditSession.saveError = true;
  syncProjectSaveStatusUi();
  syncProjectHistoryUi();
}

function applyProjectEditSnapshot(snapshot, reason) {
  state.zones = (snapshot.zones || []).map(item => normalizeZoneRecord(cloneProjectEditValue(item)));
  state.points = (snapshot.points || []).map(item => normalizePointRecord(cloneProjectEditValue(item)));
  state.hoveredZoneId = null;
  state.hoveredPointId = null;
  if (typeof clearPendingPoint === 'function') clearPendingPoint();

  const selectedPoint = state.points.find(item => item.id === snapshot.selectedPointId);
  const selectedZone = state.zones.find(item => item.id === snapshot.selectedZoneId);
  state.selectedPhenologyId = snapshot.selectedPhenologyId || '';
  rerenderBusinessLayers(reason);
  if (selectedPoint) selectPoint(selectedPoint.id);
  else if (selectedZone) selectZone(selectedZone.id);
  else selectZone(null);
  renderAllDerived();
  projectEditSession.trackedDataFingerprint = projectEditSnapshotFingerprint();
  refreshProjectDraftState();
}

async function runProjectHistoryAction(direction) {
  const bridge = getProjectEditHistoryBridge();
  const blockedReason = projectHistoryBlockedReason();
  if (blockedReason) {
    toast(blockedReason);
    return false;
  }
  const entry = direction === 'undo' ? bridge?.undo() : bridge?.redo();
  if (!entry) {
    toast(t(direction === 'undo' ? 'historyNothingToUndo' : 'historyNothingToRedo'));
    syncProjectHistoryUi();
    return false;
  }

  projectEditSession.applying = true;
  try {
    applyProjectEditSnapshot(entry[direction === 'undo' ? 'before' : 'after'], `history-${direction}`);
    await persistProject();
    toast(`${t(direction === 'undo' ? 'historyUndoApplied' : 'historyRedoApplied')}: ${t(entry.labelKey)}`);
    return true;
  } catch (error) {
    handleUiError(error, `project-history:${direction}`, {
      title: t('historyApplyFailed')
    });
    return false;
  } finally {
    projectEditSession.applying = false;
    syncProjectHistoryUi();
  }
}

function undoProjectEdit() {
  return runProjectHistoryAction('undo');
}

function redoProjectEdit() {
  return runProjectHistoryAction('redo');
}

function handleProjectHistoryShortcut(event) {
  const primaryModifier = (event.ctrlKey || event.metaKey) && !event.altKey;
  const key = String(event.key || '').toLocaleLowerCase();
  if (!primaryModifier || event.repeat || isTextEditingElement(event.target)) return false;
  if (typeof getTopLayerModal === 'function' && getTopLayerModal()) return false;

  const undo = key === 'z' && !event.shiftKey;
  const redo = (key === 'z' && event.shiftKey) || (key === 'y' && !event.shiftKey);
  if (!undo && !redo) return false;
  event.preventDefault();
  if (undo) void undoProjectEdit();
  else void redoProjectEdit();
  return true;
}

function confirmDiscardProjectDraft() {
  refreshProjectDraftState();
  if (!projectHasUnappliedDraft()) return true;
  return openConfirmDialog({
    title: t('projectDraftDiscardTitle'),
    message: t('projectDraftDiscardPrompt'),
    acceptLabel: t('confirmAction'),
    cancelLabel: t('cancelAction')
  });
}

function handleProjectBeforeUnload(event) {
  refreshProjectDraftState();
  if (!projectHasUnappliedDraft()) return;
  event.preventDefault();
  event.returnValue = '';
}

function bindProjectHistoryEvents() {
  ui.btnUndoProjectEdit?.addEventListener('click', () => void undoProjectEdit());
  ui.btnRedoProjectEdit?.addEventListener('click', () => void redoProjectEdit());
  [ui.zoneId, ui.zoneName, ui.zoneDescription].forEach(node => {
    node?.addEventListener('input', refreshProjectDraftState);
    node?.addEventListener('change', refreshProjectDraftState);
  });
  window.addEventListener('beforeunload', handleProjectBeforeUnload);
  projectEditSession.trackedDataFingerprint = projectEditSnapshotFingerprint();
  refreshProjectDraftState();
  syncProjectHistoryUi();
}
