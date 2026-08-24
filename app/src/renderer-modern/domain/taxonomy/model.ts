import type { TaxonomyCandidateSummary, UnknownRecord } from '../project/types';

export interface TaxonomySuggestionPatch {
  family: string;
  genus: string;
  taxonomySource: string;
  taxonomyMatchedName: string;
  taxonomyConfidence: number | null;
  taxonomyConfidenceLabel: string;
  taxonomyVerificationStatus: 'suggested';
  identificationStatus: 'needReview';
  taxonomyUpdatedAt: string;
  taxonomyCandidatesSummary: TaxonomyCandidateSummary[];
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : {};
}

function text(value: unknown): string {
  return String(value || '');
}

function finiteNumber(value: unknown, fallback: number | null): number | null {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function compactTaxonomyCandidates(
  candidates: unknown,
  limit = 5
): TaxonomyCandidateSummary[] {
  const safeLimit = Math.max(0, Math.floor(Number(limit) || 0));
  const source = Array.isArray(candidates) ? candidates : [];
  return source.slice(0, safeLimit).map(value => {
    const item = asRecord(value);
    return {
      provider: text(item.provider),
      matchedName: text(item.matchedName),
      scientificName: text(item.scientificName),
      canonicalName: text(item.canonicalName),
      family: text(item.family),
      genus: text(item.genus),
      rank: text(item.rank),
      score: finiteNumber(item.score, null),
      matchType: text(item.matchType),
      occurrenceWeight: finiteNumber(item.occurrenceWeight, 1) ?? 1
    };
  });
}

export function buildTaxonomySuggestionPatch(
  resultValue: unknown,
  candidateValue: unknown,
  updatedAt: string
): TaxonomySuggestionPatch {
  const result = asRecord(resultValue);
  const candidate = asRecord(candidateValue);
  const candidateSource = result.candidates || (candidateValue ? [candidateValue] : []);
  return {
    family: text(candidate.family || result.suggestedFamily),
    genus: text(candidate.genus || result.suggestedGenus),
    taxonomySource: text(candidate.provider || result.source || 'unknown'),
    taxonomyMatchedName: text(
      candidate.matchedName || candidate.scientificName || result.matchedName
    ),
    taxonomyConfidence: finiteNumber(result.confidence, null),
    taxonomyConfidenceLabel: text(result.confidenceLabel || 'unknown'),
    taxonomyVerificationStatus: 'suggested',
    identificationStatus: 'needReview',
    taxonomyUpdatedAt: String(updatedAt || ''),
    taxonomyCandidatesSummary: compactTaxonomyCandidates(candidateSource, 5)
  };
}
