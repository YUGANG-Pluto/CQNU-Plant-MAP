const SAFE_MODE_LOCKED_IDS = Object.freeze([
  'btnSave',
  'btnModeDrawZone',
  'btnModeAddPoint',
  'btnConfirmPoint',
  'btnCancelPoint',
  'btnDeleteZone',
  'btnDeletePoint',
  'btnApplyZone',
  'btnApplyPoint',
  'btnChooseImage',
  'btnExportCsv',
  'btnExportGeoJSON',
  'btnImportCsv',
  'btnImportGeoJSON',
  'baseMapSelect',
  'autoNormalizeBasemapSwitch',
  'btnBasemapStandardize',
  'btnCorrectSelectionGcj',
  'btnCorrectSelectionBd',
  'btnUndoCoordCorrection',
  'btnNewBaseMap',
  'btnSaveBaseMap',
  'btnDeleteBaseMap',
  'btnNewOverlay',
  'btnSaveOverlay',
  'btnResetBuiltinOverlays',
  'btnOpenTrash',
  'btnRestoreTrash',
  'btnDeleteTrashForever',
  'btnOpenPointEditor',
  'btnOpenPointEditorInline',
  'btnAddPhenology',
  'btnDeletePhenology',
  'btnOpenTheme',
  'btnSaveTheme',
  'btnResetThemeAll',
  'btnResetThemeSlot',
  'btnResetGlassSettings',
  'btnResetStatusColors',
  'btnGenerateChartPalette',
  'btnOpenMerge',
  'btnChooseMergeBase',
  'btnChooseMergeOther',
  'btnRunMerge',
  'btnMergeReviewApply',
  'btnBackupProject',
  'btnChooseBackupTarget',
  'btnRunManualBackup',
  'btnRunSafeRepair',
  'btnCleanupLogs',
  'btnReadSelectedLog',
  'btnExportDiagnostics',
  'btnStoragePreflight',
  'btnCreateSqliteStorage',
  'btnExportSqliteJson',
  'btnLoadSqliteStorage',
  'btnLoadJsonStorage',
  'btnRefreshStorageArtifacts',
  'btnDeleteSelectedStorageArtifacts',
  'btnInspectSelectedBackup',
  'btnRestoreSelectedBackup',
  'btnApplySpeciesReference',
  'btnExportUiSettings',
  'btnImportUiSettings'
]);

const SAFE_MODE_READONLY_FIELD_IDS = Object.freeze([
  'zoneId',
  'zoneName',
  'zoneDescription',
  'pointId',
  'plantNameCn',
  'plantNameSci',
  'observer',
  'surveyDate',
  'habitat',
  'abundance',
  'growthForm',
  'floweringState',
  'cultivatedStatus',
  'plantNote',
  'bmEditTarget',
  'bmNameZh',
  'bmNameEn',
  'bmType',
  'bmUrl',
  'bmAttribution',
  'bmMaxZoom',
  'bmMaxNativeZoom',
  'bmCoordSystem',
  'bmProvider',
  'bmTileSize',
  'bmZoomOffset',
  'bmSubdomains',
  'bmLayers',
  'bmFormat',
  'bmTransparent',
  'bmOverlayTarget',
  'bmOverlayNameZh',
  'bmOverlayNameEn',
  'bmOverlayEnabled',
  'bmOverlayType',
  'bmOverlayProvider',
  'bmOverlayUrl',
  'bmOverlaySubdomains',
  'bmOverlayCoordSystem',
  'bmOverlayMaxNativeZoom',
  'bmOverlayMaxZoom',
  'bmOverlayOpacity',
  'bmOverlayZIndex',
  'bmOverlayAttach',
  'bmOverlayToken',
  'bmOverlayNotes',
  'themeGlassMode',
  'themeGlassEffectOpacity',
  'themeGlassEffectBlur',
  'themeGlassEffectSaturate',
  'themeGlassEffectHighlight',
  'themeGlassEffectShadow',
  'themeGlassEffectBrightness',
  'progressHeight',
  'progressMode',
  'progressShowPercent',
  'progressShowStage',
  'progressGlass',
  'motionMode',
  'motionSpeedMultiplier',
  'motionFadeDuration',
  'motionTransitionDuration',
  'motionModalDuration',
  'motionStagger',
  'motionHoverLift',
  'motionScaleEnter',
  'motionScalePress',
  'motionEasing',
  'motionHover',
  'motionModal',
  'motionLayout',
  'motionTheme',
  'motionReduced',
  'statusColorSuccess',
  'statusColorDanger',
  'statusColorWarning',
  'statusColorUnknown',
  'statusColorEnabled',
  'statusColorDisabled',
  'themeRadius',
  'themeShadowStrength'
]);

