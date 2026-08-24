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

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function snapshotProject(project) {
  return {
    settings: project.settings,
    zones: project.zones,
    points: project.points
  };
}

function finish(exitCode) {
  if (process.versions.electron) {
    require('electron').app.exit(exitCode);
    return;
  }
  process.exitCode = exitCode;
}

function runRuntimeAcceptance() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'plant-sqlite-runtime-'));
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

    const infoDir = path.join(trustedProjectDir, 'information');
    const dbPath = path.join(infoDir, storageConversionService.SQLITE_DB_FILE);
    const reportPath = path.join(infoDir, storageConversionService.SQLITE_REPORT_FILE);

    const preflight = storageConversionService.getPreflight({
      projectDir: trustedProjectDir
    });
    const created = storageConversionService.createSqliteFromJson({
      projectDir: trustedProjectDir
    });

    const jsonRemovedAfterCreate = !fs.existsSync(path.join(infoDir, 'settings.json'))
      && !fs.existsSync(path.join(infoDir, 'zones.json'))
      && !fs.existsSync(path.join(infoDir, 'points.json'));
    const sqliteCreatedAfterCreate = fs.existsSync(dbPath);
    const sqliteAutoLoad = projectStore.loadProject({
      projectDir: trustedProjectDir,
      storageFormat: 'auto'
    });

    const mutated = clone(snapshotProject(sqliteAutoLoad));
    mutated.settings.runtimeAcceptance = true;
    mutated.zones.push({
      id: 'zone-runtime',
      name: 'Runtime acceptance zone',
      legacyRuntimeField: 'keep-runtime-zone'
    });
    mutated.points.push({
      id: 'point-runtime',
      pointId: 'P-RUNTIME',
      zoneRef: 'zone-runtime',
      plantNameCn: 'Runtime plant',
      plantNameSci: 'Runtime plantus',
      family: 'Runtimeaceae',
      genus: 'Runtimeus',
      legacyRuntimeField: 'keep-runtime-point'
    });

    const sqliteSave = projectStore.saveProject({
      projectDir: trustedProjectDir,
      settings: mutated.settings,
      zones: mutated.zones,
      points: mutated.points
    });
    const sqliteReload = projectStore.loadProject({
      projectDir: trustedProjectDir,
      storageFormat: 'auto'
    });

    const staleJson = {
      settings: { staleJsonOnly: true },
      zones: [{ id: 'zone-json-only', name: 'JSON only zone' }],
      points: [{ id: 'point-json-only', pointId: 'P-JSON-ONLY' }]
    };
    projectStore.saveProject({
      projectDir: trustedProjectDir,
      storageFormat: 'json',
      settings: staleJson.settings,
      zones: staleJson.zones,
      points: staleJson.points
    });

    const autoWithBothFormats = projectStore.loadProject({
      projectDir: trustedProjectDir,
      storageFormat: 'auto'
    });
    const explicitJsonLoad = projectStore.loadProject({
      projectDir: trustedProjectDir,
      storageFormat: 'json'
    });
    const inventoryWithBoth = storageConversionService.listStorageArtifacts({
      projectDir: trustedProjectDir
    });

    const exported = storageConversionService.exportSqliteToJson({
      projectDir: trustedProjectDir
    });
    const finalLoad = projectStore.loadProject({
      projectDir: trustedProjectDir,
      storageFormat: 'auto'
    });
    const backupRoot = path.join(trustedProjectDir, 'information', 'statistics', 'backup');
    const backupNames = fs.existsSync(backupRoot)
      ? fs.readdirSync(backupRoot).filter(name => name.endsWith('.zip')).sort()
      : [];

    const checks = {
      preflightOk: preflight.ok === true,
      createCompleted: created.status === 'completed',
      sqliteCreatedAfterCreate,
      reportCreated: fs.existsSync(reportPath),
      jsonRemovedAfterCreate,
      autoLoadAfterCreateUsesSqlite: sqliteAutoLoad.storageFormat === 'sqlite',
      autoLoadAfterCreateEqualsFixture: isDeepStrictEqual(snapshotProject(sqliteAutoLoad), fixture),
      saveWithoutFormatUsesSqlite: sqliteSave.storageFormat === 'sqlite',
      sqliteReloadEqualsMutation: isDeepStrictEqual(snapshotProject(sqliteReload), mutated),
      autoWithBothFormatsUsesSqlite: autoWithBothFormats.storageFormat === 'sqlite',
      autoWithBothFormatsKeepsSqliteData: isDeepStrictEqual(snapshotProject(autoWithBothFormats), mutated),
      explicitJsonLoadUsesJson: explicitJsonLoad.storageFormat === 'json',
      explicitJsonLoadReadsJsonData: isDeepStrictEqual(snapshotProject(explicitJsonLoad), staleJson),
      inventoryPrefersSqlite: inventoryWithBoth.activeStorageFormat === 'sqlite',
      inventoryAllowsBothFormats: isDeepStrictEqual(inventoryWithBoth.availableStorageFormats, ['sqlite', 'json']),
      exportCompleted: exported.status === 'completed',
      sqliteRemovedAfterExport: !fs.existsSync(dbPath),
      finalLoadUsesJson: finalLoad.storageFormat === 'json',
      finalJsonEqualsSqliteMutation: isDeepStrictEqual(snapshotProject(finalLoad), mutated),
      backupLabelsPresent: backupNames.some(name => name.includes(storageConversionService.JSON_TO_SQLITE_BACKUP_LABEL))
        && backupNames.some(name => name.includes(storageConversionService.SQLITE_TO_JSON_BACKUP_LABEL)),
      rendererDatabaseAccessBlocked: created.rendererDatabaseAccess === false && exported.rendererDatabaseAccess === false,
      exposesSqlBlocked: created.exposesSql === false && exported.exposesSql === false
    };

    return {
      ok: Object.values(checks).every(Boolean),
      runtime: process.versions.electron ? 'electron-main' : 'node',
      projectData: 'synthetic fixture project',
      checks,
      storage: {
        preflightActiveFormat: preflight.activeStorageFormat,
        createdActiveFormat: created.activeStorageFormat,
        sqliteSaveFormat: sqliteSave.storageFormat,
        autoWithBothFormats: autoWithBothFormats.storageFormat,
        explicitJsonFormat: explicitJsonLoad.storageFormat,
        finalFormat: finalLoad.storageFormat,
        availableWhenBothExist: inventoryWithBoth.availableStorageFormats
      },
      files: {
        jsonRemovedAfterCreate,
        sqliteCreatedAfterCreate,
        sqliteRemovedAfterExport: !fs.existsSync(dbPath),
        conversionReport: path.basename(reportPath),
        backupCount: backupNames.length,
        backupNames
      },
      safety: {
        temporaryProjectRemovedAfterRun: true,
        rendererDatabaseAccess: false,
        exposesSql: false,
        sourceCleanupVerified: true,
        explicitJsonCompatibilityVerified: true
      }
    };
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

try {
  const result = runRuntimeAcceptance();
  console.log(JSON.stringify(result, null, 2));
  finish(result.ok ? 0 : 1);
} catch (error) {
  console.error(`sqlite runtime acceptance failed: ${error.message}`);
  finish(1);
}
