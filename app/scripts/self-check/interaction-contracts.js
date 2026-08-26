function testCommandPaletteContract() {
  const modernRoot = path.join(process.cwd(), 'src/renderer-modern');
  const appSource = fs.readFileSync(path.join(modernRoot, 'App.tsx'), 'utf8');
  const headerSource = fs.readFileSync(path.join(modernRoot, 'features/shell/WorkspaceHeader.tsx'), 'utf8');
  const componentSource = fs.readFileSync(path.join(modernRoot, 'features/shell/CommandPalette.tsx'), 'utf8');
  const styleSource = fs.readFileSync(path.join(modernRoot, 'styles/command-palette.css'), 'utf8');
  const mainSource = fs.readFileSync(path.join(modernRoot, 'main.tsx'), 'utf8');
  const registrySource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/shell/commandRegistry.js'), 'utf8');
  const runtimeSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/shell/commandPalette.js'), 'utf8');
  const eventSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/shell/eventBindings.js'), 'utf8');
  const loaderSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/legacy-loader.js'), 'utf8');
  const elementsSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/dom/elements.js'), 'utf8');

  assert.ok(appSource.includes('<CommandPalette />'));
  assert.ok(mainSource.includes("./styles/command-palette.css"));
  assert.ok(headerSource.includes('id="btnOpenCommandPalette"'));
  assert.ok(headerSource.includes('shortcut="Ctrl K"'));
  [
    'commandPaletteModal',
    'commandPaletteInput',
    'commandPaletteResults',
    'commandPaletteResultCount',
    'btnCommandPaletteHelp'
  ].forEach(id => {
    assert.ok(componentSource.includes(`id="${id}"`), `${id} must stay in the command palette component`);
    assert.ok(elementsSource.includes(`'${id}'`), `${id} must stay registered in the DOM map`);
  });
  [
    'function getCommandPaletteCommands',
    'function searchCommandPaletteCommands',
    'commandPaletteZoneCommands',
    'commandPalettePointCommands',
    "activateObjectSelection('zone'",
    "activateObjectSelection('point'"
  ].forEach(fragment => assert.ok(registrySource.includes(fragment), `command registry missing ${fragment}`));
  [
    'function openCommandPalette',
    'function closeCommandPalette',
    'function executeCommandPaletteCommand',
    'function handleCommandPaletteShortcut',
    'function bindCommandPaletteEvents',
    'COMMAND_PALETTE_RECENT_LIMIT',
    "event.key === 'ArrowDown'",
    "event.key === 'Enter'"
  ].forEach(fragment => assert.ok(runtimeSource.includes(fragment), `command runtime missing ${fragment}`));
  assert.ok(runtimeSource.includes('target.click()'), 'registered commands must forward to existing controls');
  assert.ok(!/\b(fetch|readFile|writeFile|child_process)\b/.test(`${registrySource}\n${runtimeSource}`), 'command center must not add data or system access');
  assert.ok(loaderSource.indexOf('./src/renderer/shell/commandRegistry.js') < loaderSource.indexOf('./src/renderer/shell/commandPalette.js'));
  assert.ok(loaderSource.indexOf('./src/renderer/shell/commandPalette.js') < loaderSource.indexOf('./src/renderer/shell/eventBindings.js'));
  assert.ok(eventSource.includes('handleCommandPaletteShortcut(event)'));
  assert.ok(eventSource.includes('bindCommandPaletteEvents'));
  assert.ok(eventSource.includes('topModal === ui.commandPaletteModal'));
  [
    '.command-palette-panel',
    '.command-palette-result.is-active',
    '.command-palette-shortcut-row',
    '@media (prefers-reduced-motion: reduce)',
    '.motion-disabled :where('
  ].forEach(selector => assert.ok(styleSource.includes(selector), `${selector} must stay in command palette styles`));
  ['var(--motion-duration, 580ms)', 'var(--motion-duration-fast)'].forEach(duration => {
    assert.ok(styleSource.includes(duration), `${duration} must stay represented in command palette timing`);
  });
  ['zh.js', 'en.js'].forEach(name => {
    const source = readLocaleSource(name);
    [
      'openCommandPalette',
      'commandPaletteSearchPlaceholder',
      'commandPaletteRecent',
      'commandPaletteSuggested',
      'commandPaletteBlockedByDialog',
      'commandGroupZones',
      'commandGroupPoints',
      'commandShortcutExecute'
    ].forEach(key => assert.ok(source.includes(`"${key}"`), `${name} missing ${key}`));
  });
}

