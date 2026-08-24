import { BrowserWindow, ipcMain, type IpcMainInvokeEvent } from 'electron';
import { IPC_CHANNELS, type IpcChannel, type IpcResponse } from '../../shared/ipc-contract';

type IpcHandler = (payload: unknown, event: IpcMainInvokeEvent) => unknown | Promise<unknown>;

const { logError, toAppError } = require('../../../src/main/errors') as {
  logError: (scope: string, error: unknown) => void;
  toAppError: (error: unknown) => { code: string; message: string };
};
const projectStore = require('../../../src/main/projectStore');
const dialogs = require('../../../src/main/dialogService');
const imageService = require('../../../src/main/imageService');
const backupService = require('../../../src/main/backupService');
const logger = require('../../../src/main/logger');
const maintenanceService = require('../../../src/main/maintenanceService');
const speciesReferenceService = require('../../../src/main/speciesReferenceService');
const storageConversionService = require('../../../src/main/storageConversionService');
const securityPolicy = require('../../../src/main/securityPolicy');

function ok(data: unknown): IpcResponse {
  return { ok: true, data };
}

function fail(scope: string, error: unknown): IpcResponse {
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

function handle(channel: IpcChannel, handler: IpcHandler): void {
  ipcMain.handle(channel, async (event, payload: unknown) => {
    try {
      securityPolicy.assertTrustedIpcSender(event);
      const safePayload = payload === undefined || payload === null ? {} : payload;
      return ok(await handler(safePayload, event));
    } catch (error) {
      return fail(channel, error);
    }
  });
}

function toggleCurrentWindowFullscreen(_payload: unknown, event: IpcMainInvokeEvent) {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window) {
    return { isFullscreen: false };
  }

  const isFullscreen = !window.isFullScreen();
  window.setFullScreen(isFullscreen);
  return { isFullscreen };
}

export function registerIpc(): void {
  handle(IPC_CHANNELS.project.chooseDir, async () => dialogs.chooseProjectDir());
  handle(IPC_CHANNELS.project.chooseMergeDir, async () => dialogs.chooseMergeProjectDir());
  handle(IPC_CHANNELS.project.load, projectStore.loadProject);
  handle(IPC_CHANNELS.project.save, projectStore.saveProject);
  handle(IPC_CHANNELS.project.getModifiedTime, projectStore.getModifiedTime);
  handle(IPC_CHANNELS.project.importCsv, async () => dialogs.importCsv());
  handle(IPC_CHANNELS.project.exportCsv, dialogs.exportCsv);
  handle(IPC_CHANNELS.project.importGeoJson, async () => dialogs.importGeoJson());
  handle(IPC_CHANNELS.project.exportGeoJson, dialogs.exportGeoJson);
  handle(IPC_CHANNELS.project.exportMarkdown, dialogs.exportMarkdown);
  handle(IPC_CHANNELS.project.exportSvg, dialogs.exportSvg);

  handle(IPC_CHANNELS.settings.importJson, dialogs.importJson);
  handle(IPC_CHANNELS.settings.exportJson, dialogs.exportJson);
  handle(IPC_CHANNELS.image.import, imageService.importImage);
  handle(IPC_CHANNELS.image.delete, imageService.deleteImage);

  handle(IPC_CHANNELS.backup.chooseDir, async () => dialogs.chooseBackupDir());
  handle(IPC_CHANNELS.backup.create, backupService.create);
  handle(IPC_CHANNELS.backup.inspectRestore, backupService.inspectRestorePlan);
  handle(IPC_CHANNELS.backup.restore, backupService.restore);
  handle(IPC_CHANNELS.backup.listExpired, backupService.listExpired);
  handle(IPC_CHANNELS.backup.keepExpired, backupService.keepExpired);
  handle(IPC_CHANNELS.backup.deleteExpired, backupService.deleteExpired);

  handle(IPC_CHANNELS.window.toggleFullscreen, toggleCurrentWindowFullscreen);
  handle(IPC_CHANNELS.window.openExternal, securityPolicy.openExternalUrl);

  handle(IPC_CHANNELS.log.report, logger.reportRendererLog);
  handle(IPC_CHANNELS.log.setLevel, payload => {
    const level = (payload as { level?: unknown }).level;
    return { level: logger.setLogLevel(level) };
  });
  handle(IPC_CHANNELS.log.listRecent, logger.listRecentLogs);
  handle(IPC_CHANNELS.log.readLog, logger.readLogFile);
  handle(IPC_CHANNELS.log.deleteLogs, logger.deleteLogFiles);
  handle(IPC_CHANNELS.log.cleanup, () => logger.cleanupOldLogs());
  handle(IPC_CHANNELS.log.exportDiagnostics, dialogs.exportJson);

  handle(IPC_CHANNELS.maintenance.checkImageRefs, maintenanceService.checkImageRefs);
  handle(IPC_CHANNELS.storage.conversionPreflight, storageConversionService.getPreflight);
  handle(IPC_CHANNELS.storage.listArtifacts, storageConversionService.listStorageArtifacts);
  handle(IPC_CHANNELS.storage.deleteArtifacts, storageConversionService.deleteStorageArtifacts);
  handle(IPC_CHANNELS.storage.createSqliteFromJson, storageConversionService.createSqliteFromJson);
  handle(IPC_CHANNELS.storage.exportSqliteToJson, storageConversionService.exportSqliteToJson);
  handle(IPC_CHANNELS.species.referenceQuery, speciesReferenceService.querySpeciesReference);
  handle(IPC_CHANNELS.species.suggestTaxonomy, speciesReferenceService.suggestTaxonomyFromReferences);
  handle(IPC_CHANNELS.species.imageCompare, speciesReferenceService.querySpeciesImageCompare);
}
