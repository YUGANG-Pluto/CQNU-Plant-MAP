const fs = require('fs');
const path = require('path');

const sqliteConversionService = require('../src/main/sqliteConversionService');

const FIXTURES = Object.freeze([
  'json-project-basic',
  'json-project-unknown-fields'
]);

function readFixture(name) {
  const root = path.join(__dirname, '..', 'tests', 'fixtures', name);
  return {
    settings: JSON.parse(fs.readFileSync(path.join(root, 'settings.json'), 'utf8')),
    zones: JSON.parse(fs.readFileSync(path.join(root, 'zones.json'), 'utf8')),
    points: JSON.parse(fs.readFileSync(path.join(root, 'points.json'), 'utf8'))
  };
}

function finish(exitCode) {
  if (process.versions.electron) {
    require('electron').app.exit(exitCode);
    return;
  }
  process.exitCode = exitCode;
}

try {
  const results = FIXTURES.map(name => ({
    fixture: name,
    ...sqliteConversionService.runTemporaryJsonSqliteRoundTrip(readFixture(name))
  }));
  const summary = {
    ok: results.every(item => item.ok && item.cleaned && item.closed && item.roundTrip?.jsonEqual),
    runtime: process.versions.electron ? 'electron-main' : 'node',
    fixtures: results
  };

  console.log(JSON.stringify(summary, null, 2));
  finish(summary.ok ? 0 : 1);
} catch (error) {
  console.error(`sqlite conversion test failed: ${error.message}`);
  finish(1);
}
