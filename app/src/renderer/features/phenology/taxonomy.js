let taxonomySuggestionCache = null;
let taxonomyCandidatesVisible = false;

function taxonomyLocale() {
  return (state.settings?.language || 'zh') === 'zh' ? 'zh-CN' : 'en';
}

function taxonomyNow() {
  return new Date().toISOString();
}

function taxonomyStatusLabel(value) {
  const labels = {
    unverified: t('taxonomyStatusUnverified'),
    suggested: t('taxonomyStatusSuggested'),
    manuallyVerified: t('taxonomyStatusManuallyVerified'),
    doubtful: t('taxonomyStatusDoubtful'),
    rejected: t('taxonomyStatusRejected')
  };
  return labels[value] || labels.unverified;
}

function taxonomySourceLabel(value) {
  const labels = {
    unknown: t('taxonomySourceUnknown'),
    manual: t('taxonomySourceManual'),
    iNaturalist: t('taxonomySourceINaturalist'),
    GBIF: t('taxonomySourceGBIF'),
    'iNaturalist+GBIF': t('taxonomySourceBoth')
  };
  return labels[value] || value || labels.unknown;
}

function setTaxonomyBusy(busy) {
  [
    ui.btnSuggestTaxonomy,
    ui.btnRefreshTaxonomy,
    ui.btnApplyTaxonomySuggestion,
    ui.btnToggleTaxonomyCandidates
  ].forEach(node => { if (node) node.disabled = !!busy; });
  if (ui.btnSuggestTaxonomy) {
    ui.btnSuggestTaxonomy.textContent = busy ? t('taxonomySuggestionRunning') : t('taxonomySuggest');
  }
  if (ui.btnRefreshTaxonomy) {
    ui.btnRefreshTaxonomy.textContent = busy ? t('taxonomySuggestionRunning') : t('taxonomyRefresh');
  }
}

function compactTaxonomyCandidates(candidates = []) {
  const compact = window.rendererDomain?.taxonomy?.compactCandidates;
  if (typeof compact === 'function') return compact(candidates, 5);
  return (Array.isArray(candidates) ? candidates : []).slice(0, 5).map(item => ({
    provider: item.provider || '',
    matchedName: item.matchedName || '',
    scientificName: item.scientificName || '',
    canonicalName: item.canonicalName || '',
    family: item.family || '',
    genus: item.genus || '',
    rank: item.rank || '',
    score: Number.isFinite(Number(item.score)) ? Number(item.score) : null,
    matchType: item.matchType || '',
    occurrenceWeight: Number.isFinite(Number(item.occurrenceWeight)) ? Number(item.occurrenceWeight) : 1
  }));
}

function taxonomyPatchFromResult(result = {}, candidate = null) {
  const buildPatch = window.rendererDomain?.taxonomy?.buildPatch;
  if (typeof buildPatch === 'function') {
    return buildPatch(result, candidate, taxonomyNow());
  }
  const selected = candidate || {};
  return {
    family: selected.family || result.suggestedFamily || '',
    genus: selected.genus || result.suggestedGenus || '',
    taxonomySource: selected.provider || result.source || 'unknown',
    taxonomyMatchedName: selected.matchedName || selected.scientificName || result.matchedName || '',
    taxonomyConfidence: Number.isFinite(Number(result.confidence)) ? Number(result.confidence) : null,
    taxonomyConfidenceLabel: result.confidenceLabel || 'unknown',
    taxonomyVerificationStatus: 'suggested',
    identificationStatus: 'needReview',
    taxonomyUpdatedAt: taxonomyNow(),
    taxonomyCandidatesSummary: compactTaxonomyCandidates(result.candidates || (candidate ? [candidate] : []))
  };
}

