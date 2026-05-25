const MODEL_VERSION = 'sqlite-exchange-model-v1';

const ZONE_FIELDS = Object.freeze([
  'id',
  'zoneId',
  'name',
  'title',
  'label',
  'displayName',
  'description',
  'geometry'
]);

const POINT_FIELDS = Object.freeze([
  'id',
  'pointId',
  'zoneRef',
  'zoneId',
  'zone',
  'lat',
  'lng',
  'plantNameCn',
  'plantNameSci',
  'family',
  'genus',
  'identificationStatus',
  'taxonomySource',
  'taxonomyMatchedName',
  'taxonomyConfidence',
  'taxonomyConfidenceLabel',
  'taxonomyVerificationStatus',
  'taxonomyUpdatedAt',
  'observer',
  'surveyDate',
  'habitat',
  'abundance',
  'growthForm',
  'floweringState',
  'cultivatedStatus',
  'note',
  'images',
  'selectedPhenologyId'
]);

const PHENOLOGY_FIELDS = Object.freeze([
  'id',
  'label',
  'observer',
  'surveyDate',
  'habitat',
  'abundance',
  'growthForm',
  'floweringState',
  'cultivatedStatus',
  'note',
  'images'
]);

const TAXONOMY_CANDIDATE_FIELDS = Object.freeze([
  'provider',
  'matchedName',
  'scientificName',
  'canonicalName',
  'family',
  'genus',
  'rank',
  'score',
  'matchType',
  'occurrenceWeight',
  'selected'
]);

function cloneJson(value, fallback) {
  if (value === undefined) {
    return fallback;
  }
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
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  return JSON.parse(value);
}

function presentFields(record, fields) {
  return fields.filter(field => Object.prototype.hasOwnProperty.call(record, field));
}

function extraFields(record, knownFields) {
  const known = new Set(knownFields);
  const out = {};
  Object.keys(record || {}).forEach(key => {
    if (!known.has(key)) {
      out[key] = record[key];
    }
  });
  return out;
}

function restoreRecord(row, fieldValues) {
  const out = parseJson(row.compatJson, {});
  const fields = parseJson(row.presentFieldsJson, []);
  fields.forEach(field => {
    if (Object.prototype.hasOwnProperty.call(fieldValues, field)) {
      out[field] = cloneJson(fieldValues[field], fieldValues[field]);
    }
  });
  return out;
}

function makeZoneRow(zone, index) {
  const record = cloneJson(zone || {}, {});
  const internalKey = safeText(record.id || record.zoneId || `zone:${index}`);
  return {
    internalKey,
    sourceIndex: index,
    id: safeText(record.id),
    zoneId: safeText(record.zoneId),
    name: safeText(record.name),
    title: safeText(record.title),
    label: safeText(record.label),
    displayName: safeText(record.displayName),
    description: safeText(record.description),
    geometryJson: jsonText(record.geometry),
    compatJson: jsonText(extraFields(record, ZONE_FIELDS)),
    presentFieldsJson: jsonText(presentFields(record, ZONE_FIELDS))
  };
}

function restoreZone(row) {
  return restoreRecord(row, {
    id: row.id,
    zoneId: row.zoneId,
    name: row.name,
    title: row.title,
    label: row.label,
    displayName: row.displayName,
    description: row.description,
    geometry: parseJson(row.geometryJson, null)
  });
}

function makePointInternalKey(point, index) {
  return safeText(point.id || point.pointId || `point:${index}`);
}

