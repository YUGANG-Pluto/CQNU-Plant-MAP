function renderOverlaySettingsPanel() {
  if (!ui.bmOverlayTarget) return;
  ensureStandardBaseMaps();
  const overlays = getOverlayBaseMaps();
  ui.bmOverlayTarget.innerHTML = '';
  overlays.forEach(overlay => {
    const opt = document.createElement('option');
    opt.value = overlay.id;
    opt.textContent = basemapLabel(overlay);
    ui.bmOverlayTarget.appendChild(opt);
  });
  if (!state.currentOverlayEditId || !overlays.some(item => item.id === state.currentOverlayEditId)) {
    state.currentOverlayEditId = overlays[0]?.id || null;
  }
  ui.bmOverlayTarget.value = state.currentOverlayEditId || '';
  const overlay = overlays.find(item => item.id === state.currentOverlayEditId);
  if (overlay) fillOverlayForm(overlay);
  else newOverlayForm();
  renderOverlayStatusPanel();
}

function fillOverlayForm(overlay) {
  if (!overlay || !ui.bmOverlayTarget) return;
  const normalized = normalizeBaseMapConfig(overlay);
  state.currentOverlayEditId = normalized.id;
  ui.bmOverlayTarget.value = normalized.id;
  ui.bmOverlayNameZh.value = typeof normalized.name === 'string' ? normalized.name : (normalized.name?.zh || '');
  ui.bmOverlayNameEn.value = typeof normalized.name === 'string' ? normalized.name : (normalized.name?.en || '');
  ui.bmOverlayEnabled.value = String(normalized.enabled !== false);
  ui.bmOverlayType.value = normalized.type.toLowerCase();
  ui.bmOverlayProvider.value = normalized.provider || 'Custom';
  if (ui.bmOverlaySourceLabel) ui.bmOverlaySourceLabel.value = normalized.sourceLabel || normalized.provider || '';
  ui.bmOverlayUrl.value = normalized.url;
  ui.bmOverlaySubdomains.value = normalized.subdomains || '';
  ui.bmOverlayCoordSystem.value = normalized.coordSystem || 'GCJ02';
  ui.bmOverlayMaxNativeZoom.value = normalized.maxNativeZoom;
  ui.bmOverlayMaxZoom.value = normalized.maxZoom;
  ui.bmOverlayOpacity.value = normalized.opacity;
  ui.bmOverlayOpacityValue.textContent = `${Math.round(normalized.opacity * 100)}%`;
  ui.bmOverlayZIndex.value = normalized.zIndex || 420;
  ui.bmOverlayAttach.value = normalizeAttachBaseMapIds(normalized.attachToBaseMapIds).join(',');
  ui.bmOverlayToken.value = normalized.token || '';
  if (ui.bmOverlayTermsUrl) ui.bmOverlayTermsUrl.value = normalized.termsUrl || normalized.serviceTermsUrl || '';
  if (ui.bmOverlayReviewNumber) ui.bmOverlayReviewNumber.value = normalized.reviewNumber || normalized.mapReviewNumber || '';
  ui.bmOverlayNotes.value = normalized.notes || '';
}

function newOverlayForm() {
  state.currentOverlayEditId = null;
  if (!ui.bmOverlayTarget) return;
  ui.bmOverlayTarget.value = '';
  ui.bmOverlayNameZh.value = '';
  ui.bmOverlayNameEn.value = '';
  ui.bmOverlayEnabled.value = 'true';
  ui.bmOverlayType.value = 'xyz';
  ui.bmOverlayProvider.value = 'Custom';
  if (ui.bmOverlaySourceLabel) ui.bmOverlaySourceLabel.value = '';
  ui.bmOverlayUrl.value = '';
  ui.bmOverlaySubdomains.value = '';
  ui.bmOverlayCoordSystem.value = 'GCJ02';
  ui.bmOverlayMaxNativeZoom.value = 18;
  ui.bmOverlayMaxZoom.value = 22;
  ui.bmOverlayOpacity.value = 1;
  ui.bmOverlayOpacityValue.textContent = '100%';
  ui.bmOverlayZIndex.value = 420;
  ui.bmOverlayAttach.value = 'amap-satellite';
  ui.bmOverlayToken.value = '';
  if (ui.bmOverlayTermsUrl) ui.bmOverlayTermsUrl.value = '';
  if (ui.bmOverlayReviewNumber) ui.bmOverlayReviewNumber.value = '';
  ui.bmOverlayNotes.value = '';
}

