let workspaceDrawerCloseTimer = null;

async function chooseAndLoadProject() {
  const result = await callIpc(window.plantApp.project.chooseDir());
  if (result.canceled) return;
  await loadProjectIntoRenderer(result.projectDir);
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
