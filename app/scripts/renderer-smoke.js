const { app } = require('electron');
const { createMainWindow } = require('../main-dist/main/windowManager');
const { registerIpc } = require('../main-dist/main/ipc/register');
const { runRendererDomainSmoke } = require('./renderer-smoke/domain-contract');
const { runRendererMotionSmoke } = require('./renderer-smoke/motion-contract');

const requiredIds = [
  'map',
  'btnChooseDir',
  'btnSave',
  'projectHistoryControls',
  'btnUndoProjectEdit',
  'btnRedoProjectEdit',
  'projectSaveStatus',
  'projectSaveStatusText',
  'projectSaveTimestamp',
  'btnModeBrowse',
  'btnModeDrawZone',
  'btnModeAddPoint',
  'btnOpenStats',
  'btnOpenQuery',
  'btnOpenReviewWorkbench',
  'btnOpenSpeciesReference',
  'currentModeText',
  'baseMapSelect',
  'rightModuleZoneCard',
  'rightInspectorPanel',
  'workspaceUtilityDrawer',
  'basemapWorkspaceModal',
  'pointEditorModal',
  'speciesReferenceModal',
  'btnCloseSpeciesReferenceModal',
  'speciesReferenceSciInput',
  'speciesReferenceCommonInput',
  'statsModal',
  'queryModal',
  'reviewWorkbenchModal',
  'btnCloseReviewWorkbench',
  'reviewTotalPoints',
  'reviewReadyPoints',
  'reviewPendingPoints',
  'reviewOpenIssueCount',
  'reviewProgressTrack',
  'reviewProgressBar',
  'reviewProgressPercent',
  'reviewIssueFilter',
  'reviewZoneFilter',
  'reviewSeverityFilter',
  'reviewSearch',
  'btnResetReviewFilters',
  'reviewVisibleCount',
  'reviewTaskList',
  'reviewSelectionPosition',
  'btnPreviousReviewTask',
  'btnNextReviewTask',
  'reviewTaskDetail',
  'btnLocateReviewTask',
  'btnEditReviewTask',
  'trashModal',
  'themeModal',
  'mergeModal',
  'backupModal',
  'maintenanceModal',
  'confirmModal',
  'alertModal',
  'imagePreviewModal',
  'toastRegion',
  'pointEditorSaveState',
  'mapSelectionAnnouncer',
  'objectSelectionSummary',
  'objectWorkflowFeedback',
  'btnPreviousObject',
  'btnFocusSelection',
  'btnNextObject',
  'btnOpenCommandPalette',
  'commandPaletteModal',
  'btnCloseCommandPalette',
  'commandPaletteInput',
  'commandPaletteResults',
  'commandPaletteResultCount',
  'commandPaletteAnnouncer',
  'btnCommandPaletteHelp'
];

function waitForLoad(window) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Renderer smoke load timed out.')), 10000);
    window.webContents.once('did-finish-load', () => {
      clearTimeout(timer);
      resolve();
    });
    window.webContents.once('did-fail-load', (_event, code, description) => {
      clearTimeout(timer);
      reject(new Error(`Renderer failed to load (${code}): ${description}`));
    });
  });
}

