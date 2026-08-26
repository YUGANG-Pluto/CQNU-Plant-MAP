let workspaceDrawerCloseTimer = null;

function projectOpenButtons() {
  return [ui.btnChooseDir, ui.btnChooseDirWelcome, ui.btnImportProjectFolder].filter(Boolean);
}

function setProjectOpenState(activeButton, busy, message = '') {
  projectOpenButtons().forEach(button => {
    button.classList.toggle('is-busy', busy && button === activeButton);
    if (busy && button === activeButton) button.setAttribute('aria-busy', 'true');
    else button.removeAttribute('aria-busy');
    button.disabled = busy || window.platformAdapter?.capabilities.readProject !== true;
  });
  if (ui.webProjectOpenStatus) ui.webProjectOpenStatus.textContent = message;
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

  const discardDecision = typeof confirmDiscardProjectDraft === 'function'
    ? confirmDiscardProjectDraft()
    : true;
  if (discardDecision !== true && !await discardDecision) return;

  const portable = button?.dataset?.projectOpenMode === 'portable-folder';
  const workflow = window.projectWorkflow;
  const command = portable
    ? window.platformAdapter.project.choosePortableDir
    : window.platformAdapter.project.chooseDir;
  if (!workflow?.chooseAndLoad && typeof command !== 'function') {
    showAlert(t('webProjectFolderUnsupported'));
    return;
  }

  setProjectOpenState(button, true, t(portable ? 'webProjectImportingFolder' : 'webProjectOpeningFolder'));
  try {
    // Invoke the picker before the first await to preserve Chromium's trusted user activation.
    const pendingOpen = workflow?.chooseAndLoad
      ? workflow.chooseAndLoad({ mode: portable ? 'portable-folder' : 'directory' })
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
    setProjectOpenState(button, false, t('webProjectOpenReady'));
  } catch (error) {
    setProjectOpenState(button, false, t('webProjectOpenFailed'));
    showAlert(error?.message || '本地项目目录未能打开，请检查浏览器权限后重试。');
  } finally {
    setProjectOpenState(button, false, ui.webProjectOpenStatus?.textContent || '');
  }
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
}
