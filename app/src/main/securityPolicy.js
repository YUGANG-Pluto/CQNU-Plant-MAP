const path = require('path');
const { pathToFileURL } = require('url');
const { shell } = require('electron');
const { AppError } = require('./errors');
const { ERROR_CODES } = require('./errorCodes');

const APP_INDEX_URL = pathToFileURL(path.join(__dirname, '..', '..', 'index.html')).toString();
const ALLOWED_EXTERNAL_HOSTS = new Set([
  'gbif.org',
  'www.gbif.org',
  'inaturalist.org',
  'www.inaturalist.org',
  'wikipedia.org'
]);
const ALLOWED_EXTERNAL_HOST_SUFFIXES = ['.wikipedia.org'];

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

function isAllowedExternalHost(value) {
  const hostname = String(value || '').trim().toLowerCase().replace(/\.$/, '');
  return ALLOWED_EXTERNAL_HOSTS.has(hostname) ||
    ALLOWED_EXTERNAL_HOST_SUFFIXES.some(suffix => hostname.endsWith(suffix));
}

function normalizeExternalUrl(value) {
  let parsed;
  try {
    parsed = new URL(String(value || ''));
  } catch (error) {
    throw new AppError(ERROR_CODES.INVALID_EXTERNAL_URL, '外部链接无效。', error);
  }

  if (parsed.protocol !== 'https:' || !isAllowedExternalHost(parsed.hostname)) {
    throw new AppError(ERROR_CODES.INVALID_EXTERNAL_URL, '只允许打开受信任的 HTTPS 物种参考链接。');
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
  isAllowedExternalHost,
  normalizeExternalUrl,
  openExternalUrl
};
