const path = require('path');
const { pathToFileURL } = require('url');
const { shell } = require('electron');
const { AppError } = require('./errors');
const { ERROR_CODES } = require('./errorCodes');

const APP_INDEX_URL = pathToFileURL(path.join(__dirname, '..', '..', 'index.html')).toString();

function isTrustedRendererUrl(value) {
  const url = String(value || '');
  return url === APP_INDEX_URL || url.startsWith(`${APP_INDEX_URL}#`);
}

function senderUrl(event) {
  return event?.senderFrame?.url || event?.sender?.getURL?.() || '';
}

function assertTrustedIpcSender(event) {
  if (!isTrustedRendererUrl(senderUrl(event))) {
    throw new AppError(ERROR_CODES.UNTRUSTED_IPC_SENDER, '拒绝来自非应用页面的请求。');
  }
}

function normalizeExternalUrl(value) {
  let parsed;
  try {
    parsed = new URL(String(value || ''));
  } catch (error) {
    throw new AppError(ERROR_CODES.INVALID_EXTERNAL_URL, '外部链接无效。', error);
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new AppError(ERROR_CODES.INVALID_EXTERNAL_URL, '只允许打开 http 或 https 链接。');
  }
  return parsed.toString();
}

async function openExternalUrl(payload = {}) {
  const url = normalizeExternalUrl(payload.url || payload);
  await shell.openExternal(url);
  return { opened: true, url };
}

module.exports = {
  APP_INDEX_URL,
  isTrustedRendererUrl,
  senderUrl,
  assertTrustedIpcSender,
  normalizeExternalUrl,
  openExternalUrl
};
