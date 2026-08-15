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
  const useTaxonomy = !!ui.speciesReferenceApplyTaxonomy?.checked && !!(suggestion.classification?.family || suggestion.classification?.genus);
  const appendNote = !!ui.speciesReferenceAppendNote?.checked;
  if (!useSci && !useCommon && !useTaxonomy && !appendNote) return showAlert(t('speciesReferenceNoFieldSelected'));

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
  if (useTaxonomy) {
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
    const classification = suggestion.classification || {};
    const provider = suggestion.source === 'gbif' ? 'GBIF' : 'iNaturalist';
    const patch = {
      family: classification.family || '',
      genus: classification.genus || '',
      taxonomySource: provider,
      taxonomyMatchedName: suggestion.scientificName || suggestion.canonicalName || '',
      taxonomyConfidence: Number.isFinite(Number(suggestion.confidence)) ? Number(suggestion.confidence) : null,
      taxonomyConfidenceLabel: 'medium',
      taxonomyVerificationStatus: 'suggested',
      identificationStatus: 'needReview',
      taxonomyUpdatedAt: new Date().toISOString(),
      taxonomyCandidatesSummary: [{
        provider,
        matchedName: suggestion.scientificName || suggestion.canonicalName || '',
        scientificName: suggestion.scientificName || '',
        canonicalName: suggestion.canonicalName || '',
        family: classification.family || '',
        genus: classification.genus || '',
        rank: suggestion.rank || '',
        score: Number.isFinite(Number(suggestion.confidence)) ? Number(suggestion.confidence) : null,
        matchType: suggestion.matchType || '',
        occurrenceWeight: 1
      }]
    };
    if (typeof applyTaxonomyFieldsToPoint === 'function') {
      applyTaxonomyFieldsToPoint(point, patch, { overwrite });
    } else {
      if (patch.family && (overwrite || !point.family)) point.family = patch.family;
      if (patch.genus && (overwrite || !point.genus)) point.genus = patch.genus;
      point.taxonomySource = patch.taxonomySource;
      point.taxonomyVerificationStatus = patch.taxonomyVerificationStatus;
      point.taxonomyUpdatedAt = patch.taxonomyUpdatedAt;
    }
    refreshTaxonomyPanel?.(point);
  }

  syncPointSummary(point);
  updatePointTooltip(point);
  renderAllDerived();
  await persistProject();
  if (typeof setPointEditorDraftBaseline === 'function') setPointEditorDraftBaseline();
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
