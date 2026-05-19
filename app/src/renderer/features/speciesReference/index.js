let speciesReferenceCache = null;

function clearSpeciesReferenceCache() {
  speciesReferenceCache = null;
  if (ui.speciesReferenceResults) clearNode(ui.speciesReferenceResults);
  if (ui.speciesReferenceSummary) ui.speciesReferenceSummary.textContent = t('speciesReferenceEmpty');
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
  closeLayerModal(ui.speciesReferenceModal);
}

function setSpeciesReferenceBusy(busy) {
  if (ui.btnRunSpeciesReference) ui.btnRunSpeciesReference.disabled = !!busy;
  if (ui.btnRunSpeciesReference) ui.btnRunSpeciesReference.textContent = busy ? t('speciesReferenceRunning') : t('runSpeciesReference');
}

function speciesReferenceLocale() {
  return (state.settings?.language || 'zh') === 'zh' ? 'zh-CN' : 'en';
}

function sourceStatusLabel(sources = {}) {
  return ['gbif', 'inaturalist'].map(key => {
    const item = sources[key] || {};
    const label = key === 'gbif' ? 'GBIF' : 'iNaturalist';
    return `${label}: ${item.ok ? `${item.count || 0}` : t('speciesReferenceSourceFailed')}`;
  }).join(' / ');
}

function sourceClassName(source) {
  return source === 'gbif' ? 'species-source-gbif' : 'species-source-inat';
}

function selectedSpeciesReferenceSuggestion() {
  if (!speciesReferenceCache) return null;
  return speciesReferenceCache.suggestions.find(item => item.id === speciesReferenceCache.selectedId) || null;
}

function syncSpeciesReferenceApplyControls(suggestion) {
  const hasSuggestion = !!suggestion;
  [ui.speciesReferenceApplySci, ui.speciesReferenceApplyCommon, ui.speciesReferenceAppendNote, ui.btnApplySpeciesReference]
    .forEach(node => { if (node) node.disabled = !hasSuggestion; });
  if (!hasSuggestion) {
    if (ui.speciesReferenceApplySci) ui.speciesReferenceApplySci.checked = false;
    if (ui.speciesReferenceApplyCommon) ui.speciesReferenceApplyCommon.checked = false;
    if (ui.speciesReferenceAppendNote) ui.speciesReferenceAppendNote.checked = false;
    if (typeof syncMaintenanceSafeModeUi === 'function') syncMaintenanceSafeModeUi();
    return;
  }

  const currentCommon = String(ui.plantNameCn?.value || getSelectedPoint()?.plantNameCn || '').trim();
  const currentSci = String(ui.plantNameSci?.value || getSelectedPoint()?.plantNameSci || '').trim();
  if (ui.speciesReferenceApplySci) {
    ui.speciesReferenceApplySci.checked = !!suggestion.scientificName && suggestion.scientificName !== currentSci;
    ui.speciesReferenceApplySci.disabled = !suggestion.scientificName;
  }
  if (ui.speciesReferenceApplyCommon) {
    ui.speciesReferenceApplyCommon.checked = !!suggestion.commonName && (!currentCommon || suggestion.commonName !== currentCommon);
    ui.speciesReferenceApplyCommon.disabled = !suggestion.commonName;
  }
  if (ui.speciesReferenceAppendNote) ui.speciesReferenceAppendNote.checked = false;
  if (typeof syncMaintenanceSafeModeUi === 'function') syncMaintenanceSafeModeUi();
}

