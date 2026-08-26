const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const appRoot = path.resolve(__dirname, '../..');
const i18nRoot = path.join(appRoot, 'src/renderer/i18n');
const modules = ['core', 'project', 'appearance', 'map', 'species', 'stats', 'maintenance'];

function readModule(locale, moduleName) {
  const tag = locale.toUpperCase();
  const variable = `I18N_${tag}_${moduleName.toUpperCase()}`;
  const file = path.join(i18nRoot, locale, `${moduleName}.js`);
  const source = fs.readFileSync(file, 'utf8');
  const context = { result: null };
  vm.runInNewContext(source.replace(`const ${variable} =`, 'result ='), context, { filename: file });
  return context.result;
}

function loadLocale(locale) {
  const result = {};
  for (const moduleName of modules) {
    const values = readModule(locale, moduleName);
    for (const [key, value] of Object.entries(values)) {
      assert.equal(Object.hasOwn(result, key), false, `${locale} key ${key} is duplicated`);
      assert.equal(typeof value, 'string', `${locale} key ${key} must contain text`);
      result[key] = value;
    }
  }
  return result;
}

test('locale modules keep Chinese and English key parity without duplicates', () => {
  const zh = loadLocale('zh');
  const en = loadLocale('en');
  assert.deepEqual(Object.keys(zh).sort(), Object.keys(en).sort());
  assert.ok(Object.keys(zh).length > 700);
});

test('project and appearance dictionaries are isolated from the general core', () => {
  for (const locale of ['zh', 'en']) {
    const core = readModule(locale, 'core');
    const project = readModule(locale, 'project');
    const appearance = readModule(locale, 'appearance');
    assert.equal(Object.hasOwn(core, 'projectImportTitle'), false);
    assert.equal(Object.hasOwn(core, 'themeCenterTitle'), false);
    assert.equal(Object.hasOwn(project, 'projectImportTitle'), true);
    assert.equal(Object.hasOwn(appearance, 'themeCenterTitle'), true);
  }
});

test('legacy loader loads split dictionaries before locale aggregators', () => {
  const loader = fs.readFileSync(path.join(appRoot, 'src/renderer/legacy-loader.js'), 'utf8');
  for (const locale of ['zh', 'en']) {
    for (const moduleName of ['project', 'appearance']) {
      assert.ok(
        loader.indexOf(`/i18n/${locale}/${moduleName}.js`) < loader.indexOf(`/i18n/${locale}.js`),
        `${locale}/${moduleName}.js must load before ${locale}.js`
      );
    }
  }
});
