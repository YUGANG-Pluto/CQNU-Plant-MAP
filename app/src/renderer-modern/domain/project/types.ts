export type UnknownRecord = Record<string, unknown>;

export type TaxonomySource =
  | 'manual'
  | 'iNaturalist'
  | 'GBIF'
  | 'iNaturalist+GBIF'
  | 'unknown';

export type TaxonomyVerificationStatus =
  | 'unverified'
  | 'suggested'
  | 'manuallyVerified'
  | 'doubtful'
  | 'rejected';

export interface TaxonomyCandidateSummary {
  provider: string;
  matchedName: string;
  scientificName: string;
  canonicalName: string;
  family: string;
  genus: string;
  rank: string;
  score: number | null;
  matchType: string;
  occurrenceWeight: number;
}

export interface ZoneDomainRecord {
  source: Readonly<UnknownRecord>;
  id: string;
  zoneId: string;
  name: string;
  description: string;
  geometry: Readonly<UnknownRecord> | null;
}

export interface PhenologyDomainRecord {
  source: Readonly<UnknownRecord>;
  id: string;
  label: string;
  observer: string;
  surveyDate: string;
  habitat: string;
  abundance: string;
  growthForm: string;
  floweringState: string;
  cultivatedStatus: string;
  note: string;
  images: readonly string[];
}

export interface PointDomainRecord {
  source: Readonly<UnknownRecord>;
  id: string;
  pointId: string;
  zoneRef: string;
  lat: number | null;
  lng: number | null;
  plantNameCn: string;
  plantNameSci: string;
  family: string;
  genus: string;
  identificationStatus: string;
  taxonomySource: string;
  taxonomyVerificationStatus: string;
  taxonomyCandidatesSummary: readonly TaxonomyCandidateSummary[];
  phenologyEntries: readonly PhenologyDomainRecord[];
}

export type CompatibilityWarningCode =
  | 'invalid-zone-record'
  | 'invalid-point-record'
  | 'missing-zone-id'
  | 'missing-point-id'
  | 'invalid-coordinate';

export interface CompatibilityWarning {
  code: CompatibilityWarningCode;
  path: string;
}

export interface ProjectDomainSnapshot {
  zones: readonly ZoneDomainRecord[];
  points: readonly PointDomainRecord[];
  warnings: readonly CompatibilityWarning[];
}