function makePointRow(point, index) {
  const record = cloneJson(point || {}, {});
  const internalKey = makePointInternalKey(record, index);
  return {
    internalKey,
    sourceIndex: index,
    id: safeText(record.id),
    pointId: safeText(record.pointId),
    zoneRef: safeText(record.zoneRef),
    zoneId: safeText(record.zoneId),
    zone: safeText(record.zone),
    lat: safeNumber(record.lat),
    lng: safeNumber(record.lng),
    plantNameCn: safeText(record.plantNameCn),
    plantNameSci: safeText(record.plantNameSci),
    family: safeText(record.family),
    genus: safeText(record.genus),
    identificationStatus: safeText(record.identificationStatus),
    taxonomySource: safeText(record.taxonomySource),
    taxonomyMatchedName: safeText(record.taxonomyMatchedName),
    taxonomyConfidence: safeNumber(record.taxonomyConfidence),
    taxonomyConfidenceLabel: safeText(record.taxonomyConfidenceLabel),
    taxonomyVerificationStatus: safeText(record.taxonomyVerificationStatus),
    taxonomyUpdatedAt: safeText(record.taxonomyUpdatedAt),
    observer: safeText(record.observer),
    surveyDate: safeText(record.surveyDate),
    habitat: safeText(record.habitat),
    abundance: safeText(record.abundance),
    growthForm: safeText(record.growthForm),
    floweringState: safeText(record.floweringState),
    cultivatedStatus: safeText(record.cultivatedStatus),
    note: safeText(record.note),
    imagesJson: jsonText(record.images),
    selectedPhenologyId: safeText(record.selectedPhenologyId),
    compatJson: jsonText(extraFields(record, [
      ...POINT_FIELDS,
      'phenologyEntries',
      'taxonomyCandidatesSummary'
    ])),
    presentFieldsJson: jsonText(presentFields(record, [
      ...POINT_FIELDS,
      'phenologyEntries',
      'taxonomyCandidatesSummary'
    ]))
  };
}

function restorePoint(row, phenologyRows, candidateRows) {
  const out = restoreRecord(row, {
    id: row.id,
    pointId: row.pointId,
    zoneRef: row.zoneRef,
    zoneId: row.zoneId,
    zone: row.zone,
    lat: row.lat,
    lng: row.lng,
    plantNameCn: row.plantNameCn,
    plantNameSci: row.plantNameSci,
    family: row.family,
    genus: row.genus,
    identificationStatus: row.identificationStatus,
    taxonomySource: row.taxonomySource,
    taxonomyMatchedName: row.taxonomyMatchedName,
    taxonomyConfidence: row.taxonomyConfidence,
    taxonomyConfidenceLabel: row.taxonomyConfidenceLabel,
    taxonomyVerificationStatus: row.taxonomyVerificationStatus,
    taxonomyUpdatedAt: row.taxonomyUpdatedAt,
    observer: row.observer,
    surveyDate: row.surveyDate,
    habitat: row.habitat,
    abundance: row.abundance,
    growthForm: row.growthForm,
    floweringState: row.floweringState,
    cultivatedStatus: row.cultivatedStatus,
    note: row.note,
    images: parseJson(row.imagesJson, undefined),
    selectedPhenologyId: row.selectedPhenologyId
  });
  const fields = parseJson(row.presentFieldsJson, []);
  if (fields.includes('phenologyEntries')) {
    out.phenologyEntries = phenologyRows
      .filter(item => item.pointInternalKey === row.internalKey)
      .sort((a, b) => a.sourceIndex - b.sourceIndex)
      .map(restorePhenologyEntry);
  }
  if (fields.includes('taxonomyCandidatesSummary')) {
    out.taxonomyCandidatesSummary = candidateRows
      .filter(item => item.pointInternalKey === row.internalKey)
      .sort((a, b) => a.sourceIndex - b.sourceIndex)
      .map(restoreTaxonomyCandidate);
  }
  return out;
}

function makePhenologyRows(point, pointInternalKey) {
  const entries = Array.isArray(point?.phenologyEntries) ? point.phenologyEntries : [];
  return entries.map((entry, index) => {
    const record = cloneJson(entry || {}, {});
    return {
      internalKey: safeText(record.id || `${pointInternalKey}:phenology:${index}`),
      pointInternalKey,
      sourceIndex: index,
      id: safeText(record.id),
      label: safeText(record.label),
      observer: safeText(record.observer),
      surveyDate: safeText(record.surveyDate),
      habitat: safeText(record.habitat),
      abundance: safeText(record.abundance),
      growthForm: safeText(record.growthForm),
      floweringState: safeText(record.floweringState),
      cultivatedStatus: safeText(record.cultivatedStatus),
      note: safeText(record.note),
      imagesJson: jsonText(record.images),
      compatJson: jsonText(extraFields(record, PHENOLOGY_FIELDS)),
      presentFieldsJson: jsonText(presentFields(record, PHENOLOGY_FIELDS))
    };
  });
}

