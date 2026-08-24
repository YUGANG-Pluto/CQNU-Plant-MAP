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
  const result = await callIpc(window.platformAdapter.storage.deleteArtifacts({
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
  const plan = await callIpc(window.platformAdapter.backup.inspectRestore({
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

async function confirmBackupRestore(backupName, imported = false) {
  const confirmed = await openConfirmDialog({
    title: maintenanceText(imported ? 'maintenanceBackupRestoreImported' : 'maintenanceBackupRestoreSelected'),
    message: `${maintenanceText(imported ? 'maintenanceBackupRestoreImportedConfirm' : 'maintenanceBackupRestoreConfirm')}\n${backupName}`,
    acceptLabel: maintenanceText(imported ? 'maintenanceBackupRestoreImported' : 'maintenanceBackupRestoreSelected'),
    cancelLabel: maintenanceText('cancelAction')
  });
  if (!confirmed) return false;
  return openConfirmDialog({
    title: maintenanceText('maintenanceBackupRestoreHighRiskTitle'),
    message: maintenanceText('maintenanceBackupRestoreHighRiskConfirm'),
    acceptLabel: maintenanceText(imported ? 'maintenanceBackupRestoreImported' : 'maintenanceBackupRestoreSelected'),
    cancelLabel: maintenanceText('cancelAction')
  });
}

async function restoreSelectedBackup() {
  if (guardMaintenanceReadOnlyAction('backup-restore')) return;
  if (!requireProject()) return;
  const backupName = getSingleSelectedBackupName();
  if (!backupName) return;
  const plan = await inspectSelectedBackupRestore();
  if (!plan?.ok) return;

  if (!await confirmBackupRestore(backupName)) return;

  try {
    const result = await withProgressTask({ type: 'maintenance', title: maintenanceText('maintenanceBackupRestoreSelected'), stage: maintenanceText('progressBackup') }, async task => {
      task.update({ percent: 15, stage: maintenanceText('progressBackup') });
      await yieldToUi();
  const restored = await callIpc(window.platformAdapter.backup.restore({
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

async function importExternalBackupArchive() {
  if (guardMaintenanceReadOnlyAction('backup-import-external')) return;
  if (!requireProject()) return;
  const importArchive = window.platformAdapter.backup.importArchive;
  if (typeof importArchive !== 'function') {
    showAlert(maintenanceText('maintenanceBackupImportUnavailable'));
    return;
  }
  try {
    setMaintenanceBusy(ui.btnImportExternalBackup, true);
    const plan = await callIpc(importArchive({ projectDir: state.projectDir }));
    if (plan.canceled) return;
    setImportedBackupPlan(plan);
    renderBackupRestorePlan(plan);
    if (ui.maintenanceStorageSummary) {
      ui.maintenanceStorageSummary.textContent = maintenanceText('maintenanceBackupImportReady');
    }
  } catch (error) {
    setImportedBackupPlan(null);
    handleUiError(error, 'maintenance:backup-import-external', {
      title: maintenanceText('maintenanceBackupImportFailed')
    });
  } finally {
    setMaintenanceBusy(ui.btnImportExternalBackup, false);
  }
}

async function restoreImportedBackupArchive() {
  if (guardMaintenanceReadOnlyAction('backup-restore-imported')) return;
  if (!requireProject()) return;
  const plan = maintenanceImportedBackupPlan;
  const restoreImported = window.platformAdapter.backup.restoreImported;
  if (!plan?.importToken || typeof restoreImported !== 'function') {
    showAlert(maintenanceText('maintenanceBackupImportSelectFirst'));
    return;
  }
  if (!await confirmBackupRestore(plan.backupName || '', true)) return;

  try {
    const result = await withProgressTask({
      type: 'maintenance',
      title: maintenanceText('maintenanceBackupRestoreImported'),
      stage: maintenanceText('progressBackup')
    }, async task => {
      task.update({ percent: 15, stage: maintenanceText('progressBackup') });
      await yieldToUi();
      const restored = await callIpc(restoreImported({
        projectDir: state.projectDir,
        importToken: plan.importToken,
        confirmRestore: true
      }));
      task.update({ percent: 75, stage: maintenanceText('progressReloading') });
      await loadProjectIntoRenderer(state.projectDir, { storageFormat: 'auto' });
      task.update({ percent: 92, stage: maintenanceText('maintenanceStorageVerifying') });
      await yieldToUi();
      return restored;
    });
    setImportedBackupPlan(null);
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
    showAlert(`${maintenanceText('maintenanceBackupRestoreDone')}\n${maintenanceText('maintenanceBackupRestoreSafetyBackup')}: ${result.safetyBackupFile || ''}`);
  } catch (error) {
    handleUiError(error, 'maintenance:backup-restore-imported', {
      title: maintenanceText('maintenanceBackupRestoreFailed'),
      message: maintenanceText('maintenanceBackupImportRetryHint')
    });
  }
}

async function runStoragePreflight() {
  if (!requireProject()) return null;
  try {
    setMaintenanceBusy(ui.btnStoragePreflight, true);
  const report = await callIpc(window.platformAdapter.storage.conversionPreflight({
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
  const result = await callIpc(window.platformAdapter.storage.createSqliteFromJson({
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
  const result = await callIpc(window.platformAdapter.storage.exportSqliteToJson({
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
