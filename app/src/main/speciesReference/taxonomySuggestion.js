const { cleanText } = require('./textUtils');
const { dedupeSuggestions } = require('./normalizers');

function normalizeProviderName(value) {
  const text = cleanText(value).toLowerCase();
  if (text === 'gbif') return 'gbif';
  if (text === 'inaturalist' || text === 'inat' || text === 'inaturalist cv') return 'inaturalist';
  return '';
}

function normalizeProviderList(providers) {
  const requested = Array.isArray(providers) && providers.length ? providers : ['GBIF', 'iNaturalist'];
  const normalized = requested.map(normalizeProviderName).filter(Boolean);
  return [...new Set(normalized)].filter(provider => provider === 'gbif' || provider === 'inaturalist');
}

function providerLabel(provider) {
  return provider === 'gbif' ? 'GBIF' : 'iNaturalist';
}

function normalizeScore(value) {
  const score = Number(value);
  return Number.isFinite(score) ? score : null;
}

function taxonomyCandidateFromSuggestion(item = {}, rawNameUsed = '') {
  const classification = item.classification || {};
  const provider = normalizeProviderName(item.source);
  if (!provider) return null;
  const family = cleanText(item.family || classification.family);
  const genus = cleanText(item.genus || classification.genus);
  if (!family && !genus) return null;
  return {
    provider: providerLabel(provider),
    matchedName: cleanText(item.matchedName || item.scientificName || item.canonicalName || item.commonName),
    scientificName: cleanText(item.scientificName),
    canonicalName: cleanText(item.canonicalName || item.scientificName),
    family,
    genus,
    rank: cleanText(item.rank),
    score: normalizeScore(item.confidence),
    matchType: cleanText(item.matchType),
    rawNameUsed: cleanText(rawNameUsed),
    occurrenceWeight: 1
  };
}

