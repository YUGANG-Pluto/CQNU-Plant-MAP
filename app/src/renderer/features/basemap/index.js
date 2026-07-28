function basemapTileStatus(bm) {
  const zoom = state.map?.getZoom?.() ?? 0;
  if (!bm) return { level: 'error', text: t('basemapStatusNoLayer') };
  if (!Number.isFinite(bm.maxNativeZoom)) return { level: 'warning', text: t('basemapStatusNeedNativeZoom') };
  if (zoom > bm.maxZoom) return { level: 'error', text: t('basemapStatusZoomExceeded') };
  if (zoom > bm.maxNativeZoom) {
    return {
      level: 'ok',
      text: t('basemapStatusClientUpscale'),
      localUpscale: true,
      detail: `${t('basemapStatusNativeZoom')}: z=${bm.maxNativeZoom}`
    };
  }
  return { level: 'ok', text: t('basemapStatusOk'), localUpscale: false };
}

function validateBaseMapConfig(bm) {
  const normalized = normalizeBaseMapConfig(bm);
  const checks = [];
  const authorizationScoped = isProviderAuthorizationScoped(normalized);
  const authorizationRequired = normalized.authorizationRequired || normalized.requiresAuthorization || authorizationScoped;
  const keyRequired = normalized.keyRequired || normalized.requiresKey || authorizationScoped || hasKeyPlaceholder(normalized.url);
  const keyConfigured = Boolean(normalized.token || normalized.key);
  const keyTemplatePresent = hasKeyPlaceholder(normalized.url);
  checks.push({ level: normalized.coordSystem ? 'ok' : 'error', text: t('basemapCheckCoordSystem'), detail: normalized.coordSystem || t('notFilled') });
  checks.push({ level: TILE_LAYER_TYPES.includes(normalized.type) ? 'ok' : 'error', text: t('basemapCheckType'), detail: normalized.type });
  checks.push({ level: normalized.sourceLabel || normalized.provider ? 'ok' : 'warning', text: t('basemapSourceLabel'), detail: normalized.sourceLabel || normalized.provider || t('notFilled') });
  checks.push({
    level: authorizationRequired ? 'pending' : 'ok',
    text: t('basemapAuthorization'),
    detail: authorizationRequired ? t('basemapAuthorizationHint') : t('basemapAuthorizationNotRequired')
  });
  checks.push({
    level: keyRequired ? (keyTemplatePresent ? 'ok' : 'warning') : 'pending',
    text: t('basemapKeyTemplate'),
    detail: keyTemplatePresent ? '{key}/{token}' : (keyRequired ? t('basemapKeyTemplateMissing') : t('basemapAuthorizationNotRequired'))
  });
  checks.push({
    level: keyRequired ? (keyConfigured ? 'ok' : 'warning') : 'pending',
    text: t('basemapKeyStatus'),
    detail: keyRequired ? (keyConfigured ? t('configured') : t('basemapKeyRequired')) : t('basemapAuthorizationNotRequired')
  });
  checks.push({
    level: authorizationRequired ? (normalized.termsUrl || normalized.serviceTermsUrl ? 'ok' : 'warning') : 'pending',
    text: t('basemapTermsUrl'),
    detail: normalized.termsUrl || normalized.serviceTermsUrl || (authorizationRequired ? t('notFilled') : t('basemapAuthorizationNotRequired'))
  });
  checks.push({
    level: authorizationRequired ? (normalized.reviewNumber || normalized.mapReviewNumber ? 'ok' : 'warning') : 'pending',
    text: t('basemapReviewNumber'),
    detail: normalized.reviewNumber || normalized.mapReviewNumber || (authorizationRequired ? t('basemapReviewNumberRequired') : t('basemapAuthorizationNotRequired'))
  });
  checks.push({ level: Number.isFinite(normalized.maxNativeZoom) ? 'ok' : 'warning', text: t('basemapCheckNativeZoom'), detail: Number.isFinite(normalized.maxNativeZoom) ? `z=${normalized.maxNativeZoom}` : t('notFilled') });
  checks.push({ level: normalized.maxZoom >= normalized.maxNativeZoom && normalized.maxZoom <= 24 ? 'ok' : 'error', text: t('basemapCheckZoom'), detail: `${normalized.maxNativeZoom} / ${normalized.maxZoom}` });
  checks.push({ level: normalized.maxZoom > normalized.maxNativeZoom ? 'ok' : 'pending', text: t('basemapCheckLocalUpscale'), detail: normalized.maxZoom > normalized.maxNativeZoom ? t('basemapLocalUpscaleReady') : t('basemapLocalUpscaleNotNeeded') });
  const hasTiles = normalized.type === 'WMS' || (/\{x\}/.test(normalized.url) && /\{y\}/.test(normalized.url) && /\{z\}/.test(normalized.url));
  checks.push({ level: hasTiles ? 'ok' : 'error', text: t('basemapCheckUrl'), detail: hasTiles ? t('basemapStatusOk') : t('basemapCheckUrlMissing') });
  if (normalized.type === 'WMS') checks.push({ level: normalized.layerName || normalized.layers ? 'ok' : 'error', text: t('basemapCheckWmsLayers'), detail: normalized.layerName || normalized.layers || t('notFilled') });
  checks.push({ level: isAutoNormalizeBasemapEnabled() ? 'enabled' : 'disabled', text: t('autoNormalizeBasemap'), detail: isAutoNormalizeBasemapEnabled() ? t('enabled') : t('disabled') });
  return checks;
}

