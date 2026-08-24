function openMaintenanceCenter() {
  ui.maintenanceProjectPath.textContent = maintenanceProjectLabel();
  syncMaintenanceSafeModeUi();
  renderMaintenanceReport(maintenanceLastReport);
  renderStorageReport(null);
  renderStorageArtifacts(null);
  setImportedBackupPlan(maintenanceImportedBackupPlan);
  openLayerModal(ui.maintenanceModal);
  refreshMaintenanceLogs();
  refreshStorageArtifacts();
}

function bindMaintenanceEvents() {
  ui.btnOpenMaintenance?.addEventListener('click', openMaintenanceCenter);
  ui.btnCloseMaintenanceModal?.addEventListener('click', () => closeLayerModal(ui.maintenanceModal));
  ui.maintenanceModal?.querySelector('.layer-modal-backdrop')
    ?.addEventListener('click', () => closeLayerModal(ui.maintenanceModal));
  ui.btnRunHealthCheck?.addEventListener('click', () => runMaintenanceHealthCheck());
  ui.btnRunSafeRepair?.addEventListener('click', runMaintenanceSafeRepair);
  ui.btnRefreshLogs?.addEventListener('click', refreshMaintenanceLogs);
  ui.btnReadSelectedLog?.addEventListener('click', readSelectedMaintenanceLog);
  ui.btnCleanupLogs?.addEventListener('click', cleanupMaintenanceLogs);
  ui.btnExportDiagnostics?.addEventListener('click', exportDiagnostics);
  ui.btnStoragePreflight?.addEventListener('click', runStoragePreflight);
  ui.btnCreateSqliteStorage?.addEventListener('click', createSqliteStorage);
  ui.btnExportSqliteJson?.addEventListener('click', exportSqliteJson);
  ui.btnLoadSqliteStorage?.addEventListener('click', () => loadStorageFormat('sqlite'));
  ui.btnLoadJsonStorage?.addEventListener('click', () => loadStorageFormat('json'));
  ui.btnRefreshStorageArtifacts?.addEventListener('click', refreshStorageArtifacts);
  ui.btnDeleteSelectedStorageArtifacts?.addEventListener('click', deleteSelectedStorageArtifacts);
  ui.btnInspectSelectedBackup?.addEventListener('click', inspectSelectedBackupRestore);
  ui.btnRestoreSelectedBackup?.addEventListener('click', restoreSelectedBackup);
  ui.btnImportExternalBackup?.addEventListener('click', importExternalBackupArchive);
  ui.btnRestoreImportedBackup?.addEventListener('click', restoreImportedBackupArchive);
  ui.btnApplySafeMode?.addEventListener('click', applySafeModeSettings);
  ui.btnExitSafeMode?.addEventListener('click', exitSafeModeSettings);
  ui.btnExportUiSettings?.addEventListener('click', exportUiSettings);
  ui.btnImportUiSettings?.addEventListener('click', importUiSettings);
  syncMaintenanceSafeModeUi();
}
