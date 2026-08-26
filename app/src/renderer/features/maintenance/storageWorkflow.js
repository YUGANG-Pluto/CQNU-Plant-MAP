async function inspectProjectBackup(payload) {
  if (window.projectWorkflow?.inspectBackup) {
    return window.projectWorkflow.inspectBackup(payload);
  }
  return callIpc(window.platformAdapter.backup.inspectRestore(payload));
}

async function restoreProjectBackup(payload) {
  if (window.projectWorkflow?.restoreBackup) {
    return window.projectWorkflow.restoreBackup(payload);
  }
  return callIpc(window.platformAdapter.backup.restore(payload));
}
