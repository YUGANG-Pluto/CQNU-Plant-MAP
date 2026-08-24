const {
  PHENOLOGY_FIELDS,
  POINT_FIELDS,
  TAXONOMY_CANDIDATE_FIELDS,
  ZONE_FIELDS
} = require('./constants');
const {
  cloneJson,
  extraFields,
  jsonText,
  presentFields,
  safeNumber,
  safeText
} = require('./compat');

function indexedInternalKey(type, index, identifier) {
  const suffix = safeText(identifier).trim();
  return suffix ? `${type}:${index}:${suffix}` : `${type}:${index}`;
}

function makeZoneRow(zone, index) {
  const record = cloneJson(zone || {}, {});
  return {
    internalKey: indexedInternalKey('zone', index, record.id || record.zoneId),
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

function makePointInternalKey(point, index) {
  return indexedInternalKey('point', index, point.id || point.pointId);
}

function makePointRow(point, index) {
  const record = cloneJson(point || {}, {});
  const knownFields = [...POINT_FIELDS, 'phenologyEntries', 'taxonomyCandidatesSummary'];
  return {
    internalKey: makePointInternalKey(record, index),
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
    compatJson: jsonText(extraFields(record, knownFields)),
    presentFieldsJson: jsonText(presentFields(record, knownFields))
  };
}

function makePhenologyRows(point, pointInternalKey) {
  const entries = Array.isArray(point?.phenologyEntries) ? point.phenologyEntries : [];
  return entries.map((entry, index) => {
    const record = cloneJson(entry || {}, {});
    return {
      internalKey: indexedInternalKey(`${pointInternalKey}:phenology`, index, record.id),
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

function makeTaxonomyCandidateRows(point, pointInternalKey) {
  const candidates = Array.isArray(point?.taxonomyCandidatesSummary)
    ? point.taxonomyCandidatesSummary
    : [];
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
      occurrenceWeight: record.occurrenceWeight === null || record.occurrenceWeight === undefined
        ? null
        : safeNumber(record.occurrenceWeight),
      selected: Boolean(record.selected),
      compatJson: jsonText(extraFields(record, TAXONOMY_CANDIDATE_FIELDS)),
      presentFieldsJson: jsonText(presentFields(record, TAXONOMY_CANDIDATE_FIELDS))
    };
  });
}

function collectImageRows(points, pointRows) {
  const rows = [];
  points.forEach((point, pointIndex) => {
    const pointInternalKey = pointRows[pointIndex].internalKey;
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
      const entryInternalKey = indexedInternalKey(
        `${pointInternalKey}:phenology`,
        entryIndex,
        entry?.id
      );
      entryImages.forEach((imagePath, imageIndex) => {
        rows.push({
          ownerType: 'phenology_entry',
          ownerInternalKey: entryInternalKey,
          pointInternalKey,
          sourceIndex: imageIndex,
          path: safeText(imagePath)
        });
      });
    });
  });
  return rows;
}

function serializeProjectTables(project = {}) {
  const settings = cloneJson(project.settings || {}, {});
  const zones = Array.isArray(project.zones) ? cloneJson(project.zones, []) : [];
  const points = Array.isArray(project.points) ? cloneJson(project.points, []) : [];
  const pointRows = points.map(makePointRow);
  const phenologyRows = points.flatMap((point, index) => (
    makePhenologyRows(point, pointRows[index].internalKey)
  ));
  const candidateRows = points.flatMap((point, index) => (
    makeTaxonomyCandidateRows(point, pointRows[index].internalKey)
  ));
  const imageRows = collectImageRows(points, pointRows);

  return {
    settings,
    zones,
    points,
    tables: {
      project_settings: Object.keys(settings).map(key => ({ key, valueJson: jsonText(settings[key]) })),
      zones: zones.map(makeZoneRow),
      points: pointRows,
      phenology_entries: phenologyRows,
      images: imageRows,
      taxonomy_candidates: candidateRows
    }
  };
}

module.exports = {
  indexedInternalKey,
  makePointInternalKey,
  serializeProjectTables
};