function testMotionFeedbackContract() {
  const read = relativePath => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
  const listRuntime = read('src/renderer/features/recycleBin/index.js');
  const objectRuntime = read('src/renderer/shell/objectWorkflow.js');
  const objectStyles = read('src/renderer/styles/52-object-workflow.css');
  const workspaceStyles = read('src/renderer-modern/styles/workspace-motion.css');
  const historyStyles = read('src/renderer-modern/styles/project-history.css');
  const runtimeMotionSmoke = read('scripts/renderer-smoke/motion-contract.js');

  assert.ok(listRuntime.includes("classList.add('is-entering')"));
  assert.ok(listRuntime.includes("classList.remove('is-entering')"));
  assert.ok(objectRuntime.includes('}, 760);'));
  ['objectListPanelIn', 'objectListItemIn', 'objectSelectionPulse 720ms'].forEach(fragment => {
    assert.ok(objectStyles.includes(fragment), `object workflow motion missing ${fragment}`);
  });
  ['uiModuleButtonIn', '--motion-duration-reveal, 720ms', '.ui-module-button::after'].forEach(fragment => {
    assert.ok(workspaceStyles.includes(fragment), `module motion missing ${fragment}`);
  });
  ['projectSaveConfirmed', 'projectSaveRing', 'projectSaveError'].forEach(fragment => {
    assert.ok(historyStyles.includes(fragment), `save feedback motion missing ${fragment}`);
  });
  assert.ok(runtimeMotionSmoke.includes('moduleTransitionDurations'));
  assert.ok(runtimeMotionSmoke.includes('duration >= 260'));
}