function detectBasemapStatus() {
  const activeRaw = getActiveBaseMapConfig();
  const active = activeRaw ? normalizeBaseMapConfig(activeRaw) : null;
  const checks = active ? validateBaseMapConfig(activeRaw) : [];
  const overlays = getOverlayBaseMaps();
  const enabledOverlays = overlays.filter(item => item.enabled !== false);
  checks.push({ level: overlays.length ? 'ok' : 'warning', text: t('basemapOverlayConfiguredCount'), detail: String(overlays.length) });
  enabledOverlays.forEach(overlay => {
    const tile = basemapTileStatus(overlay);
    checks.push({ level: tile.level, text: `${t('basemapOverlayLayer')}: ${basemapLabel(overlay)}`, detail: tile.localUpscale ? t('basemapStatusClientUpscale') : t('basemapStatusNativeTiles') });
    validateOverlayConfig(overlay, active).forEach(item => checks.push(item));
  });
  const overlayMismatch = enabledOverlays.filter(item => active && item.coordSystem !== active.coordSystem);
  if (overlayMismatch.length) {
    checks.push({ level: 'warning', text: t('basemapOverlayMismatch'), detail: String(overlayMismatch.length) });
  }
  const layerDiag = typeof getBusinessLayerDiagnostics === 'function' ? getBusinessLayerDiagnostics() : null;
  if (layerDiag) {
    checks.push({ level: layerDiag.duplicateCount ? 'warning' : 'ok', text: t('businessLayerStatus'), detail: layerDiag.duplicateCount ? t('businessLayerDuplicateFound') : t('businessLayerSingleInstance') });
    checks.push({ level: 'ok', text: t('businessLayerDisplayCoord'), detail: layerDiag.coordSystem });
    checks.push({ level: 'ok', text: t('businessLayerStorageCoord'), detail: layerDiag.storageCoordSystem });
    checks.push({ level: 'ok', text: t('businessLayerZoneCount'), detail: String(layerDiag.zoneCount) });
    checks.push({ level: 'ok', text: t('businessLayerPointCount'), detail: String(layerDiag.pointCount) });
    checks.push({ level: 'ok', text: t('businessLayerRenderToken'), detail: `#${layerDiag.token} · ${layerDiag.reason}` });
  }
  const hasError = checks.some(item => normalizeStatusLevel(item.level) === 'error');
  const hasWarning = checks.some(item => normalizeStatusLevel(item.level) === 'warning');
  state.lastBasemapCheck = {
    status: !active ? 'error' : hasError ? 'error' : hasWarning ? 'warning' : 'ok',
    checks,
    checkedAt: new Date().toLocaleString('zh-CN', { hour12: false })
  };
  updateBasemapWorkStatus();
  renderOverlayStatusPanel();
  return state.lastBasemapCheck;
}

