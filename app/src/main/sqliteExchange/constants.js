const MODEL_VERSION = 'sqlite-exchange-model-v1';

const REQUIRED_TABLES = Object.freeze([
  'project_settings',
  'zones',
  'points',
  'phenology_entries',
  'images',
  'taxonomy_candidates'
]);

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

module.exports = {
  MODEL_VERSION,
  REQUIRED_TABLES,
  ZONE_FIELDS,
  POINT_FIELDS,
  PHENOLOGY_FIELDS,
  TAXONOMY_CANDIDATE_FIELDS
};
