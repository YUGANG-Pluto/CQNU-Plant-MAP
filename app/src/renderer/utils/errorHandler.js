function errorMessage(error) {
  if (!error) return '';
  if (typeof error === 'string') return error;
  return error.message || String(error);
}

function errorCode(error) {
  return error?.code || error?.name || 'ERROR';
}

function reportRendererError(scope, error, details = {}) {
  const payload = {
    level: 'error',
    scope,
    code: errorCode(error),
    message: errorMessage(error),
    details: {
      ...details,
      stack: typeof error?.stack === 'string' ? error.stack.slice(0, 2000) : undefined
    },
    url: window.location.href
  };

  window.platformAdapter?.log?.report(payload).catch(logError => {
    console.error('[logger] renderer report failed', logError);
  });
}

function showErrorDialog(error, options = {}) {
  const translate = typeof t === 'function' ? t : key => key;
  const title = options.title || translate('errorDialogTitle');
  const message = options.message || errorMessage(error) || translate('operationFailed');
  const detail = options.detail || errorCode(error);

  if (!ui.alertModal || !ui.alertTitle || !ui.alertMessage) {
    window.alert(`${title}\n${message}`);
    return;
  }

  ui.alertTitle.textContent = title;
  ui.alertMessage.textContent = message;
  if (ui.alertDetail) {
    ui.alertDetail.textContent = detail || '';
    ui.alertDetail.closest('.alert-panel')?.classList.toggle('has-detail', !!detail);
  }
  openLayerModal(ui.alertModal, { focusTarget: ui.btnAlertClose });
}

function handleUiError(error, scope = 'renderer', options = {}) {
  reportRendererError(scope, error, options.details || {});
  showErrorDialog(error, options);
}

function installGlobalErrorHandlers() {
  window.addEventListener('error', event => {
    handleUiError(event.error || event.message, 'renderer:window-error', {
      title: '界面错误',
      details: { filename: event.filename, lineno: event.lineno, colno: event.colno }
    });
  });

  window.addEventListener('unhandledrejection', event => {
    handleUiError(event.reason, 'renderer:unhandled-rejection', {
      title: '操作失败'
    });
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    errorMessage,
    errorCode
  };
}
