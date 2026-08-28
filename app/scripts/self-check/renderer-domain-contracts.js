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
  ['src/renderer/features/maintenance/logsSettings.js', 'src/renderer/features/maintenance/storage.js'].forEach(
    relativePath => {
      assert.ok(!fs.existsSync(appFile(relativePath)), `${relativePath} must remain split by responsibility`);
    }
  );

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
  assert.ok(
    speciesReference['index.js'].split(/\r?\n/).length <= 60,
    'species reference index must remain an event coordinator'
  );
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

  const selectionModel = read('src/renderer-modern/features/selection/model.ts');
  const selectionRuntime = read('src/renderer-modern/features/selection/runtime.ts');
  const selectionSources = `${selectionModel}\n${selectionRuntime}`;
  assert.ok(selectionModel.includes('createObjectSelectionStore'));
  assert.ok(selectionModel.includes("version: 'object-selection-v1'"));
  assert.ok(selectionModel.includes('subscribe(listener)'));
  assert.ok(selectionRuntime.includes("Object.defineProperty(window, 'objectSelectionStore'"));
  assert.ok(selectionRuntime.includes('writable: false'));
  assert.ok(modernMain.includes('installObjectSelectionStore()'));
  assert.ok(modernMain.indexOf('installObjectSelectionStore()') < modernMain.indexOf('installRendererStateFacade()'));
  assert.ok(read('src/renderer/map/zones.js').includes('window.objectSelectionStore.selectZone(zoneId)'));
  assert.ok(read('src/renderer/map/points.js').includes('window.objectSelectionStore.selectPoint({'));
  assert.ok(
    read('src/renderer/shell/objectWorkflow.js').includes('window.objectSelectionStore.setHover({ type, id, active })')
  );
  assert.ok(read('src/renderer/shell/eventBindings.js').includes('window.objectSelectionStore.setActiveListTab(tab)'));
  assert.ok(selectionModel.split(/\r?\n/).length <= 220, 'selection store model must remain focused');
  assert.ok(selectionRuntime.split(/\r?\n/).length <= 60, 'selection runtime bridge must remain focused');
  assert.ok(
    !/\b(fetch|ipcRenderer|readFile|writeFile|child_process|projectDir)\b/.test(selectionSources),
    'typed object selection state must remain path-neutral and outside network, IPC, and file APIs'
  );

  const queryModel = read('src/renderer-modern/features/query/model.ts');
  const queryRuntime = read('src/renderer-modern/features/query/runtime.ts');
  const queryLegacy = read('src/renderer/features/query/index.js');
  const querySources = `${queryModel}\n${queryRuntime}`;
  assert.ok(queryModel.includes('function runProjectQuery'));
  assert.ok(queryModel.includes('function getPointQueryCompleteness'));
  assert.ok(queryRuntime.includes("version: 'research-query-v1'"));
  assert.ok(queryRuntime.includes("Object.defineProperty(window, 'researchQuery'"));
  assert.ok(modernMain.includes('installResearchQueryBridge()'));
  assert.ok(modernMain.indexOf('installRendererDomainBridge()') < modernMain.indexOf('installResearchQueryBridge()'));
  assert.ok(queryLegacy.includes('window.researchQuery?.run(state.zones, state.points, readQueryFilters())'));
  assert.ok(!queryLegacy.includes('function pointMatchesCompleteness'));
  assert.ok(queryModel.split(/\r?\n/).length <= 260, 'query model must remain focused');
  assert.ok(queryRuntime.split(/\r?\n/).length <= 80, 'query runtime bridge must remain focused');
  assert.ok(
    !/\b(fetch|ipcRenderer|readFile|writeFile|child_process|projectDir)\b/.test(querySources),
    'typed research query must remain path-neutral and outside network, IPC, and file APIs'
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
  const domainSource = domainFiles
    .map(relativePath => {
      assert.ok(fs.existsSync(appFile(relativePath)), `${relativePath} must exist`);
      const source = read(relativePath);
      const lineCount = source.split(/\r?\n/).length;
      assert.ok(lineCount <= 260, `${relativePath} exceeds the typed domain size guard (${lineCount})`);
      return source;
    })
    .join('\n');
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
  assert.ok(domainSmokeSource.includes('researchQueryModelReady'));
  assert.ok(domainSmokeSource.split(/\r?\n/).length <= 180, 'renderer domain smoke contract must remain focused');
  assert.ok(
    !/\b(fetch|ipcRenderer|readFile|writeFile|child_process|projectDir)\b/.test(domainSource),
    'typed renderer domain must remain path-neutral and outside network, IPC, and file APIs'
  );
}
