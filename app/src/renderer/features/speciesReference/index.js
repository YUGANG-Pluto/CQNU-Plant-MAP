function bindSpeciesReferenceEvents() {
  ui.btnOpenSpeciesReference?.addEventListener('click', openSpeciesReferenceCenter);
  ui.btnOpenSpeciesReferenceInline?.addEventListener('click', openSpeciesReferenceCenter);
  ui.btnCloseSpeciesReferenceModal?.addEventListener('click', closeSpeciesReferenceCenter);
  ui.speciesReferenceModal?.querySelector('.layer-modal-backdrop')
    ?.addEventListener('click', closeSpeciesReferenceCenter);
  ui.btnRunSpeciesReference?.addEventListener('click', runSpeciesReferenceQuery);
  ui.btnOpenInatTokenPage?.addEventListener('click', () => openReferenceExternalUrl(INATURALIST_API_TOKEN_URL));
  ui.btnRunSpeciesImageCompare?.addEventListener('click', runSpeciesImageCompare);
  ui.btnPreviewSpeciesReferenceImage?.addEventListener('click', () => openSelectedSpeciesReferenceImage());
  ui.btnDiscardSpeciesReference?.addEventListener('click', closeSpeciesReferenceCenter);
  ui.btnApplySpeciesReference?.addEventListener('click', applySpeciesReferenceSuggestion);
  ui.speciesReferenceResults?.addEventListener('change', event => {
    if (!speciesReferenceCache || event.target.name !== 'speciesReferenceSuggestion') return;
    selectSpeciesReferenceSuggestion(event.target.value);
  });
  ui.speciesReferenceResults?.addEventListener('click', event => {
    if (interceptReferenceExternalLink(event)) return;
    if (event.target?.matches?.('input[name="speciesReferenceSuggestion"]')) return;
    const card = event.target?.closest?.('.species-reference-card[data-suggestion-id]');
    if (!card) return;
    selectSpeciesReferenceSuggestion(card.dataset.suggestionId || '');
  });
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
