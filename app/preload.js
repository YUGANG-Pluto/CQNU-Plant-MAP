const { contextBridge, ipcRenderer } = require('electron');

// Expose only the minimal secure bridge APIs needed by the renderer.
contextBridge.exposeInMainWorld('plantApp', {
  chooseProjectDir: () => ipcRenderer.invoke('dialog:chooseProjectDir'),
  chooseDirectory: (payload) => ipcRenderer.invoke('dialog:chooseDirectory', payload),
  loadProject: (projectDir) => ipcRenderer.invoke('project:load', projectDir),
  saveProject: (payload) => ipcRenderer.invoke('project:save', payload),
  getProjectModifiedTime: (payload) => ipcRenderer.invoke('project:getModifiedTime', payload),
  chooseImage: () => ipcRenderer.invoke('dialog:chooseImage'),
  importImage: (payload) => ipcRenderer.invoke('image:import', payload),
  deleteImage: (payload) => ipcRenderer.invoke('image:delete', payload),
  saveFileDialog: (payload) => ipcRenderer.invoke('dialog:saveFile', payload),
  openDataFile: (payload) => ipcRenderer.invoke('dialog:openDataFile', payload),
  writeTextFile: (payload) => ipcRenderer.invoke('file:writeText', payload),
  readTextFile: (payload) => ipcRenderer.invoke('file:readText', payload),
  joinPath: (payload) => ipcRenderer.invoke('path:join', payload),
  getSiblingBackupDir: (payload) => ipcRenderer.invoke('backup:getSiblingDir', payload),
  createZipBackup: (payload) => ipcRenderer.invoke('backup:createZip', payload),
  listExpiredBackups: (payload) => ipcRenderer.invoke('backup:listExpired', payload),
  touchBackupFiles: (payload) => ipcRenderer.invoke('backup:touchFiles', payload),
  deleteBackupFiles: (payload) => ipcRenderer.invoke('backup:deleteFiles', payload)
});