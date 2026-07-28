function storageCountsText(counts = {}) {
  return [
    `${maintenanceText('maintenanceStorageZones')}: ${counts.zones ?? 0}`,
    `${maintenanceText('maintenanceStoragePoints')}: ${counts.points ?? 0}`,
    `${maintenanceText('maintenanceStoragePhenology')}: ${counts.phenologyEntries ?? 0}`,
    `${maintenanceText('maintenanceStorageImages')}: ${counts.imageReferences ?? 0}`,
    `${maintenanceText('maintenanceStorageTaxonomy')}: ${counts.taxonomyCandidates ?? 0}`
  ].join(' / ');
}

function storageFormatText(format) {
  if (format === 'sqlite') return 'SQLite';
  if (format === 'json') return 'JSON';
  return String(format || '—');
}

function storageAvailableFormatsText(report = {}) {
  const formats = Array.isArray(report.availableStorageFormats)
    ? report.availableStorageFormats
    : [
      report.activeStorageFormat || '',
      report.databaseExists ? 'sqlite' : '',
      report.jsonFilesExist || report.jsonFilesKept ? 'json' : ''
    ].filter(Boolean);
  const uniqueFormats = [...new Set(formats)];
  return formats.length
    ? uniqueFormats.map(storageFormatText).join(' / ')
    : maintenanceText('maintenanceStorageNoReadableFormat');
}

function storageBackupCount(report = {}) {
  if (Array.isArray(report.backupFiles)) return report.backupFiles.length;
  if (Array.isArray(report.inventory?.backupFiles)) return report.inventory.backupFiles.length;
  return null;
}

function renderStorageReport(report) {
  if (!ui.maintenanceStorageReport) return;
  clearNode(ui.maintenanceStorageReport);
  if (!report) {
    ui.maintenanceStorageReport.appendChild(listTextItem(maintenanceText('maintenanceStorageNoReport')));
    return;
  }

  const statusText = report.ok === false || report.status === 'failed'
    ? maintenanceText('maintenanceStorageStatusBlocked')
    : maintenanceText('maintenanceStorageStatusReady');
  const rows = [
    [maintenanceText('maintenanceStorageStatus'), statusText],
    [maintenanceText('maintenanceStorageActiveFormat'), storageFormatText(report.activeStorageFormat || state.storageFormat || 'json')],
    [maintenanceText('maintenanceStorageAvailableFormats'), storageAvailableFormatsText(report)],
    [maintenanceText('maintenanceStorageDatabase'), report.databaseFile || 'data.db'],
    [maintenanceText('maintenanceStorageJsonKept'), report.jsonFilesKept === false ? maintenanceText('no') : maintenanceText('yes')],
    [maintenanceText('maintenanceStorageCounts'), storageCountsText(report.counts || {})]
  ];
  const backupCount = storageBackupCount(report);

  if (report.databaseExists !== undefined) {
    rows.splice(2, 0, [
      maintenanceText('maintenanceStorageDatabaseExists'),
      report.databaseExists ? maintenanceText('yes') : maintenanceText('no')
    ]);
  }
  if (report.backupFile) {
    rows.push([maintenanceText('maintenanceStorageBackup'), report.backupFile]);
  }
  if (backupCount !== null) {
    rows.push([maintenanceText('maintenanceStorageBackupCount'), String(backupCount)]);
  }
  if (report.removedSourceFiles?.length) {
    rows.push([maintenanceText('maintenanceStorageRemovedSources'), report.removedSourceFiles.join(', ')]);
  }
  if (report.projectModifiedTime) {
    rows.push([maintenanceText('maintenanceStorageProjectReloaded'), maintenanceText('yes')]);
  }
  if (report.warnings?.length) {
    rows.push([maintenanceText('maintenanceWarn'), report.warnings.join('; ')]);
  }
  if ((Array.isArray(report.availableStorageFormats) && report.availableStorageFormats.length === 0)
    || (report.inventory && Array.isArray(report.inventory.availableStorageFormats) && report.inventory.availableStorageFormats.length === 0)) {
    rows.push([maintenanceText('maintenanceStorageRecovery'), maintenanceText('maintenanceStorageRestoreFromBackupHint')]);
  }

  rows.forEach(([label, value]) => {
    ui.maintenanceStorageReport.appendChild(listTextItem(label, value));
  });
}

