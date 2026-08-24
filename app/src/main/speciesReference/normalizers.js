const {
  cleanText,
  cleanParagraph,
  uniqueStrings,
  toFeatureLines
} = require('./textUtils');

function compactClassification(item = {}) {
  return {
    kingdom: item.kingdom || '',
    phylum: item.phylum || '',
    className: item.class || '',
    order: item.order || '',
    family: item.family || '',
    genus: item.genus || '',
    species: item.species || item.canonicalName || item.name || ''
  };
}

function classificationFromINaturalist(item = {}) {
  const classification = {
    kingdom: 'Plantae',
    phylum: '',
    className: '',
    order: '',
    family: '',
    genus: '',
    species: item.name || ''
  };
  (item.ancestors || []).forEach(ancestor => {
    const rank = String(ancestor.rank || '').toLowerCase();
    if (rank === 'kingdom') classification.kingdom = ancestor.name || classification.kingdom;
    if (rank === 'phylum') classification.phylum = ancestor.name || '';
    if (rank === 'class') classification.className = ancestor.name || '';
    if (rank === 'order') classification.order = ancestor.name || '';
    if (rank === 'family') classification.family = ancestor.name || '';
    if (rank === 'genus') classification.genus = ancestor.name || '';
  });
  return classification;
}

function mergeClassification(base = {}, patch = {}) {
  return {
    kingdom: patch.kingdom || base.kingdom || '',
    phylum: patch.phylum || base.phylum || '',
    className: patch.className || base.className || '',
    order: patch.order || base.order || '',
    family: patch.family || base.family || '',
    genus: patch.genus || base.genus || '',
    species: patch.species || base.species || ''
  };
}

function normalizeGbifDescriptions(results = []) {
  return results
    .map(item => ({
      source: cleanText(item.source || item.type || 'GBIF'),
      description: cleanParagraph(item.description, 520)
    }))
    .filter(item => item.description)
    .slice(0, 3);
}

function vernacularLanguageScore(item = {}) {
  const language = String(item.language || '').toLowerCase();
  if (['zho', 'zh', 'cmn', 'chi'].includes(language)) return 0;
  if (language === 'eng' || language === 'en') return 1;
  if (!language) return 2;
  return 3;
}

function normalizeGbifVernacularNames(results = []) {
  return uniqueStrings(
    [...results]
      .sort((a, b) => vernacularLanguageScore(a) - vernacularLanguageScore(b))
      .map(item => item.vernacularName),
    8
  );
}