function applyTaxonomyFieldsToPoint(point, patch = {}, options = {}) {
  if (!point) return { applied: false, blocked: true };
  const overwrite = !!options.overwrite;
  const hasExistingFamily = !!String(point.family || '').trim();
  const hasExistingGenus = !!String(point.genus || '').trim();
  const manuallyVerified = point.taxonomyVerificationStatus === 'manuallyVerified';
  const shouldBlock = !overwrite && manuallyVerified && (hasExistingFamily || hasExistingGenus);
  if (shouldBlock) return { applied: false, blocked: true };

  const canWriteFamily = overwrite || !hasExistingFamily;
  const canWriteGenus = overwrite || !hasExistingGenus;
  if (patch.family && canWriteFamily) point.family = patch.family;
  if (patch.genus && canWriteGenus) point.genus = patch.genus;
  point.taxonomySource = patch.taxonomySource || point.taxonomySource || 'unknown';
  point.taxonomyMatchedName = patch.taxonomyMatchedName || point.taxonomyMatchedName || '';
  point.taxonomyConfidence = Number.isFinite(Number(patch.taxonomyConfidence))
    ? Number(patch.taxonomyConfidence)
    : null;
  point.taxonomyConfidenceLabel = patch.taxonomyConfidenceLabel || point.taxonomyConfidenceLabel || 'unknown';
  point.taxonomyVerificationStatus = patch.taxonomyVerificationStatus || 'suggested';
  point.identificationStatus = patch.identificationStatus || point.identificationStatus || 'needReview';
  point.taxonomyUpdatedAt = patch.taxonomyUpdatedAt || taxonomyNow();
  point.taxonomyCandidatesSummary = compactTaxonomyCandidates(
    patch.taxonomyCandidatesSummary || point.taxonomyCandidatesSummary
  );
  return { applied: true, blocked: false };
}

function setTaxonomySuggestionSummary(message) {
  if (ui.taxonomySuggestionSummary) {
    ui.taxonomySuggestionSummary.textContent = message || t('taxonomySuggestionEmpty');
  }
}

function renderTaxonomyCandidateList(candidates = []) {
  if (!ui.taxonomyCandidateList) return;
  ui.taxonomyCandidateList.classList.toggle('hidden', !taxonomyCandidatesVisible);
  if (!taxonomyCandidatesVisible) return;
  if (!candidates.length) {
    ui.taxonomyCandidateList.innerHTML = `<div class="subtle">${escapeHtml(t('taxonomySuggestionEmpty'))}</div>`;
    return;
  }
  ui.taxonomyCandidateList.innerHTML = candidates.map((item, index) => {
    const title = item.matchedName || item.scientificName || item.canonicalName || t('notFilled');
    const details = [
      item.provider,
      item.scientificName,
      item.family ? `${t('speciesReferenceFamily')}: ${item.family}` : '',
      item.genus ? `${t('speciesReferenceGenus')}: ${item.genus}` : '',
      item.rank,
      Number.isFinite(Number(item.score)) ? `${t('speciesReferenceScore')}: ${item.score}` : '',
      item.matchType
    ].filter(Boolean).join(' / ');
    return `
      <div class="taxonomy-candidate-card">
        <div>
          <strong title="${escapeHtml(title)}">${escapeHtml(title)}</strong>
          <span class="subtle" title="${escapeHtml(details)}">${escapeHtml(details || '-')}</span>
        </div>
        <button class="btn btn-soft" data-taxonomy-candidate-index="${index}">${escapeHtml(t('taxonomyCandidateApply'))}</button>
      </div>
    `;
  }).join('');
}

