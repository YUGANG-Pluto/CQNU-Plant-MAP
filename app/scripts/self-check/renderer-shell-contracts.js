function testHtmlErrorDialogWiring() {
  const html = readRendererMarkup();
  const loaderSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/legacy-loader.js'), 'utf8');
  assert.ok(html.includes('id="alertModal"'));
  assert.ok(html.includes('id="btnAlertClose"'));
  assert.ok(loaderSource.includes('./src/renderer/utils/format.js'));
  assert.ok(loaderSource.includes('./src/renderer/utils/dom.js'));
  assert.ok(loaderSource.includes('./src/renderer/utils/errorHandler.js'));
  assert.ok(
    loaderSource.indexOf('./src/renderer/utils/dialogs.js') <
      loaderSource.indexOf('./src/renderer/utils/errorHandler.js')
  );
}

function testEngineeringSplitContract() {
  const html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
  const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
  const modernRoot = path.join(process.cwd(), 'src/renderer-modern');
  const themeModel = fs.readFileSync(path.join(modernRoot, 'features/theme/model.ts'), 'utf8');
  const themeRuntime = fs.readFileSync(path.join(modernRoot, 'features/theme/runtime.ts'), 'utf8');
  const themeComponent = fs.readFileSync(path.join(modernRoot, 'features/theme/ThemeSettingsModal.tsx'), 'utf8');

  const styleDir = path.join(process.cwd(), 'src/renderer/styles');
  const appCss = fs.readFileSync(path.join(styleDir, 'app.css'), 'utf8');
  [
    '00-tokens-base.css',
    '10-controls-lists.css',
    '11-map-modals.css',
    '12-research-stats.css',
    '12-research-stats-fullscreen.css',
    '12-research-stats-responsive.css',
    '13-maintenance.css',
    '20-workbench-layout.css',
    '21-chart-primitives.css',
    '22-responsive.css',
    '30-glass-scopes.css',
    '31-status-progress.css',
    '32-motion.css',
    '40-workspace-summary.css',
    '41-basemap-workspace.css',
    '42-utility-drawer.css',
    '50-basemap-overlay.css',
    '51-right-inspector.css',
    '52-object-workflow.css'
  ].forEach(name => {
    assert.ok(appCss.includes(`./${name}`), `${name} must be imported by app.css`);
    assert.ok(fs.existsSync(path.join(styleDir, name)), `${name} must exist`);
  });

  assert.ok(html.includes('id="modernUiRoot"'));
  assert.ok(html.includes('./renderer-dist/modern-shell.css'));
  assert.ok(html.includes('./renderer-dist/modern-shell.js'));
  assert.ok(html.includes('./src/renderer/legacy-loader.js'));
  assert.ok(!html.includes('./src/renderer/features/theme/config.js'));
  assert.ok(!html.includes('./src/renderer/features/theme/index.js'));
  assert.ok(html.indexOf('./renderer-dist/modern-shell.js') < html.indexOf('./src/renderer/legacy-loader.js'));
  assert.strictEqual((html.match(/id="themeModal"/g) || []).length, 0, 'theme markup belongs in the component');
  assert.strictEqual(packageJson.scripts.prestart, 'npm run build');
  assert.ok(packageJson.scripts.build.includes('npm run build:electron'));
  assert.ok(packageJson.scripts.build.includes('npm run build:renderer'));
  assert.ok(packageJson.scripts.verify.includes('npm run build'));
  assert.ok(packageJson.build.files.includes('main-dist/**/*'));
  assert.ok(packageJson.build.files.includes('renderer-dist/**/*'));
  assert.ok(themeModel.includes("'scientific-white' | 'liquid-glass'"));
  assert.ok(themeModel.includes("DEFAULT_UI_STYLE_ID: ThemeStyleId = 'scientific-white'"));
  assert.ok(themeRuntime.includes('installLegacyThemeBridge'));
  assert.ok(themeRuntime.includes("guard('save-theme')"));
  assert.ok(themeComponent.includes('id="themeModal"'));
  assert.ok(themeComponent.includes('id="themeAccentColor"'));
  assert.ok(themeComponent.includes('id="themeDensityControls"'));
}