function normalizeTaxonomyCandidates(suggestions = [], rawNameUsed = '', inputName = '') {
  const seen = new Set();
  const normalizedInput = cleanText(inputName).toLowerCase();
  return suggestions
    .map(item => taxonomyCandidateFromSuggestion(item, rawNameUsed))
    .filter(Boolean)
    .map(candidate => {
      const canonical = cleanText(candidate.canonicalName || candidate.scientificName || candidate.matchedName).toLowerCase();
      const rank = cleanText(candidate.rank).toLowerCase();
      const exact = !!normalizedInput && [candidate.scientificName, candidate.canonicalName, candidate.matchedName]
        .map(value => cleanText(value).toLowerCase())
        .includes(normalizedInput);
      let occurrenceWeight = 1;
      if (exact) occurrenceWeight += 1;
      if (rank === 'species') occurrenceWeight += 0.5;
      const score = candidate.score;
      if (Number.isFinite(score) && (score >= 80 || (score > 0 && score <= 1 && score >= 0.8))) occurrenceWeight += 0.5;
      return {
        ...candidate,
        occurrenceWeight: Math.round(occurrenceWeight * 1000) / 1000,
        exactMatch: exact
      };
    })
    .filter(candidate => {
      const key = `${candidate.provider}:${cleanText(candidate.canonicalName || candidate.scientificName || candidate.matchedName).toLowerCase()}:${candidate.family}:${candidate.genus}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function chooseTaxonomyVote(candidates, field) {
  const groups = new Map();
  candidates.forEach(candidate => {
    const value = cleanText(candidate[field]);
    if (!value) return;
    const key = value.toLowerCase();
    if (!groups.has(key)) {
      groups.set(key, {
        value,
        weight: 0,
        exactCount: 0,
        speciesCount: 0,
        providers: new Set(),
        candidates: []
      });
    }
    const group = groups.get(key);
    group.weight += Number(candidate.occurrenceWeight || 1);
    group.exactCount += candidate.exactMatch ? 1 : 0;
    group.speciesCount += cleanText(candidate.rank).toLowerCase() === 'species' ? 1 : 0;
    group.providers.add(candidate.provider);
    group.candidates.push(candidate);
  });
  const ranked = [...groups.values()].sort((a, b) => (
    b.weight - a.weight ||
    b.exactCount - a.exactCount ||
    b.speciesCount - a.speciesCount ||
    b.providers.size - a.providers.size ||
    a.value.localeCompare(b.value)
  ));
  if (!ranked.length) return { value: '', conflict: false, ratio: 0, supporters: [] };
  const top = ranked[0];
  const second = ranked[1];
  if (second) {
    const unresolvedTie = top.weight === second.weight
      && top.exactCount === second.exactCount
      && top.speciesCount === second.speciesCount
      && top.providers.size === second.providers.size;
    if (unresolvedTie) {
      return { value: '', conflict: true, ratio: 0, supporters: top.candidates };
    }
  }
  const total = ranked.reduce((sum, group) => sum + group.weight, 0);
  return {
    value: top.value,
    conflict: false,
    ratio: total > 0 ? top.weight / total : 0,
    supporters: top.candidates
  };
}

function confidenceLabel(confidence) {
  if (!Number.isFinite(confidence)) return 'unknown';
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.6) return 'medium';
  return 'low';
}

function summarizeTaxonomySuggestion(input = {}, candidates = [], queryName = '', providerFailures = []) {
  const warnings = [];
  if (!candidates.length) {
    return {
      ok: true,
      queryName,
      providersUsed: [],
      suggestedFamily: '',
      suggestedGenus: '',
      matchedName: '',
      source: 'unknown',
      confidence: null,
      confidenceLabel: 'unknown',
      verificationStatus: 'unverified',
      candidates: [],
      warnings: ['未找到可靠科属建议，请手动填写或稍后重试。', ...providerFailures]
    };
  }
  const familyVote = chooseTaxonomyVote(candidates, 'family');
  const genusVote = chooseTaxonomyVote(candidates, 'genus');
  if (familyVote.conflict || genusVote.conflict) warnings.push('存在多个候选，请人工选择或手动填写。');
  const supporters = [...familyVote.supporters, ...genusVote.supporters];
  const providerSet = new Set(supporters.length ? supporters.map(item => item.provider) : candidates.map(item => item.provider));
  const providersUsed = [...new Set(candidates.map(item => item.provider))];
  const ratioValues = [familyVote.ratio, genusVote.ratio].filter(value => value > 0);
  let confidence = ratioValues.length ? ratioValues.reduce((sum, value) => sum + value, 0) / ratioValues.length : null;
  if (confidence !== null && providerSet.size > 1) confidence = Math.min(1, confidence + 0.08);
  if (confidence !== null && candidates.some(item => item.exactMatch)) confidence = Math.min(1, confidence + 0.06);
  const roundedConfidence = confidence === null ? null : Math.round(confidence * 1000) / 1000;
  const existingFamily = cleanText(input.existingFamily);
  const existingGenus = cleanText(input.existingGenus);
  const manuallyVerified = cleanText(input.taxonomyVerificationStatus) === 'manuallyVerified';
  const overwriteBlocked = !input.allowOverwriteManual && (manuallyVerified || existingFamily || existingGenus);
  if (overwriteBlocked) warnings.push('已有科属信息不会被自动覆盖；如需覆盖请手动确认。');
  return {
    ok: true,
    queryName,
    providersUsed,
    suggestedFamily: familyVote.value,
    suggestedGenus: genusVote.value,
    matchedName: cleanText(candidates.find(item => item.exactMatch)?.matchedName || candidates[0]?.matchedName),
    source: providerSet.size ? [...providerSet].join('+') : 'unknown',
    confidence: roundedConfidence,
    confidenceLabel: confidenceLabel(roundedConfidence),
    verificationStatus: 'suggested',
    overwriteBlocked,
    candidates: candidates.slice(0, 5).map(candidate => ({
      provider: candidate.provider,
      matchedName: candidate.matchedName,
      scientificName: candidate.scientificName,
      canonicalName: candidate.canonicalName,
      family: candidate.family,
      genus: candidate.genus,
      rank: candidate.rank,
      score: candidate.score,
      matchType: candidate.matchType,
      occurrenceWeight: candidate.occurrenceWeight
    })),
    warnings: [...warnings, ...providerFailures]
  };
}

module.exports = {
  normalizeProviderName,
  normalizeProviderList,
  providerLabel,
  normalizeScore,
  taxonomyCandidateFromSuggestion,
  normalizeTaxonomyCandidates,
  chooseTaxonomyVote,
  confidenceLabel,
  summarizeTaxonomySuggestion
};
