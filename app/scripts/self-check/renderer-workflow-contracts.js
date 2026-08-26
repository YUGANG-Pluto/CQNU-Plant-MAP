function testObjectWorkflowContract() {
  const modernRoot = path.join(process.cwd(), 'src/renderer-modern');
  const commandSource = fs.readFileSync(path.join(modernRoot, 'features/shell/ObjectCommandBar.tsx'), 'utf8');
  const inspectorSource = fs.readFileSync(path.join(modernRoot, 'features/shell/ContextInspector.tsx'), 'utf8');
  const drawerSource = fs.readFileSync(path.join(modernRoot, 'features/shell/UtilityDrawers.tsx'), 'utf8');
  const workflowSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/shell/objectWorkflow.js'), 'utf8');
  const loaderSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/legacy-loader.js'), 'utf8');
  const pointSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/map/points.js'), 'utf8');
  const zoneSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/map/zones.js'), 'utf8');
  const styleSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/styles/52-object-workflow.css'), 'utf8');

  ['btnPreviousObject', 'btnFocusSelection', 'btnNextObject', 'objectWorkflowFeedback'].forEach(id => {
    assert.ok(commandSource.includes(`id="${id}"`), `${id} must stay in the contextual command bar`);
  });
  assert.ok(inspectorSource.includes('<ObjectCommandBar />'));
  assert.ok(drawerSource.includes('role="tablist"'));
  assert.ok(drawerSource.includes('role="listbox"'));
  [
    'function configureObjectListItem',
    'function configureMapObjectLayer',
    'function syncObjectSelectionUi',
    'function activateObjectSelection',
    'function navigateObjectSelection',
    'function renderObjectListEmpty',
    "node.setAttribute('aria-selected'",
    "event.key === 'ArrowDown'",
    "event.key === 'Enter'"
  ].forEach(fragment => assert.ok(workflowSource.includes(fragment), `object workflow missing ${fragment}`));
  assert.ok(loaderSource.includes('./src/renderer/shell/objectWorkflow.js'));
  assert.ok(loaderSource.indexOf('./src/renderer/shell/objectWorkflow.js') < loaderSource.indexOf('./src/renderer/map/zones.js'));
  assert.ok(pointSource.includes('configureMapObjectLayer(marker'));
  assert.ok(zoneSource.includes('configureMapObjectLayer(layer'));
  assert.ok(pointSource.includes('duration: 0.36'));
  assert.ok(zoneSource.includes('duration: 0.36'));
  ['.object-command-center', '.object-list-item.is-selected', '.object-empty-state', '#map .leaflet-interactive:focus-visible'].forEach(selector => {
    assert.ok(styleSource.includes(selector), `${selector} must stay in the object workflow styles`);
  });
  ['320ms', '720ms', '900ms'].forEach(duration => {
    assert.ok(styleSource.includes(duration) || workflowSource.includes(duration), `${duration} must stay represented in the interaction timing`);
  });
  assert.ok(workflowSource.includes('OBJECT_FOCUS_FEEDBACK_MS = 360'));
  assert.ok(styleSource.includes('@media (prefers-reduced-motion: reduce)'));
  ['zh.js', 'en.js'].forEach(name => {
    const source = readLocaleSource(name);
    [
      'objectSelectionLabel',
      'objectWorkflowLocated',
      'objectWorkflowNoGeometry',
      'objectListKeyboardHint'
    ].forEach(key => assert.ok(source.includes(`"${key}"`), `${name} missing ${key}`));
  });
}

function testCssStructureGuards() {
  const styleDirs = [
    path.join(process.cwd(), 'src/renderer/styles'),
    path.join(process.cwd(), 'src/renderer-modern/styles')
  ];
  styleDirs.forEach(styleDir => {
    fs.readdirSync(styleDir)
      .filter(name => name.endsWith('.css'))
      .forEach(name => {
        const source = fs.readFileSync(path.join(styleDir, name), 'utf8');
        const relativeName = path.relative(process.cwd(), path.join(styleDir, name));
        const open = (source.match(/\{/g) || []).length;
        const close = (source.match(/\}/g) || []).length;
        assert.strictEqual(open, close, `${relativeName} has unbalanced CSS braces`);
        assert.ok(!/,\s*\}/.test(source), `${relativeName} has a dangling selector before a closing brace`);
      });
  });
}

