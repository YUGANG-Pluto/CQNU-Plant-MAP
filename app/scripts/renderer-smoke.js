const { app } = require('electron');
const { createMainWindow } = require('../main-dist/main/windowManager');
const { registerIpc } = require('../main-dist/main/ipc/register');

const requiredIds = [
  'map',
  'btnChooseDir',
  'btnSave',
  'rightInspectorPanel',
  'workspaceUtilityDrawer',
  'basemapWorkspaceModal',
  'pointEditorModal',
  'speciesReferenceModal',
  'statsModal',
  'queryModal',
  'trashModal',
  'themeModal',
  'mergeModal',
  'backupModal',
  'maintenanceModal',
  'confirmModal',
  'alertModal',
  'imagePreviewModal'
];

function waitForLoad(window) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Renderer smoke load timed out.')), 10000);
    window.webContents.once('did-finish-load', () => {
      clearTimeout(timer);
      resolve();
    });
    window.webContents.once('did-fail-load', (_event, code, description) => {
      clearTimeout(timer);
      reject(new Error(`Renderer failed to load (${code}): ${description}`));
    });
  });
}

async function run() {
  app.disableHardwareAcceleration();
  await app.whenReady();
  registerIpc();

  const errors = [];
  const window = createMainWindow({ show: false });
  window.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    if (level >= 3) {
      errors.push(`${sourceId || 'renderer'}:${line || 0} ${message}`);
    }
  });
  window.webContents.on('render-process-gone', (_event, details) => {
    errors.push(`renderer process exited: ${details.reason}`);
  });

  await waitForLoad(window);
  await new Promise(resolve => setTimeout(resolve, 700));

  const result = await window.webContents.executeJavaScript(`(() => {
    const requiredIds = ${JSON.stringify(requiredIds)};
    const allIds = Array.from(document.querySelectorAll('[id]'), node => node.id);
    const duplicateIds = allIds.filter((id, index) => allIds.indexOf(id) !== index);
    return {
      readyState: document.readyState,
      missingIds: requiredIds.filter(id => !document.getElementById(id)),
      duplicateIds: Array.from(new Set(duplicateIds)),
      modernChildCount: document.getElementById('modernUiRoot')?.children.length || 0,
      mapReady: Boolean(window.__CQNU_STATE__?.map),
      themeBridgeReady: [
        'ensureThemeSettings',
        'applyThemeVariables',
        'openThemeCenter',
        'bindThemePanelEvents'
      ].every(name => typeof window[name] === 'function')
    };
  })()`, true);

  const failures = [];
  if (result.readyState !== 'complete') failures.push(`document state: ${result.readyState}`);
  if (result.missingIds.length) failures.push(`missing ids: ${result.missingIds.join(', ')}`);
  if (result.duplicateIds.length) failures.push(`duplicate ids: ${result.duplicateIds.join(', ')}`);
  if (result.modernChildCount < 1) failures.push('modern renderer root is empty');
  if (!result.mapReady) failures.push('Leaflet map did not initialize');
  if (!result.themeBridgeReady) failures.push('theme compatibility bridge is incomplete');
  failures.push(...errors);

  window.destroy();
  if (failures.length) {
    throw new Error(failures.join('\n'));
  }

  process.stdout.write(`renderer smoke passed (${requiredIds.length} required controls)\n`);
}

run()
  .then(() => app.quit())
  .catch(error => {
    process.stderr.write(`${error.stack || error.message}\n`);
    app.exit(1);
  });