function testProjectEditHistoryContract() {
  const modernRoot = path.join(process.cwd(), 'src/renderer-modern');
  const modelSource = fs.readFileSync(path.join(modernRoot, 'features/history/model.ts'), 'utf8');
  const bridgeSource = fs.readFileSync(path.join(modernRoot, 'features/history/runtime.ts'), 'utf8');
  const componentSource = fs.readFileSync(path.join(modernRoot, 'features/history/ProjectHistoryControls.tsx'), 'utf8');
  const styleSource = fs.readFileSync(path.join(modernRoot, 'styles/project-history.css'), 'utf8');
  const mainSource = fs.readFileSync(path.join(modernRoot, 'main.tsx'), 'utf8');
  const runtimeSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/shell/projectHistory.js'), 'utf8');
  const projectSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/features/project/index.js'), 'utf8');
  const phenologySource = readPhenologyRuntimeSource();
  const mapSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/map/map.js'), 'utf8');
  const pointSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/map/points.js'), 'utf8');
  const recycleSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/features/recycleBin/index.js'), 'utf8');
  const loaderSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/legacy-loader.js'), 'utf8');
  const eventSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/shell/eventBindings.js'), 'utf8');
  const commandSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/shell/commandRegistry.js'), 'utf8');
  const elementsSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/dom/elements.js'), 'utf8');

  [
    'ProjectEditSnapshot',
    'ProjectEditHistoryEntry',
    'createProjectEditHistory',
    'undoStack',
    'redoStack',
    'redoStack.length = 0',
    'structuredClone(entry)'
  ].forEach(fragment => assert.ok(modelSource.includes(fragment), `history model missing ${fragment}`));
  assert.ok(modelSource.includes('DEFAULT_HISTORY_LIMIT = 30'));
  assert.ok(bridgeSource.includes('installProjectEditHistoryBridge'));
  assert.ok(bridgeSource.includes("Object.defineProperty(window, 'projectEditHistory'"));
  assert.ok(mainSource.includes('installProjectEditHistoryBridge()'));
  assert.ok(mainSource.includes("./styles/project-history.css"));

  [
    'projectHistoryControls',
    'btnUndoProjectEdit',
    'btnRedoProjectEdit',
    'projectSaveStatus',
    'projectSaveStatusText',
    'projectSaveTimestamp'
  ].forEach(id => {
    assert.ok(componentSource.includes(`id="${id}"`), `${id} must stay in the history controls`);
    assert.ok(elementsSource.includes(`'${id}'`), `${id} must stay registered in the DOM map`);
  });

  [
    'function captureProjectEditSnapshot',
    'function beginProjectEdit',
    'function commitProjectEdit',
    'function prepareProjectEditHistoryForSave',
    'function undoProjectEdit',
    'function redoProjectEdit',
    'function handleProjectHistoryShortcut',
    'function handleProjectBeforeUnload',
    'projectEditSession.draftSources'
  ].forEach(fragment => assert.ok(runtimeSource.includes(fragment), `history runtime missing ${fragment}`));
  assert.ok(runtimeSource.includes('zones: cloneProjectEditValue(state.zones || [])'));
  assert.ok(runtimeSource.includes('points: cloneProjectEditValue(state.points || [])'));
  assert.ok(!/\b(fetch|readFile|writeFile|child_process)\b/.test(runtimeSource), 'history runtime must remain memory-only');
  assert.ok(projectSource.includes('notifyProjectSaveStarted'));
  assert.ok(projectSource.includes('notifyProjectSaveSucceeded'));
  assert.ok(projectSource.includes('notifyProjectSaveFailed'));
  assert.ok(projectSource.includes('resetProjectEditHistory'));
  assert.ok(phenologySource.includes("beginProjectEdit('historyEditZone')"));
  assert.ok(phenologySource.includes("beginProjectEdit('historyEditPoint')"));
  assert.ok(phenologySource.includes("beginProjectEdit('historyAddPhenology')"));
  assert.ok(mapSource.includes("beginProjectEdit('historyCreateZone')"));
  assert.ok(pointSource.includes("beginProjectEdit('historyCreatePoint')"));
  assert.ok(!recycleSource.includes('beginProjectEdit'), 'destructive recycle operations must stay outside session history');
  assert.ok(eventSource.includes('handleProjectHistoryShortcut(event)'));
  assert.ok(eventSource.includes('bindProjectHistoryEvents'));
  assert.ok(commandSource.includes("id: 'edit.undo'"));
  assert.ok(commandSource.includes("id: 'edit.redo'"));
  assert.ok(loaderSource.indexOf('./src/renderer/features/project/index.js') < loaderSource.indexOf('./src/renderer/shell/projectHistory.js'));
  assert.ok(loaderSource.indexOf('./src/renderer/shell/projectHistory.js') < loaderSource.indexOf('./src/renderer/shell/commandRegistry.js'));

  [
    '.project-history-controls',
    '.project-save-status.is-saving',
    '@media (prefers-reduced-motion: reduce)',
    '.motion-disabled :where('
  ].forEach(selector => assert.ok(styleSource.includes(selector), `${selector} must stay in history styles`));
  ['var(--motion-duration-fast, 440ms)', '900ms'].forEach(duration => {
    assert.ok(styleSource.includes(duration), `${duration} must stay represented in history timing`);
  });
  ['zh.js', 'en.js'].forEach(name => {
    const source = readLocaleSource(name);
    [
      'undoProjectEdit',
      'redoProjectEdit',
      'saveStateSaved',
      'saveStateDraft',
      'historyBlockedByDraft',
      'historyEditPoint',
      'projectDraftDiscardPrompt'
    ].forEach(key => assert.ok(source.includes(`"${key}"`), `${name} missing ${key}`));
  });
}

