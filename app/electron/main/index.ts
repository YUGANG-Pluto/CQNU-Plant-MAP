import { app } from 'electron';
import { registerIpc } from './ipc/register';
import { createMainWindow, hasOpenWindow } from './windowManager';

const logger = require('../../src/main/logger') as {
  initLogger: (electronApp: typeof app) => void;
  logError: (scope: string, error: unknown) => void;
};

let started = false;

function installProcessErrorHandlers(): void {
  process.on('uncaughtException', error => {
    logger.logError('main:uncaughtException', error);
  });

  process.on('unhandledRejection', reason => {
    logger.logError('main:unhandledRejection', reason);
  });
}

export function startApplication(): void {
  if (started) return;
  started = true;

  logger.initLogger(app);
  registerIpc();
  installProcessErrorHandlers();

  void app.whenReady().then(() => {
    createMainWindow();
    app.on('activate', () => {
      if (!hasOpenWindow()) {
        createMainWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}

startApplication();
