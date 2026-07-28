import { contextBridge, ipcRenderer } from 'electron';
import {
  IPC_CHANNELS,
  type IpcChannel,
  type IpcResponse,
  type PlantAppApi
} from '../shared/ipc-contract';

function invoke<TResult = unknown>(channel: IpcChannel, payload?: unknown): Promise<IpcResponse<TResult>> {
  return ipcRenderer.invoke(channel, payload) as Promise<IpcResponse<TResult>>;
}

const plantApp: PlantAppApi = {
  project: {
    chooseDir: () => invoke(IPC_CHANNELS.project.chooseDir),
    chooseMergeDir: () => invoke(IPC_CHANNELS.project.chooseMergeDir),
    load: payload => invoke(IPC_CHANNELS.project.load, payload),
    save: payload => invoke(IPC_CHANNELS.project.save, payload),
    getModifiedTime: payload => invoke(IPC_CHANNELS.project.getModifiedTime, payload),
    importCsv: () => invoke(IPC_CHANNELS.project.importCsv),
    exportCsv: payload => invoke(IPC_CHANNELS.project.exportCsv, payload),
    importGeoJson: () => invoke(IPC_CHANNELS.project.importGeoJson),
    exportGeoJson: payload => invoke(IPC_CHANNELS.project.exportGeoJson, payload),
    exportMarkdown: payload => invoke(IPC_CHANNELS.project.exportMarkdown, payload),
    exportSvg: payload => invoke(IPC_CHANNELS.project.exportSvg, payload)
  },
  settings: {
    importJson: payload => invoke(IPC_CHANNELS.settings.importJson, payload),
    exportJson: payload => invoke(IPC_CHANNELS.settings.exportJson, payload)
  },
  image: {
    import: payload => invoke(IPC_CHANNELS.image.import, payload),
    delete: payload => invoke(IPC_CHANNELS.image.delete, payload)
  },
  backup: {
    chooseDir: () => invoke(IPC_CHANNELS.backup.chooseDir),
    create: payload => invoke(IPC_CHANNELS.backup.create, payload),
    inspectRestore: payload => invoke(IPC_CHANNELS.backup.inspectRestore, payload),
    restore: payload => invoke(IPC_CHANNELS.backup.restore, payload),
    listExpired: payload => invoke(IPC_CHANNELS.backup.listExpired, payload),
    keepExpired: payload => invoke(IPC_CHANNELS.backup.keepExpired, payload),
    deleteExpired: payload => invoke(IPC_CHANNELS.backup.deleteExpired, payload)
  },
  log: {
    report: payload => invoke(IPC_CHANNELS.log.report, payload),
    setLevel: payload => invoke(IPC_CHANNELS.log.setLevel, payload),
    listRecent: payload => invoke(IPC_CHANNELS.log.listRecent, payload),
    readLog: payload => invoke(IPC_CHANNELS.log.readLog, payload),
    deleteLogs: payload => invoke(IPC_CHANNELS.log.deleteLogs, payload),
    cleanup: payload => invoke(IPC_CHANNELS.log.cleanup, payload),
    exportDiagnostics: payload => invoke(IPC_CHANNELS.log.exportDiagnostics, payload)
  },
  maintenance: {
    checkImageRefs: payload => invoke(IPC_CHANNELS.maintenance.checkImageRefs, payload)
  },
  storage: {
    conversionPreflight: payload => invoke(IPC_CHANNELS.storage.conversionPreflight, payload),
    listArtifacts: payload => invoke(IPC_CHANNELS.storage.listArtifacts, payload),
    deleteArtifacts: payload => invoke(IPC_CHANNELS.storage.deleteArtifacts, payload),
    createSqliteFromJson: payload => invoke(IPC_CHANNELS.storage.createSqliteFromJson, payload),
    exportSqliteToJson: payload => invoke(IPC_CHANNELS.storage.exportSqliteToJson, payload)
  },
  species: {
    referenceQuery: payload => invoke(IPC_CHANNELS.species.referenceQuery, payload),
    suggestTaxonomy: payload => invoke(IPC_CHANNELS.species.suggestTaxonomy, payload),
    imageCompare: payload => invoke(IPC_CHANNELS.species.imageCompare, payload)
  },
  window: {
    toggleFullscreen: () => invoke(IPC_CHANNELS.window.toggleFullscreen),
    openExternal: payload => invoke(IPC_CHANNELS.window.openExternal, payload)
  }
};

contextBridge.exposeInMainWorld('plantApp', plantApp);