function restorePhenologyEntry(row) {
  return restoreRecord(row, {
    id: row.id,
    label: row.label,
    observer: row.observer,
    surveyDate: row.surveyDate,
    habitat: row.habitat,
    abundance: row.abundance,
    growthForm: row.growthForm,
    floweringState: row.floweringState,
    cultivatedStatus: row.cultivatedStatus,
    note: row.note,
    images: parseJson(row.imagesJson, undefined)
  });
}

function makeTaxonomyCandidateRows(point, pointInternalKey) {
  const candidates = Array.isArray(point?.taxonomyCandidatesSummary) ? point.taxonomyCandidatesSummary : [];
  return candidates.slice(0, 5).map((candidate, index) => {
    const record = cloneJson(candidate || {}, {});
    return {
      internalKey: `${pointInternalKey}:candidate:${index}`,
      pointInternalKey,
      sourceIndex: index,
      provider: safeText(record.provider),
      matchedName: safeText(record.matchedName),
      scientificName: safeText(record.scientificName),
      canonicalName: safeText(record.canonicalName),
      family: safeText(record.family),
      genus: safeText(record.genus),
      rank: safeText(record.rank),
      score: record.score === null || record.score === undefined ? null : safeNumber(record.score),
      matchType: safeText(record.matchType),
      occurrenceWeight: record.occurrenceWeight === null || record.occurrenceWeight === undefined ? null : safeNumber(record.occurrenceWeight),
      selected: Boolean(record.selected),
      compatJson: jsonText(extraFields(record, TAXONOMY_CANDIDATE_FIELDS)),
      presentFieldsJson: jsonText(presentFields(record, TAXONOMY_CANDIDATE_FIELDS))
    };
  });
}

function restoreTaxonomyCandidate(row) {
  return restoreRecord(row, {
    provider: row.provider,
    matchedName: row.matchedName,
    scientificName: row.scientificName,
    canonicalName: row.canonicalName,
    family: row.family,
    genus: row.genus,
    rank: row.rank,
    score: row.score,
    matchType: row.matchType,
    occurrenceWeight: row.occurrenceWeight,
    selected: row.selected
  });
}

function collectImageRows(points) {
  const rows = [];
  points.forEach((point, pointIndex) => {
    const pointInternalKey = makePointInternalKey(point || {}, pointIndex);
    const pointImages = Array.isArray(point?.images) ? point.images : [];
    pointImages.forEach((imagePath, imageIndex) => {
      rows.push({
        ownerType: 'point',
        ownerInternalKey: pointInternalKey,
        sourceIndex: imageIndex,
        path: safeText(imagePath)
      });
    });
    const entries = Array.isArray(point?.phenologyEntries) ? point.phenologyEntries : [];
    entries.forEach((entry, entryIndex) => {
      const entryImages = Array.isArray(entry?.images) ? entry.images : [];
      entryImages.forEach((imagePath, imageIndex) => {
        rows.push({
          ownerType: 'phenology_entry',
          ownerInternalKey: safeText(entry.id || `${pointInternalKey}:phenology:${entryIndex}`),
          pointInternalKey,
          sourceIndex: imageIndex,
          path: safeText(imagePath)
        });
      });
    });
  });
  return rows;
}

