function renderMaintenanceLogs(snapshot) {
  if (!ui.maintenanceLogList) return;
  clearNode(ui.maintenanceLogList);
  if (ui.maintenanceLogFileList) clearNode(ui.maintenanceLogFileList);
  if (ui.maintenanceLogPreview && !maintenanceSelectedLogName) ui.maintenanceLogPreview.textContent = '';
  const files = snapshot?.files || [];
  const entries = snapshot?.entries || [];
  ui.maintenanceLogSummary.textContent = `${files.length} files / ${entries.length} entries / ${maintenanceSelectedLogNames.size} selected`;
  if (ui.maintenanceLogFileList) {
    if (!files.length) {
      ui.maintenanceLogFileList.appendChild(listTextItem(maintenanceText('maintenanceNoLogs')));
    } else {
      files.forEach(file => {
        const selectedForDelete = maintenanceSelectedLogNames.has(file.name);
        const selectedForRead = file.name === maintenanceSelectedLogName;
        const checkbox = el('input', {
          title: maintenanceText('maintenanceSelectForDelete')
        });
        checkbox.type = 'checkbox';
        checkbox.checked = selectedForDelete;
        checkbox.addEventListener('change', () => {
          if (checkbox.checked) {
            maintenanceSelectedLogNames.add(file.name);
          } else {
            maintenanceSelectedLogNames.delete(file.name);
          }
          renderMaintenanceLogs(maintenanceLastLogSnapshot);
        });
        const readButton = el('button', {
          className: 'btn btn-soft maintenance-log-read-target',
          text: file.name,
          title: maintenanceText('maintenanceReadSelectedLog')
        });
        readButton.type = 'button';
        readButton.addEventListener('click', () => {
          maintenanceSelectedLogName = file.name;
          renderMaintenanceLogs(maintenanceLastLogSnapshot);
        });
        const item = el('div', {
          className: `maintenance-log-entry maintenance-log-file${selectedForDelete ? ' is-selected' : ''}${selectedForRead ? ' is-read-selected' : ''}`
        }, [
          el('div', { className: 'maintenance-log-file-row' }, [
            checkbox,
            readButton
          ]),
          el('div', { className: 'maintenance-log-entry-meta', text: `${file.size || 0} bytes / ${file.modifiedAt || ''}` })
        ]);
        ui.maintenanceLogFileList.appendChild(item);
      });
    }
  }
  if (!entries.length) {
    ui.maintenanceLogList.appendChild(listTextItem(maintenanceText('maintenanceNoLogs')));
    return;
  }
  entries.slice(0, 24).forEach(entry => {
    ui.maintenanceLogList.appendChild(el('div', {
      className: `maintenance-log-entry maintenance-log-entry--${entry.level || 'info'}`
    }, [
      el('div', { className: 'maintenance-log-entry-title', text: `${entry.level || 'info'} / ${entry.scope || 'app'}` }),
      el('div', { className: 'maintenance-log-entry-message', text: entry.message || '' }),
      el('div', { className: 'maintenance-log-entry-meta', text: `${entry.ts || ''} ${entry.fileName || ''}` })
    ]));
  });
}

function formatLogDiagnosis(diagnosis) {
  if (!diagnosis || diagnosis.status === 'pass') {
    return [
      `${maintenanceText('maintenanceLogDiagnosisTitle')}: PASS`,
      maintenanceText('maintenanceLogDiagnosisPass')
    ].join('\n');
  }
  const lines = [
    `${maintenanceText('maintenanceLogDiagnosisTitle')}: ${maintenanceText('maintenanceLogDiagnosisIssues')} ${diagnosis.issueCount || 0}`,
    `${maintenanceText('maintenanceLogDiagnosisLines')}: ${diagnosis.totalLines || 0}`
  ];
  if (diagnosis.hotScopes?.length) {
    lines.push(`${maintenanceText('maintenanceLogDiagnosisScopes')}: ${diagnosis.hotScopes.map(item => `${item.scope}(${item.count})`).join(', ')}`);
  }
  (diagnosis.issues || []).slice(0, 8).forEach(issue => {
    lines.push(`- [${issue.level}] ${issue.scope}: ${issue.message}`);
  });
  (diagnosis.suggestions || []).forEach(suggestion => {
    lines.push(`${maintenanceText('maintenanceLogDiagnosisSuggestion')}: ${suggestion}`);
  });
  return lines.join('\n');
}

