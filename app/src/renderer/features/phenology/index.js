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
  if (ui.btnSuggestTaxonomy) ui.btnSuggestTaxonomy.textContent = busy ? t('taxonomySuggestionRunning') : t('taxonomySuggest');
  if (ui.btnRefreshTaxonomy) ui.btnRefreshTaxonomy.textContent = busy ? t('taxonomySuggestionRunning') : t('taxonomyRefresh');
}

function compactTaxonomyCandidates(candidates = []) {
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
  point.taxonomyConfidence = Number.isFinite(Number(patch.taxonomyConfidence)) ? Number(patch.taxonomyConfidence) : null;
  point.taxonomyConfidenceLabel = patch.taxonomyConfidenceLabel || point.taxonomyConfidenceLabel || 'unknown';
  point.taxonomyVerificationStatus = patch.taxonomyVerificationStatus || 'suggested';
  point.identificationStatus = patch.identificationStatus || point.identificationStatus || 'needReview';
  point.taxonomyUpdatedAt = patch.taxonomyUpdatedAt || taxonomyNow();
  point.taxonomyCandidatesSummary = compactTaxonomyCandidates(patch.taxonomyCandidatesSummary || point.taxonomyCandidatesSummary);
  return { applied: true, blocked: false };
}

function setTaxonomySuggestionSummary(message) {
  if (ui.taxonomySuggestionSummary) ui.taxonomySuggestionSummary.textContent = message || t('taxonomySuggestionEmpty');
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
  if (ui.taxonomyVerificationStatus) ui.taxonomyVerificationStatus.value = point?.taxonomyVerificationStatus || 'unverified';
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
    const candidateCount = Array.isArray(point.taxonomyCandidatesSummary) ? point.taxonomyCandidatesSummary.length : 0;
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
  point.taxonomyVerificationStatus = ui.taxonomyVerificationStatus?.value || point.taxonomyVerificationStatus || 'unverified';
  point.taxonomyUpdatedAt = ui.taxonomyUpdatedAt?.value || point.taxonomyUpdatedAt || '';
  if ((nextFamily !== previousFamily || nextGenus !== previousGenus) && point.taxonomySource !== 'iNaturalist' && point.taxonomySource !== 'GBIF' && point.taxonomySource !== 'iNaturalist+GBIF') {
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
      taxonomyVerificationStatus: ui.taxonomyVerificationStatus?.value || point.taxonomyVerificationStatus || 'unverified',
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
    setTaxonomySuggestionSummary(`${values || t('taxonomySuggestionNoReliableCandidate')} · ${taxonomySourceLabel(result.source)} · ${result.confidenceLabel || 'unknown'}${warnings ? ` · ${warnings}` : ''}`);
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
  point.taxonomyVerificationStatus = point.family || point.genus ? 'unverified' : 'unverified';
  point.taxonomyUpdatedAt = taxonomyNow();
  taxonomySuggestionCache = null;
  taxonomyCandidatesVisible = false;
  refreshTaxonomyPanel(point);
  renderAllDerived();
  await persistProject();
  toast(t('taxonomySuggestionCleared'));
}

function toggleTaxonomyCandidates() {
  taxonomyCandidatesVisible = !taxonomyCandidatesVisible;
  if (ui.btnToggleTaxonomyCandidates) {
    ui.btnToggleTaxonomyCandidates.textContent = taxonomyCandidatesVisible ? t('taxonomyHideCandidates') : t('taxonomyViewCandidates');
  }
  renderTaxonomyCandidateList((taxonomySuggestionCache?.candidates || getSelectedPoint()?.taxonomyCandidatesSummary || []));
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
}

function populateZoneForm() {
  const zone = getSelectedZone();
  ui.zoneId.value = zone?.zoneId || '';
  ui.zoneName.value = zone?.name || '';
  ui.zoneDescription.value = zone?.description || '';
  ui.zoneId.dataset.targetId = zone?.id || '';
}

function updatePointSummaryBox() {
  const point = getSelectedPoint();
  if (!ui.pointSummaryBox) return;

  if (!point) {
    ui.pointSummaryBox.textContent = '—';
    return;
  }

  const labels = getPhenologyEntries(point)
    .map(entry => entry.label)
    .filter(Boolean)
    .join(' / ');

  const title = pointDisplayName(point);
  const sci = point.plantNameSci || '';
  const id = point.pointId || '';
  const labelText = labels || t('phenologyListEmpty');
  ui.pointSummaryBox.innerHTML = `
    <div class="point-summary-name" title="${escapeHtml(title)}"><strong>${escapeHtml(title)}</strong></div>
    ${sci ? `<div class="subtle point-summary-sci" title="${escapeHtml(sci)}">${escapeHtml(sci)}</div>` : ''}
    <div class="subtle point-summary-id" title="${escapeHtml(id)}">${escapeHtml(id)}</div>
    <div class="subtle point-summary-labels" title="${escapeHtml(labelText)}">${escapeHtml(labelText)}</div>
  `;
  if (typeof scheduleRightPanelDisplayMode === 'function') scheduleRightPanelDisplayMode('point-summary-update');
}

function renderPhenologyTabs() {
  if (!ui.phenologyTabs) return;

  const point = getSelectedPoint();
  ui.phenologyTabs.innerHTML = '';

  if (!point) {
    ui.phenologyTabs.innerHTML = `<span class="subtle">${escapeHtml(t('noPointSelected'))}</span>`;
    return;
  }

  const entries = getPhenologyEntries(point);
  if (!entries.length) {
    ui.phenologyTabs.innerHTML = `<span class="subtle">${escapeHtml(t('phenologyListEmpty'))}</span>`;
    return;
  }

  entries.forEach(entry => {
    const button = document.createElement('button');
    button.className = 'seg-btn phenology-tab-btn';
    button.classList.toggle('active', entry.id === state.selectedPhenologyId);
    button.textContent = entry.label || entry.floweringState || t('notFilled');
    button.addEventListener('click', () => {
      state.selectedPhenologyId = entry.id;
      populatePointForm();
    });
    ui.phenologyTabs.appendChild(button);
  });
}

function populatePointForm() {
  const point = getSelectedPoint();
  ui.pointId.value = point?.pointId || '';
  ui.pointId.dataset.targetId = point?.id || '';
  ui.plantNameCn.value = point?.plantNameCn || '';
  ui.plantNameSci.value = point?.plantNameSci || '';
  taxonomySuggestionCache = point?.taxonomyCandidatesSummary?.length
    ? { ok: true, candidates: point.taxonomyCandidatesSummary, source: point.taxonomySource || 'unknown' }
    : null;
  taxonomyCandidatesVisible = false;
  if (ui.btnToggleTaxonomyCandidates) ui.btnToggleTaxonomyCandidates.textContent = t('taxonomyViewCandidates');
  refreshTaxonomyPanel(point);

  const entry = getSelectedPhenologyEntry(point);
  ui.observer.value = entry?.observer || '';
  ui.surveyDate.value = entry?.surveyDate || '';
  ui.habitat.value = entry?.habitat || '';
  ui.abundance.value = entry?.abundance || '';
  ui.growthForm.value = entry?.growthForm || '';
  ui.floweringState.value = entry?.floweringState || entry?.label || '';
  ui.cultivatedStatus.value = entry?.cultivatedStatus || '';
  ui.plantNote.value = entry?.note || '';

  renderPhenologyTabs();
  renderImageList(entry?.images || []);
  updatePointSummaryBox();
}

function clearPointForm() {
  ui.pointId.value = '';
  ui.pointId.dataset.targetId = '';
  ui.plantNameCn.value = '';
  ui.plantNameSci.value = '';
  taxonomySuggestionCache = null;
  taxonomyCandidatesVisible = false;
  refreshTaxonomyPanel(null);
  ui.observer.value = '';
  ui.surveyDate.value = '';
  ui.habitat.value = '';
  ui.abundance.value = '';
  ui.growthForm.value = '';
  ui.floweringState.value = '';
  ui.cultivatedStatus.value = '';
  ui.plantNote.value = '';
  renderImageList([]);
  renderPhenologyTabs();
  updatePointSummaryBox();
}

async function applyZoneInfo() {
  if (typeof guardMaintenanceReadOnlyAction === 'function' && guardMaintenanceReadOnlyAction('apply-zone')) return;
  const zone = getEditableZone();
  if (!zone) return showAlert(t('noZoneSelected'));

  state.selectedZoneId = zone.id;
  zone.zoneId = ui.zoneId.value.trim();
  zone.name = ui.zoneName.value.trim();
  zone.description = ui.zoneDescription.value.trim();

  updateZoneTooltip(zone);
  renderAllDerived();
  await persistProject();
}

function readPointFormIntoEntry(point, entry) {
  point.pointId = ui.pointId.value.trim();
  point.plantNameCn = ui.plantNameCn.value.trim();
  point.plantNameSci = ui.plantNameSci.value.trim();
  readTaxonomyFormIntoPoint(point);

  entry.observer = ui.observer.value.trim();
  entry.surveyDate = ui.surveyDate.value;
  entry.habitat = ui.habitat.value.trim();
  entry.abundance = ui.abundance.value.trim();
  entry.growthForm = ui.growthForm.value.trim();
  entry.floweringState = mapLegacyPhenology(ui.floweringState.value.trim());
  entry.label = entry.floweringState;
  entry.cultivatedStatus = ui.cultivatedStatus.value.trim();
  entry.note = ui.plantNote.value.trim();
}

async function applyPointInfo() {
  if (typeof guardMaintenanceReadOnlyAction === 'function' && guardMaintenanceReadOnlyAction('apply-point')) return;
  const point = getEditablePoint();
  if (!point) return showAlert(t('noPointSelected'));

  const entry = getSelectedPhenologyEntry(point);
  if (!entry) return showAlert(t('noPhenologySelected'));

  state.selectedPointId = point.id;
  state.selectedZoneId = point.zoneRef;
  readPointFormIntoEntry(point, entry);
  syncPointSummary(point);
  updatePointTooltip(point);
  renderAllDerived();
  await persistProject();
}

function openPointEditor() {
  if (typeof guardMaintenanceReadOnlyAction === 'function' && guardMaintenanceReadOnlyAction('open-point-editor')) return;
  const point = getSelectedPoint();
  if (!point) return showAlert(t('noPointSelected'));
  populatePointForm();
  openLayerModal(ui.pointEditorModal);
}

function closePointEditor() {
  closeLayerModal(ui.pointEditorModal);
}

function openSmallPrompt(title, initial = '') {
  ui.smallPromptTitle.textContent = title;
  ui.smallPromptInput.value = initial;
  openLayerModal(ui.smallPromptModal);
  ui.smallPromptInput.focus();
  return new Promise(resolve => {
    state.promptResolver = resolve;
  });
}

function settleSmallPrompt(value) {
  closeLayerModal(ui.smallPromptModal);
  if (state.promptResolver) state.promptResolver(value);
  state.promptResolver = null;
}

async function addPhenologyEntry() {
  if (typeof guardMaintenanceReadOnlyAction === 'function' && guardMaintenanceReadOnlyAction('add-phenology')) return;
  const point = getSelectedPoint();
  if (!point) return showAlert(t('noPointSelected'));

  const value = await openSmallPrompt(t('addPhenologyPrompt'));
  if (!value) return;

  const label = mapLegacyPhenology(String(value).trim());
  const entry = makePhenologyEntry({ label, floweringState: label });
  point.phenologyEntries.push(entry);
  state.selectedPhenologyId = entry.id;

  syncPointSummary(point);
  populatePointForm();
  renderAllDerived();
  await persistProject();
}

async function deletePhenologyEntry() {
  if (typeof guardMaintenanceReadOnlyAction === 'function' && guardMaintenanceReadOnlyAction('delete-phenology')) return;
  const point = getSelectedPoint();
  const entry = getSelectedPhenologyEntry(point);
  if (!point || !entry) return showAlert(t('noPhenologySelected'));

  if (point.phenologyEntries.length <= 1) {
    point.phenologyEntries[0] = makePhenologyEntry({ label: '不明', floweringState: '不明' });
    state.selectedPhenologyId = point.phenologyEntries[0].id;
    syncPointSummary(point);
    populatePointForm();
    renderAllDerived();
    await persistProject();
    return;
  }

  const ok = await openConfirmDialog({
    title: t('deletePhenology'),
    message: t('deletePhenologyPrompt')
  });
  if (!ok) return;

  point.phenologyEntries = point.phenologyEntries.filter(item => item.id !== entry.id);
  state.selectedPhenologyId = point.phenologyEntries[0]?.id || '';
  syncPointSummary(point);
  populatePointForm();
  renderAllDerived();
  await persistProject();
}

function fillDatalist(listEl, values) {
  if (!listEl) return;
  listEl.innerHTML = values
    .map(value => `<option value="${escapeHtml(value)}"></option>`)
    .join('');
}

function refreshSuggestionLists() {
  fillDatalist(ui.habitatOptions, STANDARD_OPTIONS.habitat);
  fillDatalist(ui.abundanceOptions, STANDARD_OPTIONS.abundance);
  fillDatalist(ui.growthFormOptions, STANDARD_OPTIONS.growthForm);
  fillDatalist(ui.floweringStateOptions, STANDARD_OPTIONS.floweringState);
  fillDatalist(ui.cultivatedStatusOptions, STANDARD_OPTIONS.cultivatedStatus);
}

function clearZoneForm() {
  ui.zoneId.value = '';
  ui.zoneName.value = '';
  ui.zoneDescription.value = '';
  ui.zoneId.dataset.targetId = '';
}