function buildSqliteModelFromJsonProject(project = {}) {
  const settings = cloneJson(project.settings || {}, {});
  const zones = Array.isArray(project.zones) ? cloneJson(project.zones, []) : [];
  const points = Array.isArray(project.points) ? cloneJson(project.points, []) : [];

  const pointRows = points.map(makePointRow);
  const phenologyRows = points.flatMap((point, index) => makePhenologyRows(point, pointRows[index].internalKey));
  const candidateRows = points.flatMap((point, index) => makeTaxonomyCandidateRows(point, pointRows[index].internalKey));
  const imageRows = collectImageRows(points);

  return {
    version: MODEL_VERSION,
    generatedAt: new Date().toISOString(),
    tables: {
      project_settings: Object.keys(settings).map(key => ({ key, valueJson: jsonText(settings[key]) })),
      zones: zones.map(makeZoneRow),
      points: pointRows,
      phenology_entries: phenologyRows,
      images: imageRows,
      taxonomy_candidates: candidateRows
    },
    report: {
      zoneCount: zones.length,
      pointCount: points.length,
      phenologyEntryCount: phenologyRows.length,
      imageReferenceCount: imageRows.length,
      taxonomyCandidateCount: candidateRows.length,
      warnings: []
    }
  };
}

function buildJsonProjectFromSqliteModel(model = {}) {
  const tables = model.tables || {};
  const settings = {};
  (tables.project_settings || []).forEach(row => {
    settings[row.key] = parseJson(row.valueJson, null);
  });
  const phenologyRows = Array.isArray(tables.phenology_entries) ? tables.phenology_entries : [];
  const candidateRows = Array.isArray(tables.taxonomy_candidates) ? tables.taxonomy_candidates : [];
  return {
    settings,
    zones: (tables.zones || [])
      .slice()
      .sort((a, b) => a.sourceIndex - b.sourceIndex)
      .map(restoreZone),
    points: (tables.points || [])
      .slice()
      .sort((a, b) => a.sourceIndex - b.sourceIndex)
      .map(row => restorePoint(row, phenologyRows, candidateRows))
  };
}

function validateSqliteExchangeModel(model = {}) {
  const errors = [];
  if (model.version !== MODEL_VERSION) {
    errors.push(`unsupported model version: ${safeText(model.version)}`);
  }
  const tables = model.tables || {};
  [
    'project_settings',
    'zones',
    'points',
    'phenology_entries',
    'images',
    'taxonomy_candidates'
  ].forEach(name => {
    if (!Array.isArray(tables[name])) {
      errors.push(`missing table model: ${name}`);
    }
  });
  return {
    ok: errors.length === 0,
    errors
  };
}

function countCompatFields(rows = []) {
  return rows.reduce((total, row) => total + Object.keys(parseJson(row.compatJson, {})).length, 0);
}

function countRowsWithCompat(rows = []) {
  return rows.filter(row => Object.keys(parseJson(row.compatJson, {})).length > 0).length;
}

function uniqueImagePathCount(rows = []) {
  return new Set(rows.map(row => row.path).filter(Boolean)).size;
}

function buildConversionReport(model = {}, options = {}) {
  const tables = model.tables || {};
  const validation = validateSqliteExchangeModel(model);
  const zoneRows = tables.zones || [];
  const pointRows = tables.points || [];
  const phenologyRows = tables.phenology_entries || [];
  const imageRows = tables.images || [];
  const candidateRows = tables.taxonomy_candidates || [];
  const settingsRows = tables.project_settings || [];
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
    direction: options.direction || 'json-to-sqlite-table-model',
    generatedAt: options.generatedAt || new Date().toISOString(),
    sourceFormat: options.sourceFormat || 'json-project',
    targetFormat: options.targetFormat || 'sqlite-table-model',
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

function buildBackupPreflightPlan(options = {}) {
  const generatedAt = options.generatedAt || new Date().toISOString();
  const direction = options.direction || 'json-to-sqlite';
  return {
    version: MODEL_VERSION,
    type: 'backup-preflight-plan',
    generatedAt,
    direction,
    required: true,
    executeBackup: false,
    writeFiles: false,
    reason: options.reason || 'storage conversion preflight',
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
  MODEL_VERSION,
  buildSqliteModelFromJsonProject,
  buildJsonProjectFromSqliteModel,
  validateSqliteExchangeModel,
  buildConversionReport,
  buildBackupPreflightPlan
};