function readOverlayForm() {
  const id = state.currentOverlayEditId || `overlay_${Date.now()}`;
  const existing = state.settings.baseMaps.find(item => item.id === id);
  const sourceLabel = ui.bmOverlaySourceLabel?.value.trim() || '';
  const token = ui.bmOverlayToken.value.trim();
  const termsUrl = ui.bmOverlayTermsUrl?.value.trim() || '';
  const reviewNumber = ui.bmOverlayReviewNumber?.value.trim() || '';
  const inferredAuthorizationRequired = isProviderAuthorizationScoped({
    provider: ui.bmOverlayProvider.value,
    sourceLabel,
    url: ui.bmOverlayUrl.value
  });
  const inferredKeyRequired = hasKeyPlaceholder(ui.bmOverlayUrl.value) || inferredAuthorizationRequired;
  return normalizeBaseMapConfig({
    id,
    name: {
      zh: ui.bmOverlayNameZh.value.trim() || t('basemapOverlayUnnamed'),
      en: ui.bmOverlayNameEn.value.trim() || ui.bmOverlayNameZh.value.trim() || 'Overlay'
    },
    enabled: ui.bmOverlayEnabled.value === 'true',
    type: ui.bmOverlayType.value,
    provider: ui.bmOverlayProvider.value.trim() || 'Custom',
    sourceLabel,
    url: ui.bmOverlayUrl.value.trim(),
    subdomains: ui.bmOverlaySubdomains.value.trim(),
    coordSystem: ui.bmOverlayCoordSystem.value,
    maxNativeZoom: Number(ui.bmOverlayMaxNativeZoom.value || 18),
    maxZoom: Number(ui.bmOverlayMaxZoom.value || 22),
    opacity: Number(ui.bmOverlayOpacity.value || 1),
    zIndex: Number(ui.bmOverlayZIndex.value || 420),
    attachToBaseMapIds: ui.bmOverlayAttach.value.trim(),
    token,
    key: token,
    termsUrl,
    serviceTermsUrl: termsUrl,
    reviewNumber,
    mapReviewNumber: reviewNumber,
    notes: ui.bmOverlayNotes.value.trim(),
    transparent: true,
    isOverlay: true,
    builtIn: existing?.builtIn || false,
    authorizationRequired: Boolean(existing?.authorizationRequired || inferredAuthorizationRequired),
    requiresAuthorization: Boolean(existing?.requiresAuthorization || existing?.authorizationRequired || inferredAuthorizationRequired),
    keyRequired: Boolean(existing?.keyRequired || inferredKeyRequired),
    requiresKey: Boolean(existing?.requiresKey || existing?.keyRequired || inferredKeyRequired),
    authorizationNote: existing?.authorizationNote || ''
  });
}

function validateOverlayConfig(overlay, active = getActiveBaseMapConfig()) {
  const normalized = normalizeBaseMapConfig({ ...overlay, isOverlay: true });
  const checks = validateBaseMapConfig(normalized).filter(item => item.text !== t('autoNormalizeBasemap'));
  checks.push({ level: normalized.isOverlay ? 'ok' : 'error', text: t('basemapOverlayCheckSeparated'), detail: normalized.isOverlay ? t('basemapOverlaySeparated') : t('basemapOverlayMixed') });
  checks.push({ level: normalized.transparent ? 'ok' : 'warning', text: t('basemapOverlayCheckTransparent'), detail: normalized.transparent ? t('enabled') : t('disabled') });
  checks.push({ level: normalized.opacity >= 0 && normalized.opacity <= 1 ? 'ok' : 'error', text: t('basemapOverlayOpacity'), detail: `${Math.round(normalized.opacity * 100)}%` });
  const attached = normalizeAttachBaseMapIds(normalized.attachToBaseMapIds);
  checks.push({ level: attached.length ? 'ok' : 'warning', text: t('basemapOverlayAttach'), detail: attached.join(', ') || t('basemapOverlayAttachAny') });
  if (active) {
    const current = normalizeBaseMapConfig(active);
    const attachedOk = !attached.length || attached.includes(current.id);
    checks.push({ level: attachedOk ? 'ok' : 'warning', text: t('basemapOverlayAttachCurrent'), detail: attachedOk ? basemapLabel(current) : t('basemapOverlayNotRecommended') });
    checks.push({ level: normalized.coordSystem === current.coordSystem ? 'ok' : 'warning', text: t('basemapOverlayCoordMatch'), detail: `${normalized.coordSystem} / ${current.coordSystem}` });
  }
  if (hasKeyPlaceholder(normalized.url)) {
    checks.push({ level: normalized.token || normalized.key ? 'ok' : 'warning', text: t('basemapOverlayToken'), detail: normalized.token || normalized.key ? t('configured') : t('notFilled') });
  }
  return checks;
}