const SAFE_MODE_DYNAMIC_LOCKED_SELECTORS = Object.freeze([
  '[data-safe-mode-locked="1"]',
  '.img-actions button',
  '#statsModal .stats-control-card select',
  '#mergeReviewModal input[type="checkbox"]',
  '.theme-style-btn',
  '.theme-layout-btn',
  '.theme-token-btn',
  '.preset-swatch',
  '[data-token]',
  '[data-glass]',
  '[data-progress]',
  '[data-motion]',
  '[data-status-color]',
  '.seg-btn[data-lang]'
]);

const PLATFORM_READ_ONLY_ALLOWED_IDS = Object.freeze([
  'btnExportCsv',
  'btnExportGeoJSON'
]);

const PLATFORM_READ_ONLY_ALLOWED_SCOPES = Object.freeze([
  'export-csv',
  'export-geojson'
]);

let safeModeLockEventsBound = false;

function getMaintenanceSafeModeState() {
  ensureSettingsShape(state.settings || {});
  const safeMode = state.settings.maintenanceSafeMode || {};
  return safeMode && typeof safeMode === 'object' ? safeMode : { enabled: false };
}

function isMaintenanceSafeModeEnabled() {
  return getMaintenanceSafeModeState().enabled === true;
}

function isPlatformReadOnlyMode() {
  return window.platformAdapter?.capabilities?.readOnly === true;
}

function isMaintenanceReadOnlyMode() {
  return isMaintenanceSafeModeEnabled() || isPlatformReadOnlyMode();
}

function guardMaintenanceReadOnlyAction(scope = 'safe-mode') {
  if (
    isPlatformReadOnlyMode()
    && !isMaintenanceSafeModeEnabled()
    && PLATFORM_READ_ONLY_ALLOWED_SCOPES.includes(scope)
  ) return false;
  if (!isMaintenanceReadOnlyMode()) return false;
  showAlert(maintenanceText('maintenanceSafeModeReadOnlyBlocked'));
  window.platformAdapter?.log?.report?.({
    level: 'warn',
    scope: `maintenance:read-only:${scope}`,
    message: 'Blocked write action while safe mode is enabled'
  }).catch(() => {});
  return true;
}

function setMaintenanceSafeModeState(nextState) {
  if (!state.settings) return;
  state.settings.maintenanceSafeMode = {
    enabled: false,
    ...nextState
  };
}

function setSafeModeLockedElementState(element, locked) {
  if (!element) return;
  const tag = element.tagName?.toLowerCase();
  const isNativeControl = ['button', 'select', 'input', 'textarea'].includes(tag);
  const hadSafeModeState = Object.prototype.hasOwnProperty.call(element.dataset, 'safeModePrevDisabled')
    || Object.prototype.hasOwnProperty.call(element.dataset, 'safeModePrevReadonly')
    || Object.prototype.hasOwnProperty.call(element.dataset, 'safeModePrevTitle')
    || Object.prototype.hasOwnProperty.call(element.dataset, 'safeModePrevAriaDisabled');
  element.classList.toggle('safe-mode-locked-control', locked);
  if (!locked && !hadSafeModeState) return;

  if (locked) {
    if (!Object.prototype.hasOwnProperty.call(element.dataset, 'safeModePrevTitle')) {
      element.dataset.safeModePrevTitle = element.title || '';
    }
    if (!Object.prototype.hasOwnProperty.call(element.dataset, 'safeModePrevDisabled')) {
      element.dataset.safeModePrevDisabled = element.disabled ? '1' : '0';
    }
    if (!Object.prototype.hasOwnProperty.call(element.dataset, 'safeModePrevReadonly')) {
      element.dataset.safeModePrevReadonly = element.readOnly ? '1' : '0';
    }
    if (!Object.prototype.hasOwnProperty.call(element.dataset, 'safeModePrevAriaDisabled')) {
      element.dataset.safeModePrevAriaDisabled = element.getAttribute('aria-disabled') || '';
    }
    element.setAttribute('aria-disabled', 'true');
    element.title = maintenanceText('maintenanceSafeModeReadOnlyTitle');
  } else {
    element.title = element.dataset.safeModePrevTitle || '';
    if (element.dataset.safeModePrevAriaDisabled) {
      element.setAttribute('aria-disabled', element.dataset.safeModePrevAriaDisabled);
    } else {
      element.removeAttribute('aria-disabled');
    }
  }

  if (tag === 'textarea' || (tag === 'input' && !['checkbox', 'radio', 'range', 'color', 'date'].includes(element.type))) {
    element.readOnly = locked ? true : element.dataset.safeModePrevReadonly === '1';
  } else if (isNativeControl) {
    element.disabled = locked ? true : element.dataset.safeModePrevDisabled === '1';
  }

  if (!locked) {
    delete element.dataset.safeModePrevTitle;
    delete element.dataset.safeModePrevDisabled;
    delete element.dataset.safeModePrevReadonly;
    delete element.dataset.safeModePrevAriaDisabled;
  }
}