function testProjectWorkflowContract() {
  const modernRoot = path.join(process.cwd(), 'src/renderer-modern');
  const modelSource = fs.readFileSync(path.join(modernRoot, 'features/project/model.ts'), 'utf8');
  const typesSource = fs.readFileSync(path.join(modernRoot, 'features/project/types.ts'), 'utf8');
  const runtimeSource = fs.readFileSync(path.join(modernRoot, 'features/project/runtime.ts'), 'utf8');
  const mainSource = fs.readFileSync(path.join(modernRoot, 'main.tsx'), 'utf8');
  const projectSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/features/project/index.js'), 'utf8');
  const drawerSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/shell/workspaceDrawer.js'), 'utf8');
  const backupSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/features/backup/index.js'), 'utf8');
  const storageSource = ['storageWorkflow.js', 'storageActions.js']
    .map(name => fs.readFileSync(path.join(process.cwd(), 'src/renderer/features/maintenance', name), 'utf8'))
    .join('\n');

  assert.ok(modelSource.includes("version: 'project-workflow-v1'"));
  assert.ok(typesSource.includes("readonly version: 'project-workflow-v1'"));
  assert.ok(modelSource.includes("'PROJECT_WORKFLOW_BUSY'"));
  assert.ok(modelSource.includes('const pendingSelection = services.chooseProject(mode);'));
  assert.ok(runtimeSource.includes('document.documentElement.dataset.projectWorkflow = controller.version'));
  assert.ok(mainSource.indexOf('installPlatformAdapter();') < mainSource.indexOf('installProjectWorkflowBridge();'));
  assert.ok(projectSource.includes('window.projectWorkflow?.save'));
  assert.ok(projectSource.includes('window.projectWorkflow?.load'));
  assert.ok(projectSource.includes('function applyLoadedProjectToRenderer(data)'));
  assert.ok(drawerSource.includes('workflow.chooseAndLoad({ mode })'));
  assert.ok(drawerSource.includes('await applyLoadedProjectToRenderer(result.project)'));
  assert.ok(backupSource.includes('window.projectWorkflow?.createBackup'));
  assert.ok(storageSource.includes('window.projectWorkflow?.inspectBackup'));
  assert.ok(storageSource.includes('window.projectWorkflow?.restoreBackup'));
  [modelSource, typesSource, runtimeSource].forEach((source, index) => {
    const names = ['model.ts', 'types.ts', 'runtime.ts'];
    const lineCount = source.split(/\r?\n/).length;
    assert.ok(lineCount <= 260, `project workflow ${names[index]} exceeds the typed module size guard (${lineCount})`);
  });
}

function testModernVisualSystemContract() {
  const modernStyleDir = path.join(process.cwd(), 'src/renderer-modern/styles');
  const designSource = fs.readFileSync(path.join(modernStyleDir, 'design-system.css'), 'utf8');
  const capabilitySource = fs.readFileSync(path.join(modernStyleDir, 'web-capability.css'), 'utf8');
  const chartSource = fs.readFileSync(path.join(modernStyleDir, 'research-charts.css'), 'utf8');
  const appearanceSource = fs.readFileSync(path.join(modernStyleDir, 'appearance-center.css'), 'utf8');
  const materialSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/styles/30-glass-scopes.css'), 'utf8');
  const maintainedSource = [designSource, chartSource, appearanceSource, materialSource].join('\n');
  ['theme-scientific-white', 'theme-liquid-glass', '.modern-theme-choice', '.modern-theme-panel'].forEach(selector => {
    assert.ok(maintainedSource.includes(selector), `${selector} must stay in the maintained visual system`);
  });
  assert.ok(chartSource.includes('--research-focus-ring'));
  assert.ok(chartSource.includes('border-radius: 8px'));
  assert.ok(capabilitySource.includes('.web-capability-disclosure'));
  assert.ok(capabilitySource.includes('@media (max-width: 720px)'));
  assert.ok(
    !maintainedSource.includes('vibeui'),
    'removed design experiments must not remain in the maintained visual layer'
  );
  assert.ok(appearanceSource.includes('.modern-material-segmented'));
  assert.ok(!fs.existsSync(path.join(modernStyleDir, 'appearance-preview.css')));
  ['glass-mode-solid', 'glass-mode-regular', 'glass-mode-clear', '.glass-interactive'].forEach(selector =>
    assert.ok(materialSource.includes(selector), `${selector} must remain available`)
  );
  assert.ok(materialSource.includes('prefers-reduced-transparency: reduce'));
}

