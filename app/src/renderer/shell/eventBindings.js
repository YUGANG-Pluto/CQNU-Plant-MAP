function bindProjectEvents() {
  ui.btnChooseDir.addEventListener('click', chooseAndLoadProject);
  ui.btnSave.addEventListener('click', async () => {
    if (typeof guardMaintenanceReadOnlyAction === 'function' && guardMaintenanceReadOnlyAction('save-project')) return;
    await persistProject();
    showAlert(t('saveSuccess'));
  });

  document.querySelectorAll('.seg-btn[data-lang]').forEach(button => {
    button.addEventListener('click', async () => {
      if (typeof guardMaintenanceReadOnlyAction === 'function' && guardMaintenanceReadOnlyAction('switch-language')) return;
      if (!state.settings) return;
      state.settings.language = button.dataset.lang;
      applyI18n();
      await persistProject();
    });
  });

  ui.btnExportCsv.addEventListener('click', exportRecordsCSV);
  ui.btnExportGeoJSON.addEventListener('click', exportGeoJSON);
  ui.btnImportCsv.addEventListener('click', importRecordsCSV);
  ui.btnImportGeoJSON.addEventListener('click', importGeoJSON);
}

function bindMapEvents() {
  ui.btnModeBrowse.addEventListener('click', () => setMode('browse'));
  ui.btnModeDrawZone.addEventListener('click', () => {
    if (!requireProject()) return;
    if (state.pendingPoint) return showAlert(t('pendingPointBlocked'));
    setMode('drawZone');
  });
  ui.btnModeAddPoint.addEventListener('click', () => {
    if (!requireProject()) return;
    if (!getSelectedZone()) return showAlert(t('chooseZoneThenAddPoint'));
    setMode('addPoint');
  });

  ui.btnConfirmPoint.addEventListener('click', confirmPendingPoint);
  ui.btnCancelPoint.addEventListener('click', cancelPendingPoint);
  ui.btnDeleteZone.addEventListener('click', deleteCurrentZone);
  ui.btnDeletePoint.addEventListener('click', deleteCurrentPoint);
  ui.btnApplyZone.addEventListener('click', applyZoneInfo);
  ui.btnApplyPoint.addEventListener('click', applyPointInfo);
  ui.btnChooseImage.addEventListener('click', chooseAndImportImage);
}

function bindBasemapEvents() {
  ui.baseMapSelect.addEventListener('change', async () => {
    if (typeof guardMaintenanceReadOnlyAction === 'function' && guardMaintenanceReadOnlyAction('switch-basemap')) {
      renderBaseMapSelect();
      return;
    }
    state.settings.activeBaseMapId = ui.baseMapSelect.value;
    if (typeof isAutoNormalizeBasemapEnabled === 'function' && isAutoNormalizeBasemapEnabled()) {
      standardizeCurrentBasemapConfig({ silent: true });
    }
    applyActiveBaseMap();
    await persistProject();
  });

  ui.autoNormalizeBasemapSwitch?.addEventListener('click', toggleAutoNormalizeBasemap);
  ui.autoNormalizeBasemapSwitch?.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    toggleAutoNormalizeBasemap();
  });
  ui.btnBasemapDetect?.addEventListener('click', runBasemapStatusCheck);
  ui.btnBasemapStandardize?.addEventListener('click', runBasemapStandardize);
  ui.btnCorrectSelectionGcj?.addEventListener('click', () => correctSelectedGeometry('GCJ02'));
  ui.btnCorrectSelectionBd?.addEventListener('click', () => correctSelectedGeometry('BD09'));
  ui.btnUndoCoordCorrection?.addEventListener('click', undoLastCoordinateCorrection);

  ui.bmEditTarget.addEventListener('change', () => {
    const basemap = state.settings?.baseMaps.find(item => item.id === ui.bmEditTarget.value);
    if (basemap) fillBasemapForm(basemap);
    else newBasemapForm();
  });

  ui.btnToggleBasemapEditor.addEventListener('click', openBasemapWorkspacePanel);
  ui.btnCloseBasemapWorkspaceModal?.addEventListener('click', closeBasemapWorkspacePanel);
  ui.btnCloseBasemapWorkspaceFooter?.addEventListener('click', closeBasemapWorkspacePanel);
  ui.basemapWorkspaceModal?.querySelector('.layer-modal-backdrop')
    ?.addEventListener('click', closeBasemapWorkspacePanel);
  document.querySelectorAll('.basemap-tab').forEach(button => {
    button.addEventListener('click', () => setBasemapWorkspaceTab(button.dataset.basemapTab || 'source'));
  });

  ui.btnNewBaseMap.addEventListener('click', newBasemapForm);
  ui.btnSaveBaseMap.addEventListener('click', saveBasemap);
  ui.btnDeleteBaseMap.addEventListener('click', deleteBasemap);

  ui.bmOverlayTarget?.addEventListener('change', () => {
    const overlay = state.settings?.baseMaps.find(item => item.id === ui.bmOverlayTarget.value);
    if (overlay) fillOverlayForm(overlay);
    else newOverlayForm();
    renderOverlayStatusPanel();
  });
  ui.bmOverlayOpacity?.addEventListener('input', () => {
    if (ui.bmOverlayOpacityValue) ui.bmOverlayOpacityValue.textContent = `${Math.round(Number(ui.bmOverlayOpacity.value || 0) * 100)}%`;
  });
  ui.btnNewOverlay?.addEventListener('click', newOverlayForm);
  ui.btnTestOverlay?.addEventListener('click', testOverlayConfig);
  ui.btnSaveOverlay?.addEventListener('click', saveOverlayConfig);
  ui.btnResetBuiltinOverlays?.addEventListener('click', resetBuiltinOverlays);
}