function refreshTaxonomyPanel(point = getSelectedPoint()) {
  if (ui.familyInput) ui.familyInput.value = point?.family || '';
  if (ui.genusInput) ui.genusInput.value = point?.genus || '';
  if (ui.identificationStatus) ui.identificationStatus.value = point?.identificationStatus || 'draft';
  if (ui.taxonomySource) ui.taxonomySource.value = point?.taxonomySource || 'unknown';
  if (ui.taxonomyVerificationStatus) {
    ui.taxonomyVerificationStatus.value = point?.taxonomyVerificationStatus || 'unverified';
  }
  if (ui.taxonomyUpdatedAt) ui.taxonomyUpdatedAt.value = point?.taxonomyUpdatedAt || '';
  const family = String(point?.family || '').trim();
  const genus = String(point?.genus || '').trim();
  if (ui.phenologyTaxonomyInfo) {
    ui.phenologyTaxonomyInfo.textContent = family || genus
      ? `${t('phenologyTaxonomyInherits')} ${[family, genus].filter(Boolean).join(' / ')} · ${taxonomyStatusLabel(point?.taxonomyVerificationStatus || 'unverified')}`
      : t('phenologyTaxonomyMissing');
  }
  if (point) {
    const source = taxonomySourceLabel(point.taxonomySource || 'unknown');
    const status = taxonomyStatusLabel(point.taxonomyVerificationStatus || 'unverified');
    const candidateCount = Array.isArray(point.taxonomyCandidatesSummary)
      ? point.taxonomyCandidatesSummary.length
      : 0;
    setTaxonomySuggestionSummary(family || genus
      ? `${[family || '-', genus || '-'].join(' / ')} · ${source} · ${status}${candidateCount ? ` · ${t('taxonomyCandidateCount')}: ${candidateCount}` : ''}`
      : t('taxonomySuggestionEmpty'));
    renderTaxonomyCandidateList(point.taxonomyCandidatesSummary || []);
  } else {
    setTaxonomySuggestionSummary(t('taxonomySuggestionNoPoint'));
    renderTaxonomyCandidateList([]);
  }
}

function readTaxonomyFormIntoPoint(point) {
  if (!point) return;
  const previousFamily = String(point.family || '').trim();
  const previousGenus = String(point.genus || '').trim();
  const nextFamily = String(ui.familyInput?.value || '').trim();
  const nextGenus = String(ui.genusInput?.value || '').trim();
  point.family = nextFamily;
  point.genus = nextGenus;
  point.identificationStatus = ui.identificationStatus?.value || point.identificationStatus || 'draft';
  point.taxonomySource = ui.taxonomySource?.value || point.taxonomySource || 'unknown';
  point.taxonomyVerificationStatus = ui.taxonomyVerificationStatus?.value
    || point.taxonomyVerificationStatus
    || 'unverified';
  point.taxonomyUpdatedAt = ui.taxonomyUpdatedAt?.value || point.taxonomyUpdatedAt || '';
  const providerSource = ['iNaturalist', 'GBIF', 'iNaturalist+GBIF'].includes(point.taxonomySource);
  if ((nextFamily !== previousFamily || nextGenus !== previousGenus) && !providerSource) {
    point.taxonomySource = 'manual';
    point.taxonomyUpdatedAt = taxonomyNow();
  }
}

function flagTaxonomyNeedsRefresh() {
  if (!ui.taxonomySuggestionSummary) return;
  const point = getSelectedPoint();
  if (!point) return;
  ui.taxonomySuggestionSummary.textContent = t('taxonomySuggestionNeedsRefresh');
}

