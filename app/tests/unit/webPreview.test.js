const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const preview = require('../../scripts/web-preview');

test('browser preview binds to loopback and exposes only renderer assets', () => {
  assert.equal(preview.host, '127.0.0.1');
  assert.equal(path.basename(preview.safeRelativePath('/')), 'index.html');
  assert.match(preview.safeRelativePath('/src/renderer/app.js'), /src[\\/]renderer[\\/]app\.js$/);
  assert.match(preview.safeRelativePath('/node_modules/leaflet/dist/leaflet.js'), /leaflet\.js$/);
  assert.equal(preview.safeRelativePath('/package.json'), '');
  assert.equal(preview.safeRelativePath('/src/main/projectStore.js'), '');
  assert.equal(preview.safeRelativePath('/node_modules/better-sqlite3/package.json'), '');
});

test('browser preview rejects encoded and normalized path traversal', () => {
  assert.equal(preview.safeRelativePath('/src/renderer/../../package.json'), '');
  assert.equal(preview.safeRelativePath('/src/renderer/%2e%2e/%2e%2e/package.json'), '');
  assert.equal(preview.safeRelativePath('/src/renderer/%5c..%5c..%5cpackage.json'), '');
});