function storageArtifactLabel(kind, item = {}) {
  if (kind === 'sqlite') return `${maintenanceText('maintenanceStorageCurrentSqlite')} / ${item.name || 'data.db'}`;
  if (kind === 'json') return maintenanceText('maintenanceStorageCurrentJson');
  return `${maintenanceText('maintenanceStorageBackup')}: ${item.name || ''}`;
}

function selectedStorageNames() {
  const names = [];
  if (maintenanceSelectedStorageArtifacts.sqlite) {
    names.push(maintenanceText('maintenanceStorageCurrentSqlite'));
  }
  if (maintenanceSelectedStorageArtifacts.json) {
    names.push(maintenanceText('maintenanceStorageCurrentJson'));
  }
  maintenanceSelectedStorageArtifacts.backups.forEach(name => {
    names.push(`${maintenanceText('maintenanceStorageBackup')}: ${name}`);
  });
  return names;
}

function getSingleSelectedBackupName() {
  const names = [...maintenanceSelectedStorageArtifacts.backups];
  if (names.length !== 1) {
    showAlert(maintenanceText(names.length ? 'maintenanceBackupSelectOneOnly' : 'maintenanceBackupSelectOne'));
    return '';
  }
  return names[0];
}

function renderBackupRestorePlan(plan) {
  if (!ui.maintenanceStorageReport) return;
  clearNode(ui.maintenanceStorageReport);
  if (!plan) {
    ui.maintenanceStorageReport.appendChild(listTextItem(maintenanceText('maintenanceBackupNoRestorePlan')));
    return;
  }
  [
    [maintenanceText('maintenanceStorageStatus'), plan.ok ? maintenanceText('maintenanceStorageStatusReady') : maintenanceText('maintenanceStorageStatusBlocked')],
    [maintenanceText('maintenanceStorageBackup'), plan.backupName || ''],
    [maintenanceText('maintenanceBackupRestoreFiles'), String(plan.restoreFileCount || 0)],
    [maintenanceText('maintenanceBackupRestoreStorage'), [
      plan.hasSqliteStorage ? 'SQLite' : '',
      plan.hasJsonStorage ? 'JSON' : ''
    ].filter(Boolean).join(' / ') || maintenanceText('maintenanceStorageNoReadableFormat')],
    [maintenanceText('maintenanceBackupRestoreSafety'), plan.createsSafetyBackup ? maintenanceText('yes') : maintenanceText('no')],
    [maintenanceText('maintenanceBackupRestoreSkipped'), String(plan.skippedBackupEntries || 0)]
  ].forEach(([label, value]) => ui.maintenanceStorageReport.appendChild(listTextItem(label, value)));
  if (plan.warnings?.length) {
    ui.maintenanceStorageReport.appendChild(listTextItem(maintenanceText('maintenanceWarn'), plan.warnings.join('; ')));
  }
}

function renderStorageArtifacts(inventory) {
  if (!ui.maintenanceStorageArtifactList) return;
  clearNode(ui.maintenanceStorageArtifactList);
  if (!inventory) {
    ui.maintenanceStorageArtifactList.appendChild(listTextItem(maintenanceText('maintenanceStorageArtifactsEmpty')));
    return;
  }

  const rows = [];
  if (inventory.sqliteDatabase?.exists) {
    rows.push({
      type: 'sqlite',
      selected: maintenanceSelectedStorageArtifacts.sqlite,
      title: storageArtifactLabel('sqlite', inventory.sqliteDatabase),
      meta: `${inventory.sqliteDatabase.size || 0} bytes / ${inventory.sqliteDatabase.modifiedAt || ''}`
    });
  }
  if (inventory.jsonFilesExist) {
    const totalSize = (inventory.jsonFiles || []).reduce((sum, file) => sum + (file.size || 0), 0);
    rows.push({
      type: 'json',
      selected: maintenanceSelectedStorageArtifacts.json,
      title: storageArtifactLabel('json'),
      meta: `${totalSize} bytes / settings.json, zones.json, points.json`
    });
  }
  (inventory.backupFiles || []).forEach(file => {
    rows.push({
      type: 'backup',
      name: file.name,
      selected: maintenanceSelectedStorageArtifacts.backups.has(file.name),
      title: storageArtifactLabel('backup', file),
      meta: `${file.size || 0} bytes / ${file.modifiedAt || ''}`
    });
  });

  if (!rows.length) {
    ui.maintenanceStorageArtifactList.appendChild(listTextItem(maintenanceText('maintenanceStorageArtifactsEmpty')));
    return;
  }

  rows.forEach(row => {
    const checkbox = el('input', {
      title: maintenanceText('maintenanceStorageSelectForDelete')
    });
    checkbox.type = 'checkbox';
    checkbox.checked = row.selected;
    checkbox.addEventListener('change', () => {
      if (row.type === 'sqlite') {
        maintenanceSelectedStorageArtifacts.sqlite = checkbox.checked;
      } else if (row.type === 'json') {
        maintenanceSelectedStorageArtifacts.json = checkbox.checked;
      } else if (checkbox.checked) {
        maintenanceSelectedStorageArtifacts.backups.add(row.name);
      } else {
        maintenanceSelectedStorageArtifacts.backups.delete(row.name);
      }
      renderStorageArtifacts(maintenanceLastStorageInventory);
    });
    ui.maintenanceStorageArtifactList.appendChild(el('div', {
      className: `maintenance-log-entry maintenance-log-file${row.selected ? ' is-selected' : ''}`
    }, [
      el('div', { className: 'maintenance-log-file-row' }, [
        checkbox,
        el('div', { className: 'maintenance-log-entry-title', text: row.title })
      ]),
      el('div', { className: 'maintenance-log-entry-meta', text: row.meta })
    ]));
  });
}

