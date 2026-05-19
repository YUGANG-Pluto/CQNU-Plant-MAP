const path = require('path');
const { BrowserWindow } = require('electron');
const { APP_INDEX_URL } = require('./securityPolicy');

function createMainWindow() {
  const iconPath = path.join(__dirname, '..', '..', 'build', 'icon.png');
  const indexPath = path.join(__dirname, '..', '..', 'index.html');
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1120,
    minHeight: 720,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, '..', '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false
    }
  });

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, targetUrl) => {
    if (targetUrl !== APP_INDEX_URL && !targetUrl.startsWith(`${APP_INDEX_URL}#`)) {
      event.preventDefault();
    }
  });

  win.loadFile(indexPath);
  return win;
}

function hasOpenWindow() {
  return BrowserWindow.getAllWindows().length > 0;
}

module.exports = {
  createMainWindow,
  hasOpenWindow
};
