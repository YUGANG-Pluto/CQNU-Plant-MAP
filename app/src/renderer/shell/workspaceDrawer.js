let workspaceDrawerCloseTimer = null;

async function chooseAndLoadProject() {
  const button = ui.btnChooseDir;
  if (button?.classList.contains('is-busy')) return;
  if (typeof confirmDiscardProjectDraft === 'function' && !await confirmDiscardProjectDraft()) return;
  button?.classList.add('is-busy');
  button?.setAttribute('aria-busy', 'true');
  if (button) button.disabled = true;
  try {
    const result = await callIpc(window.platformAdapter.project.chooseDir());
    if (result.canceled) return;
    await loadProjectIntoRenderer(result.projectDir);
  } catch (error) {
    showAlert(error?.message || '本地项目目录未能打开，请检查浏览器权限后重试。');
  } finally {
    button?.classList.remove('is-busy');
    button?.removeAttribute('aria-busy');
    if (button) button.disabled = window.platformAdapter?.capabilities.readProject !== true;
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
