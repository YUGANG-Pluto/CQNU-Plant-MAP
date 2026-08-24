let speciesReferenceCache = null;
let speciesReferencePanelController = null;

function getSpeciesReferencePanelController() {
  if (!speciesReferencePanelController) {
    speciesReferencePanelController = window.rendererDomain?.speciesReference?.createPanelController?.() || null;
  }
  return speciesReferencePanelController;
}

function selectSpeciesReferenceSuggestion(suggestionId) {
  if (!speciesReferenceCache || !suggestionId) return;
  if (!speciesReferenceCache.suggestions.some(item => item.id === suggestionId)) return;
  const panelState = getSpeciesReferencePanelController()?.select(suggestionId);
  speciesReferenceCache.selectedId = panelState?.selectedId || suggestionId;
  renderSpeciesReferenceResults(speciesReferenceCache);
}

function clearSpeciesReferenceCache() {
  speciesReferenceCache = null;
  getSpeciesReferencePanelController()?.clear();
  if (ui.speciesReferenceResults) clearNode(ui.speciesReferenceResults);
  if (ui.speciesReferenceSummary) ui.speciesReferenceSummary.textContent = t('speciesReferenceEmpty');
  if (ui.speciesReferenceImageCompareStatus) ui.speciesReferenceImageCompareStatus.textContent = t('speciesReferenceImageCompareHint');
  renderSpeciesReferenceDetail(null);
  syncSpeciesReferenceApplyControls(null);
}

function currentSpeciesReferenceInput() {
  const point = getSelectedPoint();
  const formSci = String(ui.plantNameSci?.value || '').trim();
  const formCommon = String(ui.plantNameCn?.value || '').trim();
  return {
    point,
    scientificName: formSci || point?.plantNameSci || '',
    commonName: formCommon || point?.plantNameCn || ''
  };
}

function openSpeciesReferenceCenter() {
  const { point, scientificName, commonName } = currentSpeciesReferenceInput();
  if (!point) return showAlert(t('noPointSelected'));
  clearSpeciesReferenceCache();
  ui.speciesReferenceSciInput.value = scientificName;
  ui.speciesReferenceCommonInput.value = commonName;
  openLayerModal(ui.speciesReferenceModal, { focusTarget: ui.btnRunSpeciesReference });
}

function closeSpeciesReferenceCenter() {
  clearSpeciesReferenceCache();
  if (ui.speciesReferenceImageTokenInput) ui.speciesReferenceImageTokenInput.value = '';
  closeLayerModal(ui.speciesReferenceModal);
}

function setSpeciesReferenceBusy(busy) {
  getSpeciesReferencePanelController()?.setBusy('query', busy);
  if (ui.btnRunSpeciesReference) {
    ui.btnRunSpeciesReference.disabled = !!busy;
    ui.btnRunSpeciesReference.classList.toggle('is-busy', !!busy);
    ui.btnRunSpeciesReference.setAttribute('aria-busy', String(!!busy));
    const label = ui.btnRunSpeciesReference.querySelector('[data-action-label]');
    if (label) label.textContent = busy ? t('speciesReferenceRunning') : t('runSpeciesReference');
  }
  ui.speciesReferenceResults?.setAttribute('aria-busy', String(!!busy));
}

function setSpeciesImageCompareBusy(busy) {
  getSpeciesReferencePanelController()?.setBusy('image', busy);
  if (ui.btnRunSpeciesImageCompare) ui.btnRunSpeciesImageCompare.disabled = !!busy;
  if (ui.btnRunSpeciesImageCompare) {
    ui.btnRunSpeciesImageCompare.classList.toggle('is-busy', !!busy);
    ui.btnRunSpeciesImageCompare.setAttribute('aria-busy', String(!!busy));
    const label = ui.btnRunSpeciesImageCompare.querySelector('[data-action-label]');
    if (label) {
      label.textContent = busy
        ? t('speciesReferenceImageCompareRunning')
        : t('speciesReferenceRunImageCompare');
    }
  }
  if (ui.speciesReferenceImageTokenInput) ui.speciesReferenceImageTokenInput.disabled = !!busy;
}

function speciesReferenceLocale() {
  return (state.settings?.language || 'zh') === 'zh' ? 'zh-CN' : 'en';
}