async function refreshStorageArtifacts() {
  if (!requireProject()) return null;
  try {
    setMaintenanceBusy(ui.btnRefreshStorageArtifacts, true);
    maintenanceLastStorageInventory = await callIpc(window.plantApp.storage.listArtifacts({
      projectDir: state.projectDir,
      backupDir: state.backupTargetDir || ''
    }));
    renderStorageArtifacts(maintenanceLastStorageInventory);
    renderStorageReport({
      status: 'completed',
      activeStorageFormat: maintenanceLastStorageInventory.activeStorageFormat,
      databaseExists: maintenanceLastStorageInventory.databaseExists,
      jsonFilesExist: maintenanceLastStorageInventory.jsonFilesExist,
      jsonFilesKept: maintenanceLastStorageInventory.jsonFilesExist,
      availableStorageFormats: maintenanceLastStorageInventory.availableStorageFormats,
      backupFiles: maintenanceLastStorageInventory.backupFiles,
      databaseFile: maintenanceLastStorageInventory.databaseFile
    });
    return maintenanceLastStorageInventory;
  } catch (error) {
    handleUiError(error, 'maintenance:storage-artifacts', {
      title: maintenanceText('maintenanceStorageArtifactsFailed')
    });
    return null;
  } finally {
    setMaintenanceBusy(ui.btnRefreshStorageArtifacts, false);
  }
}