async function runTaxonomySuggestion() {
  if (typeof guardMaintenanceReadOnlyAction === 'function' && guardMaintenanceReadOnlyAction('suggest-taxonomy')) return;
  const point = getEditablePoint();
  if (!point) return showAlert(t('taxonomySuggestionNoPoint'));
  const scientificName = String(ui.plantNameSci?.value || point.plantNameSci || '').trim();
  const chineseName = String(ui.plantNameCn?.value || point.plantNameCn || '').trim();
  if (!scientificName && !chineseName) return showAlert(t('taxonomySuggestionNeedName'));
  if (!window.plantApp?.species?.suggestTaxonomy) return showAlert(t('taxonomySuggestionUnavailable'));

  setTaxonomyBusy(true);
  setTaxonomySuggestionSummary(t('taxonomySuggestionRunning'));
  try {
    const result = await callIpc(window.plantApp.species.suggestTaxonomy({
      scientificName,
      chineseName,
      existingFamily: String(ui.familyInput?.value || point.family || '').trim(),
      existingGenus: String(ui.genusInput?.value || point.genus || '').trim(),
      taxonomyVerificationStatus: ui.taxonomyVerificationStatus?.value
        || point.taxonomyVerificationStatus
        || 'unverified',
      allowOverwriteManual: false,
      providers: ['iNaturalist', 'GBIF'],
      locale: taxonomyLocale()
    }));
    taxonomySuggestionCache = result;
    taxonomyCandidatesVisible = true;
    renderTaxonomyCandidateList(result.candidates || []);
    const warnings = (result.warnings || []).join(' / ');
    if (!result.ok) {
      setTaxonomySuggestionSummary(warnings || t('taxonomySuggestionNoReliableCandidate'));
      return;
    }
    const values = [result.suggestedFamily, result.suggestedGenus].filter(Boolean).join(' / ');
    setTaxonomySuggestionSummary(
      `${values || t('taxonomySuggestionNoReliableCandidate')} · ${taxonomySourceLabel(result.source)} · ${result.confidenceLabel || 'unknown'}${warnings ? ` · ${warnings}` : ''}`
    );
  } catch (error) {
    handleUiError(error, 'taxonomy:suggest', { title: t('taxonomySuggestionFailed') });
    setTaxonomySuggestionSummary(t('taxonomySuggestionFailed'));
  } finally {
    setTaxonomyBusy(false);
  }
}

async function applyTaxonomySuggestion(index = -1) {
  if (typeof guardMaintenanceReadOnlyAction === 'function' && guardMaintenanceReadOnlyAction('apply-taxonomy')) return;
  const point = getEditablePoint();
  const result = taxonomySuggestionCache;
  if (!point || !result?.ok) return showAlert(t('taxonomySuggestionNoReliableCandidate'));
  const candidates = result.candidates || [];
  const candidate = index >= 0 ? candidates[index] : null;
  const patch = taxonomyPatchFromResult(result, candidate);
  const hasExisting = !!String(point.family || '').trim() || !!String(point.genus || '').trim();
  const locked = point.taxonomyVerificationStatus === 'manuallyVerified';
  let overwrite = false;
  if (hasExisting || locked) {
    overwrite = await openConfirmDialog({
      title: t('taxonomyApplySuggestion'),
      message: t('taxonomyOverwriteConfirm'),
      acceptLabel: t('taxonomyApplySuggestion'),
      cancelLabel: t('cancelAction')
    });
    if (!overwrite) return;
  }
  const applied = applyTaxonomyFieldsToPoint(point, patch, { overwrite });
  if (!applied.applied) return showAlert(t('taxonomyOverwriteBlocked'));
  syncPointSummary(point);
  updatePointTooltip(point);
  refreshTaxonomyPanel(point);
  renderAllDerived();
  await persistProject();
  setPointEditorDraftBaseline();
  toast(t('taxonomySuggestionApplied'));
}

async function keepManualTaxonomy() {
  if (typeof guardMaintenanceReadOnlyAction === 'function' && guardMaintenanceReadOnlyAction('manual-taxonomy')) return;
  const point = getEditablePoint();
  if (!point) return showAlert(t('taxonomySuggestionNoPoint'));
  readTaxonomyFormIntoPoint(point);
  point.taxonomySource = 'manual';
  point.taxonomyUpdatedAt = taxonomyNow();
  refreshTaxonomyPanel(point);
  renderAllDerived();
  await persistProject();
  setPointEditorDraftBaseline();
  toast(t('taxonomyManualKept'));
}

async function markTaxonomyVerified() {
  if (typeof guardMaintenanceReadOnlyAction === 'function' && guardMaintenanceReadOnlyAction('verify-taxonomy')) return;
  const point = getEditablePoint();
  if (!point) return showAlert(t('taxonomySuggestionNoPoint'));
  readTaxonomyFormIntoPoint(point);
  point.taxonomyVerificationStatus = 'manuallyVerified';
  point.identificationStatus = 'verified';
  point.taxonomyUpdatedAt = taxonomyNow();
  refreshTaxonomyPanel(point);
  renderAllDerived();
  await persistProject();
  setPointEditorDraftBaseline();
  toast(t('taxonomyMarkedVerified'));
}