function normalizeGbifMedia(results = []) {
  return results
    .map(item => ({
      url: cleanText(item.identifier || item.references),
      format: cleanText(item.format || item.type),
      creator: cleanText(item.creator),
      license: cleanText(item.license),
      source: cleanText(item.publisher || item.source || 'GBIF')
    }))
    .filter(item => item.url && (!item.format || /^image\//i.test(item.format) || /\.(png|jpe?g|webp)(\?|$)/i.test(item.url)))
    .slice(0, 4);
}

function normalizeGbifProfiles(results = []) {
  return uniqueStrings(results.flatMap(item => [
    ...toFeatureLines(item.lifeForm),
    ...toFeatureLines(item.habitat),
    ...toFeatureLines(item.vegetationType)
  ]), 6);
}

function withDetailDefaults(item) {
  return {
    descriptions: [],
    vernacularNames: item.commonName ? [item.commonName] : [],
    featureHints: [],
    images: item.photoUrl ? [{
      url: item.photoUrl,
      creator: item.photoAttribution || '',
      license: '',
      source: item.sourceLabel || item.source || ''
    }] : [],
    ...item
  };
}

function normalizeGbifMatch(item) {
  if (!item || !item.usageKey) return null;
  return withDetailDefaults({
    id: `gbif-match-${item.usageKey}`,
    source: 'gbif',
    sourceLabel: 'GBIF',
    sourceUrl: `https://www.gbif.org/species/${item.usageKey}`,
    key: item.usageKey,
    scientificName: item.scientificName || '',
    canonicalName: item.canonicalName || item.species || item.scientificName || '',
    commonName: '',
    rank: item.rank || '',
    status: item.status || '',
    matchType: item.matchType || '',
    confidence: Number.isFinite(item.confidence) ? item.confidence : null,
    observationsCount: null,
    photoUrl: '',
    classification: compactClassification(item),
    summary: [
      item.matchType ? `match=${item.matchType}` : '',
      item.status ? `status=${item.status}` : '',
      Number.isFinite(item.confidence) ? `confidence=${item.confidence}` : ''
    ].filter(Boolean).join(' / ')
  });
}

function normalizeGbifCandidate(item) {
  if (!item || !item.key) return null;
  return withDetailDefaults({
    id: `gbif-search-${item.key}`,
    source: 'gbif',
    sourceLabel: 'GBIF',
    sourceUrl: `https://www.gbif.org/species/${item.key}`,
    key: item.key,
    scientificName: item.scientificName || '',
    canonicalName: item.canonicalName || item.scientificName || '',
    commonName: (item.vernacularNames || []).find(name => name.language === 'zho')?.vernacularName || '',
    rank: item.rank || '',
    status: item.taxonomicStatus || '',
    matchType: 'SEARCH',
    confidence: null,
    observationsCount: Number.isFinite(item.numOccurrences) ? item.numOccurrences : null,
    photoUrl: '',
    classification: compactClassification(item),
    summary: [
      item.rank ? `rank=${item.rank}` : '',
      item.taxonomicStatus ? `status=${item.taxonomicStatus}` : ''
    ].filter(Boolean).join(' / ')
  });
}

function normalizeINaturalistTaxon(item) {
  if (!item || !item.id) return null;
  const photo = item.default_photo || {};
  const conservation = item.conservation_status || {};
  const classification = classificationFromINaturalist(item);
  return withDetailDefaults({
    id: `inat-${item.id}`,
    source: 'inaturalist',
    sourceLabel: 'iNaturalist',
    sourceUrl: `https://www.inaturalist.org/taxa/${item.id}`,
    key: item.id,
    scientificName: item.name || '',
    canonicalName: item.name || '',
    commonName: item.preferred_common_name || item.english_common_name || '',
    rank: item.rank || '',
    status: item.is_active === false ? 'INACTIVE' : 'ACTIVE',
    matchType: item.matched_term ? `MATCHED: ${item.matched_term}` : 'AUTOCOMPLETE',
    confidence: null,
    observationsCount: Number.isFinite(item.observations_count) ? item.observations_count : null,
    photoUrl: photo.medium_url || photo.square_url || photo.url || '',
    photoAttribution: photo.attribution || '',
    conservationStatus: conservation.status_name || conservation.status || '',
    wikipediaUrl: item.wikipedia_url || '',
    descriptions: cleanParagraph(item.wikipedia_summary, 520)
      ? [{ source: 'iNaturalist / Wikipedia', description: cleanParagraph(item.wikipedia_summary, 520) }]
      : [],
    vernacularNames: uniqueStrings([item.preferred_common_name, item.english_common_name], 8),
    images: photo.medium_url || photo.square_url || photo.url ? [{
      url: photo.medium_url || photo.square_url || photo.url,
      creator: photo.attribution || '',
      license: photo.license_code || '',
      source: 'iNaturalist'
    }] : [],
    classification: mergeClassification({
      kingdom: item.iconic_taxon_name || 'Plantae',
      species: item.name || ''
    }, classification),
    summary: [
      item.rank ? `rank=${item.rank}` : '',
      Number.isFinite(item.observations_count) ? `observations=${item.observations_count}` : '',
      item.preferred_common_name ? `common=${item.preferred_common_name}` : '',
      conservation.status_name ? `iucn=${conservation.status_name}` : ''
    ].filter(Boolean).join(' / ')
  });
}

function dedupeSuggestions(items) {
  const seen = new Set();
  return items.filter(item => {
    if (!item?.scientificName && !item?.canonicalName) return false;
    const key = `${item.source}:${String(item.scientificName || item.canonicalName).toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 12);
}

function normalizeVisionScore(item = {}) {
  const score = item.combined_score ?? item.vision_score ?? item.score ?? item.frequency_score ?? item.probability;
  const value = Number(score);
  if (!Number.isFinite(value)) return null;
  return value <= 1 ? Math.round(value * 1000) / 10 : Math.round(value * 10) / 10;
}

function normalizeVisionSuggestion(item = {}) {
  const taxon = item.taxon || item;
  const normalized = normalizeINaturalistTaxon(taxon);
  if (!normalized) return null;
  const score = normalizeVisionScore(item);
  return {
    ...normalized,
    id: `inat-vision-${taxon.id}`,
    source: 'inaturalist',
    sourceLabel: 'iNaturalist CV',
    sourceUrl: `https://www.inaturalist.org/taxa/${taxon.id}`,
    matchType: 'IMAGE',
    confidence: score,
    summary: [
      score !== null ? `image=${score}%` : '',
      normalized.rank ? `rank=${normalized.rank}` : '',
      Number.isFinite(normalized.observationsCount) ? `observations=${normalized.observationsCount}` : ''
    ].filter(Boolean).join(' / ')
  };
}

function normalizeVisionResults(data = {}) {
  const results = data.results || data.suggestions || data.predictions || [];
  return results
    .map(normalizeVisionSuggestion)
    .filter(Boolean)
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
    .slice(0, 8);
}

module.exports = {
  compactClassification,
  classificationFromINaturalist,
  mergeClassification,
  normalizeGbifDescriptions,
  normalizeGbifVernacularNames,
  normalizeGbifMedia,
  normalizeGbifProfiles,
  withDetailDefaults,
  normalizeGbifMatch,
  normalizeGbifCandidate,
  normalizeINaturalistTaxon,
  dedupeSuggestions,
  normalizeVisionScore,
  normalizeVisionSuggestion,
  normalizeVisionResults
};