async function deleteSelectedStorageArtifacts() {
  if (guardMaintenanceReadOnlyAction('storage-delete-artifacts')) return;
  if (!requireProject()) return;
  const inventory = maintenanceLastStorageInventory || await refreshStorageArtifacts();
  if (!inventory) return;

  const selectedNames = selectedStorageNames();
  if (!selectedNames.length) {
    showAlert(maintenanceText('maintenanceStorageSelectFirst'));
    return;
  }

  const confirmed = await openConfirmDialog({
    title: maintenanceText('maintenanceStorageDeleteSelected'),
    message: `${maintenanceText('maintenanceStorageDeleteConfirm')}\n${selectedNames.join('\n')}`,
    acceptLabel: maintenanceText('deleteNow'),
    cancelLabel: maintenanceText('cancelAction')
  });
  if (!confirmed) return;

  const selectedStorageCount = (maintenanceSelectedStorageArtifacts.sqlite && inventory.sqliteDatabase?.exists ? 1 : 0)
    + (maintenanceSelectedStorageArtifacts.json && inventory.jsonFilesExist ? 1 : 0);
  const availableStorageCount = Array.isArray(inventory.availableStorageFormats)
    ? inventory.availableStorageFormats.length
    : 0;
  let allowDeleteOnlyStorage = false;
  if (selectedStorageCount > 0 && availableStorageCount - selectedStorageCount <= 0) {
    allowDeleteOnlyStorage = await openConfirmDialog({
      title: maintenanceText('maintenanceStorageOnlyOneTitle'),
      message: maintenanceText('maintenanceStorageOnlyOneConfirm'),
      acceptLabel: maintenanceText('deleteNow'),
      cancelLabel: maintenanceText('cancelAction')
    });
    if (!allowDeleteOnlyStorage) return;
  }

  try {
    const didRequestSqliteDelete = maintenanceSelectedStorageArtifacts.sqlite;
    const didRequestJsonDelete = maintenanceSelectedStorageArtifacts.json;
    const result = await callIpc(window.plantApp.storage.deleteArtifacts({
      projectDir: state.projectDir,
      backupDir: state.backupTargetDir || '',
      deleteSqliteDatabase: didRequestSqliteDelete,
      deleteJsonFiles: didRequestJsonDelete,
      backupNames: [...maintenanceSelectedStorageArtifacts.backups],
      allowDeleteOnlyStorage
    }));
    maintenanceSelectedStorageArtifacts.sqlite = false;
    maintenanceSelectedStorageArtifacts.json = false;
    maintenanceSelectedStorageArtifacts.backups = new Set();
    maintenanceLastStorageInventory = result.inventory || await refreshStorageArtifacts();
    renderStorageArtifacts(maintenanceLastStorageInventory);
    renderStorageReport(result);
    if (didRequestSqliteDelete && state.storageFormat === 'sqlite' && maintenanceLastStorageInventory?.jsonFilesExist) {
      await loadProjectIntoRenderer(state.projectDir, { storageFormat: 'json' });
    } else if (didRequestJsonDelete && state.storageFormat === 'json' && maintenanceLastStorageInventory?.databaseExists) {
      await loadProjectIntoRenderer(state.projectDir, { storageFormat: 'sqlite' });
    } else if ((didRequestSqliteDelete || didRequestJsonDelete)
      && Array.isArray(maintenanceLastStorageInventory?.availableStorageFormats)
      && maintenanceLastStorageInventory.availableStorageFormats.length === 0) {
      if (ui.maintenanceStorageSummary) {
        ui.maintenanceStorageSummary.textContent = maintenanceText('maintenanceStorageNoReadableFormatSummary');
      }
    }
    showAlert(`${maintenanceText('maintenanceStorageDeleteDone')} ${selectedNames.length}`);
  } catch (error) {
    handleUiError(error, 'maintenance:storage-delete-artifacts', {
      title: maintenanceText('maintenanceStorageDeleteFailed')
    });
  }
}

async function inspectSelectedBackupRestore() {
  if (!requireProject()) return null;
  const backupName = getSingleSelectedBackupName();
  if (!backupName) return null;
  try {
    const plan = await callIpc(window.plantApp.backup.inspectRestore({
      projectDir: state.projectDir,
      backupDir: state.backupTargetDir || '',
      backupName
    }));
    renderBackupRestorePlan(plan);
    if (ui.maintenanceStorageSummary) {
      ui.maintenanceStorageSummary.textContent = plan.ok
        ? maintenanceText('maintenanceBackupRestorePlanReady')
        : maintenanceText('maintenanceBackupRestorePlanBlocked');
    }
    return plan;
  } catch (error) {
    handleUiError(error, 'maintenance:backup-restore-inspect', {
      title: maintenanceText('maintenanceBackupInspectFailed'),
      message: `${maintenanceText('maintenanceBackupInspectFailed')}\n${maintenanceText('maintenanceBackupRestoreInspectHint')}`
    });
    return null;
  }
}

