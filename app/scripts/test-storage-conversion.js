const fs = require('fs');
const os = require('os');
const path = require('path');
const { isDeepStrictEqual } = require('util');

const pathGuard = require('../src/main/pathGuard');
const projectStore = require('../src/main/projectStore');
const storageConversionService = require('../src/main/storageConversionService');

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

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function runStorageConversionCheck() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'plant-storage-conversion-'));
  const projectDir = path.join(root, 'project');
  const fixture = readFixture('json-project-unknown-fields');
  const trustedProjectDir = pathGuard.trustProjectDirFromDialog(projectDir);

  try {
    projectStore.ensureProjectStructure(trustedProjectDir);
    projectStore.saveProject({
      projectDir: trustedProjectDir,
      settings: fixture.settings,
      zones: fixture.zones,
      points: fixture.points
    });

    const preflight = storageConversionService.getPreflight({
      projectDir: trustedProjectDir
    });
    const created = storageConversionService.createSqliteFromJson({
      projectDir: trustedProjectDir
    });
    const infoDir = path.join(trustedProjectDir, 'information');
    const dbPath = path.join(infoDir, storageConversionService.SQLITE_DB_FILE);
    const reportPath = path.join(infoDir, storageConversionService.SQLITE_REPORT_FILE);
    const dbExists = fs.existsSync(dbPath);
    const reportExists = fs.existsSync(reportPath);
    const jsonRemovedAfterCreate = !fs.existsSync(path.join(infoDir, 'settings.json'))
      && !fs.existsSync(path.join(infoDir, 'zones.json'))
      && !fs.existsSync(path.join(infoDir, 'points.json'));

    writeJson(path.join(infoDir, 'settings.json'), { overwritten: true });
    writeJson(path.join(infoDir, 'zones.json'), []);
    writeJson(path.join(infoDir, 'points.json'), []);

    const exported = storageConversionService.exportSqliteToJson({
      projectDir: trustedProjectDir
    });
    const loaded = projectStore.loadProject({ projectDir: trustedProjectDir });
    const restored = {
      settings: loaded.settings,
      zones: loaded.zones,
      points: loaded.points
    };
    const jsonEqual = isDeepStrictEqual(restored, fixture);
    const backupRoot = path.join(trustedProjectDir, 'information', 'statistics', 'backup');
    const backupCount = fs.existsSync(backupRoot)
      ? fs.readdirSync(backupRoot).filter(name => name.endsWith('.zip')).length
      : 0;
    const backupNames = fs.existsSync(backupRoot)
      ? fs.readdirSync(backupRoot).filter(name => name.endsWith('.zip'))
      : [];
    const sqliteRemovedAfterExport = !fs.existsSync(dbPath);

    return {
      ok: preflight.ok
        && created.status === 'completed'
        && exported.status === 'completed'
        && dbExists
        && reportExists
        && jsonEqual
        && backupCount >= 2
        && jsonRemovedAfterCreate
        && sqliteRemovedAfterExport
        && backupNames.some(name => name.includes(storageConversionService.JSON_TO_SQLITE_BACKUP_LABEL))
        && backupNames.some(name => name.includes(storageConversionService.SQLITE_TO_JSON_BACKUP_LABEL)),
      runtime: process.versions.electron ? 'electron-main' : 'node',
      preflight: {
        ok: preflight.ok,
        databaseExists: preflight.databaseExists,
        counts: preflight.counts,
        exposesSql: preflight.safety?.exposesSql === true
      },
      create: {
        status: created.status,
        databaseFile: created.databaseFile,
        jsonFilesKept: created.jsonFilesKept,
        rendererDatabaseAccess: created.rendererDatabaseAccess,
        exposesSql: created.exposesSql
      },
      export: {
        status: exported.status,
        databaseFile: exported.databaseFile,
        rendererDatabaseAccess: exported.rendererDatabaseAccess,
        exposesSql: exported.exposesSql
      },
      files: {
        databaseCreated: dbExists,
        databaseRemovedAfterExport: sqliteRemovedAfterExport,
        reportCreated: reportExists,
        backupCount,
        backupRoot,
        backupNames,
        jsonRemovedAfterCreate
      },
      roundTrip: {
        jsonEqual
      }
    };
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

try {
  const result = runStorageConversionCheck();
  console.log(JSON.stringify(result, null, 2));
  finish(result.ok ? 0 : 1);
} catch (error) {
  console.error(`storage conversion test failed: ${error.message}`);
  finish(1);
}
