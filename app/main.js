const { app } = require('electron');
const { createMainWindow, hasOpenWindow } = require('./src/main/windowManager');
const { registerIpc } = require('./src/main/ipcRegister');
const logger = require('./src/main/logger');

logger.initLogger(app);
registerIpc();

process.on('uncaughtException', error => {
  logger.logError('main:uncaughtException', error);
});

process.on('unhandledRejection', reason => {
  logger.logError('main:unhandledRejection', reason);
});

app.whenReady().then(() => {
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
