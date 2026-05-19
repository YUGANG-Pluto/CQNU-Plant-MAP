let speciesReferenceCache = null;

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
    ? `<a href="${escapeHtml(safeUrl)}" data-external-url="${escapeHtml(safeUrl)}" rel="noreferrer">${escapeHtml(label || safeUrl)}</a>`
    : '';
}

async function openReferenceExternalUrl(value) {
  const url = safeExternalUrl(value);
  if (!url) return;
  try {
    await callIpc(window.plantApp.window.openExternal({ url }));
  } catch (error) {
    handleUiError(error, 'species-reference:open-external', {
      title: t('operationFailed')
    });
  }
}

function interceptReferenceExternalLink(event) {
  const anchor = event.target?.closest?.('a[data-external-url]');
  if (!anchor) return false;
  event.preventDefault();
  openReferenceExternalUrl(anchor.dataset.externalUrl || anchor.href);
  return true;
}

function clearSpeciesReferenceCache() {
  speciesReferenceCache = null;
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
  if (ui.btnRunSpeciesReference) ui.btnRunSpeciesReference.disabled = !!busy;
  if (ui.btnRunSpeciesReference) ui.btnRunSpeciesReference.textContent = busy ? t('speciesReferenceRunning') : t('runSpeciesReference');
}

function setSpeciesImageCompareBusy(busy) {
  if (ui.btnRunSpeciesImageCompare) ui.btnRunSpeciesImageCompare.disabled = !!busy;
  if (ui.btnRunSpeciesImageCompare) {
    ui.btnRunSpeciesImageCompare.textContent = busy
      ? t('speciesReferenceImageCompareRunning')
      : t('speciesReferenceRunImageCompare');
  }
  if (ui.speciesReferenceImageTokenInput) ui.speciesReferenceImageTokenInput.disabled = !!busy;
}

function speciesReferenceLocale() {
  return (state.settings?.language || 'zh') === 'zh' ? 'zh-CN' : 'en';
}