function bindListEvents() {
  ui.btnTabZones.addEventListener('click', () => {
    state.activeListTab = 'zones';
    renderLists();
  });
  ui.btnTabPoints.addEventListener('click', () => {
    state.activeListTab = 'points';
    renderLists();
  });
}

function openStatsCenterOverview() {
  state.statsTab = 'overview';
  renderStatsModal();
  if (typeof syncThemeControls === 'function') syncThemeControls();
  openLayerModal(ui.statsModal);
}

function bindStatsEvents() {
  ui.btnOpenStats.addEventListener('click', openStatsCenterOverview);
  ui.btnOpenStatsFromSummary?.addEventListener('click', openStatsCenterOverview);
  ui.btnCloseStatsModal.addEventListener('click', () => closeLayerModal(ui.statsModal));
  ui.statsModal.querySelector('.layer-modal-backdrop')
    .addEventListener('click', () => closeLayerModal(ui.statsModal));

  document.querySelectorAll('.stats-tab').forEach(button => {
    button.addEventListener('click', () => {
      state.statsTab = button.dataset.tab;
      renderStatsModal();
      if (typeof syncThemeControls === 'function') syncThemeControls();
    });
  });
}

function bindQueryEvents() {
  ui.btnOpenQuery.addEventListener('click', () => {
    populateQueryFilters();
    renderQueryResults();
    openLayerModal(ui.queryModal);
    ui.queryText.focus();
  });

  ui.btnCloseQueryModal.addEventListener('click', () => closeLayerModal(ui.queryModal));
  ui.queryModal.querySelector('.layer-modal-backdrop')
    .addEventListener('click', () => closeLayerModal(ui.queryModal));

  [
    ui.queryText,
    ui.queryZone,
    ui.queryCompleteness,
    ui.queryGrowthForm,
    ui.queryFloweringState,
    ui.queryCultivatedStatus,
    ui.queryHabitat,
    ui.queryObserver,
    ui.queryDateStart,
    ui.queryDateEnd
  ].forEach(node => node && node.addEventListener('input', renderQueryResults));

  ui.queryZone?.addEventListener('change', renderQueryResults);
  ui.queryCompleteness?.addEventListener('change', renderQueryResults);
  ui.btnRunQuery.addEventListener('click', renderQueryResults);
  ui.btnResetQuery.addEventListener('click', resetQueryForm);
}

function resetQueryForm() {
  ui.queryText.value = '';
  ui.queryZone.value = '';
  if (ui.queryCompleteness) ui.queryCompleteness.value = '';
  ui.queryGrowthForm.value = '';
  ui.queryFloweringState.value = '';
  ui.queryCultivatedStatus.value = '';
  ui.queryHabitat.value = '';
  ui.queryObserver.value = '';
  ui.queryDateStart.value = '';
  ui.queryDateEnd.value = '';
  renderQueryResults();
}

function bindRecycleAndEditorEvents() {
  ui.btnOpenTrash.addEventListener('click', () => {
    renderTrashList();
    openLayerModal(ui.trashModal);
  });
  ui.btnCloseTrashModal.addEventListener('click', () => closeLayerModal(ui.trashModal));
  ui.trashModal.querySelector('.layer-modal-backdrop')
    .addEventListener('click', () => closeLayerModal(ui.trashModal));
  ui.btnRestoreTrash.addEventListener('click', restoreSelectedTrash);
  ui.btnDeleteTrashForever.addEventListener('click', deleteTrashForever);

  ui.btnOpenPointEditor?.addEventListener('click', openPointEditor);
  ui.btnOpenPointEditorInline?.addEventListener('click', openPointEditor);
  ui.btnClosePointEditorModal?.addEventListener('click', closePointEditor);
  ui.pointEditorModal?.querySelector('.layer-modal-backdrop')?.addEventListener('click', closePointEditor);
  ui.btnAddPhenology?.addEventListener('click', addPhenologyEntry);
  ui.btnDeletePhenology?.addEventListener('click', deletePhenologyEntry);
  if (typeof bindTaxonomyEvents === 'function') bindTaxonomyEvents();
}

