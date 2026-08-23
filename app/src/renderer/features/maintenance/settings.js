const MAINTENANCE_SETTINGS_SCHEMA = 'cqnu-plant-ui-settings-v1';

function buildSettingsBundle() {
  const settings = ensureSettingsShape(state.settings || {});
  return {
    schema: MAINTENANCE_SETTINGS_SCHEMA,
    exportedAt: new Date().toISOString(),
    language: settings.language || 'zh',
    uiTheme: settings.uiTheme || {},
    statsCustom: settings.statsCustom || {}
  };
}

function extractSettingsBundle(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(maintenanceText('maintenanceInvalidSettingsFile'));
  }
  const source = raw;
  const bundle = {};
  if (source.language === 'zh' || source.language === 'en') bundle.language = source.language;
  if (source.uiTheme && typeof source.uiTheme === 'object' && !Array.isArray(source.uiTheme)) {
    bundle.uiTheme = source.uiTheme;
  }
  if (source.statsCustom && typeof source.statsCustom === 'object' && !Array.isArray(source.statsCustom)) {
    bundle.statsCustom = source.statsCustom;
  }
  if (!bundle.language && !bundle.uiTheme && !bundle.statsCustom) {
    throw new Error(maintenanceText('maintenanceInvalidSettingsFile'));
  }
  return bundle;
}

async function applySettingsBundle(bundle) {
  if (guardMaintenanceReadOnlyAction('apply-settings-bundle')) return;
  state.settings = ensureSettingsShape({
    ...state.settings,
    ...(bundle.language ? { language: bundle.language } : {}),
    ...(bundle.uiTheme ? { uiTheme: bundle.uiTheme } : {}),
    ...(bundle.statsCustom ? { statsCustom: bundle.statsCustom } : {}),
    maintenanceSafeMode: { enabled: false }
  });
  ensureThemeSettings();
  applyThemeVariables();
  syncMaintenanceSafeModeUi();
  applyI18n();
  renderAllDerived();
  await persistProject();
}

async function exportUiSettings() {
  if (guardMaintenanceReadOnlyAction('export-ui-settings')) return;
  if (!requireProject()) return;
  try {
  const result = await callIpc(window.platformAdapter.settings.exportJson({
      title: maintenanceText('maintenanceExportSettings'),
      defaultPath: 'plant_ui_settings.json',
      content: JSON.stringify(buildSettingsBundle(), null, 2)
    }));
    if (!result.canceled) showAlert(maintenanceText('maintenanceSettingsExported'));
  } catch (error) {
    handleUiError(error, 'maintenance:settings-export', {
      title: maintenanceText('maintenanceSettingsExportFailed')
    });
  }
}

async function importUiSettings() {
  if (guardMaintenanceReadOnlyAction('import-ui-settings')) return;
  if (!requireProject()) return;
  try {
  const result = await callIpc(window.platformAdapter.settings.importJson({
      title: maintenanceText('maintenanceImportSettings')
    }));
    if (result.canceled) return;
    const bundle = extractSettingsBundle(JSON.parse(result.content));
    const confirmed = await openConfirmDialog({
      title: maintenanceText('maintenanceImportSettings'),
      message: maintenanceText('maintenanceImportSettingsConfirm'),
      acceptLabel: maintenanceText('maintenanceImportSettings'),
      cancelLabel: maintenanceText('cancelAction')
    });
    if (!confirmed) return;
    await applySettingsBundle(bundle);
    showAlert(maintenanceText('maintenanceSettingsImported'));
  } catch (error) {
    handleUiError(error, 'maintenance:settings-import', {
      title: maintenanceText('maintenanceSettingsImportFailed')
    });
  }
}

function createMaintenanceSafeModeTheme() {
  const theme = createThemeDefaults('linear-minimal');
  theme.glass = {
    ...theme.glass,
    mode: 'off',
    opacity: 0,
    blur: 0,
    saturate: 100,
    highlight: 0,
    shadow: 0,
    brightness: 0,
    apply: {
      modules: false,
      controls: false,
      mapBadges: false,
      charts: false,
      settings: false
    }
  };
  theme.motion = {
    ...MOTION_MODE_PRESETS.off,
    mode: 'off',
    reduced: true
  };
  theme.progress = {
    ...theme.progress,
    mode: 'compact',
    glass: false
  };
  return theme;
}

async function applySafeModeSettings() {
  if (!requireProject()) return;
  if (isMaintenanceSafeModeEnabled()) {
    showAlert(maintenanceText('maintenanceSafeModeAlreadyOn'));
    syncMaintenanceSafeModeUi();
    return;
  }
  const confirmed = await openConfirmDialog({
    title: maintenanceText('maintenanceApplySafeMode'),
    message: maintenanceText('maintenanceSafeModeConfirm'),
    acceptLabel: maintenanceText('maintenanceApplySafeMode'),
    cancelLabel: maintenanceText('cancelAction')
  });
  if (!confirmed) return;

  try {
    const previousUiTheme = cloneMaintenanceJson(state.settings.uiTheme || {});
    const theme = createMaintenanceSafeModeTheme();
    state.settings = ensureSettingsShape({
      ...state.settings,
      uiTheme: theme,
      maintenanceSafeMode: {
        enabled: true,
        enabledAt: new Date().toISOString(),
        previousUiTheme
      }
    });
    ensureThemeSettings();
    applyThemeVariables();
    syncMaintenanceSafeModeUi();
    applyI18n();
    renderAllDerived();
    await persistProject();
    showAlert(maintenanceText('maintenanceSafeModeDone'));
  } catch (error) {
    handleUiError(error, 'maintenance:safe-mode', {
      title: maintenanceText('maintenanceSafeModeFailed')
    });
  }
}

async function exitSafeModeSettings() {
  if (!requireProject()) return;
  if (!isMaintenanceSafeModeEnabled()) {
    showAlert(maintenanceText('maintenanceSafeModeAlreadyOff'));
    syncMaintenanceSafeModeUi();
    return;
  }
  const safeMode = getMaintenanceSafeModeState();
  const confirmed = await openConfirmDialog({
    title: maintenanceText('maintenanceExitSafeMode'),
    message: maintenanceText('maintenanceExitSafeModeConfirm'),
    acceptLabel: maintenanceText('maintenanceExitSafeMode'),
    cancelLabel: maintenanceText('cancelAction')
  });
  if (!confirmed) return;

  try {
    const previousUiTheme = safeMode.previousUiTheme && typeof safeMode.previousUiTheme === 'object'
      ? safeMode.previousUiTheme
      : createThemeDefaults(DEFAULT_UI_STYLE_ID);
    state.settings = ensureSettingsShape({
      ...state.settings,
      uiTheme: previousUiTheme,
      maintenanceSafeMode: {
        enabled: false,
        disabledAt: new Date().toISOString()
      }
    });
    ensureThemeSettings();
    applyThemeVariables();
    syncMaintenanceSafeModeUi();
    applyI18n();
    renderAllDerived();
    await persistProject();
    showAlert(maintenanceText('maintenanceExitSafeModeDone'));
  } catch (error) {
    handleUiError(error, 'maintenance:exit-safe-mode', {
      title: maintenanceText('maintenanceExitSafeModeFailed')
    });
  }
}
