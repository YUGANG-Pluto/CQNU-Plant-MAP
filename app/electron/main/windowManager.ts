import path from 'node:path';
import { BrowserWindow } from 'electron';

const securityPolicy = require('../../src/main/securityPolicy') as {
  APP_INDEX_URL: string;
};

export interface MainWindowOptions {
  show?: boolean;
}

function installSessionPermissionPolicy(window: BrowserWindow): void {
  const appSession = window.webContents.session;
  appSession.setPermissionCheckHandler(() => false);
  appSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });
}

export function createMainWindow(options: MainWindowOptions = {}): BrowserWindow {
  const show = options.show !== false;
  const appRoot = path.resolve(__dirname, '..', '..');
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1120,
    minHeight: 720,
    show,
    skipTaskbar: !show,
    icon: path.join(appRoot, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(appRoot, 'main-dist', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
      backgroundThrottling: show
    }
  });

  installSessionPermissionPolicy(window);
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, targetUrl) => {
    const { APP_INDEX_URL } = securityPolicy;
    if (targetUrl !== APP_INDEX_URL && !targetUrl.startsWith(`${APP_INDEX_URL}#`)) {
      event.preventDefault();
    }
  });

  void window.loadFile(path.join(appRoot, 'index.html'));
  return window;
}

export function hasOpenWindow(): boolean {
  return BrowserWindow.getAllWindows().length > 0;
}
