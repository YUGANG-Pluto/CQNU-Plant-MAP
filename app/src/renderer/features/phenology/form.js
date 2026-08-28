function populateZoneForm() {
  const zone = getSelectedZone();
  ui.zoneId.value = zone?.zoneId || '';
  ui.zoneName.value = zone?.name || '';
  ui.zoneDescription.value = zone?.description || '';
  ui.zoneId.dataset.targetId = zone?.id || '';
  if (typeof refreshProjectDraftState === 'function') refreshProjectDraftState();
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
  if (typeof scheduleRightPanelDisplayMode === 'function') {
    scheduleRightPanelDisplayMode('point-summary-update');
  }
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
    button.addEventListener('click', async () => {
      if (entry.id === state.selectedPhenologyId) return;
      if (!(await confirmDiscardPointEditorDraft())) return;
      if (window.objectSelectionStore) window.objectSelectionStore.selectPhenology(entry.id);
      else state.selectedPhenologyId = entry.id;
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
    ? {
        ok: true,
        candidates: point.taxonomyCandidatesSummary,
        source: point.taxonomySource || 'unknown'
      }
    : null;
  taxonomyCandidatesVisible = false;
  if (ui.btnToggleTaxonomyCandidates) {
    ui.btnToggleTaxonomyCandidates.textContent = t('taxonomyViewCandidates');
  }
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
  setPointEditorDraftBaseline();
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
  setPointEditorDraftBaseline();
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

function fillDatalist(listEl, values) {
  if (!listEl) return;
  listEl.innerHTML = values.map(value => `<option value="${escapeHtml(value)}"></option>`).join('');
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
  if (typeof refreshProjectDraftState === 'function') refreshProjectDraftState();
}