function testModernMotionContract() {
  const globalSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/styles/32-motion.css'), 'utf8');
  const chartStyles = fs.readFileSync(
    path.join(process.cwd(), 'src/renderer-modern/styles/research-charts.css'),
    'utf8'
  );
  const chartSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/features/stats/charts.js'), 'utf8');
  const motionConfig = fs.readFileSync(path.join(process.cwd(), 'src/renderer-modern/motion/motionConfig.ts'), 'utf8');
  const motionKernel = fs.readFileSync(path.join(process.cwd(), 'src/renderer-modern/motion/motionKernel.ts'), 'utf8');
  const motionPrimitives = fs.readFileSync(
    path.join(process.cwd(), 'src/renderer-modern/motion/motionPrimitives.ts'),
    'utf8'
  );
  const motionScenes = fs.readFileSync(path.join(process.cwd(), 'src/renderer-modern/motion/motionScenes.ts'), 'utf8');
  ['@keyframes uiDialogIn', '@keyframes uiPanelIn'].forEach(keyframe =>
    assert.ok(globalSource.includes(keyframe), `${keyframe} must stay available`)
  );
  assert.ok(chartStyles.includes('@keyframes researchContentIn'));
  [
    '.motion-modal .layer-modal:not(.hidden)',
    '.motion-modal .right-inspector-drawer:not(.hidden)',
    '.motion-disabled :where('
  ].forEach(selector =>
    assert.ok(globalSource.includes(selector) || chartStyles.includes(selector), `${selector} must stay wired`)
  );
  assert.ok(chartStyles.includes(':where(#statsModal:not(.hidden), .stats-fullscreen-layer)'));
  assert.ok(
    globalSource.includes('@media (prefers-reduced-motion: reduce)'),
    'system reduced-motion preferences must be respected'
  );
  assert.ok(
    chartStyles.includes('.motion-hover #statsModal :where(.chart-card, .stats-control-card):hover'),
    'stats chart cards must not lift while reading charts'
  );
  assert.ok(
    !chartStyles.includes('.donut-svg {\n  animation:'),
    'donut svg should not animate independently of its data marks'
  );
  assert.ok(chartSource.includes('--chart-index'));
  assert.ok(chartSource.includes('--slice-index'));
  assert.ok(chartSource.includes('--legend-index'));
  assert.ok(motionConfig.includes('MIN_ACTIVE_MOTION_MS = 260'));
  assert.ok(motionConfig.includes('Math.max(MIN_ACTIVE_MOTION_MS'));
  assert.ok(motionKernel.includes('transitionView'));
  assert.ok(motionKernel.includes('runViewTransition'));
  assert.ok(motionKernel.includes("error.name !== 'InvalidStateError'"));
  assert.ok(motionKernel.includes('control.cancel?.()'));
  assert.ok(motionKernel.includes('controls.forEach(cancel)'));
  assert.ok(motionPrimitives.includes("from 'motion/mini'"));
  assert.ok(motionPrimitives.includes('IntersectionObserver'));
  assert.ok(motionPrimitives.includes('document.startViewTransition'));
  assert.ok(motionPrimitives.includes("document.addEventListener('pointerover'"));
  assert.ok(motionPrimitives.includes("document.addEventListener('keydown'"));
  assert.ok(!motionKernel.includes("from 'motion'"));
  assert.ok(motionScenes.includes('workspaceEntranceScene'));
  assert.ok(motionScenes.includes('layerCloseScene'));
  assert.ok(motionScenes.includes('staggerDelay'));
}