function renderStatusIcon(level) {
  const normalized = normalizeStatusLevel(level);
  return `<span class="status-icon status-${normalized}" aria-hidden="true">${getStatusIcon(level)}</span>`;
}

function renderBasemapDetailPanel(active, tile, overlays, mismatchCount, check) {
  if (!ui.basemapDetailPanel) return;
  const checks = check?.checks?.length ? check.checks : validateBaseMapConfig(active);
  const checkHtml = checks.map(item => {
    const level = normalizeStatusLevel(item.level);
    return `<div class="basemap-check-row status-${level}">
      <span>${renderStatusIcon(item.level)}${escapeHtml(item.text)}</span>
      <strong>${escapeHtml(item.detail || '')}</strong>
    </div>`;
  }).join('');
  ui.basemapDetailPanel.innerHTML = `
    <div class="basemap-detail-summary">
      <span>${renderStatusIcon(tile.level)}${escapeHtml(tile.text)}${tile.detail ? ` · ${escapeHtml(tile.detail)}` : ''}</span>
      <span>${renderStatusIcon(mismatchCount ? 'warning' : 'ok')}${escapeHtml(t('basemapStatusOverlays'))}: ${overlays.length}</span>
      <span>${renderStatusIcon(isAutoNormalizeBasemapEnabled() ? 'enabled' : 'disabled')}${escapeHtml(t('autoNormalizeBasemap'))}</span>
    </div>
    <div class="basemap-check-list">${checkHtml}</div>
  `;
}

function renderBasemapReport() {
  if (!ui.basemapReportPanel) return;
  const check = state.lastBasemapCheck || detectBasemapStatus();
  if (!check?.checks?.length) {
    ui.basemapReportPanel.innerHTML = `<div class="hint-box">${escapeHtml(t('basemapReportEmpty'))}</div>`;
    return;
  }
  const groups = ['error', 'warning', 'ok', 'pending', 'unknown'].map(level => {
    const items = check.checks.filter(item => normalizeStatusLevel(item.level) === level);
    if (!items.length) return '';
    const rows = items.map(item => `
      <div class="basemap-check-row status-${level}">
        <span>${renderStatusIcon(item.level)}${escapeHtml(item.text)}</span>
        <strong title="${escapeHtml(item.detail || '')}">${escapeHtml(item.detail || '')}</strong>
      </div>
    `).join('');
    return `<details class="basemap-report-group" open><summary>${renderStatusIcon(level)}${escapeHtml(t('basemapCheck' + level))} · ${items.length}</summary><div class="basemap-check-list">${rows}</div></details>`;
  }).join('');
  ui.basemapReportPanel.innerHTML = `
    <div class="basemap-report-head">
      <span>${renderStatusIcon(check.status)}${escapeHtml(t('basemapDetectDone'))}</span>
      <strong>${escapeHtml(check.checkedAt || '')}</strong>
    </div>
    ${groups}
  `;
}

