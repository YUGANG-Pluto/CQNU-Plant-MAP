let toastTimer = 0;

function ensureSettingsShape(settings) {
  const next = settings || {};
  next.language = next.language || 'zh';
  next.baseMaps = Array.isArray(next.baseMaps) && next.baseMaps.length
    ? next.baseMaps
    : [];
  next.activeBaseMapId = next.activeBaseMapId || next.baseMaps[0]?.id || 'osm-street';
  next.autoNormalizeBasemap = typeof next.autoNormalizeBasemap === 'boolean' ? next.autoNormalizeBasemap : true;
  next.recycleBin = Array.isArray(next.recycleBin) ? next.recycleBin : [];
  next.uiTheme = next.uiTheme || {};
  next.maintenanceSafeMode = next.maintenanceSafeMode && typeof next.maintenanceSafeMode === 'object' && !Array.isArray(next.maintenanceSafeMode)
    ? next.maintenanceSafeMode
    : { enabled: false };
  next.statsCustom = Object.assign({
    category: 'zone',
    chartType: 'combo',
    barMetric: 'speciesCount',
    lineMetric: 'pointCount'
  }, next.statsCustom || {});
  return next;
}

function getRecycleBin() {
  ensureSettingsShape(state.settings);
  return state.settings.recycleBin;
}

function getMotionDurationMs(variableName, fallback = 300) {
  return window.cqnuLayerManager?.getDurationMs(variableName, fallback) || Math.max(260, fallback);
}

function getTopLayerModal() {
  return window.cqnuLayerManager?.getTopLayer() || null;
}

function trapLayerModalFocus(event) {
  return window.cqnuLayerManager?.trapFocus(event) || false;
}

function openLayerModal(modal, options = {}) {
  window.cqnuLayerManager?.open(modal, options);
}

function closeLayerModal(modal, options = {}) {
  window.cqnuLayerManager?.close(modal, options);
}

function showAlert(message) {
  if (!ui.alertModal || !ui.alertTitle || !ui.alertMessage) {
    window.alert(message);
    return;
  }

  ui.alertTitle.textContent = typeof t === 'function' ? t('alertDialogTitle') : '提示';
  ui.alertMessage.textContent = message || '';
  if (ui.alertDetail) {
    ui.alertDetail.textContent = '';
    ui.alertDetail.closest('.alert-panel')?.classList.remove('has-detail');
  }
  openLayerModal(ui.alertModal, { focusTarget: ui.btnAlertClose });
}

function openConfirmDialog({
  title = '',
  message = '',
  acceptLabel = null,
  cancelLabel = null
}) {
  ui.confirmTitle.textContent = title || t('confirmAction');
  ui.confirmMessage.textContent = message || '';
  ui.btnConfirmAccept.textContent = acceptLabel || t('confirmAction');
  ui.btnConfirmCancel.textContent = cancelLabel || t('cancelAction');
  openLayerModal(ui.confirmModal);
  return new Promise(resolve => {
    state.confirmResolver = resolve;
  });
}

function settleConfirmDialog(result) {
  closeLayerModal(ui.confirmModal);
  if (state.confirmResolver) {
    state.confirmResolver(result);
  }
  state.confirmResolver = null;
}

function buildTrashItem(type, label, payload) {
  return {
    id: makeUid('trash'),
    type,
    label,
    payload,
    deletedAt: new Date().toISOString()
  };
}

function pushToRecycleBin(item) {
  getRecycleBin().unshift(item);
  renderTrashList();
}

function getTrashSelection() {
  return getRecycleBin().find(item => item.id === state.trashSelectedId) || null;
}

function toast(msg) {
  console.log('[toast]', msg);
  const region = ui.toastRegion || document.getElementById('toastRegion');
  if (!region || !msg) return;
  window.clearTimeout(toastTimer);
  region.textContent = String(msg);
  region.classList.add('is-visible');
  toastTimer = window.setTimeout(() => {
    region.classList.remove('is-visible');
  }, 3600);
}

function zoneDisplayName(zone) {
  return zone?.name || zone?.zoneId || t('unnamedZone');
}

function pointDisplayName(point) {
  return point?.plantNameCn || point?.plantNameSci || point?.pointId || t('unnamedPoint');
}

function getSelectedZone() {
  return state.zones.find(zone => zone.id === state.selectedZoneId) || null;
}

function getSelectedPoint() {
  return state.points.find(point => point.id === state.selectedPointId) || null;
}

function getEditableZone() {
  const targetId = ui.zoneId.dataset.targetId;
  return getSelectedZone() || state.zones.find(zone => zone.id === targetId) || null;
}

function getEditablePoint() {
  const targetId = ui.pointId.dataset.targetId;
  return getSelectedPoint() || state.points.find(point => point.id === targetId) || null;
}