async function restoreSelectedBackup() {
  if (guardMaintenanceReadOnlyAction('backup-restore')) return;
  if (!requireProject()) return;
  const backupName = getSingleSelectedBackupName();
  if (!backupName) return;
  const plan = await inspectSelectedBackupRestore();
  if (!plan?.ok) return;

  const confirmed = await openConfirmDialog({
    title: maintenanceText('maintenanceBackupRestoreSelected'),
    message: `${maintenanceText('maintenanceBackupRestoreConfirm')}\n${backupName}`,
    acceptLabel: maintenanceText('maintenanceBackupRestoreSelected'),
    cancelLabel: maintenanceText('cancelAction')
  });
  if (!confirmed) return;

  const secondConfirmed = await openConfirmDialog({
    title: maintenanceText('maintenanceBackupRestoreHighRiskTitle'),
    message: maintenanceText('maintenanceBackupRestoreHighRiskConfirm'),
    acceptLabel: maintenanceText('maintenanceBackupRestoreSelected'),
    cancelLabel: maintenanceText('cancelAction')
  });
  if (!secondConfirmed) return;

  try {
    const result = await withProgressTask({ type: 'maintenance', title: maintenanceText('maintenanceBackupRestoreSelected'), stage: maintenanceText('progressBackup') }, async task => {
      task.update({ percent: 15, stage: maintenanceText('progressBackup') });
      await yieldToUi();
      const restored = await callIpc(window.plantApp.backup.restore({
        projectDir: state.projectDir,
        backupDir: state.backupTargetDir || '',
        backupName,
        confirmRestore: true
      }));
      task.update({ percent: 75, stage: maintenanceText('progressReloading') });
      await loadProjectIntoRenderer(state.projectDir, { storageFormat: 'auto' });
      task.update({ percent: 92, stage: maintenanceText('maintenanceStorageVerifying') });
      await yieldToUi();
      return restored;
    });
    maintenanceSelectedStorageArtifacts.backups = new Set();
    await refreshStorageArtifacts();
    renderBackupRestorePlan({
      ok: true,
      backupName: result.backupName,
      restoreFileCount: result.restoredFileCount,
      hasSqliteStorage: result.hasSqliteStorage,
      hasJsonStorage: result.hasJsonStorage,
      skippedBackupEntries: result.skippedBackupEntries,
      createsSafetyBackup: true,
      warnings: result.warnings || []
    });
    if (ui.maintenanceStorageSummary) {
      ui.maintenanceStorageSummary.textContent = `${maintenanceText('maintenanceBackupRestoreDone')} ${result.restoredFileCount || 0}`;
    }
    showAlert(`${maintenanceText('maintenanceBackupRestoreDone')}\n${maintenanceText('maintenanceBackupRestoreSafetyBackup')}: ${result.safetyBackupFile || ''}`);
  } catch (error) {
    handleUiError(error, 'maintenance:backup-restore', {
      title: maintenanceText('maintenanceBackupRestoreFailed'),
      message: `${maintenanceText('maintenanceBackupRestoreFailed')}\n${maintenanceText('maintenanceBackupRestoreFailureHint')}`
    });
  }
}

async function runStoragePreflight() {
  if (!requireProject()) return null;
  try {
    setMaintenanceBusy(ui.btnStoragePreflight, true);
    const report = await callIpc(window.plantApp.storage.conversionPreflight({
      projectDir: state.projectDir
    }));
    renderStorageReport(report);
    await refreshStorageArtifacts();
    if (ui.maintenanceStorageSummary) {
      ui.maintenanceStorageSummary.textContent = `${maintenanceText('maintenanceStoragePreflightDone')} ${storageCountsText(report.counts || {})}`;
    }
    return report;
  } catch (error) {
    handleUiError(error, 'maintenance:storage-preflight', {
      title: maintenanceText('maintenanceStoragePreflightFailed'),
      message: `${maintenanceText('maintenanceStoragePreflightFailed')}\n${maintenanceText('maintenanceStoragePreflightRecoveryHint')}`
    });
    return null;
  } finally {
    setMaintenanceBusy(ui.btnStoragePreflight, false);
  }
}

async function createSqliteStorage() {
  if (guardMaintenanceReadOnlyAction('storage-create-sqlite')) return;
  if (!requireProject()) return;
  const confirmed = await openConfirmDialog({
    title: maintenanceText('maintenanceStorageCreateSqlite'),
    message: maintenanceText('maintenanceStorageCreateConfirm'),
    acceptLabel: maintenanceText('maintenanceStorageCreateSqlite'),
    cancelLabel: maintenanceText('cancelAction')
  });
  if (!confirmed) return;

  try {
    const report = await withProgressTask({ type: 'maintenance', title: maintenanceText('maintenanceStorageCreateSqlite'), stage: maintenanceText('progressWriting') }, async task => {
      task.update({ percent: 8, stage: maintenanceText('progressWriting') });
      await persistProject();
      task.update({ percent: 28, stage: maintenanceText('progressBackup') });
      await yieldToUi();
      const result = await callIpc(window.plantApp.storage.createSqliteFromJson({
        projectDir: state.projectDir,
        backupDir: state.backupTargetDir || ''
      }));
      task.update({ percent: 92, stage: maintenanceText('maintenanceStorageVerifying') });
      await yieldToUi();
      return result;
    });
    renderStorageReport(report);
    await loadProjectIntoRenderer(state.projectDir, { storageFormat: 'sqlite' });
    await refreshStorageArtifacts();
    if (ui.maintenanceStorageSummary) {
      ui.maintenanceStorageSummary.textContent = maintenanceText('maintenanceStorageCreateDone');
    }
    showAlert(`${maintenanceText('maintenanceStorageCreateDone')}\n${maintenanceText('maintenanceStorageBackup')}: ${report.backupFile || ''}`);
  } catch (error) {
    handleUiError(error, 'maintenance:storage-create-sqlite', {
      title: maintenanceText('maintenanceStorageCreateFailed'),
      message: `${maintenanceText('maintenanceStorageCreateFailed')}\n${maintenanceText('maintenanceStorageCreateRecoveryHint')}`
    });
  }
}