function renderSpeciesReferenceCard(item, checked) {
  const photo = item.photoUrl
    ? `<img src="${escapeHtml(item.photoUrl)}" alt="${escapeHtml(item.scientificName || item.commonName || '')}" loading="lazy" />`
    : `<div class="species-reference-photo-empty">${escapeHtml(t('noImage'))}</div>`;
  const className = ['species-reference-card', checked ? 'is-selected' : '', sourceClassName(item.source)].filter(Boolean).join(' ');
  const classification = item.classification || {};
  const taxonomy = [
    classification.family,
    classification.genus,
    item.rank,
    item.status,
    item.conservationStatus ? `${t('speciesReferenceConservation')}: ${item.conservationStatus}` : ''
  ].filter(Boolean).join(' / ');
  const count = Number.isFinite(item.observationsCount)
    ? `${t('speciesReferenceObservations')}: ${item.observationsCount}`
    : '';
  const confidence = Number.isFinite(item.confidence)
    ? `${t('speciesReferenceConfidence')}: ${item.confidence}`
    : '';
  return `
    <label class="${className}">
      <input type="radio" name="speciesReferenceSuggestion" value="${escapeHtml(item.id)}" ${checked ? 'checked' : ''} />
      <div class="species-reference-photo" title="${escapeHtml(item.photoAttribution || '')}">${photo}</div>
      <div class="species-reference-body">
        <div class="species-reference-title">
          <strong>${escapeHtml(item.scientificName || item.canonicalName || t('notFilled'))}</strong>
          <span>${escapeHtml(item.sourceLabel)}</span>
        </div>
        <p>${escapeHtml(item.commonName || t('notFilled'))}</p>
        <div class="species-reference-meta">${escapeHtml(taxonomy || item.summary || '—')}</div>
        <div class="species-reference-meta">${escapeHtml([item.matchType, confidence, count].filter(Boolean).join(' / ') || '—')}</div>
        <div class="species-reference-links">
          <a href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(t('speciesReferenceOpenSource'))}</a>
          ${item.wikipediaUrl ? `<a href="${escapeHtml(item.wikipediaUrl)}" target="_blank" rel="noreferrer">${escapeHtml(t('speciesReferenceOpenWiki'))}</a>` : ''}
        </div>
      </div>
    </label>
  `;
}

function renderSpeciesReferenceResults(data) {
  if (!ui.speciesReferenceResults || !ui.speciesReferenceSummary) return;
  const suggestions = data.suggestions || [];
  const selectedId = suggestions.some(item => item.id === data.selectedId) ? data.selectedId : suggestions[0]?.id || '';
  speciesReferenceCache = {
    ...data,
    pointId: getSelectedPoint()?.id || '',
    selectedId
  };

  ui.speciesReferenceSummary.textContent = `${t('speciesReferenceResultSummary')} ${suggestions.length} / ${sourceStatusLabel(data.sources)}`;
  if (!suggestions.length) {
    ui.speciesReferenceResults.innerHTML = `<div class="hint-box">${escapeHtml(t('speciesReferenceNoResult'))}</div>`;
    syncSpeciesReferenceApplyControls(null);
    return;
  }

  ui.speciesReferenceResults.innerHTML = suggestions
    .map(item => renderSpeciesReferenceCard(item, item.id === speciesReferenceCache.selectedId))
    .join('');
  syncSpeciesReferenceApplyControls(selectedSpeciesReferenceSuggestion());
}

async function runSpeciesReferenceQuery() {
  const point = getSelectedPoint();
  if (!point) return showAlert(t('noPointSelected'));
  const scientificName = String(ui.speciesReferenceSciInput?.value || ui.plantNameSci?.value || point.plantNameSci || '').trim();
  const commonName = String(ui.speciesReferenceCommonInput?.value || ui.plantNameCn?.value || point.plantNameCn || '').trim();
  if (!scientificName && !commonName) return showAlert(t('speciesReferenceNeedName'));

  clearSpeciesReferenceCache();
  setSpeciesReferenceBusy(true);
  try {
    const result = await callIpc(window.plantApp.species.referenceQuery({
      scientificName,
      commonName,
      locale: speciesReferenceLocale()
    }));
    renderSpeciesReferenceResults(result);
    window.plantApp?.log?.report?.({
      level: 'info',
      scope: 'species-reference:query',
      message: 'Species reference queried',
      details: { count: result.suggestions?.length || 0 }
    }).catch(() => {});
  } catch (error) {
    clearSpeciesReferenceCache();
    handleUiError(error, 'species-reference:query', {
      title: t('speciesReferenceFailed')
    });
  } finally {
    setSpeciesReferenceBusy(false);
  }
}

