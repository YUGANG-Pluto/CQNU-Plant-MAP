function testMaintenanceCenterContract() {
  const html = readRendererMarkup();
  const loaderSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/legacy-loader.js'), 'utf8');
  const preloadSource = fs.readFileSync(path.join(process.cwd(), 'electron/preload/index.ts'), 'utf8');
  const ipcSource = fs.readFileSync(path.join(process.cwd(), 'electron/main/ipc/register.ts'), 'utf8');
  const loggerSource = fs.readFileSync(path.join(process.cwd(), 'src/main/logger.js'), 'utf8');
  const elementsSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/dom/elements.js'), 'utf8');
  const appSource = readAppSources([
    'src/renderer/shell/eventBindings.js',
    'src/renderer/app.js'
  ]);
  const maintenanceSource = readMaintenanceRuntimeSource();
  const cssSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/styles/13-maintenance.css'), 'utf8');
  const mapSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/map/map.js'), 'utf8');
  const pointMapSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/map/points.js'), 'utf8');
  const recycleSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/features/recycleBin/index.js'), 'utf8');
  const basemapSource = readAppSources([
    'src/renderer/features/basemap/model.js',
    'src/renderer/features/basemap/layers.js',
    'src/renderer/features/basemap/overlays.js',
    'src/renderer/features/basemap/index.js'
  ]);
  const projectSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/features/project/index.js'), 'utf8');
  const statsSource = readAppSources([
    'src/renderer/features/stats/config.js',
    'src/renderer/features/stats/view.js',
    'src/renderer/features/stats/export.js',
    'src/renderer/features/stats/index.js'
  ]);
  const themeSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer-modern/features/theme/runtime.ts'), 'utf8');

  [
    'btnOpenMaintenance',
    'maintenanceModal',
    'btnRunHealthCheck',
    'btnRunSafeRepair',
    'btnExportDiagnostics',
    'btnStoragePreflight',
    'btnCreateSqliteStorage',
    'btnExportSqliteJson',
    'btnRefreshStorageArtifacts',
    'btnDeleteSelectedStorageArtifacts',
    'btnApplySafeMode',
    'btnExitSafeMode',
    'maintenanceSafeModeStatus',
    'btnExportUiSettings',
    'btnImportUiSettings'
  ].forEach(id => {
    assert.ok(rendererMarkupHasId(html, id), `${id} must exist in maintenance UI`);
    assert.ok(elementsSource.includes(`'${id}'`), `${id} must be registered`);
  });
  assert.ok(loaderSource.indexOf('./src/renderer/features/project/index.js') < loaderSource.indexOf('./src/renderer/features/maintenance/index.js'));
  assert.ok(loaderSource.indexOf('./src/renderer/features/maintenance/index.js') < loaderSource.indexOf('./src/renderer/app.js'));
  assert.ok(appSource.includes('bindMaintenanceEvents'));
  assert.ok(appSource.includes('syncMaintenanceSafeModeUi'));
  [
    'invoke(IPC_CHANNELS.settings.importJson',
    'invoke(IPC_CHANNELS.settings.exportJson',
    'invoke(IPC_CHANNELS.backup.inspectRestore',
    'invoke(IPC_CHANNELS.backup.restore',
    'invoke(IPC_CHANNELS.log.listRecent',
    'invoke(IPC_CHANNELS.log.readLog',
    'invoke(IPC_CHANNELS.log.deleteLogs',
    'invoke(IPC_CHANNELS.log.cleanup',
    'invoke(IPC_CHANNELS.log.exportDiagnostics',
    'invoke(IPC_CHANNELS.maintenance.checkImageRefs',
    'invoke(IPC_CHANNELS.storage.conversionPreflight',
    'invoke(IPC_CHANNELS.storage.listArtifacts',
    'invoke(IPC_CHANNELS.storage.deleteArtifacts',
    'invoke(IPC_CHANNELS.storage.createSqliteFromJson',
    'invoke(IPC_CHANNELS.storage.exportSqliteToJson'
  ].forEach(fragment => assert.ok(preloadSource.includes(fragment), `preload missing ${fragment}`));
  [
    'handle(IPC_CHANNELS.settings.importJson',
    'handle(IPC_CHANNELS.settings.exportJson',
    'handle(IPC_CHANNELS.backup.inspectRestore',
    'handle(IPC_CHANNELS.backup.restore',
    'handle(IPC_CHANNELS.log.listRecent',
    'handle(IPC_CHANNELS.log.readLog',
    'handle(IPC_CHANNELS.log.deleteLogs',
    'handle(IPC_CHANNELS.log.cleanup',
    'handle(IPC_CHANNELS.log.exportDiagnostics',
    'handle(IPC_CHANNELS.maintenance.checkImageRefs',
    'handle(IPC_CHANNELS.storage.conversionPreflight',
    'handle(IPC_CHANNELS.storage.listArtifacts',
    'handle(IPC_CHANNELS.storage.deleteArtifacts',
    'handle(IPC_CHANNELS.storage.createSqliteFromJson',
    'handle(IPC_CHANNELS.storage.exportSqliteToJson'
  ].forEach(fragment => assert.ok(ipcSource.includes(fragment), `IPC missing ${fragment}`));
  assert.ok(loggerSource.includes('function listRecentLogs'));
  assert.ok(loggerSource.includes('function readLogFile'));
  assert.ok(loggerSource.includes('function diagnoseLogContent'));
  assert.ok(loggerSource.includes('function deleteLogFiles'));
  assert.ok(loggerSource.includes('function cleanupOldLogs'));
  assert.ok(maintenanceSource.includes('MAINTENANCE_SETTINGS_SCHEMA'));
  assert.ok(maintenanceSource.includes('function createMaintenanceSafeModeTheme'));
  assert.ok(maintenanceSource.includes("createThemeDefaults('linear-minimal')"));
  assert.ok(maintenanceSource.includes('function exitSafeModeSettings'));
  assert.ok(maintenanceSource.includes('previousUiTheme'));
  assert.ok(maintenanceSource.includes('syncMaintenanceSafeModeUi'));
  assert.ok(maintenanceSource.includes('SAFE_MODE_LOCKED_IDS'));
  assert.ok(maintenanceSource.includes('SAFE_MODE_READONLY_FIELD_IDS'));
  assert.ok(maintenanceSource.includes('SAFE_MODE_DYNAMIC_LOCKED_SELECTORS'));
  assert.ok(maintenanceSource.includes('function guardMaintenanceReadOnlyAction'));
  assert.ok(maintenanceSource.includes('function enforceSafeModeMapBrowseOnly'));
  [
    "'btnSave'",
    "'btnApplyZone'",
    "'btnApplyPoint'",
    "'btnRunMerge'",
    "'btnRunManualBackup'",
    "'btnExportDiagnostics'",
    "'btnStoragePreflight'",
    "'btnCreateSqliteStorage'",
    "'btnExportSqliteJson'",
    "'btnLoadSqliteStorage'",
    "'btnLoadJsonStorage'",
    "'btnRefreshStorageArtifacts'",
    "'btnDeleteSelectedStorageArtifacts'",
    "'btnInspectSelectedBackup'",
    "'btnRestoreSelectedBackup'"
  ].forEach(fragment => assert.ok(maintenanceSource.includes(fragment), `safe mode lock list missing ${fragment}`));
  assert.ok(mapSource.includes("isMaintenanceReadOnlyMode() && mode !== 'browse'"));
  assert.ok(mapSource.includes("guardMaintenanceReadOnlyAction('map-add-point')"));
  assert.ok(pointMapSource.includes("guardMaintenanceReadOnlyAction('create-point')"));
  assert.ok(pointMapSource.includes("guardMaintenanceReadOnlyAction('confirm-point')"));
  assert.ok(recycleSource.includes("guardMaintenanceReadOnlyAction('delete-zone')"));
  assert.ok(recycleSource.includes("guardMaintenanceReadOnlyAction('restore-trash')"));
  assert.ok(basemapSource.includes("guardMaintenanceReadOnlyAction('save-basemap')"));
  assert.ok(basemapSource.includes("guardMaintenanceReadOnlyAction('correct-geometry')"));
  assert.ok(projectSource.includes("guardMaintenanceReadOnlyAction('import-csv')"));
  assert.ok(statsSource.includes("guardMaintenanceReadOnlyAction('stats-settings')"));
  assert.ok(themeSource.includes("guard('save-theme')"));
  assert.ok(!maintenanceSource.includes("maintenanceText('cancelCreatePoint')"));
  assert.ok(maintenanceSource.includes('createBackupZip(state.projectDir, \'\', \'maintenance\')'));
  assert.ok(maintenanceSource.includes('maintenanceSafeRepairScope'));
  assert.ok(!maintenanceSource.includes('deleteCurrent'));
  assert.ok(!maintenanceSource.includes('state.points = state.points.filter'));
  assert.ok(fs.readFileSync(path.join(process.cwd(), 'src/renderer/utils/dialogs.js'), 'utf8').includes("t('cancelAction')"));
  assert.ok(cssSource.includes('.maintenance-grid'));
  assert.ok(cssSource.includes('.safe-mode-locked-control'));
  ['zh.js', 'en.js'].forEach(name => {
    const source = readLocaleSource(name);
    [
      'openMaintenanceCenter',
      'maintenanceCenterTitle',
      'maintenanceSafeRepair',
      'maintenanceExportDiagnostics',
      'maintenanceApplySafeMode',
      'maintenanceExitSafeMode',
      'maintenanceSafeModeOn',
      'maintenanceSafeModeReadOnlyBlocked',
      'maintenanceSafeModeReadOnlyTitle',
      'maintenanceStorageTitle',
      'maintenanceStoragePreflight',
      'maintenanceStorageCreateSqlite',
      'maintenanceStorageExportJson',
      'maintenanceStorageAvailableFormats',
      'maintenanceStorageNoReadableFormat',
      'maintenanceStorageRecovery',
      'maintenanceStorageRestoreFromBackupHint',
      'maintenanceStorageCreateRecoveryHint',
      'maintenanceStorageExportRecoveryHint',
      'maintenanceStorageLoadRecoveryHint',
      'maintenanceBackupInspectRestore',
      'maintenanceBackupRestoreSelected',
      'maintenanceBackupRestoreHighRiskConfirm',
      'maintenanceBackupRestoreSafetyBackup',
      'cancelAction'
    ].forEach(key => assert.ok(source.includes(`"${key}"`), `${name} missing ${key}`));
  });
}

