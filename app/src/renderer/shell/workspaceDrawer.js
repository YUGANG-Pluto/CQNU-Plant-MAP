let workspaceDrawerCloseTimer = null;

function projectOpenButtons() {
  return [
    ui.btnChooseDir,
    ui.btnChooseDirWelcome,
    ui.btnImportProjectDirectory,
    ui.btnImportProjectSqlite,
    ui.btnImportProjectJson,
    ui.btnImportProjectFolder
  ].filter(Boolean);
}

function setProjectOpenState(activeButton, busy, message = '') {
  projectOpenButtons().forEach(button => {
    button.classList.toggle('is-busy', busy && button === activeButton);
    if (busy && button === activeButton) button.setAttribute('aria-busy', 'true');
    else button.removeAttribute('aria-busy');
    button.disabled = busy || window.platformAdapter?.capabilities.readProject !== true;
  });
  [ui.webProjectOpenStatus, ui.projectImportStatus].filter(Boolean).forEach(region => {
    region.textContent = message;
  });
  const motionState = busy
    ? 'opening'
    : message === t('webProjectOpenReady')
      ? 'ready'
      : message === t('webProjectOpenFailed')
        ? 'error'
        : 'canceled';
  window.cqnuMotionKernel?.projectOpen?.(motionState, activeButton);
}

async function chooseAndLoadProject(event) {
  const button = event?.currentTarget || ui.btnChooseDir;
  if (projectOpenButtons().some(candidate => candidate.classList.contains('is-busy'))) return;

  const requestedMode = button?.dataset?.projectOpenMode || '';
  if (
    window.platformAdapter?.runtime === 'web' &&
    !requestedMode &&
    [ui.btnChooseDir, ui.btnChooseDirWelcome].includes(button)
  ) {
    openProjectImportCenter(button);
    return;
  }

  const discardDecision = typeof confirmDiscardProjectDraft === 'function'
    ? confirmDiscardProjectDraft()
    : true;
  if (discardDecision !== true && !await discardDecision) return;

  const mode = ['directory', 'portable-folder', 'sqlite-file', 'json-files'].includes(requestedMode)
    ? requestedMode
    : 'directory';
  const workflow = window.projectWorkflow;
  const command = {
    directory: window.platformAdapter.project.chooseDir,
    'portable-folder': window.platformAdapter.project.choosePortableDir,
    'sqlite-file': window.platformAdapter.project.chooseSqliteFile,
    'json-files': window.platformAdapter.project.chooseJsonFiles
  }[mode];
  if (!workflow?.chooseAndLoad && typeof command !== 'function') {
    showAlert(t('webProjectFolderUnsupported'));
    return;
  }

  const progressKey = {
    directory: 'webProjectOpeningFolder',
    'portable-folder': 'webProjectImportingFolder',
    'sqlite-file': 'projectImportReadingSqlite',
    'json-files': 'projectImportReadingJson'
  }[mode];
  setProjectOpenState(button, true, t(progressKey));
  try {
    // Invoke the picker before the first await to preserve Chromium's trusted user activation.
    const pendingOpen = workflow?.chooseAndLoad
      ? workflow.chooseAndLoad({ mode })
      : command();
    const result = workflow?.chooseAndLoad
      ? await pendingOpen
      : await callIpc(pendingOpen);
    if (result.canceled) {
      setProjectOpenState(button, false, t('webProjectOpenCanceled'));
      return;
    }
    if (workflow?.chooseAndLoad) {
      await applyLoadedProjectToRenderer(result.project);
    } else {
      await loadProjectIntoRenderer(result.projectDir, { storageFormat: result.storageFormat || 'auto' });
    }
    closeLayerModal(ui.projectImportModal, { restoreFocus: false });
    setProjectOpenState(button, false, t('webProjectOpenReady'));
  } catch (error) {
    setProjectOpenState(button, false, t('webProjectOpenFailed'));
    showAlert(error?.message || '本地项目目录未能打开，请检查浏览器权限后重试。');
  } finally {
    setProjectOpenState(button, false, ui.webProjectOpenStatus?.textContent || '');
  }
}

function openProjectImportCenter(returnFocus = null) {
  if (!ui.projectImportModal) return;
  if (ui.btnImportProjectBackup) {
    ui.btnImportProjectBackup.disabled = !state.projectDir
      || window.platformAdapter?.capabilities.externalBackupImport !== true;
  }
  if (ui.projectImportStatus) ui.projectImportStatus.textContent = t('projectImportReady');
  openLayerModal(ui.projectImportModal, {
    focusTarget: ui.btnImportProjectDirectory,
    returnFocus
  });
}

function openExternalBackupFromImportCenter() {
  if (!state.projectDir) {
    showAlert(t('projectImportBackupRequiresProject'));
    return;
  }
  closeLayerModal(ui.projectImportModal, { restoreFocus: false });
  if (typeof openMaintenanceCenter === 'function') openMaintenanceCenter();
  if (typeof importExternalBackupArchive === 'function') importExternalBackupArchive();
}

function requireProject() {
  if (state.projectDir) return true;
  showAlert(t('noProject'));
  return false;
}


function openWorkspaceUtilityDrawer() {
  if (!ui.workspaceUtilityDrawer) return;
  if (workspaceDrawerCloseTimer) {
    clearTimeout(workspaceDrawerCloseTimer);
    workspaceDrawerCloseTimer = null;
  }
  ui.workspaceUtilityDrawer.classList.remove('is-closing');
  ui.workspaceUtilityDrawer.setAttribute('aria-hidden', 'false');
  openLayerModal(ui.workspaceUtilityDrawer);
  window.requestAnimationFrame(() => ui.btnCloseWorkspaceDrawer?.focus());
}

function closeWorkspaceUtilityDrawer() {
  if (!ui.workspaceUtilityDrawer) return;
  if (ui.workspaceUtilityDrawer.classList.contains('hidden')) return;
  if (workspaceDrawerCloseTimer) {
    clearTimeout(workspaceDrawerCloseTimer);
    workspaceDrawerCloseTimer = null;
  }
  closeLayerModal(ui.workspaceUtilityDrawer, { returnFocus: ui.btnOpenWorkspaceDrawer });
}

function bindWorkspaceDrawerEvents() {
  ui.btnOpenWorkspaceDrawer?.addEventListener('click', openWorkspaceUtilityDrawer);
  ui.btnCloseWorkspaceDrawer?.addEventListener('click', closeWorkspaceUtilityDrawer);
  ui.workspaceUtilityDrawer?.querySelector('.layer-modal-backdrop')
    ?.addEventListener('click', closeWorkspaceUtilityDrawer);
  ui.btnCloseProjectImportModal?.addEventListener('click', () => closeLayerModal(ui.projectImportModal));
  ui.projectImportModal?.querySelector('.layer-modal-backdrop')
    ?.addEventListener('click', () => closeLayerModal(ui.projectImportModal));
  ui.btnImportProjectBackup?.addEventListener('click', openExternalBackupFromImportCenter);
}
