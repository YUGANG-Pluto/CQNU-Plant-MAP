const INATURALIST_API_TOKEN_URL = 'https://www.inaturalist.org/users/api_token';

function safeExternalUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
}

function safePreviewUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return ['http:', 'https:', 'file:'].includes(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
}

function externalLinkHtml(url, label) {
  const safeUrl = safeExternalUrl(url);
  return safeUrl
    ? `<button type="button" class="species-reference-link" data-external-url="${escapeHtml(safeUrl)}" title="${escapeHtml(safeUrl)}">${escapeHtml(label || safeUrl)}</button>`
    : '';
}

async function openReferenceExternalUrl(value) {
  const url = safeExternalUrl(value);
  if (!url) return;
  try {
  await callIpc(window.platformAdapter.window.openExternal({ url }));
  } catch (error) {
    handleUiError(error, 'species-reference:open-external', {
      title: t('operationFailed')
    });
  }
}

function interceptReferenceExternalLink(event) {
  const control = event.target?.closest?.('[data-external-url]');
  if (!control) return false;
  event.preventDefault();
  event.stopPropagation();
  openReferenceExternalUrl(control.dataset.externalUrl || '');
  return true;
}
