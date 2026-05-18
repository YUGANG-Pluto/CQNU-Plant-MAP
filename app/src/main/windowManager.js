const path = require('path');
const { pathToFileURL } = require('url');
const { BrowserWindow } = require('electron');

function createMainWindow() {
  const iconPath = path.join(__dirname, '..', '..', 'build', 'icon.png');
  const indexPath = path.join(__dirname, '..', '..', 'index.html');
  const indexUrl = pathToFileURL(indexPath).toString();
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
      sandbox: true
    }
  });

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, targetUrl) => {
    if (targetUrl !== indexUrl && !targetUrl.startsWith(`${indexUrl}#`)) {
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