async function readSelectedMaintenanceLog() {
  if (!maintenanceSelectedLogName) {
    showAlert(maintenanceText('maintenanceSelectLogFirst'));
    return;
  }
  try {
    const result = await callIpc(window.plantApp.log.readLog({
      name: maintenanceSelectedLogName
    }));
    if (ui.maintenanceLogPreview) {
      const diagnosisText = formatLogDiagnosis(result.diagnosis);
      const content = result.truncated
        ? `${maintenanceText('maintenanceLogTruncated')}\n${result.content || ''}`
        : result.content || '';
      ui.maintenanceLogPreview.textContent = result.truncated
        ? `${diagnosisText}\n\n--- LOG ---\n${content}`
        : `${diagnosisText}\n\n--- LOG ---\n${content}`;
    }
  } catch (error) {
    handleUiError(error, 'maintenance:log-read', {
      title: maintenanceText('maintenanceLogReadFailed')
    });
  }
}

async function refreshMaintenanceLogs() {
  try {
    setMaintenanceBusy(ui.btnRefreshLogs, true);
    maintenanceLastLogSnapshot = await callIpc(window.plantApp.log.listRecent({ limit: 80 }));
    renderMaintenanceLogs(maintenanceLastLogSnapshot);
    return maintenanceLastLogSnapshot;
  } catch (error) {
    handleUiError(error, 'maintenance:logs', {
      title: maintenanceText('maintenanceLogFailed')
    });
    return null;
  } finally {
    setMaintenanceBusy(ui.btnRefreshLogs, false);
  }
}

async function cleanupMaintenanceLogs() {
  if (guardMaintenanceReadOnlyAction('delete-selected-log')) return;
  const selectedNames = [...maintenanceSelectedLogNames];
  if (!selectedNames.length) {
    showAlert(maintenanceText('maintenanceSelectLogFirst'));
    return;
  }
  const confirmed = await openConfirmDialog({
    title: maintenanceText('maintenanceDeleteSelectedLogs'),
    message: selectedNames.join('\n'),
    acceptLabel: maintenanceText('deleteNow'),
    cancelLabel: maintenanceText('cancelAction')
  });
  if (!confirmed) return;
  try {
    const result = await callIpc(window.plantApp.log.deleteLogs({
      names: selectedNames
    }));
    if (maintenanceSelectedLogNames.has(maintenanceSelectedLogName)) {
      maintenanceSelectedLogName = '';
    }
    maintenanceSelectedLogNames = new Set();
    if (ui.maintenanceLogPreview) ui.maintenanceLogPreview.textContent = '';
    await refreshMaintenanceLogs();
    showAlert(`${maintenanceText('maintenanceCleanupDone')} ${result.deleted || 0}`);
  } catch (error) {
    handleUiError(error, 'maintenance:log-cleanup', {
      title: maintenanceText('maintenanceCleanupFailed')
    });
  }
}

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
  const source = raw.schema === MAINTENANCE_SETTINGS_SCHEMA ? raw : raw;
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
    const result = await callIpc(window.plantApp.settings.exportJson({
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
    const result = await callIpc(window.plantApp.settings.importJson({
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

function buildDiagnosticsPayload(report, logs) {
  return {
    schema: MAINTENANCE_DIAGNOSTICS_SCHEMA,
    exportedAt: new Date().toISOString(),
    app: {
      title: document.title,
      versionLabel: document.querySelector('.app-kicker')?.textContent || ''
    },
    project: {
      selected: !!state.projectDir,
      label: maintenanceProjectLabel(),
      zoneCount: state.zones.length,
      pointCount: state.points.length
    },
    health: report ? {
      generatedAt: report.generatedAt,
      counts: report.counts,
      summary: countBySeverity(report.issues),
      issues: report.issues.slice(0, 300)
    } : null,
    logs: logs ? {
      config: {
        level: logs.config?.level,
        retentionDays: logs.config?.retentionDays,
        maxFileBytes: logs.config?.maxFileBytes
      },
      files: logs.files || [],
      entries: (logs.entries || []).slice(0, 120)
    } : null
  };
}

async function exportDiagnostics() {
  if (guardMaintenanceReadOnlyAction('export-diagnostics')) return;
  try {
    const report = maintenanceLastReport || await runMaintenanceHealthCheck({ silent: true });
    const logs = maintenanceLastLogSnapshot || await refreshMaintenanceLogs();
    const result = await callIpc(window.plantApp.log.exportDiagnostics({
      title: maintenanceText('maintenanceExportDiagnostics'),
      defaultPath: 'plant_diagnostics.json',
      content: JSON.stringify(buildDiagnosticsPayload(report, logs), null, 2)
    }));
    if (!result.canceled) showAlert(maintenanceText('maintenanceDiagnosticsExported'));
  } catch (error) {
    handleUiError(error, 'maintenance:diagnostics-export', {
      title: maintenanceText('maintenanceDiagnosticsExportFailed')
    });
  }
}