function updateBasemapWorkStatus() {
  const activeRaw = getActiveBaseMapConfig();
  if (!activeRaw) return;
  const active = normalizeBaseMapConfig(activeRaw);
  const tile = basemapTileStatus(active);
  const overlays = getCompatibleOverlayBaseMaps(active);
  const allEnabledOverlays = getOverlayBaseMaps().filter(item => item.enabled !== false);
  const mismatchCount = allEnabledOverlays.filter(item => item.coordSystem !== active.coordSystem).length;
  const check = state.lastBasemapCheck;
  const checkLevel = check ? check.status : 'pending';
  const layerDiag = typeof getBusinessLayerDiagnostics === 'function' ? getBusinessLayerDiagnostics() : null;
  const activeKeyRequired = active.keyRequired || active.requiresKey || hasKeyPlaceholder(active.url) || isProviderAuthorizationScoped(active);
  const activeKeyConfigured = Boolean(active.key || active.token);
  const compactItems = [
    { key: t('basemapStatusName'), value: basemapLabel(active), level: 'ok' },
    { key: t('basemapSourceLabel'), value: active.sourceLabel || active.provider || '—', level: active.sourceLabel || active.provider ? 'ok' : 'warning' },
    { key: t('basemapKeyStatus'), value: activeKeyRequired ? (activeKeyConfigured ? t('configured') : t('notFilled')) : t('basemapAuthorizationNotRequired'), level: activeKeyRequired ? (activeKeyConfigured ? 'ok' : 'warning') : 'pending' },
    { key: t('basemapStatusCoord'), value: active.coordSystem, level: active.coordSystem === 'WGS84' ? 'ok' : 'warning' },
    { key: t('basemapStatusZoom'), value: `${state.map?.getZoom?.() ?? '—'} / ${active.maxNativeZoom}/${active.maxZoom}`, level: tile.level },
    { key: t('basemapStatusDisplayMode'), value: tile.localUpscale ? t('basemapStatusClientUpscale') : t('basemapStatusNativeTiles'), level: tile.level },
    { key: t('businessLayerStatus'), value: layerDiag ? (layerDiag.duplicateCount ? t('businessLayerDuplicateFound') : t('businessLayerSingleInstance')) : '—', level: layerDiag?.duplicateCount ? 'warning' : 'ok' },
    { key: t('businessLayerDisplayCoord'), value: layerDiag?.coordSystem || active.coordSystem, level: 'ok' }
  ];
  if (ui.basemapStatusPanel) {
    ui.basemapStatusPanel.innerHTML = compactItems.map(item => `
      <div class="basemap-status-row status-${normalizeStatusLevel(item.level)}">
        <span>${renderStatusIcon(item.level)}${escapeHtml(item.key)}</span><strong title="${escapeHtml(item.value)}">${escapeHtml(item.value)}</strong>
      </div>
    `).join('');
  }
  const summary = `${basemapLabel(active)} / ${active.coordSystem} / z=${state.map?.getZoom?.() ?? '—'}/${active.maxNativeZoom}/${active.maxZoom} / ${mismatchCount ? t('basemapMismatch') : tile.text}`;
  if (ui.basemapQuickSummary) {
    ui.basemapQuickSummary.innerHTML = `${escapeHtml(basemapLabel(active))} / ${escapeHtml(active.coordSystem)} / z=${state.map?.getZoom?.() ?? '—'}/${active.maxNativeZoom}/${active.maxZoom} / ${renderStatusIcon(mismatchCount ? 'warning' : tile.level)}${escapeHtml(mismatchCount ? t('basemapMismatch') : tile.text)}`;
    ui.basemapQuickSummary.title = summary;
  }
  if (ui.basemapModalSummary) {
    ui.basemapModalSummary.innerHTML = `${renderStatusIcon(mismatchCount ? 'warning' : tile.level)}${escapeHtml(summary)}`;
    ui.basemapModalSummary.title = summary;
  }
  if (ui.basemapCoordRuleCurrent) {
    ui.basemapCoordRuleCurrent.textContent = `${active.coordSystem} → WGS84`;
  }
  if (ui.basemapStatusBadge) {
    const badgeLevel = normalizeStatusLevel(checkLevel === 'pending' ? tile.level : checkLevel);
    ui.basemapStatusBadge.className = `status-badge status-${badgeLevel}`;
    ui.basemapStatusBadge.textContent = getStatusIcon(badgeLevel);
  }
  updateAutoNormalizeSwitch();
  renderBasemapDetailPanel(active, tile, overlays, mismatchCount, check);
  renderBasemapReport();
}


function standardizeCurrentBasemapConfig(options = {}) {
  ensureStandardBaseMaps();
  state.settings.baseMaps = state.settings.baseMaps.map(normalizeBaseMapConfig);
  renderBasemapEditTargetSelect();
  renderBaseMapSelect();
  detectBasemapStatus();
  if (!options.silent) toast(t('basemapStandardized'));
}


async function runBasemapStatusCheck() {
  const progressId = createProgressTask({ type: 'basemap', title: t('basemapDetectTitle'), stage: t('progressPreparing'), total: 4 });
  updateProgressTask(progressId, { completed: 1, total: 4, stage: t('basemapDetectConfigStage') });
  await yieldToUi();
  updateProgressTask(progressId, { completed: 2, total: 4, stage: t('basemapDetectZoomStage') });
  await yieldToUi();
  detectBasemapStatus();
  updateProgressTask(progressId, { completed: 3, total: 4, stage: t('basemapDetectReportStage') });
  await yieldToUi();
  finishProgressTask(progressId, t('basemapDetectDone'));
}

