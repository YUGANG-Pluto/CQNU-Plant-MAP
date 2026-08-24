const { MODEL_VERSION } = require('./constants');
const { parseJson, safeText } = require('./compat');
const { validateSqliteExchangeModel } = require('./validation');

function countCompatFields(rows = []) {
  return rows.reduce((total, row) => {
    const compat = parseJson(row.compatJson, {});
    return total + (compat && typeof compat === 'object' ? Object.keys(compat).length : 0);
  }, 0);
}

function countRowsWithCompat(rows = []) {
  return rows.filter(row => {
    const compat = parseJson(row.compatJson, {});
    return compat && typeof compat === 'object' && Object.keys(compat).length > 0;
  }).length;
}

function uniqueImagePathCount(rows = []) {
  return new Set(rows.map(row => row.path).filter(Boolean)).size;
}

function buildConversionReport(model = {}, options = {}) {
  const tables = model.tables || {};
  const validation = validateSqliteExchangeModel(model);
  const rows = name => Array.isArray(tables[name]) ? tables[name] : [];
  const zoneRows = rows('zones');
  const pointRows = rows('points');
  const phenologyRows = rows('phenology_entries');
  const imageRows = rows('images');
  const candidateRows = rows('taxonomy_candidates');
  const settingsRows = rows('project_settings');
  const compatCounts = {
    zoneUnknownFieldCount: countCompatFields(zoneRows),
    pointUnknownFieldCount: countCompatFields(pointRows),
    phenologyUnknownFieldCount: countCompatFields(phenologyRows),
    taxonomyCandidateUnknownFieldCount: countCompatFields(candidateRows)
  };
  compatCounts.totalUnknownFieldCount = Object.values(compatCounts)
    .reduce((total, value) => total + value, 0);

  const warnings = [
    ...(Array.isArray(options.warnings) ? options.warnings.map(safeText).filter(Boolean) : []),
    ...validation.errors
  ];

  return {
    version: MODEL_VERSION,
    direction: safeText(options.direction || 'json-to-sqlite-table-model'),
    generatedAt: safeText(options.generatedAt || new Date().toISOString()),
    sourceFormat: safeText(options.sourceFormat || 'json-project'),
    targetFormat: safeText(options.targetFormat || 'sqlite-table-model'),
    status: validation.ok ? 'ready-for-preflight' : 'blocked',
    counts: {
      settings: settingsRows.length,
      zones: zoneRows.length,
      points: pointRows.length,
      phenologyEntries: phenologyRows.length,
      imageReferences: imageRows.length,
      uniqueImageReferences: uniqueImagePathCount(imageRows),
      taxonomyCandidates: candidateRows.length
    },
    compatibility: {
      ...compatCounts,
      rowsWithCompatibilityPayload: countRowsWithCompat(zoneRows)
        + countRowsWithCompat(pointRows)
        + countRowsWithCompat(phenologyRows)
        + countRowsWithCompat(candidateRows)
    },
    privacy: {
      containsAbsolutePaths: false,
      containsLocalUserPaths: false,
      storesRawProviderResponses: false,
      storesServiceTokens: false
    },
    safety: {
      writesDatabaseFile: false,
      executesBackup: false,
      changesProjectFiles: false,
      requiresBackupBeforeRuntimeConversion: true
    },
    warnings
  };
}

module.exports = {
  buildConversionReport
};