async function markTaxonomyDoubtful() {
  if (typeof guardMaintenanceReadOnlyAction === 'function' && guardMaintenanceReadOnlyAction('doubtful-taxonomy')) return;
  const point = getEditablePoint();
  if (!point) return showAlert(t('taxonomySuggestionNoPoint'));
  readTaxonomyFormIntoPoint(point);
  point.taxonomyVerificationStatus = 'doubtful';
  point.identificationStatus = 'doubtful';
  point.taxonomyUpdatedAt = taxonomyNow();
  refreshTaxonomyPanel(point);
  renderAllDerived();
  await persistProject();
  setPointEditorDraftBaseline();
  toast(t('taxonomyMarkedDoubtful'));
}

async function clearTaxonomySuggestion() {
  if (typeof guardMaintenanceReadOnlyAction === 'function' && guardMaintenanceReadOnlyAction('clear-taxonomy')) return;
  const point = getEditablePoint();
  if (!point) return showAlert(t('taxonomySuggestionNoPoint'));
  point.taxonomyMatchedName = '';
  point.taxonomyConfidence = null;
  point.taxonomyConfidenceLabel = 'unknown';
  point.taxonomyCandidatesSummary = [];
  point.taxonomySource = point.family || point.genus ? 'manual' : 'unknown';
  point.taxonomyVerificationStatus = 'unverified';
  point.taxonomyUpdatedAt = taxonomyNow();
  taxonomySuggestionCache = null;
  taxonomyCandidatesVisible = false;
  refreshTaxonomyPanel(point);
  renderAllDerived();
  await persistProject();
  setPointEditorDraftBaseline();
  toast(t('taxonomySuggestionCleared'));
}

function toggleTaxonomyCandidates() {
  taxonomyCandidatesVisible = !taxonomyCandidatesVisible;
  if (ui.btnToggleTaxonomyCandidates) {
    ui.btnToggleTaxonomyCandidates.textContent = taxonomyCandidatesVisible
      ? t('taxonomyHideCandidates')
      : t('taxonomyViewCandidates');
  }
  renderTaxonomyCandidateList(
    taxonomySuggestionCache?.candidates || getSelectedPoint()?.taxonomyCandidatesSummary || []
  );
}

function bindTaxonomyEvents() {
  ui.btnSuggestTaxonomy?.addEventListener('click', runTaxonomySuggestion);
  ui.btnRefreshTaxonomy?.addEventListener('click', runTaxonomySuggestion);
  ui.btnToggleTaxonomyCandidates?.addEventListener('click', toggleTaxonomyCandidates);
  ui.btnApplyTaxonomySuggestion?.addEventListener('click', () => applyTaxonomySuggestion());
  ui.btnKeepManualTaxonomy?.addEventListener('click', keepManualTaxonomy);
  ui.btnVerifyTaxonomy?.addEventListener('click', markTaxonomyVerified);
  ui.btnDoubtfulTaxonomy?.addEventListener('click', markTaxonomyDoubtful);
  ui.btnClearTaxonomySuggestion?.addEventListener('click', clearTaxonomySuggestion);
  ui.taxonomyCandidateList?.addEventListener('click', event => {
    const button = event.target?.closest?.('[data-taxonomy-candidate-index]');
    if (!button) return;
    applyTaxonomySuggestion(Number(button.dataset.taxonomyCandidateIndex));
  });
  ui.plantNameCn?.addEventListener('input', flagTaxonomyNeedsRefresh);
  ui.plantNameSci?.addEventListener('input', flagTaxonomyNeedsRefresh);
  bindPointEditorDraftEvents();
}