function buildSpeciesReferenceNote(suggestion) {
  const classification = suggestion.classification || {};
  const items = [
    `${suggestion.sourceLabel}: ${suggestion.scientificName || suggestion.canonicalName || ''}`,
    suggestion.commonName ? `${t('plantNameCn')}: ${suggestion.commonName}` : '',
    classification.family ? `${t('speciesReferenceFamily')}: ${classification.family}` : '',
    suggestion.status ? `${t('speciesReferenceStatus')}: ${suggestion.status}` : '',
    Number.isFinite(suggestion.observationsCount) ? `${t('speciesReferenceObservations')}: ${suggestion.observationsCount}` : '',
    suggestion.sourceUrl
  ].filter(Boolean);
  return `${t('speciesReferenceNotePrefix')}${items.join('；')}`;
}

async function applySpeciesReferenceSuggestion() {
  if (typeof guardMaintenanceReadOnlyAction === 'function' && guardMaintenanceReadOnlyAction('apply-species-reference')) return;
  const point = getEditablePoint();
  const suggestion = selectedSpeciesReferenceSuggestion();
  if (!point || !suggestion) return showAlert(t('speciesReferenceNoSelection'));
  if (speciesReferenceCache?.pointId && speciesReferenceCache.pointId !== point.id) {
    clearSpeciesReferenceCache();
    return showAlert(t('speciesReferencePointChanged'));
  }

  const useSci = !!ui.speciesReferenceApplySci?.checked && !!suggestion.scientificName;
  const useCommon = !!ui.speciesReferenceApplyCommon?.checked && !!suggestion.commonName;
  const appendNote = !!ui.speciesReferenceAppendNote?.checked;
  if (!useSci && !useCommon && !appendNote) return showAlert(t('speciesReferenceNoFieldSelected'));

  const ok = await openConfirmDialog({
    title: t('speciesReferenceApply'),
    message: t('speciesReferenceApplyConfirm'),
    acceptLabel: t('speciesReferenceApply'),
    cancelLabel: t('cancelAction')
  });
  if (!ok) return;

  if (useSci) {
    point.plantNameSci = suggestion.scientificName;
    if (ui.plantNameSci) ui.plantNameSci.value = suggestion.scientificName;
  }
  if (useCommon) {
    point.plantNameCn = suggestion.commonName;
    if (ui.plantNameCn) ui.plantNameCn.value = suggestion.commonName;
  }
  if (appendNote) {
    const entry = getSelectedPhenologyEntry(point) || getPhenologyEntries(point)[0];
    if (entry) {
      const note = buildSpeciesReferenceNote(suggestion);
      entry.note = [entry.note, note].filter(Boolean).join('\n');
      if (ui.plantNote) ui.plantNote.value = entry.note;
    }
  }

  syncPointSummary(point);
  updatePointTooltip(point);
  renderAllDerived();
  await persistProject();
  toast(t('speciesReferenceApplied'));
  window.plantApp?.log?.report?.({
    level: 'info',
    scope: 'species-reference:apply',
    message: 'Species reference applied by user',
    details: { pointId: point.pointId || point.id, source: suggestion.sourceLabel }
  }).catch(() => {});
  closeSpeciesReferenceCenter();
}

function bindSpeciesReferenceEvents() {
  ui.btnOpenSpeciesReference?.addEventListener('click', openSpeciesReferenceCenter);
  ui.btnOpenSpeciesReferenceInline?.addEventListener('click', openSpeciesReferenceCenter);
  ui.btnCloseSpeciesReferenceModal?.addEventListener('click', closeSpeciesReferenceCenter);
  ui.speciesReferenceModal?.querySelector('.layer-modal-backdrop')
    ?.addEventListener('click', closeSpeciesReferenceCenter);
  ui.btnRunSpeciesReference?.addEventListener('click', runSpeciesReferenceQuery);
  ui.btnDiscardSpeciesReference?.addEventListener('click', closeSpeciesReferenceCenter);
  ui.btnApplySpeciesReference?.addEventListener('click', applySpeciesReferenceSuggestion);
  ui.speciesReferenceResults?.addEventListener('change', event => {
    if (!speciesReferenceCache || event.target.name !== 'speciesReferenceSuggestion') return;
    speciesReferenceCache.selectedId = event.target.value;
    renderSpeciesReferenceResults(speciesReferenceCache);
  });
}