function refreshSafeModeLockedControls() {
  const locked = isMaintenanceReadOnlyMode();
  const platformOnly = isPlatformReadOnlyMode() && !isMaintenanceSafeModeEnabled();
  SAFE_MODE_LOCKED_IDS.forEach(id => {
    const allowPlatformExport = platformOnly && PLATFORM_READ_ONLY_ALLOWED_IDS.includes(id);
    setSafeModeLockedElementState(document.getElementById(id), locked && !allowPlatformExport);
  });
  SAFE_MODE_READONLY_FIELD_IDS.forEach(id => setSafeModeLockedElementState(document.getElementById(id), locked));
  SAFE_MODE_DYNAMIC_LOCKED_SELECTORS.forEach(selector => {
    document.querySelectorAll(selector).forEach(element => setSafeModeLockedElementState(element, locked));
  });

  if (ui.btnModeBrowse) {
    ui.btnModeBrowse.disabled = false;
    ui.btnModeBrowse.classList.remove('safe-mode-locked-control');
    ui.btnModeBrowse.removeAttribute('aria-disabled');
  }
  if (ui.btnOpenMaintenance) {
    ui.btnOpenMaintenance.disabled = false;
    ui.btnOpenMaintenance.classList.remove('safe-mode-locked-control');
  }
  if (ui.btnRunHealthCheck) ui.btnRunHealthCheck.disabled = false;
  if (ui.btnRefreshLogs) ui.btnRefreshLogs.disabled = false;
  if (ui.btnExitSafeMode) ui.btnExitSafeMode.disabled = !locked;
}

function enforceSafeModeMapBrowseOnly() {
  if (!isMaintenanceReadOnlyMode()) return;
  if (state.pendingPoint) {
    clearPendingPoint();
  }
  if (state.currentMode !== 'browse' && typeof setMode === 'function') {
    setMode('browse');
  }
  if (state.map?.dragging?.enable) {
    state.map.dragging.enable();
  }
  if (typeof disableDrawHandler === 'function') {
    disableDrawHandler();
  }
}

function matchesSafeModeLockedTarget(target) {
  if (!target?.closest) return false;
  const direct = target.closest(SAFE_MODE_LOCKED_IDS.map(id => `#${id}`).join(','));
  if (direct) return true;
  return SAFE_MODE_DYNAMIC_LOCKED_SELECTORS.some(selector => target.closest(selector));
}

function handleSafeModeLockedDomEvent(event) {
  if (!isMaintenanceReadOnlyMode()) return;
  if (!matchesSafeModeLockedTarget(event.target)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  guardMaintenanceReadOnlyAction(event.type);
}

function bindSafeModeLockEvents() {
  if (safeModeLockEventsBound) return;
  safeModeLockEventsBound = true;
  ['click', 'change', 'input', 'submit'].forEach(type => {
    document.addEventListener(type, handleSafeModeLockedDomEvent, true);
  });
}

function syncMaintenanceSafeModeUi() {
  const enabled = isMaintenanceSafeModeEnabled();
  document.documentElement.classList.toggle('platform-read-only', isPlatformReadOnlyMode());
  document.documentElement.classList.toggle('maintenance-safe-mode', enabled);
  bindSafeModeLockEvents();
  if (ui.maintenanceSafeModeStatus) {
    ui.maintenanceSafeModeStatus.textContent = maintenanceText(
      enabled ? 'maintenanceSafeModeOn' : 'maintenanceSafeModeOff'
    );
    ui.maintenanceSafeModeStatus.classList.toggle('is-on', enabled);
  }
  if (ui.btnApplySafeMode) {
    ui.btnApplySafeMode.disabled = enabled;
  }
  if (ui.btnExitSafeMode) {
    ui.btnExitSafeMode.disabled = !enabled;
  }
  if (ui.maintenanceSettingsSummary) {
    ui.maintenanceSettingsSummary.textContent = enabled
      ? maintenanceText('maintenanceSafeModeActiveHint')
      : maintenanceText('maintenanceSettingsHint');
  }
  refreshSafeModeLockedControls();
  enforceSafeModeMapBrowseOnly();
}
