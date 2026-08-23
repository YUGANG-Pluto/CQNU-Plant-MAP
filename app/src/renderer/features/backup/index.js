function dirnameLabel(dir) {
  return dir ? dir.replaceAll('\\', '/') : '—';
}

async function createBackupZip(projectDir, backupDir, label) {
  const data = await callIpc(window.platformAdapter.backup.create({
    projectDir,
    backupDir,
    label
  }));
  return data.filePath;
}

async function autoBackupProjects(dirs, label = 'auto') {
  const done = [];
  const uniqueDirs = [...new Set((dirs || []).filter(Boolean))];

  for (const dir of uniqueDirs) {
    const file = await createBackupZip(dir, '', label);
    done.push(file);
  }

  return done;
}

async function maybeHandleExpiredBackups(projectDir) {
  if (!projectDir) {
    return;
  }

    const result = await callIpc(window.platformAdapter.backup.listExpired({
    projectDir,
    days: BACKUP_EXPIRE_DAYS
  }));

  if (!result.items?.length) {
    return;
  }

  const names = result.items.map(item => item.name).join('\n');
  const del = await openConfirmDialog({
    title: t('expiredBackupsTitle'),
    message: `${t('expiredBackupsMessage')}\n${names}`,
    acceptLabel: t('deleteNow'),
    cancelLabel: t('keepSevenMoreDays')
  });

  const paths = result.items.map(item => item.path);
  if (del) {
        await callIpc(window.platformAdapter.backup.deleteExpired({ projectDir, paths }));
    return;
  }

        await callIpc(window.platformAdapter.backup.keepExpired({ projectDir, paths }));
}

function updateBackupPaths() {
  if (ui.backupCurrentPath) {
    ui.backupCurrentPath.textContent = dirnameLabel(state.projectDir);
  }
  if (ui.backupTargetPath) {
    ui.backupTargetPath.textContent = dirnameLabel(state.backupTargetDir);
  }
}

function openBackupCenter() {
  updateBackupPaths();
  if (ui.backupSummary) {
    ui.backupSummary.textContent = '';
  }
  openLayerModal(ui.backupModal);
}

async function chooseBackupDirectory() {
  const result = await callIpc(window.platformAdapter.backup.chooseDir());
  return result.canceled ? '' : result.backupDir;
}

async function retryManualBackupAfterTrustReset() {
  state.backupTargetDir = '';
  const target = await chooseBackupDirectory();
  if (!target) {
    return;
  }

  state.backupTargetDir = target;
  updateBackupPaths();
  const file = await createBackupZip(state.projectDir, target, 'manual');
  if (ui.backupSummary) {
    ui.backupSummary.textContent = `${t('backupSuccess')} ${file}`;
  }
}

async function runManualBackup() {
  if (typeof guardMaintenanceReadOnlyAction === 'function' && guardMaintenanceReadOnlyAction('manual-backup')) return;
  if (!state.projectDir) {
    return showAlert(t('mergeNeedCurrent'));
  }

  const target = state.backupTargetDir || await chooseBackupDirectory();
  if (!target) {
    return;
  }

  state.backupTargetDir = target;
  updateBackupPaths();

  try {
    const file = await withProgressTask({ type: 'backup', title: t('runManualBackup'), stage: t('progressPreparing') }, async task => {
      task.update({ percent: 8, stage: t('progressPreparing') });
      await yieldToUi();
      task.update({ percent: 18, stage: t('progressCompressing') });
      const backupFile = await createBackupZip(state.projectDir, target, 'manual');
      task.update({ percent: 92, stage: t('progressWriting') });
      await yieldToUi();
      return backupFile;
    });
    if (ui.backupSummary) {
      ui.backupSummary.textContent = `${t('backupSuccess')} ${file}`;
    }
  } catch (error) {
    if (error.code === RENDERER_ERROR_CODES.UNTRUSTED_BACKUP_DIR) {
      await retryManualBackupAfterTrustReset();
      return;
    }

    handleUiError(error, 'backup:manual', {
      title: t('backupFailed'),
      message: `${t('backupFailed')} ${error.message || error}`
    });
  }
}
