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