function testSpeciesReferenceContract() {
  const html = readRendererMarkup();
  const loaderSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/legacy-loader.js'), 'utf8');
  const preloadSource = fs.readFileSync(path.join(process.cwd(), 'electron/preload/index.ts'), 'utf8');
  const ipcSource = fs.readFileSync(path.join(process.cwd(), 'electron/main/ipc/register.ts'), 'utf8');
  const serviceSource = readAppSources([
    'src/main/speciesReference/textUtils.js',
    'src/main/speciesReference/requestClient.js',
    'src/main/speciesReference/normalizers.js',
    'src/main/speciesReference/taxonomySuggestion.js',
    'src/main/speciesReferenceService.js'
  ]);
  const rendererSource = readSpeciesReferenceRuntimeSource();
  const querySource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/features/query/index.js'), 'utf8');
  const projectSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/features/project/index.js'), 'utf8');
  const elementsSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/dom/elements.js'), 'utf8');
  const appSource = readAppSources([
    'src/renderer/shell/eventBindings.js',
    'src/renderer/app.js'
  ]);
  const stateSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/state/store.js'), 'utf8');
  const maintenanceSource = readMaintenanceRuntimeSource();
  const phenologySource = readPhenologyRuntimeSource();
  const cssSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/styles/13-maintenance.css'), 'utf8');

  [
    'btnOpenSpeciesReference',
    'btnOpenSpeciesReferenceInline',
    'speciesReferenceModal',
    'speciesReferenceSciInput',
    'speciesReferenceCommonInput',
    'btnRunSpeciesReference',
    'speciesReferenceImageTokenInput',
    'speciesReferenceApplyTaxonomy',
    'btnOpenInatTokenPage',
    'btnRunSpeciesImageCompare',
    'speciesReferenceImageCompareStatus',
    'speciesReferenceDetail',
    'speciesReferenceResults',
    'btnPreviewSpeciesReferenceImage',
    'btnDiscardSpeciesReference',
    'btnApplySpeciesReference'
  ].forEach(id => {
    assert.ok(rendererMarkupHasId(html, id), `${id} must exist in species reference UI`);
    assert.ok(elementsSource.includes(`'${id}'`), `${id} must be registered`);
  });

  [
    'familyInput',
    'genusInput',
    'identificationStatus',
    'taxonomySource',
    'taxonomyVerificationStatus',
    'btnSuggestTaxonomy',
    'btnApplyTaxonomySuggestion',
    'btnVerifyTaxonomy',
    'btnDoubtfulTaxonomy',
    'taxonomyCandidateList'
  ].forEach(id => {
    assert.ok(rendererMarkupHasId(html, id), `${id} must exist in taxonomy point UI`);
    assert.ok(elementsSource.includes(`'${id}'`), `${id} must be registered`);
  });

  assert.ok(loaderSource.indexOf('./src/renderer/features/phenology/index.js') < loaderSource.indexOf('./src/renderer/features/speciesReference/index.js'));
  assert.ok(loaderSource.indexOf('./src/renderer/features/speciesReference/index.js') < loaderSource.indexOf('./src/renderer/app.js'));
  assert.ok(appSource.includes('bindSpeciesReferenceEvents'));
  assert.ok(phenologySource.includes('bindTaxonomyEvents'));
  assert.ok(preloadSource.includes('referenceQuery: payload => invoke(IPC_CHANNELS.species.referenceQuery'));
  assert.ok(preloadSource.includes('suggestTaxonomy: payload => invoke(IPC_CHANNELS.species.suggestTaxonomy'));
  assert.ok(preloadSource.includes('imageCompare: payload => invoke(IPC_CHANNELS.species.imageCompare'));
  assert.ok(ipcSource.includes('handle(IPC_CHANNELS.species.referenceQuery'));
  assert.ok(ipcSource.includes('handle(IPC_CHANNELS.species.suggestTaxonomy'));
  assert.ok(ipcSource.includes('handle(IPC_CHANNELS.species.imageCompare'));
  assert.ok(ipcSource.includes("require('../../../src/main/speciesReferenceService')"));
  assert.ok(serviceSource.includes('https://api.gbif.org/v1'));
  assert.ok(serviceSource.includes('https://api.inaturalist.org/v1'));
  assert.ok(serviceSource.includes('/v1/computervision/score_image'));
  assert.ok(serviceSource.includes('MAX_COMPARE_IMAGE_BYTES'));
  assert.ok(serviceSource.includes('querySpeciesImageCompare'));
  assert.ok(serviceSource.includes('normalizeSelectedImage'));
  assert.ok(serviceSource.includes('/descriptions'));
  assert.ok(serviceSource.includes('/vernacularNames'));
  assert.ok(serviceSource.includes('/media'));
  assert.ok(serviceSource.includes('/speciesProfiles'));
  assert.ok(serviceSource.includes('/v1/taxa/${item.key}'));
  assert.ok(serviceSource.includes('DETAIL_ENRICH_LIMIT'));
  assert.ok(!serviceSource.includes('writeFile'));
  assert.ok(!serviceSource.includes('localStorage'));
  assert.ok(rendererSource.includes('let speciesReferenceCache = null'));
  assert.ok(rendererSource.includes('clearSpeciesReferenceCache'));
  assert.ok(rendererSource.includes("guardMaintenanceReadOnlyAction('apply-species-reference')"));
  assert.ok(rendererSource.includes('openImagePreview(src, caption, imageSet)'));
  assert.ok(rendererSource.includes('renderSpeciesReferenceDetail'));
  assert.ok(rendererSource.includes('recommendationText'));
  assert.ok(rendererSource.includes('safeExternalUrl'));
  assert.ok(rendererSource.includes('INATURALIST_API_TOKEN_URL'));
  assert.ok(rendererSource.includes('https://www.inaturalist.org/users/api_token'));
  assert.ok(rendererSource.includes('externalLinkHtml'));
  assert.ok(rendererSource.includes('class="species-reference-link"'));
  assert.ok(rendererSource.includes('window.platformAdapter.window.openExternal'));
  assert.ok(rendererSource.includes('data-external-url'));
  assert.ok(rendererSource.includes('event.stopPropagation()'));
  assert.ok(rendererSource.includes('function selectSpeciesReferenceSuggestion'));
  assert.ok(rendererSource.includes('data-suggestion-id'));
  assert.ok(rendererSource.includes('runSpeciesImageCompare'));
  assert.ok(rendererSource.includes('speciesReferenceImageTokenInput'));
  assert.ok(rendererSource.includes('species-reference-compared-thumb'));
  assert.ok(rendererSource.includes('speciesReferenceApplyTaxonomy'));
  assert.ok(phenologySource.includes('applyTaxonomyFieldsToPoint'));
  assert.ok(projectSource.includes('data-i18n-placeholder'));
  assert.ok(rendererSource.includes('await persistProject()'), 'reference suggestions may persist only after user apply');
  assert.ok(!rendererSource.includes('localStorage'));
  assert.ok(!rendererSource.includes('sessionStorage'));
  assert.ok(!stateSource.includes('speciesReferenceCache'), 'species reference cache must not become project state');
  assert.ok(maintenanceSource.includes("'btnApplySpeciesReference'"));
  assert.ok(!maintenanceSource.includes("'btnOpenSpeciesReference'"), 'safe mode should allow read-only reference lookup');
  assert.ok(cssSource.includes('.species-reference-panel'));

  ['zh.js', 'en.js'].forEach(name => {
    const source = readLocaleSource(name);
    [
      'openSpeciesReference',
      'speciesReferenceTitle',
      'runSpeciesReference',
      'speciesReferenceApply',
      'speciesReferenceDiscard',
      'speciesReferenceConservation',
      'speciesReferenceOpenWiki',
      'speciesReferenceDetailEmpty',
      'speciesReferencePreviewImage',
      'speciesReferenceRunImageCompare',
      'speciesReferenceImageTokenPlaceholder',
      'speciesReferenceOpenTokenPage',
      'speciesReferenceTokenStepLogin',
      'speciesReferenceTokenStepOpen',
      'speciesReferenceTokenStepCopy',
      'speciesReferenceTokenStepPrivacy',
      'speciesReferenceImageCompareFailed',
      'speciesReferenceComparedImage',
      'speciesReferenceClassification',
      'speciesReferenceApplyTaxonomy',
      'speciesReferenceRecommendedFields',
      'speciesReferenceUnmappedToNote',
      'taxonomySuggest',
      'taxonomyApplySuggestion',
      'taxonomyStatusManuallyVerified',
      'taxonomySourceBoth',
      'statsExportTaxonomyCompletion',
      'statsExportTaxonomyCandidates'
    ].forEach(key => assert.ok(source.includes(`"${key}"`), `${name} missing ${key}`));
  });

  const gbif = speciesReferenceService.normalizeGbifMatch({
    usageKey: 2687885,
    scientificName: 'Ginkgo biloba L.',
    canonicalName: 'Ginkgo biloba',
    rank: 'SPECIES',
    status: 'ACCEPTED',
    confidence: 100,
    matchType: 'EXACT',
    family: 'Ginkgoaceae',
    genus: 'Ginkgo'
  });
  assert.strictEqual(gbif.scientificName, 'Ginkgo biloba L.');
  assert.strictEqual(gbif.classification.family, 'Ginkgoaceae');

  const inat = speciesReferenceService.normalizeINaturalistTaxon({
    id: 64350,
    name: 'Ginkgo biloba',
    rank: 'species',
    is_active: true,
    observations_count: 43523,
    preferred_common_name: '银杏',
    conservation_status: { status_name: 'endangered' },
    wikipedia_url: 'https://example.test/wiki',
    default_photo: { medium_url: 'https://example.test/ginkgo.jpg' }
  });
  assert.strictEqual(inat.commonName, '银杏');
  assert.strictEqual(inat.observationsCount, 43523);
  assert.strictEqual(inat.conservationStatus, 'endangered');
  assert.strictEqual(inat.images.length, 1);
  const vision = speciesReferenceService.normalizeVisionSuggestion({
    combined_score: 0.82,
    taxon: {
      id: 64350,
      name: 'Ginkgo biloba',
      rank: 'species',
      preferred_common_name: 'Ginkgo',
      default_photo: { medium_url: 'https://example.test/ginkgo.jpg' }
    }
  });
  assert.strictEqual(vision.sourceLabel, 'iNaturalist CV');
  assert.strictEqual(vision.confidence, 82);
  assert.ok(rendererSource.includes('speciesReferenceOpenWiki'));
  assert.ok(rendererSource.includes('photoAttribution'));
  assert.strictEqual(speciesReferenceService.dedupeSuggestions([gbif, gbif, inat]).length, 2);

  const taxonomyCandidates = speciesReferenceService.normalizeTaxonomyCandidates([
    { source: 'gbif', scientificName: 'Osmanthus fragrans', canonicalName: 'Osmanthus fragrans', rank: 'species', confidence: 95, classification: { family: 'Oleaceae', genus: 'Osmanthus' } },
    { source: 'inaturalist', scientificName: 'Osmanthus fragrans', canonicalName: 'Osmanthus fragrans', rank: 'species', confidence: 0.91, classification: { family: 'Oleaceae', genus: 'Osmanthus' } },
    { source: 'gbif', scientificName: 'Prunus mume', canonicalName: 'Prunus mume', rank: 'species', confidence: 70, classification: { family: 'Rosaceae', genus: 'Prunus' } }
  ], 'Osmanthus fragrans', 'Osmanthus fragrans');
  const taxonomySummary = speciesReferenceService.summarizeTaxonomySuggestion({ scientificName: 'Osmanthus fragrans' }, taxonomyCandidates, 'Osmanthus fragrans');
  assert.strictEqual(taxonomySummary.suggestedFamily, 'Oleaceae');
  assert.strictEqual(taxonomySummary.suggestedGenus, 'Osmanthus');
  assert.ok(taxonomySummary.candidates.length <= 5);
  const tieSummary = speciesReferenceService.summarizeTaxonomySuggestion({}, speciesReferenceService.normalizeTaxonomyCandidates([
    { source: 'gbif', scientificName: 'A', classification: { family: 'Oleaceae', genus: 'Osmanthus' } },
    { source: 'inaturalist', scientificName: 'B', classification: { family: 'Rosaceae', genus: 'Prunus' } }
  ], '', ''), '');
  assert.strictEqual(tieSummary.suggestedFamily, '');
  assert.strictEqual(tieSummary.confidenceLabel, 'unknown');
  const lockedSummary = speciesReferenceService.summarizeTaxonomySuggestion({
    existingFamily: 'Oleaceae',
    taxonomyVerificationStatus: 'manuallyVerified',
    allowOverwriteManual: false
  }, taxonomyCandidates, 'Osmanthus fragrans');
  assert.strictEqual(lockedSummary.overwriteBlocked, true);

  [
    'queryMissingScientificName',
    'queryMissingCommonName',
    'queryMissingPhenology',
    'queryMissingImage'
  ].forEach(fragment => {
    assert.ok(html.includes(fragment), `query UI missing ${fragment}`);
  });
  assert.ok(html.includes('queryCompleteness'), 'query UI missing queryCompleteness');
  assert.ok(elementsSource.includes('queryCompleteness'), 'query element missing queryCompleteness');
  assert.ok(querySource.includes('pointCompletenessFlags'));
  assert.ok(querySource.includes('openReferenceFromQueryResult'));
  assert.ok(querySource.includes('openSpeciesReferenceCenter()'));
  assert.ok(querySource.includes('query-reference-btn'));
  assert.ok(appSource.includes('ui.queryCompleteness'));
}

