const { BrowserWindow, ipcMain } = require('electron');
const { logError, toAppError } = require('./errors');
const projectStore = require('./projectStore');
const dialogs = require('./dialogService');
const imageService = require('./imageService');
const backupService = require('./backupService');
const logger = require('./logger');
const maintenanceService = require('./maintenanceService');

function ok(data) {
  return { ok: true, data };
}

function fail(scope, error) {
  const appError = toAppError(error);
  logError(scope, appError);
  return {
    ok: false,
    error: {
      code: appError.code,
      message: appError.message
    }
  };
}

// IPC 统一折叠为稳定返回结构，renderer 不直接接触 Node 异常对象。
function handle(channel, fn) {
  ipcMain.handle(channel, async (event, payload) => {
    try {
      const safePayload = payload === undefined || payload === null ? {} : payload;
      return ok(await fn(safePayload, event));
    } catch (error) {
      return fail(channel, error);
    }
  });
}


function toggleCurrentWindowFullscreen(_payload, event) {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) {
    return { isFullscreen: false };
  }

  const nextFullscreen = !win.isFullScreen();
  win.setFullScreen(nextFullscreen);
  return { isFullscreen: nextFullscreen };
}

// preload 仅映射业务命令，不暴露通用文件系统能力。
function registerIpc() {
  handle('project:chooseDir', async () => dialogs.chooseProjectDir());
  handle('project:chooseMergeDir', async () => dialogs.chooseMergeProjectDir());
  handle('project:load', projectStore.loadProject);
  handle('project:save', projectStore.saveProject);
  handle('project:getModifiedTime', projectStore.getModifiedTime);
  handle('project:importCsv', async () => dialogs.importCsv());
  handle('project:exportCsv', dialogs.exportCsv);
  handle('project:importGeoJson', async () => dialogs.importGeoJson());
  handle('project:exportGeoJson', dialogs.exportGeoJson);
  handle('settings:importJson', dialogs.importJson);
  handle('settings:exportJson', dialogs.exportJson);

  handle('image:import', imageService.importImage);
  handle('image:delete', imageService.deleteImage);

  handle('backup:chooseDir', async () => dialogs.chooseBackupDir());
  handle('backup:create', backupService.create);
  handle('backup:listExpired', backupService.listExpired);
  handle('backup:keepExpired', backupService.keepExpired);
  handle('backup:deleteExpired', backupService.deleteExpired);

  handle('window:toggleFullscreen', toggleCurrentWindowFullscreen);

  handle('log:renderer', logger.reportRendererLog);
  handle('log:setLevel', payload => ({ level: logger.setLogLevel(payload.level) }));
  handle('log:listRecent', logger.listRecentLogs);
  handle('log:cleanup', () => logger.cleanupOldLogs());
  handle('log:exportDiagnostics', dialogs.exportJson);

  handle('maintenance:checkImageRefs', maintenanceService.checkImageRefs);
}

module.exports = {
  registerIpc
};