function bindThemeEvents() {
  ui.btnOpenTheme?.addEventListener('click', openThemeCenter);
  ui.btnCloseThemeModal?.addEventListener('click', () => closeLayerModal(ui.themeModal));
  ui.themeModal?.querySelector('.layer-modal-backdrop')
    ?.addEventListener('click', () => closeLayerModal(ui.themeModal));
  bindThemePanelEvents();
}

function bindMergeEvents() {
  ui.btnOpenMerge?.addEventListener('click', openMergeCenter);
  ui.btnCloseMergeModal?.addEventListener('click', () => closeLayerModal(ui.mergeModal));
  ui.mergeModal?.querySelector('.layer-modal-backdrop')
    ?.addEventListener('click', () => closeLayerModal(ui.mergeModal));

  ui.btnChooseMergeBase?.addEventListener('click', async () => {
    state.mergeBaseDir = await chooseProjectDirectoryForMerge() || state.mergeBaseDir;
    updateMergePaths();
  });
  ui.btnChooseMergeOther?.addEventListener('click', async () => {
    state.mergeOtherDir = await chooseProjectDirectoryForMerge() || state.mergeOtherDir;
    updateMergePaths();
  });
  ui.btnRunMerge?.addEventListener('click', runMergeFlow);

  ui.btnCloseMergeReviewModal?.addEventListener('click', () => settleMergeReview(null));
  ui.mergeReviewModal?.querySelector('.layer-modal-backdrop')
    ?.addEventListener('click', () => settleMergeReview(null));
  ui.btnMergeReviewCancel?.addEventListener('click', () => settleMergeReview(null));
  ui.btnMergeReviewApply?.addEventListener('click', applyMergeReviewSelection);
}

function applyMergeReviewSelection() {
  if (typeof guardMaintenanceReadOnlyAction === 'function' && guardMaintenanceReadOnlyAction('apply-merge-review')) return;
  const mergeIdxs = [...ui.mergeReviewList.querySelectorAll('input[type=checkbox][data-idx]:checked')]
    .map(node => Number(node.dataset.idx));
  settleMergeReview({ mergeIdxs });
}

function bindBackupEvents() {
  ui.btnBackupProject?.addEventListener('click', openBackupCenter);
  ui.btnCloseBackupModal?.addEventListener('click', () => closeLayerModal(ui.backupModal));
  ui.backupModal?.querySelector('.layer-modal-backdrop')
    ?.addEventListener('click', () => closeLayerModal(ui.backupModal));
  ui.btnChooseBackupTarget?.addEventListener('click', async () => {
    state.backupTargetDir = await chooseBackupDirectory() || state.backupTargetDir;
    updateBackupPaths();
  });
  ui.btnRunManualBackup?.addEventListener('click', runManualBackup);
}

function bindDialogEvents() {
  ui.btnConfirmCancel.addEventListener('click', () => settleConfirmDialog(false));
  ui.btnConfirmAccept.addEventListener('click', () => settleConfirmDialog(true));
  ui.confirmModal.querySelector('.layer-modal-backdrop')
    .addEventListener('click', () => settleConfirmDialog(false));
  ui.btnAlertClose?.addEventListener('click', () => closeLayerModal(ui.alertModal));
  ui.alertModal?.querySelector('.layer-modal-backdrop')
    ?.addEventListener('click', () => closeLayerModal(ui.alertModal));

  ui.btnSmallPromptCancel?.addEventListener('click', () => settleSmallPrompt(''));
  ui.btnSmallPromptAccept?.addEventListener('click', () => {
    settleSmallPrompt(ui.smallPromptInput.value.trim());
  });
  ui.smallPromptModal?.querySelector('.layer-modal-backdrop')
    ?.addEventListener('click', () => settleSmallPrompt(''));
  ui.smallPromptInput?.addEventListener('keydown', event => {
    if (event.key === 'Enter') settleSmallPrompt(ui.smallPromptInput.value.trim());
  });
}

function bindImagePreviewEvents() {
  ui.btnCloseImageModal.addEventListener('click', closeImagePreview);
  ui.imagePreviewModal.querySelector('.image-modal-backdrop')
    .addEventListener('click', closeImagePreview);
  ui.imagePreviewFull.addEventListener('wheel', handleImagePreviewWheel, { passive: false });
  ui.imagePreviewFull.addEventListener('pointerdown', handleImagePreviewPointerDown);
  window.addEventListener('pointermove', handleImagePreviewPointerMove);
  window.addEventListener('pointerup', handleImagePreviewPointerUp);
  ui.imagePreviewFull.addEventListener('dblclick', resetImagePreviewView);
  ui.btnImagePrev.addEventListener('click', showPreviousPreviewImage);
  ui.btnImageNext.addEventListener('click', showNextPreviewImage);
  ui.btnImageReset.addEventListener('click', resetImagePreviewView);
  document.addEventListener('click', handleDocumentImageClick);
}