function sourceStatusLabel(sources = {}) {
  const known = [
    ['gbif', 'GBIF'],
    ['inaturalist', 'iNaturalist'],
    ['inaturalistVision', 'iNaturalist CV']
  ].filter(([key]) => Object.prototype.hasOwnProperty.call(sources, key));
  return known.map(([key, label]) => {
    const item = sources[key] || {};
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

function speciesReferenceImageSet(suggestion) {
  const urls = [
    suggestion?.photoUrl,
    ...(suggestion?.images || []).map(item => item.url)
  ].map(safeExternalUrl).filter(Boolean);
  return [...new Set(urls)];
}

function hasReferenceDetails(suggestion) {
  if (!suggestion) return false;
  return !!(
    (suggestion.descriptions || []).length ||
    (suggestion.featureHints || []).length ||
    (suggestion.vernacularNames || []).length ||
    suggestion.conservationStatus ||
    suggestion.photoAttribution ||
    speciesReferenceImageSet(suggestion).length
  );
}

function syncSpeciesReferenceApplyControls(suggestion) {
  const hasSuggestion = !!suggestion;
  [
    ui.speciesReferenceApplySci,
    ui.speciesReferenceApplyCommon,
    ui.speciesReferenceAppendNote,
    ui.btnPreviewSpeciesReferenceImage,
    ui.btnApplySpeciesReference
  ].forEach(node => { if (node) node.disabled = !hasSuggestion; });
  if (ui.btnPreviewSpeciesReferenceImage) {
    ui.btnPreviewSpeciesReferenceImage.disabled = !hasSuggestion || !speciesReferenceImageSet(suggestion).length;
  }
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
  if (ui.speciesReferenceAppendNote) ui.speciesReferenceAppendNote.checked = hasReferenceDetails(suggestion);
  if (typeof syncMaintenanceSafeModeUi === 'function') syncMaintenanceSafeModeUi();
}

function renderSpeciesReferenceCard(item, checked) {
  const photo = safeExternalUrl(item.photoUrl)
    ? `<img src="${escapeHtml(safeExternalUrl(item.photoUrl))}" alt="${escapeHtml(item.scientificName || item.commonName || '')}" loading="lazy" />`
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
  const sourceUrl = safeExternalUrl(item.sourceUrl);
  const wikiUrl = safeExternalUrl(item.wikipediaUrl);
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
        <div class="species-reference-meta">${escapeHtml(taxonomy || item.summary || '-')}</div>
        <div class="species-reference-meta">${escapeHtml([item.matchType, confidence, count].filter(Boolean).join(' / ') || '-')}</div>
        <div class="species-reference-links">
          ${externalLinkHtml(sourceUrl, t('speciesReferenceOpenSource'))}
          ${externalLinkHtml(wikiUrl, t('speciesReferenceOpenWiki'))}
        </div>
      </div>
    </label>
  `;
}

function detailListHtml(titleKey, items) {
  const filtered = items.filter(item => item?.value || item?.description || item);
  if (!filtered.length) return '';
  return `
    <section class="species-reference-detail-section">
      <h3>${escapeHtml(t(titleKey))}</h3>
      <div class="species-reference-detail-list">
        ${filtered.map(item => {
          if (typeof item === 'string') return `<div>${escapeHtml(item)}</div>`;
          const label = item.label ? `<strong>${escapeHtml(item.label)}</strong>` : '';
          const value = item.href
            ? externalLinkHtml(item.href, item.value || item.description || item.href || '')
            : escapeHtml(item.value || item.description || '');
          return `<div>${label}<span>${value}</span></div>`;
        }).join('')}
      </div>
    </section>
  `;
}

function taxonomyDetailRows(suggestion) {
  const classification = suggestion?.classification || {};
  return [
    { label: t('speciesReferenceKingdom'), value: classification.kingdom },
    { label: t('speciesReferencePhylum'), value: classification.phylum },
    { label: t('speciesReferenceClass'), value: classification.className },
    { label: t('speciesReferenceOrder'), value: classification.order },
    { label: t('speciesReferenceFamily'), value: classification.family },
    { label: t('speciesReferenceGenus'), value: classification.genus },
    { label: t('speciesReferenceSpecies'), value: classification.species || suggestion?.canonicalName || suggestion?.scientificName },
    { label: t('speciesReferenceRank'), value: suggestion?.rank },
    { label: t('speciesReferenceStatus'), value: suggestion?.status },
    { label: t('speciesReferenceConservation'), value: suggestion?.conservationStatus }
  ].filter(row => row.value);
}

function recommendationText(suggestion) {
  const point = getSelectedPoint();
  const fields = [];
  if (suggestion?.scientificName && suggestion.scientificName !== (point?.plantNameSci || '')) fields.push(t('plantNameSci'));
  if (suggestion?.commonName && suggestion.commonName !== (point?.plantNameCn || '')) fields.push(t('plantNameCn'));
  if (hasReferenceDetails(suggestion)) fields.push(t('plantNote'));
  return fields.length
    ? `${t('speciesReferenceRecommendedFields')}: ${fields.join(' / ')}. ${t('speciesReferenceUnmappedToNote')}`
    : t('speciesReferenceNoRecommendedField');
}

function renderSpeciesReferenceImages(suggestion) {
  const images = speciesReferenceImageSet(suggestion);
  if (!images.length) return '';
  return `
    <section class="species-reference-detail-section">
      <h3>${escapeHtml(t('speciesReferenceImages'))}</h3>
      <div class="species-reference-image-strip">
        ${images.map((url, index) => `
          <button type="button" class="species-reference-thumb" data-image-url="${escapeHtml(url)}" title="${escapeHtml(t('speciesReferencePreviewImage'))}">
            <img src="${escapeHtml(url)}" alt="${escapeHtml(`${suggestion.scientificName || suggestion.commonName || ''} ${index + 1}`)}" loading="lazy" />
          </button>
        `).join('')}
      </div>
      ${suggestion.photoAttribution ? `<p class="species-reference-credit">${escapeHtml(suggestion.photoAttribution)}</p>` : ''}
    </section>
  `;
}

function renderSpeciesComparedImage() {
  const fileUrl = safePreviewUrl(speciesReferenceCache?.selectedImageFileUrl);
  if (!fileUrl) return '';
  return `
    <section class="species-reference-detail-section">
      <h3>${escapeHtml(t('speciesReferenceComparedImage'))}</h3>
      <div class="species-reference-compared-image-row">
        <button type="button" class="species-reference-thumb species-reference-compared-thumb" data-compared-image="${escapeHtml(fileUrl)}" title="${escapeHtml(t('speciesReferencePreviewComparedImage'))}">
          <img src="${escapeHtml(fileUrl)}" alt="${escapeHtml(speciesReferenceCache?.selectedImageName || '')}" />
        </button>
        <div>
          <strong>${escapeHtml(speciesReferenceCache?.selectedImageName || t('notFilled'))}</strong>
          <span>${escapeHtml(t('speciesReferenceComparedImageHint'))}</span>
        </div>
      </div>
    </section>
  `;
}

function renderSpeciesReferenceDetail(suggestion) {
  if (!ui.speciesReferenceDetail) return;
  if (!suggestion) {
    ui.speciesReferenceDetail.textContent = t('speciesReferenceDetailEmpty');
    ui.speciesReferenceDetail.classList.add('is-empty');
    return;
  }
  const descriptions = (suggestion.descriptions || []).map(item => ({
    label: item.source || suggestion.sourceLabel,
    description: item.description
  }));
  const features = (suggestion.featureHints || []).map(value => ({ value }));
  const names = (suggestion.vernacularNames || []).map(value => ({ value }));
  const sourceLinks = [
    safeExternalUrl(suggestion.sourceUrl) ? { label: suggestion.sourceLabel, value: safeExternalUrl(suggestion.sourceUrl), href: safeExternalUrl(suggestion.sourceUrl) } : null,
    safeExternalUrl(suggestion.wikipediaUrl) ? { label: t('speciesReferenceOpenWiki'), value: safeExternalUrl(suggestion.wikipediaUrl), href: safeExternalUrl(suggestion.wikipediaUrl) } : null
  ].filter(Boolean);
  ui.speciesReferenceDetail.classList.remove('is-empty');
  ui.speciesReferenceDetail.innerHTML = `
    <div class="species-reference-detail-head">
      <div>
        <strong>${escapeHtml(suggestion.scientificName || suggestion.canonicalName || t('notFilled'))}</strong>
        <span>${escapeHtml(suggestion.commonName || t('notFilled'))}</span>
      </div>
      <span class="pill">${escapeHtml(suggestion.sourceLabel || suggestion.source || '')}</span>
    </div>
    <p class="species-reference-recommendation">${escapeHtml(recommendationText(suggestion))}</p>
    ${renderSpeciesComparedImage()}
    ${detailListHtml('speciesReferenceClassification', taxonomyDetailRows(suggestion))}
    ${detailListHtml('speciesReferenceVernacularNames', names)}
    ${detailListHtml('speciesReferenceFeatureNotes', descriptions.length ? descriptions : features)}
    ${features.length && descriptions.length ? detailListHtml('speciesReferenceProfileHints', features) : ''}
    ${renderSpeciesReferenceImages(suggestion)}
    ${detailListHtml('speciesReferenceSourceLinks', sourceLinks)}
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

  const imageLabel = data.selectedImageName ? `${t('speciesReferenceComparedImage')}: ${data.selectedImageName} / ` : '';
  ui.speciesReferenceSummary.textContent = `${imageLabel}${t('speciesReferenceResultSummary')} ${suggestions.length} / ${sourceStatusLabel(data.sources)}`;
  if (!suggestions.length) {
    ui.speciesReferenceResults.innerHTML = `<div class="hint-box">${escapeHtml(t('speciesReferenceNoResult'))}</div>`;
    renderSpeciesReferenceDetail(null);
    syncSpeciesReferenceApplyControls(null);
    return;
  }

  ui.speciesReferenceResults.innerHTML = suggestions
    .map(item => renderSpeciesReferenceCard(item, item.id === speciesReferenceCache.selectedId))
    .join('');
  const selected = selectedSpeciesReferenceSuggestion();
  renderSpeciesReferenceDetail(selected);
  syncSpeciesReferenceApplyControls(selected);
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

async function runSpeciesImageCompare() {
  const point = getSelectedPoint();
  if (!point) return showAlert(t('noPointSelected'));

  clearSpeciesReferenceCache();
  setSpeciesImageCompareBusy(true);
  if (ui.speciesReferenceImageCompareStatus) {
    ui.speciesReferenceImageCompareStatus.textContent = t('speciesReferenceImageCompareRunning');
  }
  try {
    const result = await callIpc(window.plantApp.species.imageCompare({
      locale: speciesReferenceLocale(),
      token: String(ui.speciesReferenceImageTokenInput?.value || '').trim()
    }));
    if (result.canceled) {
      if (ui.speciesReferenceImageCompareStatus) {
        ui.speciesReferenceImageCompareStatus.textContent = t('speciesReferenceImageCompareCanceled');
      }
      return;
    }
    renderSpeciesReferenceResults(result);
    if (ui.speciesReferenceImageCompareStatus) {
      ui.speciesReferenceImageCompareStatus.textContent = `${t('speciesReferenceImageCompareDone')} ${result.suggestions?.length || 0}`;
    }
    window.plantApp?.log?.report?.({
      level: 'info',
      scope: 'species-reference:image-compare',
      message: 'Species image comparison completed',
      details: { count: result.suggestions?.length || 0, uploadedBytes: result.uploadedBytes || 0 }
    }).catch(() => {});
  } catch (error) {
    clearSpeciesReferenceCache();
    handleUiError(error, 'species-reference:image-compare', {
      title: t('speciesReferenceImageCompareFailed')
    });
  } finally {
    setSpeciesImageCompareBusy(false);
  }
}

function buildSpeciesReferenceNote(suggestion) {
  const classification = taxonomyDetailRows(suggestion)
    .map(row => `${row.label}: ${row.value}`)
    .join('; ');
  const descriptions = (suggestion.descriptions || [])
    .map(item => [item.source, item.description].filter(Boolean).join(': '))
    .join('; ');
  const features = (suggestion.featureHints || []).join('; ');
  const names = (suggestion.vernacularNames || []).join(' / ');
  const imageCredit = suggestion.photoAttribution || (suggestion.images || []).map(item => item.creator || item.license).filter(Boolean).join('; ');
  const items = [
    `${suggestion.sourceLabel}: ${suggestion.scientificName || suggestion.canonicalName || ''}`,
    suggestion.commonName ? `${t('plantNameCn')}: ${suggestion.commonName}` : '',
    names ? `${t('speciesReferenceVernacularNames')}: ${names}` : '',
    classification ? `${t('speciesReferenceClassification')}: ${classification}` : '',
    descriptions ? `${t('speciesReferenceFeatureNotes')}: ${descriptions}` : '',
    features ? `${t('speciesReferenceProfileHints')}: ${features}` : '',
    Number.isFinite(suggestion.observationsCount) ? `${t('speciesReferenceObservations')}: ${suggestion.observationsCount}` : '',
    imageCredit ? `${t('speciesReferenceImageCredit')}: ${imageCredit}` : '',
    safeExternalUrl(suggestion.sourceUrl),
    safeExternalUrl(suggestion.wikipediaUrl)
  ].filter(Boolean);
  return `${t('speciesReferenceNotePrefix')}${items.join('; ')}`;
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
    if (!entry) return showAlert(t('noPhenologySelected'));
    const note = buildSpeciesReferenceNote(suggestion);
    entry.note = [entry.note, note].filter(Boolean).join('\n');
    if (ui.plantNote) ui.plantNote.value = entry.note;
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

function openSelectedSpeciesReferenceImage(imageUrl = '') {
  const suggestion = selectedSpeciesReferenceSuggestion();
  if (!suggestion) return showAlert(t('speciesReferenceNoSelection'));
  const imageSet = speciesReferenceImageSet(suggestion);
  const src = safeExternalUrl(imageUrl) || imageSet[0];
  if (!src) return showAlert(t('noImage'));
  const caption = [suggestion.scientificName, suggestion.commonName, suggestion.sourceLabel].filter(Boolean).join(' / ');
  openImagePreview(src, caption, imageSet);
}

function bindSpeciesReferenceEvents() {
  ui.btnOpenSpeciesReference?.addEventListener('click', openSpeciesReferenceCenter);
  ui.btnOpenSpeciesReferenceInline?.addEventListener('click', openSpeciesReferenceCenter);
  ui.btnCloseSpeciesReferenceModal?.addEventListener('click', closeSpeciesReferenceCenter);
  ui.speciesReferenceModal?.querySelector('.layer-modal-backdrop')
    ?.addEventListener('click', closeSpeciesReferenceCenter);
  ui.btnRunSpeciesReference?.addEventListener('click', runSpeciesReferenceQuery);
  ui.btnRunSpeciesImageCompare?.addEventListener('click', runSpeciesImageCompare);
  ui.btnPreviewSpeciesReferenceImage?.addEventListener('click', () => openSelectedSpeciesReferenceImage());
  ui.btnDiscardSpeciesReference?.addEventListener('click', closeSpeciesReferenceCenter);
  ui.btnApplySpeciesReference?.addEventListener('click', applySpeciesReferenceSuggestion);
  ui.speciesReferenceResults?.addEventListener('change', event => {
    if (!speciesReferenceCache || event.target.name !== 'speciesReferenceSuggestion') return;
    speciesReferenceCache.selectedId = event.target.value;
    renderSpeciesReferenceResults(speciesReferenceCache);
  });
  ui.speciesReferenceResults?.addEventListener('click', interceptReferenceExternalLink);
  ui.speciesReferenceDetail?.addEventListener('click', event => {
    if (interceptReferenceExternalLink(event)) return;
    const button = event.target.closest('.species-reference-thumb');
    if (!button) return;
    if (button.dataset.comparedImage) {
      openImagePreview(button.dataset.comparedImage, speciesReferenceCache?.selectedImageName || t('speciesReferenceComparedImage'), [button.dataset.comparedImage]);
      return;
    }
    openSelectedSpeciesReferenceImage(button.dataset.imageUrl || '');
  });
}
