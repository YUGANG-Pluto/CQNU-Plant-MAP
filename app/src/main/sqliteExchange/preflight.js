const { MODEL_VERSION } = require('./constants');
const { safeText } = require('./compat');

function buildBackupPreflightPlan(options = {}) {
  const generatedAt = safeText(options.generatedAt || new Date().toISOString());
  const direction = safeText(options.direction || 'json-to-sqlite');
  return {
    version: MODEL_VERSION,
    type: 'backup-preflight-plan',
    generatedAt,
    direction,
    required: true,
    executeBackup: false,
    writeFiles: false,
    reason: safeText(options.reason || 'storage conversion preflight'),
    includeRelativePaths: [
      'information/settings.json',
      'information/zones.json',
      'information/points.json',
      'information/images/',
      'conversion-report.json'
    ],
    excludePatterns: [
      'node_modules/',
      'dist/',
      'release/',
      '*.db',
      '*.sqlite',
      '*.sqlite3'
    ],
    steps: [
      'Validate trusted project directory.',
      'Create a normal project backup before conversion.',
      'Build conversion table model in memory.',
      'Write conversion output to a temporary target only after validation.',
      'Keep source JSON readable until conversion is verified.',
      'Store conversion report with rollback notes.'
    ],
    validationGates: [
      'record counts match expected source data',
      'unknown fields are preserved',
      'image references remain project-relative',
      'taxonomy suggestions remain advisory',
      'no service tokens or complete provider responses are stored'
    ],
    privacy: {
      exposesAbsoluteProjectPath: false,
      includesUserHomePath: false,
      includesServiceTokens: false
    }
  };
}

module.exports = {
  buildBackupPreflightPlan
};
