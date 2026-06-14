const { contextBridge, ipcRenderer } = require('electron');

/** @typedef {import('./src/shared/types/ipc').PlantAppApi} PlantAppApi */

const invoke = (channel, payload) => ipcRenderer.invoke(channel, payload);

/** @type {PlantAppApi} */
const plantApp = {
  project: {
    chooseDir: () => invoke('project:chooseDir'),
    chooseMergeDir: () => invoke('project:chooseMergeDir'),
    load: payload => invoke('project:load', payload),
    save: payload => invoke('project:save', payload),
    getModifiedTime: payload => invoke('project:getModifiedTime', payload),
    importCsv: () => invoke('project:importCsv'),
    exportCsv: payload => invoke('project:exportCsv', payload),
    importGeoJson: () => invoke('project:importGeoJson'),
    exportGeoJson: payload => invoke('project:exportGeoJson', payload),
    exportMarkdown: payload => invoke('project:exportMarkdown', payload),
    exportSvg: payload => invoke('project:exportSvg', payload)
  },
  settings: {
    importJson: payload => invoke('settings:importJson', payload),
    exportJson: payload => invoke('settings:exportJson', payload)
  },
  image: {
    import: payload => invoke('image:import', payload),
    delete: payload => invoke('image:delete', payload)
  },
  backup: {
    chooseDir: () => invoke('backup:chooseDir'),
    create: payload => invoke('backup:create', payload),
    inspectRestore: payload => invoke('backup:inspectRestore', payload),
    restore: payload => invoke('backup:restore', payload),
    listExpired: payload => invoke('backup:listExpired', payload),
    keepExpired: payload => invoke('backup:keepExpired', payload),
    deleteExpired: payload => invoke('backup:deleteExpired', payload)
  },
  log: {
    report: payload => invoke('log:renderer', payload),
    setLevel: payload => invoke('log:setLevel', payload),
    listRecent: payload => invoke('log:listRecent', payload),
    readLog: payload => invoke('log:readLog', payload),
    deleteLogs: payload => invoke('log:deleteLogs', payload),
    cleanup: payload => invoke('log:cleanup', payload),
    exportDiagnostics: payload => invoke('log:exportDiagnostics', payload)
  },
  maintenance: {
    checkImageRefs: payload => invoke('maintenance:checkImageRefs', payload)
  },
  storage: {
    conversionPreflight: payload => invoke('storage:conversionPreflight', payload),
    listArtifacts: payload => invoke('storage:listArtifacts', payload),
    deleteArtifacts: payload => invoke('storage:deleteArtifacts', payload),
    createSqliteFromJson: payload => invoke('storage:createSqliteFromJson', payload),
    exportSqliteToJson: payload => invoke('storage:exportSqliteToJson', payload)
  },
  species: {
    referenceQuery: payload => invoke('species:referenceQuery', payload),
    suggestTaxonomy: payload => invoke('species:suggestTaxonomy', payload),
    imageCompare: payload => invoke('species:imageCompare', payload)
  },
  window: {
    toggleFullscreen: () => invoke('window:toggleFullscreen'),
    openExternal: payload => invoke('window:openExternal', payload)
  }
};

contextBridge.exposeInMainWorld('plantApp', plantApp);
