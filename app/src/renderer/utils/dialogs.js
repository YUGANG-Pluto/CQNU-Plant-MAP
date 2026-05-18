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

function getMotionDurationMs(variableName, fallback = 180) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
  const value = Number(raw.replace('ms', ''));
  return Number.isFinite(value) ? Math.max(0, value) : fallback;
}

function firstFocusableElement(container) {
  if (!container) return null;
  return container.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
}

function openLayerModal(modal, options = {}) {
  if (!modal) return;
  if (modal.dataset.closeTimer) {
    clearTimeout(Number(modal.dataset.closeTimer));
    delete modal.dataset.closeTimer;
  }
  modal.classList.remove('hidden', 'is-closing');
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  if (options.focus !== false) {
    window.requestAnimationFrame(() => {
      const target = options.focusTarget || firstFocusableElement(modal);
      target?.focus?.({ preventScroll: true });
    });
  }
}

function closeLayerModal(modal, options = {}) {
  if (!modal || modal.classList.contains('hidden')) return;
  const duration = options.instant ? 0 : getMotionDurationMs('--motion-duration-fast', 160);
  modal.classList.add('is-closing');
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  if (duration <= 1 || document.documentElement.classList.contains('motion-disabled')) {
    modal.classList.add('hidden');
    modal.classList.remove('is-closing');
    options.returnFocus?.focus?.({ preventScroll: true });
    return;
  }
  const timer = window.setTimeout(() => {
    modal.classList.add('hidden');
    modal.classList.remove('is-closing');
    delete modal.dataset.closeTimer;
    options.returnFocus?.focus?.({ preventScroll: true });
  }, duration);
  modal.dataset.closeTimer = String(timer);
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
  ui.btnConfirmCancel.textContent = cancelLabel || t('cancelCreatePoint');
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