function renderOverlayStatusPanel() {
  if (!ui.basemapOverlayStatusPanel) return;
  const active = getActiveBaseMapConfig();
  const overlay = getOverlayBaseMaps().find(item => item.id === state.currentOverlayEditId);
  if (!overlay) {
    ui.basemapOverlayStatusPanel.innerHTML = `<div class="hint-box">${escapeHtml(t('basemapOverlayEmpty'))}</div>`;
    return;
  }
  const tile = basemapTileStatus(overlay);
  const checks = validateOverlayConfig(overlay, active);
  ui.basemapOverlayStatusPanel.innerHTML = `
    <div class="basemap-overlay-status-head">
      <span>${renderStatusIcon(overlay.enabled ? 'enabled' : 'disabled')}${escapeHtml(overlay.enabled ? t('enabled') : t('disabled'))}</span>
      <span>${renderStatusIcon(tile.level)}${escapeHtml(tile.localUpscale ? t('basemapStatusClientUpscale') : t('basemapStatusNativeTiles'))}</span>
    </div>
    <div class="basemap-check-list">
      ${checks.map(item => `<div class="basemap-check-row status-${normalizeStatusLevel(item.level)}"><span>${renderStatusIcon(item.level)}${escapeHtml(item.text)}</span><strong title="${escapeHtml(item.detail || '')}">${escapeHtml(item.detail || '')}</strong></div>`).join('')}
    </div>
  `;
}

async function saveOverlayConfig() {
  if (typeof guardMaintenanceReadOnlyAction === 'function' && guardMaintenanceReadOnlyAction('save-overlay')) return;
  if (!state.settings) return;
  const overlay = readOverlayForm();
  if (!overlay.url) return showAlert(t('basemapOverlayUrlRequired'));
  const invalidZoom = overlay.maxZoom < overlay.maxNativeZoom || overlay.maxZoom > 24 || overlay.maxNativeZoom < 0;
  if (invalidZoom) return showAlert(t('basemapZoomInvalid'));
  const existing = state.settings.baseMaps.find(item => item.id === overlay.id);
  if (existing) Object.assign(existing, overlay);
  else state.settings.baseMaps.push(overlay);
  state.currentOverlayEditId = overlay.id;
  renderOverlaySettingsPanel();
  applyActiveBaseMap();
  detectBasemapStatus();
  await persistProject();
  toast(t('basemapOverlaySaved'));
}

function testOverlayConfig() {
  const overlay = readOverlayForm();
  state.currentOverlayEditId = overlay.id;
  const checks = validateOverlayConfig(overlay, getActiveBaseMapConfig());
  if (ui.basemapOverlayStatusPanel) {
    ui.basemapOverlayStatusPanel.innerHTML = `
      <div class="basemap-report-head"><span>${renderStatusIcon(checks.some(item => normalizeStatusLevel(item.level) === 'error') ? 'error' : checks.some(item => normalizeStatusLevel(item.level) === 'warning') ? 'warning' : 'ok')}${escapeHtml(t('basemapOverlayStaticCheck'))}</span></div>
      <div class="basemap-check-list">
        ${checks.map(item => `<div class="basemap-check-row status-${normalizeStatusLevel(item.level)}"><span>${renderStatusIcon(item.level)}${escapeHtml(item.text)}</span><strong title="${escapeHtml(item.detail || '')}">${escapeHtml(item.detail || '')}</strong></div>`).join('')}
      </div>`;
  }
}

async function resetBuiltinOverlays() {
  if (typeof guardMaintenanceReadOnlyAction === 'function' && guardMaintenanceReadOnlyAction('reset-overlays')) return;
  if (!state.settings) return;
  const byId = new Map((state.settings.baseMaps || []).filter(item => !BUILTIN_OVERLAY_IDS.includes(item.id)).map(item => [item.id, item]));
  BUILTIN_BASEMAPS.filter(item => item.isOverlay).forEach(item => byId.set(item.id, normalizeBaseMapConfig(item)));
  state.settings.baseMaps = [...byId.values()];
  state.currentOverlayEditId = DEFAULT_OVERLAY_ID;
  renderOverlaySettingsPanel();
  applyActiveBaseMap();
  detectBasemapStatus();
  await persistProject();
  toast(t('basemapOverlayDefaultRestored'));
}
