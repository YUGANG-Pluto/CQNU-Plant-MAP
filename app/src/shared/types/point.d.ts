import type { PhenologyRecord } from './phenology';

export type TaxonomySource = 'manual' | 'iNaturalist' | 'GBIF' | 'iNaturalist+GBIF' | 'unknown' | string;
export type TaxonomyVerificationStatus = 'unverified' | 'suggested' | 'manuallyVerified' | 'doubtful' | 'rejected' | string;

export interface TaxonomyCandidateSummary {
  provider?: string;
  matchedName?: string;
  scientificName?: string;
  canonicalName?: string;
  family?: string;
  genus?: string;
  rank?: string;
  score?: number | null;
  matchType?: string;
  occurrenceWeight?: number | null;
  selected?: boolean;
  [key: string]: unknown;
}

export interface PointRecord {
  id?: string;
  pointId?: string;
  zoneRef?: string;
  zoneId?: string;
  zone?: string;
  lat?: number;
  lng?: number;
  plantNameCn?: string;
  plantNameSci?: string;
  family?: string;
  genus?: string;
  identificationStatus?: string;
  taxonomySource?: TaxonomySource;
  taxonomyMatchedName?: string;
  taxonomyConfidence?: number | null;
  taxonomyConfidenceLabel?: string;
  taxonomyVerificationStatus?: TaxonomyVerificationStatus;
  taxonomyUpdatedAt?: string;
  taxonomyCandidatesSummary?: TaxonomyCandidateSummary[];
  phenologyEntries?: PhenologyRecord[];
  images?: string[];
  [key: string]: unknown;
}