async function runBasemapStandardize() {
  if (typeof guardMaintenanceReadOnlyAction === 'function' && guardMaintenanceReadOnlyAction('standardize-basemap')) return;
  const ok = await openConfirmDialog({
    title: t('basemapStandardizeTitle'),
    message: t('basemapStandardizeConfirm'),
    acceptLabel: t('confirmAction')
  });
  if (!ok) return;
  const total = Math.max(1, state.settings.baseMaps.length + 2);
  const progressId = createProgressTask({ type: 'basemap', title: t('basemapStandardizeTitle'), total });
  updateProgressTask(progressId, { completed: 1, total, stage: t('basemapStandardizeRunning') });
  state.settings.baseMaps = state.settings.baseMaps.map((item, index) => {
    updateProgressTask(progressId, { completed: Math.min(total - 1, index + 1), total, stage: t('basemapStandardizeRunning') });
    return normalizeBaseMapConfig(item);
  });
  renderBasemapEditTargetSelect();
  renderBaseMapSelect();
  detectBasemapStatus();
  await persistProject();
  updateProgressTask(progressId, { completed: total, total, stage: t('basemapStandardizeDone') });
  finishProgressTask(progressId, t('basemapStandardizeDone'));
}

async function correctSelectedGeometry(fromSystem) {
  if (typeof guardMaintenanceReadOnlyAction === 'function' && guardMaintenanceReadOnlyAction('correct-geometry')) return;
  const source = normalizeCoordSystem(fromSystem);
  if (source === 'WGS84') return showAlert(t('basemapCorrectionNoop'));
  const target = getSelectedPoint() || getSelectedZone();
  if (!target) return showAlert(t('basemapCorrectionNeedSelection'));
  const ok = await openConfirmDialog({
    title: t('basemapCorrectionTitle'),
    message: t('basemapCorrectionConfirm'),
    acceptLabel: t('confirmAction')
  });
  if (!ok) return;

  const snapshot = JSON.parse(JSON.stringify({ points: state.points, zones: state.zones }));
  const vertices = target.geometry?.coordinates?.[0] || [];
  const total = target.pointId !== undefined ? 1 : Math.max(1, vertices.length);
  const progressId = createProgressTask({ type: 'migration', title: t('basemapCorrectionTitle'), total });
  updateProgressTask(progressId, { completed: 0, total, stage: t('basemapCorrectionRunning') });

  if (target.pointId !== undefined) {
    const [lng, lat] = convertLngLat(target.lng, target.lat, source, 'WGS84');
    target.lng = lng;
    target.lat = lat;
    updateProgressTask(progressId, { completed: 1, total, stage: t('basemapCorrectionRunning') });
  } else if (target.geometry?.coordinates?.[0]) {
    target.geometry.coordinates[0] = vertices.map(([lng, lat], index) => {
      const next = convertLngLat(lng, lat, source, 'WGS84');
      updateProgressTask(progressId, { completed: index + 1, total, stage: t('basemapCorrectionRunning') });
      return next;
    });
  }

  state.lastCoordinateCorrection = snapshot;
  rerenderSpatialLayers('coordinate-correction');
  await persistProject();
  renderAllDerived();
  finishProgressTask(progressId, t('basemapCorrectionDone'));
}

async function undoLastCoordinateCorrection() {
  if (typeof guardMaintenanceReadOnlyAction === 'function' && guardMaintenanceReadOnlyAction('undo-coordinate-correction')) return;
  if (!state.lastCoordinateCorrection) return showAlert(t('basemapCorrectionNoUndo'));
  state.points = state.lastCoordinateCorrection.points.map(normalizePointRecord);
  state.zones = state.lastCoordinateCorrection.zones.map(normalizeZoneRecord);
  state.lastCoordinateCorrection = null;
  rerenderSpatialLayers('coordinate-correction-undo');
  await persistProject();
  renderAllDerived();
  toast(t('basemapCorrectionUndone'));
}
