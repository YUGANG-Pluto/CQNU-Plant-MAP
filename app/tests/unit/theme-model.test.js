const fs = require('fs');
const path = require('path');
const Module = require('module');
const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');

function loadThemeModel() {
  const filePath = path.join(process.cwd(), 'src/renderer-modern/features/theme/model.ts');
  const source = fs.readFileSync(filePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      strict: true
    },
    fileName: filePath
  }).outputText;
  const loaded = new Module(filePath, module);
  loaded.filename = filePath;
  loaded.paths = Module._nodeModulePaths(path.dirname(filePath));
  loaded._compile(output, filePath);
  return loaded.exports;
}

const theme = loadThemeModel();

test('theme defaults use the scientific white design', () => {
  const value = theme.createThemeDefaults();
  assert.equal(value.styleId, 'scientific-white');
  assert.equal(value.density, 'comfortable');
  assert.equal(value.glass.mode, 'light');
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
