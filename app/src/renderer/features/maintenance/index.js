const MAINTENANCE_SETTINGS_SCHEMA = 'cqnu-plant-ui-settings-v1';
const MAINTENANCE_DIAGNOSTICS_SCHEMA = 'cqnu-plant-diagnostics-v1';
const MAINTENANCE_SEVERITY_ORDER = { error: 0, warn: 1, info: 2 };

let maintenanceLastReport = null;
let maintenanceLastLogSnapshot = null;

function cloneMaintenanceJson(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

function maintenanceText(key, fallback = '') {
  return typeof t === 'function' ? t(key) : fallback || key;
}

function maintenanceProjectLabel() {
  if (typeof dirnameLabel === 'function') {
    return dirnameLabel(state.projectDir);
  }
  return state.projectDir || '—';
}

function setMaintenanceBusy(button, busy) {
  if (!button) return;
  button.disabled = !!busy;
}

function getMaintenanceSafeModeState() {
  ensureSettingsShape(state.settings || {});
  const safeMode = state.settings.maintenanceSafeMode || {};
  return safeMode && typeof safeMode === 'object' ? safeMode : { enabled: false };
}

function isMaintenanceSafeModeEnabled() {
  return getMaintenanceSafeModeState().enabled === true;
}

function setMaintenanceSafeModeState(nextState) {
  if (!state.settings) return;
  state.settings.maintenanceSafeMode = {
    enabled: false,
    ...nextState
  };
}

function syncMaintenanceSafeModeUi() {
  const enabled = isMaintenanceSafeModeEnabled();
  document.documentElement.classList.toggle('maintenance-safe-mode', enabled);
  if (ui.maintenanceSafeModeStatus) {
    ui.maintenanceSafeModeStatus.textContent = maintenanceText(enabled ? 'maintenanceSafeModeOn' : 'maintenanceSafeModeOff');
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
}

function addMaintenanceIssue(issues, severity, code, title, detail = '', fixable = false) {
  issues.push({ severity, code, title, detail, fixable: !!fixable });
}

function countBySeverity(issues) {
  return issues.reduce((acc, issue) => {
    acc[issue.severity] = (acc[issue.severity] || 0) + 1;
    if (issue.fixable) acc.fixable += 1;
    return acc;
  }, { error: 0, warn: 0, info: 0, fixable: 0 });
}

function summarizeMaintenanceReport(report) {
  const counts = countBySeverity(report?.issues || []);
  if (!report) return maintenanceText('maintenanceNotRun');
  if (!report.issues.length) return maintenanceText('maintenanceHealthy');
  return `${maintenanceText('maintenanceError')}: ${counts.error} / ${maintenanceText('maintenanceWarn')}: ${counts.warn} / ${maintenanceText('maintenanceInfo')}: ${counts.info}`;
}

function issueSeverityLabel(severity) {
  return {
    error: maintenanceText('maintenanceError'),
    warn: maintenanceText('maintenanceWarn'),
    info: maintenanceText('maintenanceInfo')
  }[severity] || severity;
}

function collectDuplicateValueIssues(items, valueGetter, label, issues) {
  const seen = new Map();
  items.forEach((item, index) => {
    const value = String(valueGetter(item) || '').trim();
    if (!value) return;
    if (!seen.has(value)) {
      seen.set(value, [index + 1]);
      return;
    }
    seen.get(value).push(index + 1);
  });

  seen.forEach((positions, value) => {
    if (positions.length > 1) {
      addMaintenanceIssue(
        issues,
        'warn',
        `duplicate-${label}`,
        `${label} 重复：${value}`,
        `位置：${positions.join(', ')}。此项不自动修复，避免误改用户编号。`
      );
    }
  });
}

function isValidCoordinate(point) {
  const lat = Number(point.lat);
  const lng = Number(point.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

function collectImageRefsWithContext() {
  const rows = [];
  state.points.forEach((point, pointIndex) => {
    getPhenologyEntries(point).forEach((entry, entryIndex) => {
      normalizeImages(entry.images).forEach(ref => {
        rows.push({
          ref,
          pointLabel: pointDisplayName(point) || `#${pointIndex + 1}`,
          entryLabel: entry.label || `#${entryIndex + 1}`
        });
      });
    });
  });
  return rows;
}

async function collectImageFileIssues() {
  if (!state.projectDir || !window.plantApp?.maintenance?.checkImageRefs) return [];
  const imageRefs = collectImageRefsWithContext();
  if (!imageRefs.length) return [];

  const refs = [...new Set(imageRefs.map(item => item.ref))];
  const result = await callIpc(window.plantApp.maintenance.checkImageRefs({
    projectDir: state.projectDir,
    refs
  }));
  const missing = new Map((result.items || []).filter(item => !item.exists).map(item => [item.ref, item]));

  return imageRefs
    .filter(item => missing.has(item.ref))
    .map(item => ({
      severity: 'warn',
      code: 'missing-image',
      title: `图片引用不可用：${item.ref}`,
      detail: `${item.pointLabel} / ${item.entryLabel}。${missing.get(item.ref).code || ''}`,
      fixable: false
    }));
}

function collectProjectDataIssues(extraIssues = []) {
  const issues = [...extraIssues];
  const zones = Array.isArray(state.zones) ? state.zones : [];
  const points = Array.isArray(state.points) ? state.points : [];
  const zoneInternalIds = new Set(zones.map(zone => zone.id).filter(Boolean));

  if (!state.projectDir) {
    addMaintenanceIssue(issues, 'warn', 'no-project', maintenanceText('maintenanceNoProject'), '', false);
  }

  zones.forEach((zone, index) => {
    const label = zoneDisplayName(zone) || `#${index + 1}`;
    if (!zone.id) {
      addMaintenanceIssue(issues, 'warn', 'missing-zone-id', `分区缺少内部 ID：${label}`, '可生成内部 ID，不改变显示名称。', true);
    }
    if (!String(zone.zoneId || '').trim()) {
      addMaintenanceIssue(issues, 'warn', 'missing-zone-code', `分区缺少编号：${label}`, '可按顺序补齐 Z 编号。', true);
    }
    if (!zone.geometry?.type) {
      addMaintenanceIssue(issues, 'info', 'missing-zone-geometry', `分区没有几何边界：${label}`, '允许存在文字分区，但地图边界不会显示。');
    }
  });

  collectDuplicateValueIssues(zones, zone => zone.id, '分区内部 ID', issues);
  collectDuplicateValueIssues(zones, zone => zone.zoneId, '分区编号', issues);

  points.forEach((point, index) => {
    const label = pointDisplayName(point) || `#${index + 1}`;
    if (!point.id) {
      addMaintenanceIssue(issues, 'warn', 'missing-point-id', `点位缺少内部 ID：${label}`, '可生成内部 ID，不改变植物信息。', true);
    }
    if (!String(point.pointId || '').trim()) {
      addMaintenanceIssue(issues, 'warn', 'missing-point-code', `点位缺少编号：${label}`, '可按顺序补齐 P 编号。', true);
    }
    if (!point.zoneRef || !zoneInternalIds.has(point.zoneRef)) {
      addMaintenanceIssue(issues, 'error', 'orphan-point', `点位未绑定有效分区：${label}`, '此项需要用户判断归属分区，不自动处理。');
    }
    if (!isValidCoordinate(point)) {
      addMaintenanceIssue(issues, 'error', 'invalid-coordinate', `点位坐标异常：${label}`, `lat=${point.lat}, lng=${point.lng}`);
    }
    if (!String(point.plantNameCn || '').trim() && !String(point.plantNameSci || '').trim()) {
      addMaintenanceIssue(issues, 'warn', 'missing-plant-name', `点位缺少植物名称：${label}`, '建议补充中文名或学名。');
    }

    const entries = getPhenologyEntries(point);
    if (!entries.length) {
      addMaintenanceIssue(issues, 'warn', 'missing-phenology', `点位缺少物候记录：${label}`, '可恢复一条空白物候记录。', true);
    }
    entries.forEach(entry => {
      const images = normalizeImages(entry.images);
      if (images.length !== new Set(images).size) {
        addMaintenanceIssue(issues, 'warn', 'duplicate-entry-images', `物候图片重复：${label}`, entry.label || '', true);
      }
    });
  });

  collectDuplicateValueIssues(points, point => point.id, '点位内部 ID', issues);
  collectDuplicateValueIssues(points, point => point.pointId, '点位编号', issues);

  issues.sort((a, b) => {
    const severityDelta = MAINTENANCE_SEVERITY_ORDER[a.severity] - MAINTENANCE_SEVERITY_ORDER[b.severity];
    return severityDelta || String(a.code).localeCompare(String(b.code));
  });

  return {
    generatedAt: new Date().toISOString(),
    projectDir: state.projectDir || '',
    counts: {
      zones: zones.length,
      points: points.length,
      images: collectImageRefsWithContext().length
    },
    issues
  };
}

function renderMaintenanceReport(report) {
  if (!ui.maintenanceHealthReport) return;
  clearNode(ui.maintenanceHealthReport);
  ui.maintenanceHealthSummary.textContent = summarizeMaintenanceReport(report);
  ui.maintenanceHealthSummary.classList.toggle('maintenance-badge-ok', !!report && !report.issues.length);
  ui.btnRunSafeRepair.disabled = !report || !report.issues.some(issue => issue.fixable);

  if (!report) {
    ui.maintenanceHealthReport.appendChild(listTextItem(maintenanceText('maintenanceReportEmpty')));
    return;
  }
  if (!report.issues.length) {
    ui.maintenanceHealthReport.appendChild(listTextItem(maintenanceText('maintenanceHealthy'), `${report.counts.zones} zones / ${report.counts.points} points`));
    return;
  }

  report.issues.forEach(issue => {
    const item = el('div', {
      className: `maintenance-issue maintenance-issue--${issue.severity}`
    }, [
      el('div', { className: 'maintenance-issue-title', text: issue.title }),
      el('div', { className: 'maintenance-issue-meta', text: `${issueSeverityLabel(issue.severity)} / ${issue.code}${issue.fixable ? ` / ${maintenanceText('maintenanceFixable')}` : ''}` })
    ]);
    if (issue.detail) {
      item.appendChild(el('div', { className: 'maintenance-issue-detail', text: issue.detail }));
    }
    ui.maintenanceHealthReport.appendChild(item);
  });
}

async function runMaintenanceHealthCheck(options = {}) {
  try {
    setMaintenanceBusy(ui.btnRunHealthCheck, true);
    ui.maintenanceProjectPath.textContent = maintenanceProjectLabel();
    const imageIssues = state.projectDir ? await collectImageFileIssues() : [];
    maintenanceLastReport = collectProjectDataIssues(imageIssues);
    renderMaintenanceReport(maintenanceLastReport);
    if (!options.silent && !isMaintenanceSafeModeEnabled()) {
      ui.maintenanceSettingsSummary.textContent = maintenanceText('maintenanceCheckFinished');
    }
    syncMaintenanceSafeModeUi();
    return maintenanceLastReport;
  } catch (error) {
    handleUiError(error, 'maintenance:health-check', {
      title: maintenanceText('maintenanceCheckFailed')
    });
    return null;
  } finally {
    setMaintenanceBusy(ui.btnRunHealthCheck, false);
  }
}

function dedupeEntryImages(entry) {
  const before = normalizeImages(entry.images);
  const after = [...new Set(before)];
  entry.images = after;
  return before.length !== after.length;
}

function applyConservativeProjectRepair() {
  const changes = [];
  state.zones = state.zones.map((zone, index) => {
    const next = normalizeZoneRecord({ ...zone });
    if (!next.id) {
      next.id = makeUid('zone');
      changes.push(`zone:${index + 1}:id`);
    }
    if (!String(next.zoneId || '').trim()) {
      next.zoneId = `Z${String(index + 1).padStart(2, '0')}`;
      changes.push(`zone:${index + 1}:zoneId`);
    }
    return next;
  });

  state.points = state.points.map((point, index) => {
    const raw = { ...point };
    if (!raw.id) {
      raw.id = makeUid('point');
      changes.push(`point:${index + 1}:id`);
    }
    if (!String(raw.pointId || '').trim()) {
      raw.pointId = `P${String(index + 1).padStart(3, '0')}`;
      changes.push(`point:${index + 1}:pointId`);
    }
    const next = normalizePointRecord(raw);
    getPhenologyEntries(next).forEach(entry => {
      if (dedupeEntryImages(entry)) {
        changes.push(`point:${index + 1}:images`);
      }
    });
    syncPointSummary(next);
    return next;
  });

  return changes;
}

async function runMaintenanceSafeRepair() {
  if (!requireProject()) return;
  const report = maintenanceLastReport || await runMaintenanceHealthCheck({ silent: true });
  const fixableCount = (report?.issues || []).filter(issue => issue.fixable).length;
  if (!fixableCount) {
    showAlert(maintenanceText('maintenanceNoFixableIssue'));
    return;
  }

  const confirmed = await openConfirmDialog({
    title: maintenanceText('maintenanceSafeRepair'),
    message: `${maintenanceText('maintenanceSafeRepairConfirm')}\n${maintenanceText('maintenanceSafeRepairScope')}`,
    acceptLabel: maintenanceText('maintenanceSafeRepair'),
    cancelLabel: maintenanceText('cancelAction')
  });
  if (!confirmed) return;

  try {
    const result = await withProgressTask({ type: 'maintenance', title: maintenanceText('maintenanceSafeRepair'), stage: maintenanceText('progressBackup') }, async task => {
      task.update({ percent: 10, stage: maintenanceText('progressBackup') });
      const backupFile = await createBackupZip(state.projectDir, '', 'maintenance');
      task.update({ percent: 45, stage: maintenanceText('maintenanceRepairing') });
      await yieldToUi();
      const changes = applyConservativeProjectRepair();
      task.update({ percent: 72, stage: maintenanceText('progressWriting') });
      await persistProject();
      renderAllDerived();
      task.update({ percent: 92, stage: maintenanceText('maintenanceRunCheck') });
      return { backupFile, changes };
    });
    await runMaintenanceHealthCheck({ silent: true });
    showAlert(`${maintenanceText('maintenanceRepairDone')} ${result.changes.length}\n${maintenanceText('backupSuccess')} ${result.backupFile}`);
  } catch (error) {
    handleUiError(error, 'maintenance:safe-repair', {
      title: maintenanceText('maintenanceRepairFailed')
    });
  }
}

function renderMaintenanceLogs(snapshot) {
  if (!ui.maintenanceLogList) return;
  clearNode(ui.maintenanceLogList);
  const files = snapshot?.files || [];
  const entries = snapshot?.entries || [];
  ui.maintenanceLogSummary.textContent = `${files.length} files / ${entries.length} entries`;
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
  try {
    const result = await callIpc(window.plantApp.log.cleanup());
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

function openMaintenanceCenter() {
  ui.maintenanceProjectPath.textContent = maintenanceProjectLabel();
  syncMaintenanceSafeModeUi();
  renderMaintenanceReport(maintenanceLastReport);
  openLayerModal(ui.maintenanceModal);
  refreshMaintenanceLogs();
}

function bindMaintenanceEvents() {
  ui.btnOpenMaintenance?.addEventListener('click', openMaintenanceCenter);
  ui.btnCloseMaintenanceModal?.addEventListener('click', () => closeLayerModal(ui.maintenanceModal));
  ui.maintenanceModal?.querySelector('.layer-modal-backdrop')
    ?.addEventListener('click', () => closeLayerModal(ui.maintenanceModal));
  ui.btnRunHealthCheck?.addEventListener('click', () => runMaintenanceHealthCheck());
  ui.btnRunSafeRepair?.addEventListener('click', runMaintenanceSafeRepair);
  ui.btnRefreshLogs?.addEventListener('click', refreshMaintenanceLogs);
  ui.btnCleanupLogs?.addEventListener('click', cleanupMaintenanceLogs);
  ui.btnExportDiagnostics?.addEventListener('click', exportDiagnostics);
  ui.btnApplySafeMode?.addEventListener('click', applySafeModeSettings);
  ui.btnExitSafeMode?.addEventListener('click', exitSafeModeSettings);
  ui.btnExportUiSettings?.addEventListener('click', exportUiSettings);
  ui.btnImportUiSettings?.addEventListener('click', importUiSettings);
  syncMaintenanceSafeModeUi();
}
