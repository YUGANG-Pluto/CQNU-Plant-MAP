const { app } = require('electron');
const { mkdir, writeFile } = require('node:fs/promises');
const path = require('node:path');
const { createMainWindow } = require('../main-dist/main/windowManager');
const { registerIpc } = require('../main-dist/main/ipc/register');
const { runRendererDomainSmoke } = require('./renderer-smoke/domain-contract');
const { runRendererMotionSmoke } = require('./renderer-smoke/motion-contract');
const requiredIds = require('./renderer-smoke/required-controls');
const { collectRendererSmokeFailures } = require('./renderer-smoke/result-contract');

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

async function captureAppearanceCenter(window) {
  const outputDirectory = process.env.CQNU_SMOKE_SCREENSHOT_DIR;
  if (!outputDirectory) return;
  const originalBounds = window.getBounds();
  window.setSkipTaskbar(true);
  window.setBounds({ ...originalBounds, width: 1440, height: 960, x: -32_000, y: -32_000 }, false);
  window.showInactive();
  await window.webContents.executeJavaScript(
    `new Promise(resolve => {
    document.getElementById('btnOpenTheme')?.click();
    setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(resolve)), 1250);
  })`,
    true
  );
  await mkdir(outputDirectory, { recursive: true });
  const image = await window.webContents.capturePage();
  await writeFile(path.join(outputDirectory, 'desktop-appearance-center.png'), image.toPNG());
  await window.webContents.executeJavaScript(`document.getElementById('btnCloseThemeModal')?.click()`, true);
  window.hide();
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

  const result = await window.webContents.executeJavaScript(
    `(async () => {
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
    const projectWorkflowStatus = window.projectWorkflow?.getStatus();
    const projectWorkflowReady = window.projectWorkflow?.version === 'project-workflow-v1' &&
      document.documentElement.dataset.projectWorkflow === 'project-workflow-v1' &&
      Object.isFrozen(window.projectWorkflow) &&
      Object.isFrozen(projectWorkflowStatus) &&
      projectWorkflowStatus?.busy === false &&
      ['idle', 'ready'].includes(projectWorkflowStatus?.phase) &&
      ['chooseAndLoad', 'load', 'save', 'createBackup', 'inspectBackup', 'restoreBackup']
        .every(name => typeof window.projectWorkflow?.[name] === 'function');
    const projectSessionSnapshot = window.projectSessionStore?.getSnapshot();
    const projectSessionStoreReady = window.projectSessionStore?.version === 'project-session-v1' &&
      document.documentElement.dataset.projectSession === 'project-session-v1' &&
      Object.isFrozen(window.projectSessionStore) &&
      Object.isFrozen(projectSessionSnapshot) &&
      typeof window.projectSessionStore?.subscribe === 'function' &&
      ['electron', 'web'].includes(projectSessionSnapshot?.runtime) &&
      ['idle', 'ready'].includes(projectSessionSnapshot?.phase);
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    const motionCloseDelay = Math.max(
      760,
      (parseMs(rootStyle.getPropertyValue('--motion-duration-fast')) || 0) + 120,
      (parseMs(rootStyle.getPropertyValue('--motion-duration')) || 0) + 80,
      (parseMs(rootStyle.getPropertyValue('--motion-duration-modal')) || 0) + 60
    );
    const queryTrigger = document.getElementById('btnOpenQuery');
    const queryLauncherButton = document.querySelector('[aria-controls="workspaceModuleLauncher"]');
    const queryModal = document.getElementById('queryModal');
    queryLauncherButton.click();
    await delay(60);
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
    const queryFocusReturned = document.activeElement === queryTrigger || document.activeElement === queryLauncherButton;

    const appState = window.__CQNU_STATE__;
    const originalTheme = structuredClone(appState.settings?.uiTheme || {});
    const themeTrigger = document.getElementById('btnOpenTheme');
    const themeModal = document.getElementById('themeModal');
    themeTrigger.click();
    await delay(120);
    document.querySelector('[data-style="liquid-glass"]')?.click();
    document.querySelector('[data-glass-mode="clear"]')?.click();
    document.querySelector('[data-motion-mode="expressive"]')?.click();
    document.querySelector('[data-motion-feedback="strong"]')?.click();
    const ambientToggle = document.getElementById('motionAmbient');
    ambientToggle.checked = true;
    ambientToggle.dispatchEvent(new Event('change', { bubbles: true }));
    await delay(120);
    const themeCenterOpened = !themeModal.classList.contains('hidden') && getTopLayerModal()?.id === 'themeModal';
    const themeControlsApplied = document.documentElement.classList.contains('theme-liquid-glass') &&
      document.documentElement.classList.contains('glass-mode-clear') &&
      document.documentElement.classList.contains('motion-mode-expressive') &&
      document.documentElement.dataset.motionEngine === 'motion' &&
      document.documentElement.dataset.motionFeedback === 'strong' &&
      document.documentElement.dataset.motionAmbient === 'true';
    const themeMaterialControlsReady = ['solid', 'regular', 'clear'].every(mode =>
      Boolean(document.querySelector('[data-glass-mode="' + mode + '"]'))
    ) && !document.getElementById('themePreviewCard');
    const themeActiveDurations = [
      '--motion-duration-fast',
      '--motion-duration',
      '--motion-duration-modal'
    ].map(name => parseMs(getComputedStyle(document.documentElement).getPropertyValue(name)));
    document.getElementById('btnCloseThemeModal').click();
    await delay(motionCloseDelay);
    const themeCenterClosed = themeModal.classList.contains('hidden');
    appState.settings.uiTheme = originalTheme;
    ensureThemeSettings();
    applyThemeVariables();
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
    const objectSelectionEvents = [];
    const unsubscribeObjectSelection = window.objectSelectionStore?.subscribe(snapshot => {
      objectSelectionEvents.push(snapshot.revision);
    });
    window.objectSelectionStore?.setHover({ type: 'point', id: 'smoke-point-2', active: true });
    const objectSelectionHoverMirrored = appState.hoveredPointId === 'smoke-point-2';
    window.objectSelectionStore?.setHover({ type: 'point', id: 'smoke-point-2', active: false });
    unsubscribeObjectSelection?.();
    const objectSelectionSnapshot = window.objectSelectionStore?.getSnapshot();
    const objectSelectionStoreReady = window.objectSelectionStore?.version === 'object-selection-v1' &&
      document.documentElement.dataset.objectSelectionStore === 'object-selection-v1' &&
      Object.isFrozen(window.objectSelectionStore) &&
      Object.isFrozen(objectSelectionSnapshot) &&
      typeof window.objectSelectionStore?.subscribe === 'function' &&
      objectSelectionEvents.length >= 3 &&
      objectSelectionSnapshot?.type === 'point' &&
      objectSelectionSnapshot.selectedZoneId === 'smoke-zone' &&
      objectSelectionSnapshot.selectedPointId === 'smoke-point' &&
      objectSelectionSnapshot.selectedPhenologyId === 'smoke-entry';
    const objectSelectionCompatibilityMirrored = objectSelectionHoverMirrored &&
      appState.hoveredPointId === null &&
      appState.selectedZoneId === objectSelectionSnapshot?.selectedZoneId &&
      appState.selectedPointId === objectSelectionSnapshot?.selectedPointId;

    queryTrigger.click();
    await delay(80);
    const queryTextInput = document.getElementById('queryText');
    queryTextInput.value = '测试植物二';
    document.getElementById('btnRunQuery').click();
    await delay(80);
    const typedQueryResult = document.querySelector('#queryResults [data-object-id="smoke-point-2"]');
    const typedQueryUiRendered = document.getElementById('queryResultCount').textContent === '1' &&
      Boolean(typedQueryResult) &&
      document.getElementById('queryResults').textContent.includes('测试植物二');
    typedQueryResult?.click();
    await delay(motionCloseDelay);
    const typedQuerySelectionWorked = appState.selectedPointId === 'smoke-point-2' &&
      queryModal.classList.contains('hidden');
    queryTextInput.value = '';
    selectPoint('smoke-point');

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
    const reviewBridgeBuilt = window.researchReview?.version === 'research-review-v1' &&
      Object.isFrozen(window.researchReview) &&
      typeof window.researchReview?.createController === 'function' &&
      reviewQueue?.totalPoints === 2 &&
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
    await delay(motionCloseDelay);
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
      workspaceSurfaceCount: document.querySelectorAll('.app-shell > .app-topbar, .app-shell > .workspace-tool-rail, .app-shell > .map-shell, .app-shell > .panel-right').length,
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
      projectWorkflowReady,
      projectSessionStoreReady,
      modalPrimitiveCount: document.querySelectorAll('.modal-workflow-body').length,
      queryFocusTrapped,
      queryClosedByEscape: queryModal.classList.contains('hidden'),
      queryFocusReturned,
      themeCenterOpened,
      themeControlsApplied,
      themeMaterialControlsReady,
      themeActiveDurations,
      themeCenterClosed,
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
      objectSelectionStoreReady,
      objectSelectionCompatibilityMirrored,
      typedQueryUiRendered,
      typedQuerySelectionWorked,
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
  })()`,
    true
  );

  const failures = collectRendererSmokeFailures(result, errors);

  await captureAppearanceCenter(window);
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