async function run() {
  app.disableHardwareAcceleration();
  await app.whenReady();
  registerIpc();

  const errors = [];
  const window = createMainWindow({ show: false });
  window.webContents.on('console-message', details => {
    if (Number(details?.level || 0) >= 3) {
      errors.push(`${details?.sourceId || 'renderer'}:${details?.lineNumber || 0} ${details?.message || ''}`);
    }
  });
  window.webContents.on('render-process-gone', (_event, details) => {
    errors.push(`renderer process exited: ${details.reason}`);
  });

  await waitForLoad(window);
  await new Promise(resolve => setTimeout(resolve, 700));

  const result = await window.webContents.executeJavaScript(`(async () => {
    const requiredIds = ${JSON.stringify(requiredIds)};
    const allIds = Array.from(document.querySelectorAll('[id]'), node => node.id);
    const duplicateIds = allIds.filter((id, index) => allIds.indexOf(id) !== index);
    const rootStyle = getComputedStyle(document.documentElement);
    const parseMs = value => Number.parseFloat(String(value || '').replace('ms', ''));
    const rendererMotionContract = (${runRendererMotionSmoke.toString()})();
    const statsRegistry = window.rendererStatsRegistry;
    const statsRegistryIds = statsRegistry?.chartIds || [];
    const statsRegistryReady = statsRegistry?.version === 'stats-chart-registry-v1' &&
      statsRegistryIds.length === 27 &&
      new Set(statsRegistryIds).size === statsRegistryIds.length &&
      statsRegistry.groups.flatMap(group => group.charts).length === statsRegistryIds.length &&
      statsRegistry.presets.recommended.length === 6;
    const statsRegistryImmutable = Object.isFrozen(statsRegistry) &&
      Object.isFrozen(statsRegistry?.chartIds) &&
      Object.isFrozen(statsRegistry?.groups) &&
      statsRegistry?.groups.every(group => Object.isFrozen(group) && Object.isFrozen(group.charts)) &&
      Object.isFrozen(statsRegistry?.labels) &&
      Object.isFrozen(statsRegistry?.presets);
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    const motionCloseDelay = Math.max(
      420,
      (parseMs(rootStyle.getPropertyValue('--motion-duration')) || 0) + 80
    );
    const queryTrigger = document.getElementById('btnOpenQuery');
    const queryModal = document.getElementById('queryModal');
    queryTrigger.focus();
    queryTrigger.click();
    await delay(60);
    const focusable = Array.from(queryModal.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
      .filter(node => node.getClientRects().length > 0);
    const firstFocusable = focusable[0] || null;
    const lastFocusable = focusable[focusable.length - 1] || null;
    lastFocusable?.focus();
    lastFocusable?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    const queryFocusTrapped = document.activeElement === firstFocusable;
    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await delay(motionCloseDelay);
    const queryFocusReturned = document.activeElement === queryTrigger;

    const appState = window.__CQNU_STATE__;
    const originalState = {
      projectDir: appState.projectDir,
      projectModifiedTime: appState.projectModifiedTime,
      zones: appState.zones,
      points: appState.points,
      selectedZoneId: appState.selectedZoneId,
      selectedPointId: appState.selectedPointId,
      selectedPhenologyId: appState.selectedPhenologyId,
      hoveredZoneId: appState.hoveredZoneId,
      hoveredPointId: appState.hoveredPointId,
      activeListTab: appState.activeListTab
    };
    appState.zones = [{
      id: 'smoke-zone',
      zoneId: 'SMOKE-Z',
      name: 'Smoke Zone',
      geometry: {
        type: 'Polygon',
        coordinates: [[[106.307, 29.608], [106.31, 29.608], [106.31, 29.61], [106.307, 29.61], [106.307, 29.608]]]
      }
    }];
    appState.points = [
      {
        id: 'smoke-point',
        pointId: 'SMOKE-P1',
        zoneRef: 'smoke-zone',
        lat: 29.6088,
        lng: 106.3088,
        plantNameCn: '测试植物一',
        plantNameSci: 'Planta test one',
        phenologyEntries: [{ id: 'smoke-entry', label: '开花', floweringState: '开花', images: [] }]
      },
      {
        id: 'smoke-point-2',
        pointId: 'SMOKE-P2',
        zoneRef: 'smoke-zone',
        lat: 29.6091,
        lng: 106.3091,
        plantNameCn: '测试植物二',
        plantNameSci: 'Planta test two',
        phenologyEntries: [{ id: 'smoke-entry-2', label: '结果', floweringState: '结果', images: [] }]
      }
    ];
    appState.selectedZoneId = 'smoke-zone';
    appState.selectedPointId = 'smoke-point';
    appState.selectedPhenologyId = 'smoke-entry';
    appState.activeListTab = 'points';
    rerenderBusinessLayers('renderer-smoke-object-workflow');
    renderAllDerived();
    selectPoint('smoke-point');
    await delay(80);
    const selectedObjectCards = Array.from(document.querySelectorAll('[data-object-type="point"][data-object-id="smoke-point"]'));
    const objectSelectionSynchronized = selectedObjectCards.length >= 2 && selectedObjectCards.every(node => node.getAttribute('aria-selected') === 'true');
    const selectedMarkerNode = appState.pointLayers.get('smoke-point')?.getElement?.();
    const mapObjectAccessible = selectedMarkerNode?.getAttribute('role') === 'button' && selectedMarkerNode?.getAttribute('aria-selected') === 'true';
    const objectSummaryUpdated = document.getElementById('objectSelectionSummary').textContent.includes('测试植物一');
    const secondPointCard = document.querySelector('#pointListPanel [data-object-id="smoke-point-2"]');
    secondPointCard?.dispatchEvent(new Event('pointerenter'));
    const objectHoverLinked = appState.hoveredPointId === 'smoke-point-2';
    secondPointCard?.dispatchEvent(new Event('pointerleave'));
    secondPointCard?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    const objectKeyboardActivated = appState.selectedPointId === 'smoke-point-2';
    document.getElementById('btnPreviousObject').click();
    const objectNavigationWorked = appState.selectedPointId === 'smoke-point';
    document.getElementById('btnFocusSelection').click();
    const objectFocusBusy = document.getElementById('objectWorkflowFeedback').classList.contains('is-busy');
    await delay(420);
    const objectFocusCompleted = document.getElementById('objectWorkflowFeedback').classList.contains('is-success');

    const speciesReferenceTrigger = document.getElementById('btnOpenSpeciesReference');
    const speciesReferenceExpectedInput = currentSpeciesReferenceInput();
    speciesReferenceTrigger.click();
    await delay(80);
    const speciesReferenceModal = document.getElementById('speciesReferenceModal');
    const speciesReferenceSession = getSpeciesReferencePanelController()?.inspect();
    const speciesReferenceModalOpened = !speciesReferenceModal.classList.contains('hidden') &&
      getTopLayerModal()?.id === 'speciesReferenceModal';
    const speciesReferenceInputsPrefilled = document.getElementById('speciesReferenceSciInput').value === speciesReferenceExpectedInput.scientificName &&
      document.getElementById('speciesReferenceCommonInput').value === speciesReferenceExpectedInput.commonName;
    const speciesReferenceSessionIdle = speciesReferenceSession?.phase === 'idle' &&
      Object.isFrozen(speciesReferenceSession) &&
      Object.isFrozen(speciesReferenceSession.suggestionIds);
    document.getElementById('btnCloseSpeciesReferenceModal').click();
    await delay(motionCloseDelay);
    const speciesReferenceModalClosed = speciesReferenceModal.classList.contains('hidden') &&
      getSpeciesReferencePanelController()?.inspect().phase === 'idle';

    const originalPersistProjectForHistory = persistProject;
    persistProject = async () => {
      notifyProjectSaveStarted();
      notifyProjectSaveSucceeded(Date.now());
    };
    appState.projectDir = 'smoke-project';
    const rendererStateSnapshot = window.rendererState?.snapshot();
    const rendererProjectData = window.rendererState?.projectData();
    const rendererStateFacadeReady = rendererStateSnapshot?.hasProject === true &&
      rendererStateSnapshot.zoneCount === 1 &&
      rendererStateSnapshot.pointCount === 2 &&
      rendererStateSnapshot.selectedZoneId === 'smoke-zone' &&
      rendererStateSnapshot.selectedPointId === 'smoke-point';
    const rendererStateFacadeImmutable = Object.isFrozen(window.rendererState) &&
      Object.isFrozen(rendererStateSnapshot) &&
      Object.isFrozen(rendererProjectData) &&
      Object.isFrozen(rendererProjectData?.zones) &&
      Object.isFrozen(rendererProjectData?.points);
    const rendererStatePathHidden = !Object.prototype.hasOwnProperty.call(rendererStateSnapshot || {}, 'projectDir');
    if (rendererProjectData?.points?.[0]) {
      rendererProjectData.points[0].plantNameCn = 'detached facade value';
    }
    const rendererStateFacadeIsolated = appState.points[0].plantNameCn === '测试植物一';
    const rendererDomainContract = (${runRendererDomainSmoke.toString()})();
    resetProjectEditHistory({ lastSavedAt: Date.now() });
    const historyOriginalName = appState.points[0].plantNameCn;
    const historyTransaction = beginProjectEdit('historyEditPoint');
    appState.points[0].plantNameCn = '测试植物一（已编辑）';
    commitProjectEdit(historyTransaction);
    rerenderBusinessLayers('renderer-smoke-history-edit');
    selectPoint('smoke-point');
    const historyUndoButtonEnabled = !document.getElementById('btnUndoProjectEdit').disabled;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true }));
    await delay(100);
    const historyUndoWorked = appState.points[0].plantNameCn === historyOriginalName &&
      !document.getElementById('btnRedoProjectEdit').disabled;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true }));
    await delay(100);
    const historyRedoWorked = appState.points[0].plantNameCn === '测试植物一（已编辑）';
    const historySaveStatusWorked = document.getElementById('projectSaveStatus').dataset.status === 'saved';
    const historyCommandsRegistered = getCommandPaletteCommands().some(command => command.id === 'edit.undo') &&
      getCommandPaletteCommands().some(command => command.id === 'edit.redo');
    const historyCountBeforeTextUndo = window.projectEditHistory.inspect().undoCount;
    const pointIdInput = document.getElementById('pointId');
    pointIdInput.focus();
    pointIdInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true }));
    await delay(40);
    const textEditingPreservedHistory = window.projectEditHistory.inspect().undoCount === historyCountBeforeTextUndo &&
      appState.points[0].plantNameCn === '测试植物一（已编辑）';
    appState.points[0].habitat = 'external-change';
    prepareProjectEditHistoryForSave();
    const externalPointMutationClearedHistory = !window.projectEditHistory.inspect().canUndo &&
      !window.projectEditHistory.inspect().canRedo;

    const reviewQueue = window.researchReview?.build(appState.zones, appState.points);
    const reviewBridgeBuilt = reviewQueue?.totalPoints === 2 &&
      reviewQueue?.pendingPoints === 2 &&
      reviewQueue?.readyPoints === 0 &&
      reviewQueue?.issueCounts?.missingFamily === 2 &&
      reviewQueue?.issueCounts?.missingImage === 2;
    document.getElementById('btnOpenReviewWorkbench').click();
    await delay(80);
    const reviewModal = document.getElementById('reviewWorkbenchModal');
    const reviewWorkbenchOpened = !reviewModal.classList.contains('hidden') &&
      getTopLayerModal()?.id === 'reviewWorkbenchModal';
    const reviewOverviewRendered = document.getElementById('reviewTotalPoints').textContent === '2' &&
      document.getElementById('reviewPendingPoints').textContent === '2' &&
      document.getElementById('reviewProgressPercent').textContent === '0%';
    const reviewInitialTaskCount = document.querySelectorAll('#reviewTaskList .review-task-card').length;
    const reviewIssueFilter = document.getElementById('reviewIssueFilter');
    reviewIssueFilter.value = 'missingFamily';
    reviewIssueFilter.dispatchEvent(new Event('change', { bubbles: true }));
    const reviewIssueFilterWorked = document.querySelectorAll('#reviewTaskList .review-task-card').length === 2;
    const reviewSearch = document.getElementById('reviewSearch');
    reviewSearch.value = 'SMOKE-P2';
    reviewSearch.dispatchEvent(new Event('input', { bubbles: true }));
    const reviewSearchWorked = document.querySelectorAll('#reviewTaskList .review-task-card').length === 1 &&
      document.getElementById('reviewTaskDetail').textContent.includes('SMOKE-P2');
    document.getElementById('btnResetReviewFilters').click();
    const reviewResetWorked = document.querySelectorAll('#reviewTaskList .review-task-card').length === 2 &&
      reviewSearch.value === '';
    const reviewSelectionBefore = document.querySelector('#reviewTaskList .review-task-card.is-selected')?.dataset.reviewTaskId || '';
    document.getElementById('btnNextReviewTask').click();
    const reviewSelectionAfter = document.querySelector('#reviewTaskList .review-task-card.is-selected')?.dataset.reviewTaskId || '';
    const reviewNavigationWorked = Boolean(reviewSelectionBefore) && Boolean(reviewSelectionAfter) &&
      reviewSelectionBefore !== reviewSelectionAfter;
    document.getElementById('btnEditReviewTask').click();
    await delay(80);
    const reviewEditorLayered = !document.getElementById('pointEditorModal').classList.contains('hidden') &&
      !reviewModal.classList.contains('hidden') &&
      getTopLayerModal()?.id === 'pointEditorModal';
    document.getElementById('btnClosePointEditorModal').click();
    await delay(motionCloseDelay);
    const reviewRestoredAfterEditor = !reviewModal.classList.contains('hidden') &&
      getTopLayerModal()?.id === 'reviewWorkbenchModal';
    const reviewOriginalLanguage = appState.settings.language;
    appState.settings.language = 'en';
    applyI18n();
    const reviewWorkbenchEnglish = document.getElementById('reviewWorkbenchModalTitle').textContent ===
      'Research Data Review Workbench';
    appState.settings.language = reviewOriginalLanguage;
    applyI18n();
    document.getElementById('btnCloseReviewWorkbench').click();
    await delay(motionCloseDelay);
    const reviewWorkbenchClosed = reviewModal.classList.contains('hidden');

    const commandPalette = document.getElementById('commandPaletteModal');
    const commandInput = document.getElementById('commandPaletteInput');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true, cancelable: true }));
    await delay(80);
    const commandPaletteOpened = !commandPalette.classList.contains('hidden') && document.activeElement === commandInput;
    const commandPaletteOpenSnapshot = {
      className: commandPalette.className,
      activeElementId: document.activeElement?.id || '',
      topModalId: getTopLayerModal()?.id || ''
    };
    commandInput.value = '测试植物';
    commandInput.dispatchEvent(new Event('input', { bubbles: true }));
    const commandResultCount = document.querySelectorAll('#commandPaletteResults .command-palette-result').length;
    const activeCommandBefore = commandInput.getAttribute('aria-activedescendant');
    commandInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    const activeCommandAfter = commandInput.getAttribute('aria-activedescendant');
    const commandKeyboardNavigationWorked = commandResultCount >= 2 && activeCommandBefore !== activeCommandAfter;
    commandInput.value = 'SMOKE-P2';
    commandInput.dispatchEvent(new Event('input', { bubbles: true }));
    commandInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await delay(720);
    const commandObjectJumpWorked = appState.selectedPointId === 'smoke-point-2' && commandPalette.classList.contains('hidden');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true, cancelable: true }));
    await delay(80);
    const commandRecentRemembered = Boolean(document.querySelector('[data-command-section="recent"] [data-command-id="point:smoke-point-2"]'));
    document.getElementById('btnCommandPaletteHelp').click();
    const commandHelpWorked = document.querySelectorAll('.command-palette-shortcut-row').length >= 6;
    document.getElementById('btnCloseCommandPalette').click();
    await delay(motionCloseDelay);
    const commandPaletteClosedByButton = commandPalette.classList.contains('hidden');

    const originalLanguage = appState.settings.language;
    appState.settings.language = 'en';
    applyI18n();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true, cancelable: true }));
    await delay(80);
    const commandPaletteEnglish = document.getElementById('commandPaletteModalTitle').textContent === 'Command Center' &&
      document.getElementById('commandPaletteModeLabel').textContent === 'Quick actions';
    commandInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await delay(motionCloseDelay);
    const commandPaletteClosedByEscape = commandPalette.classList.contains('hidden');
    appState.settings.language = originalLanguage;
    applyI18n();

    document.getElementById('btnOpenQuery').click();
    await delay(80);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true, cancelable: true }));
    const commandPaletteBlockedByModal = commandPalette.classList.contains('hidden') && !queryModal.classList.contains('hidden');
    queryModal.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await delay(motionCloseDelay);

    document.getElementById('btnOpenPointEditor').click();
    await delay(60);
    const pointEditor = document.getElementById('pointEditorModal');
    const pointEditorState = document.getElementById('pointEditorSaveState');
    const observerInput = document.getElementById('observer');
    observerInput.value = 'unsaved observer';
    observerInput.dispatchEvent(new Event('input', { bubbles: true }));
    const pointEditorDirtyDetected = pointEditorState.classList.contains('is-warning');
    const globalProjectDraftDetected = document.getElementById('projectSaveStatus').dataset.status === 'draft';
    const beforeUnloadEvent = new Event('beforeunload', { cancelable: true });
    handleProjectBeforeUnload(beforeUnloadEvent);
    const projectCloseDraftGuard = beforeUnloadEvent.defaultPrevented;
    document.getElementById('btnClosePointEditorModal').click();
    await delay(60);
    const pointEditorDiscardGuard = !document.getElementById('confirmModal').classList.contains('hidden') && !pointEditor.classList.contains('hidden');
    document.getElementById('btnConfirmCancel').click();
    await delay(motionCloseDelay);
    const pointEditorCancelKeptOpen = !pointEditor.classList.contains('hidden');
    observerInput.value = '';
    observerInput.dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('btnClosePointEditorModal').click();
    await delay(motionCloseDelay);
    const pointEditorClosedCleanly = pointEditor.classList.contains('hidden');
    persistProject = originalPersistProjectForHistory;
    Object.assign(appState, originalState);
    resetProjectEditHistory({ lastSavedAt: originalState.projectModifiedTime || Date.now() });
    rerenderBusinessLayers('renderer-smoke-restore');
    renderAllDerived();
    return {
      readyState: document.readyState,
      missingIds: requiredIds.filter(id => !document.getElementById(id)),
      duplicateIds: Array.from(new Set(duplicateIds)),
      modernChildCount: document.getElementById('modernUiRoot')?.children.length || 0,
      workspaceSurfaceCount: document.querySelectorAll('.app-shell > .app-topbar, .app-shell > .panel-left, .app-shell > .map-shell, .app-shell > .panel-right').length,
      moduleButtonCount: document.querySelectorAll('.ui-module-button').length,
      motionDurations: [
        parseMs(rootStyle.getPropertyValue('--motion-duration-fast')),
        parseMs(rootStyle.getPropertyValue('--motion-duration')),
        parseMs(rootStyle.getPropertyValue('--motion-duration-modal')),
        parseMs(rootStyle.getPropertyValue('--motion-duration-reveal'))
      ],
      ...rendererMotionContract,
      statsRegistryReady,
      statsRegistryImmutable,
      modalPrimitiveCount: document.querySelectorAll('.modal-workflow-body').length,
      queryFocusTrapped,
      queryClosedByEscape: queryModal.classList.contains('hidden'),
      queryFocusReturned,
      pointEditorDirtyDetected,
      globalProjectDraftDetected,
      projectCloseDraftGuard,
      pointEditorDiscardGuard,
      pointEditorCancelKeptOpen,
      pointEditorClosedCleanly,
      objectSelectionSynchronized,
      mapObjectAccessible,
      objectSummaryUpdated,
      objectHoverLinked,
      objectKeyboardActivated,
      objectNavigationWorked,
      objectFocusBusy,
      objectFocusCompleted,
      speciesReferenceModalOpened,
      speciesReferenceInputsPrefilled,
      speciesReferenceSessionIdle,
      speciesReferenceModalClosed,
      rendererStateFacadeReady,
      rendererStateFacadeImmutable,
      rendererStatePathHidden,
      rendererStateFacadeIsolated,
      ...rendererDomainContract,
      historyUndoButtonEnabled,
      historyUndoWorked,
      historyRedoWorked,
      historySaveStatusWorked,
      historyCommandsRegistered,
      textEditingPreservedHistory,
      externalPointMutationClearedHistory,
      reviewBridgeBuilt,
      reviewWorkbenchOpened,
      reviewOverviewRendered,
      reviewInitialTaskCount,
      reviewIssueFilterWorked,
      reviewSearchWorked,
      reviewResetWorked,
      reviewNavigationWorked,
      reviewEditorLayered,
      reviewRestoredAfterEditor,
      reviewWorkbenchEnglish,
      reviewWorkbenchClosed,
      commandPaletteOpened,
      commandPaletteOpenSnapshot,
      commandKeyboardNavigationWorked,
      commandObjectJumpWorked,
      commandRecentRemembered,
      commandHelpWorked,
      commandPaletteClosedByButton,
      commandPaletteEnglish,
      commandPaletteClosedByEscape,
      commandPaletteBlockedByModal,
      mapReady: Boolean(window.__CQNU_STATE__?.map),
      themeBridgeReady: [
        'ensureThemeSettings',
        'applyThemeVariables',
        'openThemeCenter',
        'bindThemePanelEvents'
      ].every(name => typeof window[name] === 'function')
    };
  })()`, true);

  const failures = [];
  if (result.readyState !== 'complete') failures.push(`document state: ${result.readyState}`);
  if (result.missingIds.length) failures.push(`missing ids: ${result.missingIds.join(', ')}`);
  if (result.duplicateIds.length) failures.push(`duplicate ids: ${result.duplicateIds.join(', ')}`);
  if (result.modernChildCount < 1) failures.push('modern renderer root is empty');
  if (result.workspaceSurfaceCount !== 4) failures.push(`workspace surface count: ${result.workspaceSurfaceCount}`);
  if (result.moduleButtonCount !== 11) failures.push(`workspace module button count: ${result.moduleButtonCount}`);
  const motionDurationFloors = [400, 500, 620, 620];
  if (result.motionDurations.some((value, index) => !Number.isFinite(value) || value < motionDurationFloors[index])) {
    failures.push(`motion durations below perceptible floors: ${result.motionDurations.join(', ')}`);
  }
  if (!result.moduleMotionRuntimeReady) {
    failures.push(`workspace module motion is not active at runtime: ${result.moduleTransitionDurations.join(', ')}`);
  }
  if (!result.statsRegistryReady) failures.push('typed statistics chart registry is incomplete');
  if (!result.statsRegistryImmutable) failures.push('typed statistics chart registry exposes mutable containers');
  if (result.modalPrimitiveCount < 3) failures.push(`modal primitive count: ${result.modalPrimitiveCount}`);
  if (!result.queryFocusTrapped) failures.push('query modal does not trap keyboard focus');
  if (!result.queryClosedByEscape) failures.push('query modal did not close with Escape');
  if (!result.queryFocusReturned) failures.push('query modal did not restore focus to its opener');
  if (!result.pointEditorDirtyDetected) failures.push('point editor did not expose its dirty state');
  if (!result.globalProjectDraftDetected) failures.push('project save status did not expose an unapplied draft');
  if (!result.projectCloseDraftGuard) failures.push('window close was not guarded for an unapplied draft');
  if (!result.pointEditorDiscardGuard) failures.push('point editor did not guard unapplied changes');
  if (!result.pointEditorCancelKeptOpen) failures.push('point editor closed after cancelling discard');
  if (!result.pointEditorClosedCleanly) failures.push('point editor did not close after restoring persisted values');
  if (!result.objectSelectionSynchronized) failures.push('object selection did not synchronize across lists');
  if (!result.mapObjectAccessible) failures.push('map object is missing keyboard or selection semantics');
  if (!result.objectSummaryUpdated) failures.push('object command summary did not update');
  if (!result.objectHoverLinked) failures.push('object hover did not link list and map state');
  if (!result.objectKeyboardActivated) failures.push('object list item did not activate from the keyboard');
  if (!result.objectNavigationWorked) failures.push('previous/next object navigation did not preserve selection scope');
  if (!result.objectFocusBusy || !result.objectFocusCompleted) failures.push('object focus feedback did not expose busy and success states');
  if (!result.speciesReferenceModalOpened) failures.push('species reference modal did not open as the top workflow layer');
  if (!result.speciesReferenceInputsPrefilled) failures.push('species reference modal did not reuse the selected point names');
  if (!result.speciesReferenceSessionIdle) failures.push('species reference session did not expose immutable idle state');
  if (!result.speciesReferenceModalClosed) failures.push('species reference modal did not close cleanly');
  if (!result.rendererStateFacadeReady) failures.push('typed renderer state facade did not reflect current selection and counts');
  if (!result.rendererStateFacadeImmutable) failures.push('typed renderer state facade did not freeze its public containers');
  if (!result.rendererStatePathHidden) failures.push('typed renderer state facade exposed the local project path');
  if (!result.rendererStateFacadeIsolated) failures.push('typed renderer state facade leaked mutable project records');
  if (!result.rendererDomainBridgeReady) failures.push('typed renderer domain bridge is missing or mutable');
  if (!result.rendererDomainAdapterReady) failures.push('typed renderer domain adapter did not preserve canonical project values');
  if (!result.rendererDomainAdapterImmutable) failures.push('typed renderer domain adapter did not freeze its compatibility view');
  if (!result.rendererDomainAdapterInputUnchanged) failures.push('typed renderer domain adapter mutated its source record');
  if (!result.rendererDomainDraftReady) failures.push('typed phenology draft controller returned an invalid state transition');
  if (!result.rendererDomainTaxonomyReady) failures.push('typed taxonomy candidate model returned invalid output');
  if (!result.rendererDomainMaintenanceReady) failures.push('typed maintenance issue model returned invalid counts or ordering');
  if (!result.rendererDomainSpeciesReferenceReady) failures.push('typed species reference panel model returned invalid session state');
  if (!result.historyUndoButtonEnabled) failures.push('project history did not enable undo after a supported edit');
  if (!result.historyUndoWorked) failures.push('Ctrl+Z did not restore the previous project edit snapshot');
  if (!result.historyRedoWorked) failures.push('Ctrl+Shift+Z did not restore the redone project edit snapshot');
  if (!result.historySaveStatusWorked) failures.push('project save status did not return to saved');
  if (!result.historyCommandsRegistered) failures.push('undo and redo commands are missing from Command Center');
  if (!result.textEditingPreservedHistory) failures.push('text-field Ctrl+Z incorrectly consumed project history');
  if (!result.externalPointMutationClearedHistory) failures.push('an unsupported point mutation did not invalidate stale project history');
  if (!result.reviewBridgeBuilt) failures.push('research review bridge did not derive the expected local task queue');
  if (!result.reviewWorkbenchOpened) failures.push('research review workbench did not open as the top workflow layer');
  if (!result.reviewOverviewRendered || result.reviewInitialTaskCount !== 2) {
    failures.push(`research review overview or task count is incorrect: ${result.reviewInitialTaskCount}`);
  }
  if (!result.reviewIssueFilterWorked) failures.push('research review issue filter did not update the queue');
  if (!result.reviewSearchWorked) failures.push('research review search did not isolate a point task');
  if (!result.reviewResetWorked) failures.push('research review filters did not reset');
  if (!result.reviewNavigationWorked) failures.push('research review previous/next navigation did not change tasks');
  if (!result.reviewEditorLayered) failures.push('point editor did not open above the research review workbench');
  if (!result.reviewRestoredAfterEditor) failures.push('research review workbench was not restored after closing the point editor');
  if (!result.reviewWorkbenchEnglish) failures.push('research review workbench did not refresh English labels');
  if (!result.reviewWorkbenchClosed) failures.push('research review workbench did not close cleanly');
  if (!result.commandPaletteOpened) failures.push(`command palette did not open and focus search with Ctrl+K: ${JSON.stringify(result.commandPaletteOpenSnapshot)}`);
  if (!result.commandKeyboardNavigationWorked) failures.push('command palette keyboard navigation did not move the active result');
  if (!result.commandObjectJumpWorked) failures.push('command palette did not locate a point command');
  if (!result.commandRecentRemembered) failures.push('command palette did not retain recent commands for the session');
  if (!result.commandHelpWorked) failures.push('command palette shortcut reference is incomplete');
  if (!result.commandPaletteClosedByButton) failures.push('command palette close button did not close the layer');
  if (!result.commandPaletteEnglish) failures.push('command palette did not refresh English labels');
  if (!result.commandPaletteClosedByEscape) failures.push('command palette did not close with Escape');
  if (!result.commandPaletteBlockedByModal) failures.push('command palette opened over an active workflow modal');
  if (!result.mapReady) failures.push('Leaflet map did not initialize');
  if (!result.themeBridgeReady) failures.push('theme compatibility bridge is incomplete');
  failures.push(...errors);

  window.destroy();
  if (failures.length) {
    throw new Error(failures.join('\n'));
  }

  process.stdout.write(`renderer smoke passed (${requiredIds.length} required controls)\n`);
}

run()
  .then(() => app.quit())
  .catch(error => {
    process.stderr.write(`${error.stack || error.message}\n`);
    app.exit(1);
  });