function testResearchReviewWorkbenchContract() {
  const modernRoot = path.join(process.cwd(), 'src/renderer-modern');
  const modelSource = fs.readFileSync(path.join(modernRoot, 'features/review/model.ts'), 'utf8');
  const bridgeSource = fs.readFileSync(path.join(modernRoot, 'features/review/runtime.ts'), 'utf8');
  const componentSource = fs.readFileSync(path.join(modernRoot, 'features/review/ReviewWorkbenchModal.tsx'), 'utf8');
  const styleSource = fs.readFileSync(path.join(modernRoot, 'styles/review-workbench.css'), 'utf8');
  const appSource = fs.readFileSync(path.join(modernRoot, 'App.tsx'), 'utf8');
  const mainSource = fs.readFileSync(path.join(modernRoot, 'main.tsx'), 'utf8');
  const launcherSource = fs.readFileSync(path.join(modernRoot, 'features/shell/WorkspaceToolsPanel.tsx'), 'utf8');
  const runtimeSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/features/review/index.js'), 'utf8');
  const loaderSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/legacy-loader.js'), 'utf8');
  const eventSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/shell/eventBindings.js'), 'utf8');
  const derivedSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/features/recycleBin/index.js'), 'utf8');
  const commandSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/shell/commandRegistry.js'), 'utf8');
  const elementsSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/dom/elements.js'), 'utf8');

  [
    'ReviewIssueId',
    'REVIEW_ISSUE_DEFINITIONS',
    'buildResearchReviewQueue',
    'progressPercent',
    'missingCoordinate',
    'invalidZone',
    'unverifiedTaxonomy',
    'missingPhenology',
    'missingImage'
  ].forEach(fragment => assert.ok(modelSource.includes(fragment), `review model missing ${fragment}`));
  assert.ok(modelSource.includes('points.map(asRecord)'), 'review model must derive tasks without mutating points');
  assert.ok(bridgeSource.includes("Object.defineProperty(window, 'researchReview'"));
  assert.ok(mainSource.includes('installResearchReviewBridge()'));
  assert.ok(mainSource.includes("./styles/review-workbench.css"));
  assert.ok(appSource.includes('<ReviewWorkbenchModal />'));
  assert.ok(launcherSource.includes("id: 'btnOpenReviewWorkbench'"));

  [
    'reviewWorkbenchModal',
    'btnCloseReviewWorkbench',
    'reviewProgressTrack',
    'reviewIssueFilter',
    'reviewZoneFilter',
    'reviewSeverityFilter',
    'reviewSearch',
    'reviewTaskList',
    'reviewTaskDetail',
    'btnLocateReviewTask',
    'btnEditReviewTask'
  ].forEach(id => {
    const hasComponentId = componentSource.includes(`id="${id}"`) ||
      componentSource.includes(`closeButtonId="${id}"`);
    assert.ok(hasComponentId, `${id} must stay in the review component`);
    assert.ok(elementsSource.includes(`'${id}'`), `${id} must stay registered in the DOM map`);
  });

  [
    'function openReviewWorkbench',
    'function refreshReviewWorkbench',
    'function syncReviewFilterState',
    'function navigateReviewTask',
    'function locateCurrentReviewTask',
    'function editCurrentReviewTask',
    "activateObjectSelection('point'",
    'openPointEditor()',
    'function bindReviewWorkbenchEvents'
  ].forEach(fragment => assert.ok(runtimeSource.includes(fragment), `review runtime missing ${fragment}`));
  const restrictedSurface = `${modelSource}\n${bridgeSource}\n${runtimeSource}`;
  assert.ok(
    !/\b(fetch|ipcRenderer|readFile|writeFile|child_process)\b/.test(restrictedSurface),
    'review workbench must remain local, read-only, and outside IPC or file APIs'
  );
  assert.ok(loaderSource.includes('./src/renderer/features/review/index.js'));
  assert.ok(
    loaderSource.indexOf('./src/renderer/features/phenology/index.js') <
      loaderSource.indexOf('./src/renderer/features/review/index.js'),
    'review runtime must load after point editing functions'
  );
  assert.ok(eventSource.includes('bindReviewWorkbenchEvents'));
  assert.ok(derivedSource.includes('refreshReviewWorkbench'));
  assert.ok(commandSource.includes("id: 'analysis.review-workbench'"));
  assert.ok(commandSource.includes("targetId: 'btnOpenReviewWorkbench'"));

  [
    '.review-workbench-panel',
    '.review-summary-grid',
    '.review-task-card.is-selected',
    '.review-detail-actions',
    '@media (prefers-reduced-motion: reduce)',
    '.motion-disabled :where('
  ].forEach(selector => assert.ok(styleSource.includes(selector), `${selector} must stay in review styles`));
  ['var(--motion-duration-fast, 440ms)', 'var(--motion-duration, 580ms)'].forEach(duration => {
    assert.ok(styleSource.includes(duration), `${duration} must stay represented in review timing`);
  });
  ['zh.js', 'en.js'].forEach(name => {
    const source = readLocaleSource(name);
    [
      'openReviewWorkbench',
      'reviewWorkbenchTitle',
      'reviewIssueFilter',
      'reviewSeverityHigh',
      'reviewNoMatchingTasks',
      'reviewIssueInvalidZone',
      'reviewIssueMissingScientificName',
      'reviewIssueUnverifiedTaxonomy',
      'reviewIssueMissingImage'
    ].forEach(key => assert.ok(source.includes(`"${key}"`), `${name} missing ${key}`));
  });
}

