const { MODEL_VERSION } = require('./sqliteExchange/constants');
const { deserializeProjectTables } = require('./sqliteExchange/deserialize');
const { buildBackupPreflightPlan } = require('./sqliteExchange/preflight');
const { buildConversionReport } = require('./sqliteExchange/report');
const { serializeProjectTables } = require('./sqliteExchange/serialize');
const { validateSqliteExchangeModel } = require('./sqliteExchange/validation');

function buildSqliteModelFromJsonProject(project = {}) {
  const serialized = serializeProjectTables(project);
  const tables = serialized.tables;
  return {
    version: MODEL_VERSION,
    generatedAt: new Date().toISOString(),
    tables,
    report: {
      zoneCount: serialized.zones.length,
      pointCount: serialized.points.length,
      phenologyEntryCount: tables.phenology_entries.length,
      imageReferenceCount: tables.images.length,
      taxonomyCandidateCount: tables.taxonomy_candidates.length,
      warnings: []
    }
  };
}

function buildJsonProjectFromSqliteModel(model = {}) {
  return deserializeProjectTables(model.tables || {});
}

module.exports = {
  MODEL_VERSION,
  buildSqliteModelFromJsonProject,
  buildJsonProjectFromSqliteModel,
  validateSqliteExchangeModel,
  buildConversionReport,
  buildBackupPreflightPlan
};
