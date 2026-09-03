const fs = require('fs');
const path = require('path');
const Module = require('module');
const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');

function loadTypeScriptModule(relativePath) {
  const filePath = path.join(process.cwd(), relativePath);
  const previousLoader = Module._extensions['.ts'];
  Module._extensions['.ts'] = (loaded, dependencyPath) => {
    const source = fs.readFileSync(dependencyPath, 'utf8');
    const output = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        strict: true
      },
      fileName: dependencyPath
    }).outputText;
    loaded._compile(output, dependencyPath);
  };
  try {
    return require(filePath);
  } finally {
    if (previousLoader) Module._extensions['.ts'] = previousLoader;
    else delete Module._extensions['.ts'];
  }
}

const theme = loadTypeScriptModule('src/renderer-modern/features/theme/model.ts');
const themeColor = loadTypeScriptModule('src/renderer-modern/features/theme/color.ts');
const themeDocument = loadTypeScriptModule('src/renderer-modern/features/theme/document.ts');

test('theme defaults use the scientific white design', () => {
  const value = theme.createThemeDefaults();
  assert.equal(value.styleId, 'scientific-white');
  assert.equal(value.density, 'comfortable');
  assert.equal(value.glass.mode, 'solid');
  assert.equal(value.motion.mode, 'expressive');
  assert.equal(value.motion.feedback, 'strong');
  assert.equal(value.motion.ambient, true);
  assert.equal(value.glass.apply.modules, false);
  assert.equal(value.glass.apply.charts, false);
});

test('legacy style ids map to one of the two maintained designs', () => {
  assert.equal(theme.normalizeThemeStyleId('field-notebook'), 'scientific-white');
  assert.equal(theme.normalizeThemeStyleId('linear-minimal'), 'scientific-white');
  assert.equal(theme.normalizeThemeStyleId('glass-blue'), 'liquid-glass');
  assert.equal(theme.normalizeThemeStyleId('deep-slate'), 'liquid-glass');
});

test('legacy glass values normalize to the official material variants', () => {
  assert.equal(theme.normalizeThemeSettings({ glass: { mode: 'off' } }).glass.mode, 'solid');
  assert.equal(theme.normalizeThemeSettings({ glass: { mode: 'light' } }).glass.mode, 'regular');
  assert.equal(theme.normalizeThemeSettings({ glass: { mode: 'liquid' } }).glass.mode, 'clear');
});

test('normalization preserves valid custom tokens and legacy aliases', () => {
  const input = {
    styleId: 'field-notebook',
    primary: '#123456',
    tokens: { chartB: '#654321' },
    density: 'compact',
    motion: { mode: 'minimal', reduced: true }
  };
  const snapshot = structuredClone(input);
  const value = theme.normalizeThemeSettings(input);

  assert.deepEqual(input, snapshot);
  assert.equal(value.tokens.primary, '#123456');
  assert.equal(value.tokens.chartB, '#654321');
  assert.equal(value.density, 'compact');
  assert.equal(value.motion.mode, 'minimal');
  assert.equal(value.motion.enabled, false);
});

test('invalid values fall back without leaking display strings', () => {
  const value = theme.normalizeThemeSettings({
    styleId: 'unknown',
    tokens: { primary: 'undefined' },
    motion: { mode: 'rich' }
  });
  assert.equal(value.styleId, 'scientific-white');
  assert.match(value.tokens.primary, /^#[0-9A-F]{6}$/);
  assert.equal(value.motion.mode, 'expressive');
});

test('enabled motion presets keep perceptible and clearly separated timing tiers', () => {
  const minimal = theme.createMotionSettings('minimal');
  const standard = theme.createMotionSettings('standard');
  const expressive = theme.createMotionSettings('expressive');
  assert.deepEqual(
    [minimal.fadeDuration, minimal.transitionDuration, minimal.modalDuration],
    [320, 400, 500]
  );
  assert.deepEqual(
    [standard.fadeDuration, standard.transitionDuration, standard.modalDuration],
    [440, 580, 720]
  );
  assert.deepEqual(
    [expressive.fadeDuration, expressive.transitionDuration, expressive.modalDuration],
    [620, 860, 1040]
  );
  [minimal, standard, expressive].forEach(preset => {
    assert.ok(preset.fadeDuration >= 260);
    assert.ok(preset.transitionDuration >= 260);
    assert.ok(preset.modalDuration >= 260);
  });
  assert.ok(standard.fadeDuration < standard.transitionDuration);
  assert.ok(standard.transitionDuration < standard.modalDuration);
  assert.ok(standard.stagger >= 72);
});

test('legacy custom motion durations are raised to the new perceptible minimum', () => {
  const motion = theme.normalizeMotionSettings({
    mode: 'standard',
    fadeDuration: 80,
    transitionDuration: 120,
    modalDuration: 180
  });
  assert.equal(motion.fadeDuration, 440);
  assert.equal(motion.transitionDuration, 580);
  assert.equal(motion.modalDuration, 720);
});

test('theme color utilities remain deterministic after module extraction', () => {
  assert.deepEqual(themeColor.hexToHsl('#FFFFFF'), { h: 0, s: 0, l: 100 });
  assert.equal(themeColor.hslToHex(0, 100, 50), '#FF0000');
  assert.equal(themeColor.hexToRgba('#123456', 25), 'rgba(18, 52, 86, 0.25)');
  assert.equal(themeColor.readableTextColor('#FFFFFF'), '#1D2926');
  assert.equal(themeColor.readableTextColor('#000000'), '#FFFFFF');
});

test('theme document snapshot exposes stable classes, datasets, and motion variables', () => {
  const value = theme.createThemeDefaults('liquid-glass');
  const snapshot = structuredClone(value);
  const documentTheme = themeDocument.createThemeDocumentSnapshot(value);

  assert.deepEqual(value, snapshot);
  assert.equal(documentTheme.datasets.uiStyle, 'liquid-glass');
  assert.equal(documentTheme.datasets.motionProfile, 'expressive');
  assert.equal(documentTheme.datasets.motionAmbient, 'true');
  assert.ok(documentTheme.classes.includes('theme-liquid-glass'));
  assert.ok(documentTheme.classes.includes('glass-mode-regular'));
  assert.ok(documentTheme.classes.includes('motion-mode-expressive'));
  assert.equal(documentTheme.variables['--motion-duration-fast'], '620ms');
  assert.equal(documentTheme.variables['--motion-duration'], '860ms');
  assert.equal(documentTheme.variables['--motion-duration-modal'], '1040ms');
  assert.equal(documentTheme.variables['--primary'], value.tokens.primary);
  Object.values(documentTheme.variables).forEach(displayValue => {
    assert.doesNotMatch(displayValue, /(?:NaN|undefined|null)/);
  });
});

test('disabled motion produces zero-duration document variables', () => {
  const value = theme.createThemeDefaults();
  value.motion = theme.createMotionSettings('off');
  const documentTheme = themeDocument.createThemeDocumentSnapshot(value);

  assert.ok(documentTheme.classes.includes('motion-disabled'));
  assert.equal(documentTheme.datasets.motionAmbient, 'false');
  assert.equal(documentTheme.variables['--motion-duration-fast'], '0ms');
  assert.equal(documentTheme.variables['--motion-duration'], '0ms');
  assert.equal(documentTheme.variables['--motion-duration-modal'], '0ms');
});