function testPlatformAdapterContract() {
  const platformTypeSource = fs.readFileSync(
    path.join(process.cwd(), 'src/shared/types/platform.ts'),
    'utf8'
  );
  const runtimeSource = fs.readFileSync(
    path.join(process.cwd(), 'src/renderer-modern/platform/runtime.ts'),
    'utf8'
  );
  const electronSource = fs.readFileSync(
    path.join(process.cwd(), 'src/renderer-modern/platform/electronAdapter.ts'),
    'utf8'
  );
  const webSource = fs.readFileSync(
    path.join(process.cwd(), 'src/renderer-modern/platform/webAdapter.ts'),
    'utf8'
  );
  const webProjectSource = fs.readFileSync(
    path.join(process.cwd(), 'src/renderer-modern/platform/webProject.ts'),
    'utf8'
  );
  const rendererFiles = [];
  const collectRendererScripts = directory => {
    fs.readdirSync(directory, { withFileTypes: true }).forEach(entry => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) collectRendererScripts(entryPath);
      else if (entry.isFile() && entry.name.endsWith('.js')) rendererFiles.push(entryPath);
    });
  };
  collectRendererScripts(path.join(process.cwd(), 'src/renderer'));
  const rendererSource = rendererFiles
    .map(filePath => fs.readFileSync(filePath, 'utf8'))
    .join('\n');

  assert.ok(platformTypeSource.includes('export interface PlatformAdapter'));
  assert.ok(platformTypeSource.includes("export type PlatformRuntime = 'electron' | 'web'"));
  assert.ok(runtimeSource.includes('createPlatformAdapter(window.plantApp)'));
  assert.ok(runtimeSource.includes('createElectronPlatformAdapter(services)'));
  assert.ok(runtimeSource.includes('createWebPlatformAdapter()'));
  assert.ok(electronSource.includes('writeProject: true'));
  assert.ok(webSource.includes("runtime: 'web'"));
  assert.ok(webSource.includes('assessWebRuntimeCapabilities'));
  assert.ok(webSource.includes('writeProject: webCapabilityReport.workspaceReady'));
  assert.ok(webSource.includes('sqliteStorage: webCapabilityReport.workspaceReady'));
  assert.ok(webSource.includes('externalBackupImport: webCapabilityReport.portableBackupAvailable'));
  assert.ok(webSource.includes('speciesReference: true'));
  assert.ok(webSource.includes('readOnly: !webCapabilityReport.workspaceReady'));
  assert.ok(webProjectSource.includes('selectWebProjectFiles'));
  assert.ok(webProjectSource.includes('createWebProjectSession'));
  assert.ok(webProjectSource.includes("input.accept = '.json,.geojson,.csv"));
  assert.ok(!rendererSource.includes('window.plantApp'));
  assert.ok(rendererSource.includes('window.platformAdapter'));
}