async function exportSqliteJson() {
  if (guardMaintenanceReadOnlyAction('storage-export-json')) return;
  if (!requireProject()) return;
  const confirmed = await openConfirmDialog({
    title: maintenanceText('maintenanceStorageExportJson'),
    message: maintenanceText('maintenanceStorageExportConfirm'),
    acceptLabel: maintenanceText('maintenanceStorageExportJson'),
    cancelLabel: maintenanceText('cancelAction')
  });
  if (!confirmed) return;

  try {
    const report = await withProgressTask({ type: 'maintenance', title: maintenanceText('maintenanceStorageExportJson'), stage: maintenanceText('progressBackup') }, async task => {
      task.update({ percent: 15, stage: maintenanceText('progressBackup') });
      await yieldToUi();
      const result = await callIpc(window.plantApp.storage.exportSqliteToJson({
        projectDir: state.projectDir,
        backupDir: state.backupTargetDir || ''
      }));
      task.update({ percent: 78, stage: maintenanceText('progressReloading') });
      await loadProjectIntoRenderer(state.projectDir);
      task.update({ percent: 94, stage: maintenanceText('maintenanceStorageVerifying') });
      await yieldToUi();
      return result;
    });
    renderStorageReport(report);
    await refreshStorageArtifacts();
    if (ui.maintenanceStorageSummary) {
      ui.maintenanceStorageSummary.textContent = maintenanceText('maintenanceStorageExportDone');
    }
    showAlert(`${maintenanceText('maintenanceStorageExportDone')}\n${maintenanceText('maintenanceStorageBackup')}: ${report.backupFile || ''}`);
  } catch (error) {
    handleUiError(error, 'maintenance:storage-export-json', {
      title: maintenanceText('maintenanceStorageExportFailed'),
      message: `${maintenanceText('maintenanceStorageExportFailed')}\n${maintenanceText('maintenanceStorageExportRecoveryHint')}`
    });
  }
}

async function loadStorageFormat(format) {
  if (!requireProject()) return;
  try {
    await loadProjectIntoRenderer(state.projectDir, { storageFormat: format });
    if (ui.maintenanceStorageSummary) {
      ui.maintenanceStorageSummary.textContent = `${maintenanceText('maintenanceStorageLoaded')}: ${state.storageFormat || format}`;
    }
    renderStorageReport({
      status: 'completed',
      activeStorageFormat: state.storageFormat || format,
      databaseExists: state.sqliteDatabaseExists,
      jsonFilesKept: state.jsonFilesExist,
      databaseFile: 'data.db',
      counts: {
        zones: state.zones.length,
        points: state.points.length,
        phenologyEntries: state.points.reduce((total, point) => total + getPhenologyEntries(point).length, 0),
        imageReferences: state.points.reduce((total, point) => total + normalizeImages(point.images).length, 0),
        taxonomyCandidates: state.points.reduce((total, point) => total + (Array.isArray(point.taxonomyCandidatesSummary) ? point.taxonomyCandidatesSummary.length : 0), 0)
      }
    });
    await refreshStorageArtifacts();
  } catch (error) {
    handleUiError(error, `maintenance:storage-load-${format}`, {
      title: maintenanceText('maintenanceStorageLoadFailed'),
      message: `${maintenanceText('maintenanceStorageLoadFailed')}\n${maintenanceText('maintenanceStorageLoadRecoveryHint')}`
    });
  }
}
