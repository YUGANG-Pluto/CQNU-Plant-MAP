export type SpeciesReferenceProvider = 'gbif' | 'inaturalist' | 'inaturalistVision' | string;

export interface SpeciesReferenceClassification {
  kingdom?: string;
  phylum?: string;
  className?: string;
  order?: string;
  family?: string;
  genus?: string;
  species?: string;
}

export interface SpeciesReferenceImage {
  url: string;
  creator?: string;
  license?: string;
  source?: string;
}

export interface SpeciesReferenceDescription {
  source?: string;
  description: string;
}

export interface SpeciesReferenceSuggestion {
  id: string;
  source: SpeciesReferenceProvider;
  sourceLabel: string;
  sourceUrl?: string;
  wikipediaUrl?: string;
  scientificName?: string;
  canonicalName?: string;
  commonName?: string;
  rank?: string;
  status?: string;
  matchType?: string;
  confidence?: number | null;
  observationsCount?: number | null;
  photoUrl?: string;
  photoAttribution?: string;
  conservationStatus?: string;
  classification?: SpeciesReferenceClassification;
  descriptions?: SpeciesReferenceDescription[];
  vernacularNames?: string[];
  featureHints?: string[];
  images?: SpeciesReferenceImage[];
  summary?: string;
}

export interface SpeciesReferenceSourceStatus {
  ok: boolean;
  count?: number;
  queriedUrls?: string[];
  error?: string;
}

export interface SpeciesReferenceQueryInput {
  scientificName: string;
  commonName: string;
  locale: string;
}

export interface SpeciesReferenceImageCompareInput {
  locale: string;
  token: string;
}

export interface SpeciesReferenceResult {
  schema?: string;
  queriedAt?: string;
  canceled?: boolean;
  selectedId?: string;
  selectedImageName?: string;
  selectedImageFileUrl?: string;
  uploadedBytes?: number;
  input?: SpeciesReferenceQueryInput;
  sources?: Record<string, SpeciesReferenceSourceStatus>;
  suggestions?: SpeciesReferenceSuggestion[];
}

export interface TaxonomyReferenceInput {
  scientificName: string;
  chineseName: string;
  commonName?: string;
  locale?: string;
  providers?: Array<'GBIF' | 'iNaturalist'>;
}

export interface TaxonomyReferenceCandidate {
  provider: string;
  matchedName: string;
  scientificName: string;
  canonicalName: string;
  family: string;
  genus: string;
  rank: string;
  score: number | null;
  matchType: string;
  rawNameUsed?: string;
  occurrenceWeight: number;
  exactMatch?: boolean;
}

export interface TaxonomyReferenceResult {
  ok: boolean;
  queryName: string;
  providersUsed: string[];
  suggestedFamily: string;
  suggestedGenus: string;
  matchedName: string;
  source: string;
  confidence: number | null;
  confidenceLabel: string;
  verificationStatus: string;
  overwriteBlocked?: boolean;
  candidates: TaxonomyReferenceCandidate[];
  warnings: string[];
}
