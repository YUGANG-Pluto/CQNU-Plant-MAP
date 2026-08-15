function bindPhenologyFeatureEvents() {
  if (!ui.pointEditorModal || ui.pointEditorModal.dataset.phenologyEventsBound === 'true') return;
  ui.btnOpenPointEditor?.addEventListener('click', openPointEditor);
  ui.btnOpenPointEditorInline?.addEventListener('click', openPointEditor);
  ui.btnClosePointEditorModal?.addEventListener('click', () => closePointEditor());
  ui.pointEditorModal.querySelector('.layer-modal-backdrop')?.addEventListener('click', () => closePointEditor());
  ui.btnAddPhenology?.addEventListener('click', addPhenologyEntry);
  ui.btnDeletePhenology?.addEventListener('click', deletePhenologyEntry);
  bindTaxonomyEvents();
  ui.pointEditorModal.dataset.phenologyEventsBound = 'true';
}