function testRendererDomainModuleArchitectureContract() {
  const appFile = relativePath => path.join(process.cwd(), relativePath);
  const read = relativePath => fs.readFileSync(appFile(relativePath), 'utf8');
  const phenologyFiles = [...PHENOLOGY_RUNTIME_FILES];
  const speciesReferenceFiles = [...SPECIES_REFERENCE_RUNTIME_FILES];
  const maintenanceFiles = [...MAINTENANCE_RUNTIME_FILES];
  const loaderSource = read('src/renderer/legacy-loader.js');

  [...phenologyFiles, ...speciesReferenceFiles, ...maintenanceFiles].forEach(relativePath => {
    assert.ok(fs.existsSync(appFile(relativePath)), `${relativePath} must exist`);
  });
  [
    'src/renderer/features/maintenance/logsSettings.js',
    'src/renderer/features/maintenance/storage.js'
  ].forEach(relativePath => {
    assert.ok(!fs.existsSync(appFile(relativePath)), `${relativePath} must remain split by responsibility`);
  });

  let previousLoaderIndex = -1;
  [...phenologyFiles, ...speciesReferenceFiles, ...maintenanceFiles].forEach(relativePath => {
    const loaderEntry = `./${relativePath}`;
    const currentIndex = loaderSource.indexOf(loaderEntry);
    assert.ok(currentIndex > previousLoaderIndex, `${loaderEntry} must keep its dependency order`);
    previousLoaderIndex = currentIndex;
  });

  const phenology = Object.fromEntries(phenologyFiles.map(file => [path.basename(file), read(file)]));
  [
    ['draftState.js', 'function pointEditorHasUnsavedChanges'],
    ['taxonomy.js', 'function applyTaxonomyFieldsToPoint'],
    ['taxonomy.js', 'async function runTaxonomySuggestion'],
    ['form.js', 'function populatePointForm'],
    ['form.js', 'function readPointFormIntoEntry'],
    ['actions.js', 'async function applyPointInfo'],
    ['actions.js', "beginProjectEdit('historyEditPoint')"],
    ['index.js', 'function bindPhenologyFeatureEvents']
  ].forEach(([fileName, fragment]) => {
    assert.ok(phenology[fileName].includes(fragment), `${fileName} missing ${fragment}`);
  });
  assert.ok(!phenology['draftState.js'].includes('persistProject'), 'draft state must remain memory-only');
  assert.ok(!phenology['form.js'].includes('persistProject'), 'form mapping must not persist data');
  assert.ok(phenology['index.js'].split(/\r?\n/).length <= 40, 'phenology index must remain an event coordinator');

  const speciesReference = Object.fromEntries(speciesReferenceFiles.map(file => [path.basename(file), read(file)]));
  [
    ['state.js', 'function getSpeciesReferencePanelController'],
    ['links.js', 'function safeExternalUrl'],
    ['view.js', 'function renderSpeciesReferenceResults'],
    ['queries.js', 'async function runSpeciesReferenceQuery'],
    ['queries.js', 'async function runSpeciesImageCompare'],
    ['actions.js', 'async function applySpeciesReferenceSuggestion'],
    ['index.js', 'function bindSpeciesReferenceEvents']
  ].forEach(([fileName, fragment]) => {
    assert.ok(speciesReference[fileName].includes(fragment), `${fileName} missing ${fragment}`);
  });
  assert.ok(speciesReference['index.js'].split(/\r?\n/).length <= 60, 'species reference index must remain an event coordinator');
  speciesReferenceFiles.forEach(relativePath => {
    const lineCount = read(relativePath).split(/\r?\n/).length;
    assert.ok(lineCount <= 320, `${relativePath} exceeds the domain-module size guard (${lineCount})`);
  });

  const maintenance = Object.fromEntries(maintenanceFiles.map(file => [path.basename(file), read(file)]));
  [
    ['safeMode.js', 'function guardMaintenanceReadOnlyAction'],
    ['diagnostics.js', 'async function runMaintenanceHealthCheck'],
    ['repair.js', 'async function runMaintenanceSafeRepair'],
    ['repair.js', 'createBackupZip'],
    ['logs.js', 'async function refreshMaintenanceLogs'],
    ['settings.js', 'function buildSettingsBundle'],
    ['diagnosticsExport.js', 'function buildDiagnosticsPayload'],
    ['storageView.js', 'function renderStorageArtifacts'],
    ['storageWorkflow.js', 'async function inspectProjectBackup'],
    ['storageActions.js', 'async function deleteSelectedStorageArtifacts'],
    ['index.js', 'function bindMaintenanceEvents']
  ].forEach(([fileName, fragment]) => {
    assert.ok(maintenance[fileName].includes(fragment), `${fileName} missing ${fragment}`);
  });
  assert.ok(maintenance['core.js'].split(/\r?\n/).length <= 60, 'maintenance core must stay limited to shared helpers');
  maintenanceFiles.forEach(relativePath => {
    const lineCount = read(relativePath).split(/\r?\n/).length;
    assert.ok(lineCount <= 380, `${relativePath} exceeds the domain-module size guard (${lineCount})`);
  });

  const rendererDomainSource = `${readPhenologyRuntimeSource()}\n${readSpeciesReferenceRuntimeSource()}\n${readMaintenanceRuntimeSource()}`;
  assert.ok(
    !/\b(ipcRenderer|child_process|readFileSync|writeFileSync)\b/.test(rendererDomainSource),
    'renderer domain modules must use the preload business facade instead of system APIs'
  );

  const stateModel = read('src/renderer-modern/features/state/model.ts');
  const stateRuntime = read('src/renderer-modern/features/state/runtime.ts');
  const modernMain = read('src/renderer-modern/main.tsx');
  const snapshotContract = stateModel.slice(
    stateModel.indexOf('export interface RendererStateSnapshot'),
    stateModel.indexOf('export interface RendererProjectData')
  );
  assert.ok(stateModel.includes('createRendererStateFacade'));
  assert.ok(stateModel.includes('structuredClone(value)'));
  assert.ok(!snapshotContract.includes('projectDir'), 'typed renderer snapshot must not expose local paths');
  assert.ok(stateRuntime.includes("Object.defineProperty(window, 'rendererState'"));
  assert.ok(stateRuntime.includes('writable: false'));
  assert.ok(modernMain.includes('installRendererStateFacade()'));
  assert.ok(
    !/\b(fetch|ipcRenderer|readFile|writeFile|child_process)\b/.test(`${stateModel}\n${stateRuntime}`),
    'typed renderer state facade must remain local and capability-free'
  );

  const domainFiles = [
    'src/renderer-modern/domain/project/types.ts',
    'src/renderer-modern/domain/project/adapters.ts',
    'src/renderer-modern/domain/phenology/model.ts',
    'src/renderer-modern/domain/taxonomy/model.ts',
    'src/renderer-modern/domain/maintenance/model.ts',
    'src/renderer-modern/domain/species-reference/model.ts',
    'src/renderer-modern/domain/runtime.ts'
  ];
  const domainSource = domainFiles.map(relativePath => {
    assert.ok(fs.existsSync(appFile(relativePath)), `${relativePath} must exist`);
    const source = read(relativePath);
    const lineCount = source.split(/\r?\n/).length;
    assert.ok(lineCount <= 260, `${relativePath} exceeds the typed domain size guard (${lineCount})`);
    return source;
  }).join('\n');
  [
    'interface ZoneDomainRecord',
    'interface PointDomainRecord',
    'interface PhenologyDomainRecord',
    'interface TaxonomyCandidateSummary',
    'function adaptProjectRecords',
    'function createPhenologyDraftController',
    'function compactTaxonomyCandidates',
    'function countMaintenanceIssues',
    'function createSpeciesReferencePanelController',
    "version: 'renderer-domain-v1'",
    "Object.defineProperty(window, 'rendererDomain'"
  ].forEach(fragment => assert.ok(domainSource.includes(fragment), `typed renderer domain missing ${fragment}`));
  assert.ok(modernMain.includes('installRendererDomainBridge()'));
  assert.ok(modernMain.indexOf('installRendererDomainBridge()') < modernMain.indexOf('installRendererStateFacade()'));
  assert.ok(phenology['draftState.js'].includes('window.rendererDomain?.phenology'));
  assert.ok(phenology['taxonomy.js'].includes('window.rendererDomain?.taxonomy'));
  assert.ok(maintenance['diagnostics.js'].includes('window.rendererDomain?.maintenance'));
  assert.ok(speciesReference['state.js'].includes('window.rendererDomain?.speciesReference'));
  const rendererSmokeSource = read('scripts/renderer-smoke.js');
  const domainSmokeSource = read('scripts/renderer-smoke/domain-contract.js');
  assert.ok(rendererSmokeSource.includes("require('./renderer-smoke/domain-contract')"));
  assert.ok(rendererSmokeSource.includes('runRendererDomainSmoke.toString()'));
  assert.ok(domainSmokeSource.includes('function runRendererDomainSmoke'));
  assert.ok(domainSmokeSource.includes('rendererDomainAdapterInputUnchanged'));
  assert.ok(domainSmokeSource.split(/\r?\n/).length <= 180, 'renderer domain smoke contract must remain focused');
  assert.ok(
    !/\b(fetch|ipcRenderer|readFile|writeFile|child_process|projectDir)\b/.test(domainSource),
    'typed renderer domain must remain path-neutral and outside network, IPC, and file APIs'
  );
}
