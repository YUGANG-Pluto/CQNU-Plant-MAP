let maintenanceLastStorageInventory = null;
const maintenanceSelectedStorageArtifacts = {
  sqlite: false,
  json: false,
  backups: new Set()
};

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
  return uniqueFormats.length
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