function testModalWorkflowContract() {
  const modernRoot = path.join(process.cwd(), 'src/renderer-modern');
  const layerSource = fs.readFileSync(path.join(modernRoot, 'components/LayerModal.tsx'), 'utf8');
  const primitiveSource = fs.readFileSync(path.join(modernRoot, 'components/ui/ModalPrimitives.tsx'), 'utf8');
  const modalStyles = fs.readFileSync(path.join(modernRoot, 'styles/modal-primitives.css'), 'utf8');
  const querySource = fs.readFileSync(path.join(modernRoot, 'features/query/QueryModal.tsx'), 'utf8');
  const speciesSource = fs.readFileSync(
    path.join(modernRoot, 'features/species-reference/SpeciesReferenceModal.tsx'),
    'utf8'
  );
  const pointSource = fs.readFileSync(path.join(modernRoot, 'features/phenology/PointEditorModal.tsx'), 'utf8');
  const dialogRuntime = fs.readFileSync(path.join(process.cwd(), 'src/renderer/utils/dialogs.js'), 'utf8');
  const layerRuntime = fs.readFileSync(path.join(modernRoot, 'features/layers/runtime.ts'), 'utf8');
  const eventRuntime = fs.readFileSync(path.join(process.cwd(), 'src/renderer/shell/eventBindings.js'), 'utf8');
  const phenologyRuntime = readPhenologyRuntimeSource();

  ['ModalBody', 'ModalCommandBar', 'FormSection', 'FeedbackState'].forEach(name => {
    assert.ok(primitiveSource.includes(`function ${name}`), `${name} must stay in the modal primitive layer`);
  });
  assert.ok(layerSource.includes('contentClass?: string'));
  assert.ok(layerSource.includes('aria-hidden="true"'));
  assert.ok(layerSource.includes('data-i18n-aria-label="closePanel"'));
  [querySource, speciesSource, pointSource].forEach(source => {
    assert.ok(
      source.includes('contentClass="modal-workflow-content'),
      'target workflows must use the structured modal frame'
    );
    assert.ok(source.includes('<ModalBody>'), 'target workflows must use ModalBody');
  });
  assert.ok(querySource.includes('<ModalCommandBar'));
  assert.ok(layerSource.includes('footer?: ComponentChildren'));
  assert.ok(speciesSource.includes('footer={('));
  assert.ok(pointSource.includes('footer={('));
  assert.ok(pointSource.includes('id="pointEditorSaveState"'));
  assert.ok(dialogRuntime.includes('function trapLayerModalFocus'));
  assert.ok(dialogRuntime.includes('window.cqnuLayerManager?.trapFocus'));
  assert.ok(layerRuntime.includes('returnFocusTargets'));
  assert.ok(layerRuntime.includes("motionDurationMs('--motion-duration')"));
  assert.ok(eventRuntime.includes('getTopLayerModal()'));
  assert.ok(!eventRuntime.includes("if (!ui.queryModal.classList.contains('hidden')) closeLayerModal(ui.queryModal)"));
  assert.ok(phenologyRuntime.includes('function pointEditorHasUnsavedChanges'));
  assert.ok(phenologyRuntime.includes('pointEditorUnsavedPrompt'));
  assert.ok(modalStyles.includes('.ui-toast-region'));
  assert.ok(modalStyles.includes('900ms linear infinite'));
  assert.ok(modalStyles.includes('@media (prefers-reduced-motion: reduce)'));
  ['zh.js', 'en.js'].forEach(name => {
    const source = readLocaleSource(name);
    ['queryFilterRegion', 'speciesReferenceSearchRegion', 'pointEditorStateDirty', 'pointEditorUnsavedPrompt'].forEach(
      key => assert.ok(source.includes(`"${key}"`), `${name} missing ${key}`)
    );
  });
}
