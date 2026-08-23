function cloneJson(value, fallback) {
  if (value === undefined) return fallback;
  return JSON.parse(JSON.stringify(value));
}

function safeText(value) {
  return value === undefined || value === null ? '' : String(value);
}

function safeNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function jsonText(value) {
  return JSON.stringify(value === undefined ? null : value);
}

function parseJson(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function presentFields(record, fields) {
  return fields.filter(field => Object.prototype.hasOwnProperty.call(record, field));
}

function extraFields(record, knownFields) {
  const known = new Set(knownFields);
  const out = {};
  Object.keys(record || {}).forEach(key => {
    if (!known.has(key)) out[key] = record[key];
  });
  return out;
}

function restoreRecord(row, fieldValues) {
  const out = parseJson(row.compatJson, {});
  const fields = parseJson(row.presentFieldsJson, []);
  if (!out || typeof out !== 'object' || Array.isArray(out)) return {};
  if (!Array.isArray(fields)) return out;
  fields.forEach(field => {
    if (Object.prototype.hasOwnProperty.call(fieldValues, field)) {
      out[field] = cloneJson(fieldValues[field], fieldValues[field]);
    }
  });
  return out;
}

module.exports = {
  cloneJson,
  safeText,
  safeNumber,
  jsonText,
  parseJson,
  presentFields,
  extraFields,
  restoreRecord
};