function testLegacyThemeCssRemoved() {
  const styleDir = path.join(process.cwd(), 'src/renderer/styles');
  const legacyThemeIds = [
    'field-notebook',
    'botanical-scientific',
    'linear-minimal',
    'deep-slate',
    'flow-data',
    'cloud-soft',
    'lavender-soft',
    'nordic-minimal',
    'deep-indigo',
    'dimensional-chart'
  ];
  const forbiddenSelectors = legacyThemeIds.flatMap(id => [
    `theme-${id}`,
    `data-ui-style="${id}"`
  ]);

  fs.readdirSync(styleDir)
    .filter(name => name.endsWith('.css'))
    .forEach(name => {
      const source = fs.readFileSync(path.join(styleDir, name), 'utf8');
      forbiddenSelectors.forEach(selector => {
        assert.ok(!source.includes(selector), `${name} must not retain legacy theme selector ${selector}`);
      });
    });
}

function testThemeSettingsProgressiveDisclosure() {
  const html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
  const elementsSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer/dom/elements.js'), 'utf8');
  const themeSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer-modern/features/theme/model.ts'), 'utf8');
  const themeUi = fs.readFileSync(path.join(process.cwd(), 'src/renderer-modern/features/theme/ThemeSettingsModal.tsx'), 'utf8');
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  const componentIds = [...themeUi.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  assert.strictEqual(ids.length, new Set(ids).size, 'host HTML ids must stay unique');
  assert.strictEqual(componentIds.length, new Set(componentIds).size, 'component ids must stay unique');
  assert.ok(!ids.some(id => componentIds.includes(id)), 'host and component ids must not overlap');
  [
    'themeCenterKicker',
    'themeStyleHeading',
    'themeScientificWhite',
    'themeLiquidGlass',
    'themeMaterialHeading',
    'themeDensity',
    'themeMotionHeading',
    'themeMotionHint',
    'motionFeedbackHeading',
    'motionAmbient',
    'themePreviewHint'
  ].forEach(key => assert.ok(themeUi.includes(`data-i18n="${key}"`), `${key} must be wired in theme settings`));
  [
    'themeStylePresets',
    'themeAccentColor',
    'themeGlassControls',
    'themeDensityControls',
    'motionModeControls',
    'motionFeedbackControls',
    'motionAmbient',
    'motionReduced',
    'themePreviewCard',
    'btnResetThemeAll',
    'btnSaveTheme'
  ].forEach(id => {
    assert.ok(themeUi.includes(`id="${id}"`), `${id} must remain present`);
    assert.ok(elementsSource.includes(`'${id}'`), `${id} must remain registered`);
  });
  [
    'themeAlpha',
    'themeGlassOpacity',
    'themeGlassBlur',
    'themeContrast',
    'brandIconStyle',
    'brandIconDisplay',
    'brandIconHue',
    'brandIconSaturation',
    'brandIconLightness',
    'btnResetBrandIcon'
  ].forEach(id => {
    assert.ok(!rendererMarkupHasId(html, id), `${id} should not remain as a visible UI control`);
    assert.ok(!elementsSource.includes(`'${id}'`), `${id} should not remain in the DOM registry`);
  });
  [
    'glassOpacity: finiteNumber',
    'glassBlur: finiteNumber',
    'contrast: finiteNumber'
  ].forEach(fragment => assert.ok(themeSource.includes(fragment), `${fragment} must stay normalized for compatibility`));

  ['zh.js', 'en.js'].forEach(name => {
    const source = readLocaleSource(name);
    [
      'themeScientificWhite',
      'themeLiquidGlass',
      'themeAccentColor',
      'themeMaterialHeading',
      'themeDensity',
      'themeMotionHeading',
      'themeMotionHint',
      'motionFeedbackHeading',
      'motionAmbient',
      'themeSave'
    ].forEach(key => assert.ok(source.includes(`"${key}"`), `${name} missing ${key}`));
  });
}

function testBrandLogoResource() {
  const html = readRendererMarkup();
  const themeSource = fs.readFileSync(path.join(process.cwd(), 'src/renderer-modern/features/theme/model.ts'), 'utf8');
  const brandDir = path.join(process.cwd(), 'src/renderer/assets/brand');
  const logoPath = path.join(brandDir, 'cqnu-logo.svg');
  assert.ok(fs.existsSync(logoPath), 'faithful CQNU SVG logo must exist');
  assert.ok(html.includes('./src/renderer/assets/brand/cqnu-logo.svg'), 'runtime HTML must use the faithful CQNU SVG logo');
  [
    'app-logo-full.svg',
    'app-logo-mark.svg',
    'source-logo.png',
    'title-logo.png'
  ].forEach(name => {
    assert.ok(!fs.existsSync(path.join(brandDir, name)), `legacy brand asset ${name} must be removed`);
    assert.ok(!html.includes(name), `HTML must not reference legacy brand asset ${name}`);
  });
  assert.ok(!html.includes('brand-logo-full-symbol'), 'HTML must not retain the simplified inline logo symbol');
  assert.ok(themeSource.includes("style: 'theme'"), 'brand settings defaults must stay compatible');
}
