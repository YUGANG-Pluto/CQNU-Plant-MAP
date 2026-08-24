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
    ui.speciesReferenceApplyTaxonomy,
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
    if (ui.speciesReferenceApplyTaxonomy) ui.speciesReferenceApplyTaxonomy.checked = false;
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
  if (ui.speciesReferenceApplyTaxonomy) {
    const classification = suggestion.classification || {};
    const currentFamily = String(ui.familyInput?.value || getSelectedPoint()?.family || '').trim();
    const currentGenus = String(ui.genusInput?.value || getSelectedPoint()?.genus || '').trim();
    const hasTaxonomy = !!(classification.family || classification.genus);
    ui.speciesReferenceApplyTaxonomy.checked = hasTaxonomy && (!currentFamily || !currentGenus);
    ui.speciesReferenceApplyTaxonomy.disabled = !hasTaxonomy;
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
    <div class="${className}" data-suggestion-id="${escapeHtml(item.id)}">
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
    </div>
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
  if (suggestion?.classification?.family || suggestion?.classification?.genus) fields.push(`${t('speciesReferenceFamily')} / ${t('speciesReferenceGenus')}`);
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
  const pointId = getSelectedPoint()?.id || '';
  const panelState = getSpeciesReferencePanelController()?.replace(data, pointId);
  const selectedId = panelState?.selectedId || (
    suggestions.some(item => item.id === data.selectedId) ? data.selectedId : suggestions[0]?.id || ''
  );
  speciesReferenceCache = {
    ...data,
    pointId,
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
