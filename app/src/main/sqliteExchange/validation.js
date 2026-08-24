const { MODEL_VERSION, REQUIRED_TABLES } = require('./constants');
const { safeText } = require('./compat');

function duplicateKeys(rows) {
  const seen = new Set();
  const duplicates = new Set();
  rows.forEach(row => {
    const key = safeText(row?.internalKey);
    if (!key) return;
    if (seen.has(key)) duplicates.add(key);
    seen.add(key);
  });
  return [...duplicates];
}

function validateInternalKeys(tables, errors) {
  ['zones', 'points', 'phenology_entries', 'taxonomy_candidates'].forEach(name => {
    if (!Array.isArray(tables[name])) return;
    duplicateKeys(tables[name]).forEach(key => {
      errors.push(`duplicate internal key in ${name}: ${key}`);
    });
  });
}

function validatePointReferences(tables, errors) {
  if (!Array.isArray(tables.points)) return;
  const pointKeys = new Set(tables.points.map(row => safeText(row?.internalKey)).filter(Boolean));
  ['phenology_entries', 'taxonomy_candidates'].forEach(name => {
    if (!Array.isArray(tables[name])) return;
    tables[name].forEach((row, index) => {
      const pointKey = safeText(row?.pointInternalKey);
      if (!pointKey || !pointKeys.has(pointKey)) {
        errors.push(`invalid point reference in ${name}[${index}]`);
      }
    });
  });
}

function validateSqliteExchangeModel(model = {}) {
  const errors = [];
  if (model.version !== MODEL_VERSION) {
    errors.push(`unsupported model version: ${safeText(model.version)}`);
  }
  const tables = model.tables || {};
  REQUIRED_TABLES.forEach(name => {
    if (!Array.isArray(tables[name])) errors.push(`missing table model: ${name}`);
  });
  validateInternalKeys(tables, errors);
  validatePointReferences(tables, errors);
  return { ok: errors.length === 0, errors };
}

module.exports = {
  validateSqliteExchangeModel
};
