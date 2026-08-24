let layerOpenSequence = 0;
let toastTimer = 0;
const layerReturnFocusTargets = new WeakMap();

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
  const raw = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
  const match = raw.match(/^([\d.]+)\s*(ms|s)?$/i);
  const value = match ? Number(match[1]) * (String(match[2]).toLowerCase() === 's' ? 1000 : 1) : Number.NaN;
  return Number.isFinite(value) ? Math.max(260, value) : Math.max(260, fallback);
}

function focusableElements(container) {
  if (!container) return [];
  const selector = [
    'button:not([disabled])',
    '[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');
  return Array.from(container.querySelectorAll(selector)).filter(node => (
    node.getAttribute('aria-hidden') !== 'true' &&
    node.getClientRects().length > 0
  ));
}

function firstFocusableElement(container) {
  return focusableElements(container)[0] || container?.querySelector?.('[role="dialog"], [role="alertdialog"]') || null;
}

function visibleLayerModals() {
  return Array.from(document.querySelectorAll('.layer-modal:not(.hidden):not(.is-closing)'));
}

function getTopLayerModal() {
  const layers = visibleLayerModals();
  if (!layers.length) return null;
  return layers
    .map((layer, index) => ({ layer, index, order: Number(layer.dataset.layerOrder || 0) }))
    .sort((a, b) => a.order - b.order || a.index - b.index)
    .pop().layer;
}

function syncLayerModalDocumentState() {
  const hasVisibleLayer = Boolean(document.querySelector('.layer-modal:not(.hidden)'));
  document.body?.classList.toggle('has-open-layer-modal', hasVisibleLayer);
  if (!hasVisibleLayer) layerOpenSequence = 0;
}

function restoreLayerModalFocus(target) {
  if (!target?.isConnected || target.getClientRects().length === 0) return;
  const topLayer = getTopLayerModal();
  if (!topLayer || topLayer.contains(target)) {
    target.focus?.({ preventScroll: true });
  }
}

function trapLayerModalFocus(event) {
  if (event.key !== 'Tab') return false;
  const modal = getTopLayerModal();
  if (!modal) return false;
  const focusable = focusableElements(modal);
  if (!focusable.length) {
    event.preventDefault();
    firstFocusableElement(modal)?.focus?.({ preventScroll: true });
    return true;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;
  if (!modal.contains(active) || (event.shiftKey && active === first) || (!event.shiftKey && active === last)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus({ preventScroll: true });
  }
  return true;
}

function openLayerModal(modal, options = {}) {
  if (!modal) return;
  const wasHidden = modal.classList.contains('hidden');
  if (modal.dataset.closeTimer) {
    clearTimeout(Number(modal.dataset.closeTimer));
    delete modal.dataset.closeTimer;
  }
  if (wasHidden) {
    const origin = document.activeElement;
    if (origin && origin !== document.body && !modal.contains(origin)) {
      layerReturnFocusTargets.set(modal, origin);
    }
    if (!visibleLayerModals().length) layerOpenSequence = 0;
    layerOpenSequence += 1;
    modal.dataset.layerOrder = String(layerOpenSequence);
    modal.style.setProperty('--layer-order', String(layerOpenSequence));
  }
  modal.classList.remove('hidden', 'is-closing');
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  syncLayerModalDocumentState();
  if (options.focus !== false) {
    window.requestAnimationFrame(() => {
      const target = options.focusTarget || firstFocusableElement(modal);
      target?.focus?.({ preventScroll: true });
    });
  }
}

function closeLayerModal(modal, options = {}) {
  if (!modal || modal.classList.contains('hidden')) return;
  const returnFocus = options.returnFocus || layerReturnFocusTargets.get(modal);
  const motionDisabled = document.documentElement.classList.contains('motion-disabled');
  const duration = options.instant || motionDisabled ? 0 : getMotionDurationMs('--motion-duration-fast', 300);
  modal.classList.add('is-closing');
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');

  const finishClose = () => {
    modal.classList.add('hidden');
    modal.classList.remove('is-closing');
    delete modal.dataset.closeTimer;
    delete modal.dataset.layerOrder;
    modal.style.removeProperty('--layer-order');
    layerReturnFocusTargets.delete(modal);
    syncLayerModalDocumentState();
    if (options.restoreFocus !== false) restoreLayerModalFocus(returnFocus);
  };

  if (duration <= 1) {
    finishClose();
    return;
  }
  const timer = window.setTimeout(() => {
    finishClose();
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