function handleDocumentImageClick(event) {
  const img = event.target.closest('.pp-thumb, .image-card img');
  if (!img?.dataset.fullImage) return;

  const imageSet = (img.dataset.imageSet || '').split('|').filter(Boolean);
  openImagePreview(img.dataset.fullImage, img.dataset.caption || '', imageSet);
}

function bindKeyboardEvents() {
  document.addEventListener('keydown', event => {
    if (handleFullscreenShortcut(event)) return;
    handleImagePreviewKey(event);
    handleModalEscapeKey(event);
  });
}

function isTextEditingElement(target) {
  const tag = target?.tagName?.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable;
}

function handleFullscreenShortcut(event) {
  if (!(event.altKey && event.key === 'Enter')) return false;
  if (isTextEditingElement(event.target)) return false;

  event.preventDefault();
  toggleFullscreenMode();
  return true;
}

async function toggleFullscreenMode() {
  try {
    if (!window.plantApp?.window?.toggleFullscreen) return;
    await callIpc(window.plantApp.window.toggleFullscreen());
    setTimeout(() => {
      if (typeof scheduleMapResize === 'function') scheduleMapResize();
      if (typeof renderWorkspaceStatsSummary === 'function') renderWorkspaceStatsSummary();
      if (typeof scheduleRightPanelDisplayMode === 'function') scheduleRightPanelDisplayMode('fullscreen-toggle');
      if (!ui.statsModal?.classList.contains('hidden')) renderStatsModal();
    }, 180);
  } catch (error) {
    handleUiError(error, 'window:toggleFullscreen', {
      title: '窗口切换失败'
    });
  }
}

function handleImagePreviewKey(event) {
  if (ui.imagePreviewModal.classList.contains('hidden')) return;
  if (event.key === 'Escape') closeImagePreview();
  if (event.key === 'ArrowLeft') showPreviousPreviewImage();
  if (event.key === 'ArrowRight') showNextPreviewImage();
}

function handleModalEscapeKey(event) {
  if (event.key !== 'Escape') return;

  if (!ui.queryModal.classList.contains('hidden')) closeLayerModal(ui.queryModal);
  if (!ui.statsModal.classList.contains('hidden')) closeLayerModal(ui.statsModal);
  if (!ui.trashModal.classList.contains('hidden')) closeLayerModal(ui.trashModal);
  if (ui.themeModal && !ui.themeModal.classList.contains('hidden')) closeLayerModal(ui.themeModal);
  if (ui.maintenanceModal && !ui.maintenanceModal.classList.contains('hidden')) closeLayerModal(ui.maintenanceModal);
  if (ui.workspaceUtilityDrawer && !ui.workspaceUtilityDrawer.classList.contains('hidden')) closeWorkspaceUtilityDrawer();
  if (ui.rightInspectorDrawer && !ui.rightInspectorDrawer.classList.contains('hidden')) closeRightInspectorDrawer();
  if (ui.basemapWorkspaceModal && !ui.basemapWorkspaceModal.classList.contains('hidden')) closeBasemapWorkspacePanel();
  if (ui.pointEditorModal && !ui.pointEditorModal.classList.contains('hidden')) closePointEditor();
  if (ui.speciesReferenceModal && !ui.speciesReferenceModal.classList.contains('hidden')) closeSpeciesReferenceCenter();
  if (ui.smallPromptModal && !ui.smallPromptModal.classList.contains('hidden')) settleSmallPrompt('');
  if (ui.alertModal && !ui.alertModal.classList.contains('hidden')) closeLayerModal(ui.alertModal);
  if (!ui.confirmModal.classList.contains('hidden')) settleConfirmDialog(false);
}

function bindEvents() {
  bindProjectEvents();
  bindWorkspaceDrawerEvents();
  bindRightPanelEvents();
  bindMapEvents();
  bindBasemapEvents();
  bindListEvents();
  bindStatsEvents();
  bindQueryEvents();
  bindRecycleAndEditorEvents();
  bindThemeEvents();
  bindMergeEvents();
  bindBackupEvents();
  if (typeof bindMaintenanceEvents === 'function') bindMaintenanceEvents();
  if (typeof bindSpeciesReferenceEvents === 'function') bindSpeciesReferenceEvents();
  bindDialogEvents();
  bindImagePreviewEvents();
  bindKeyboardEvents();
}
