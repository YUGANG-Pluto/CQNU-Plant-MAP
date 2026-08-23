const { parseJson, restoreRecord } = require('./compat');

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

function childRows(rows, pointInternalKey, restore) {
  return rows
    .filter(item => item.pointInternalKey === pointInternalKey)
    .slice()
    .sort((a, b) => a.sourceIndex - b.sourceIndex)
    .map(restore);
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
  if (!Array.isArray(fields)) return out;
  if (fields.includes('phenologyEntries')) {
    out.phenologyEntries = childRows(phenologyRows, row.internalKey, restorePhenologyEntry);
  }
  if (fields.includes('taxonomyCandidatesSummary')) {
    out.taxonomyCandidatesSummary = childRows(
      candidateRows,
      row.internalKey,
      restoreTaxonomyCandidate
    );
  }
  return out;
}

function deserializeProjectTables(tables = {}) {
  const settings = {};
  const settingsRows = Array.isArray(tables.project_settings) ? tables.project_settings : [];
  const zoneRows = Array.isArray(tables.zones) ? tables.zones : [];
  const pointRows = Array.isArray(tables.points) ? tables.points : [];
  settingsRows.forEach(row => {
    settings[row.key] = parseJson(row.valueJson, null);
  });
  const phenologyRows = Array.isArray(tables.phenology_entries) ? tables.phenology_entries : [];
  const candidateRows = Array.isArray(tables.taxonomy_candidates) ? tables.taxonomy_candidates : [];
  return {
    settings,
    zones: zoneRows
      .slice()
      .sort((a, b) => a.sourceIndex - b.sourceIndex)
      .map(restoreZone),
    points: pointRows
      .slice()
      .sort((a, b) => a.sourceIndex - b.sourceIndex)
      .map(row => restorePoint(row, phenologyRows, candidateRows))
  };
}

module.exports = {
  deserializeProjectTables
};
