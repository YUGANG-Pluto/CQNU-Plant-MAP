const https = require('https');
const { AppError } = require('./errors');
const { ERROR_CODES } = require('./errorCodes');

const GBIF_BASE_URL = 'https://api.gbif.org/v1';
const INAT_BASE_URL = 'https://api.inaturalist.org/v1';
const PLANT_KINGDOM_KEY = 6;
const INAT_PLANT_TAXON_ID = 47126;
const REQUEST_TIMEOUT_MS = 12000;
const DETAIL_TIMEOUT_MS = 6500;
const DETAIL_ENRICH_LIMIT = 3;

function cleanText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function cleanParagraph(value, maxLength = 420) {
  const text = cleanText(String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'"));
  if (!text) return '';
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
}

function uniqueStrings(values, limit = 8) {
  const seen = new Set();
  const result = [];
  values.forEach(value => {
    const text = cleanText(value);
    const key = text.toLowerCase();
    if (!text || seen.has(key)) return;
    seen.add(key);
    result.push(text);
  });
  return result.slice(0, limit);
}

function toFeatureLines(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(toFeatureLines);
  if (typeof value === 'object') {
    return Object.entries(value).flatMap(([key, item]) => {
      const lines = toFeatureLines(item);
      return lines.map(line => `${key}: ${line}`);
    });
  }
  return [cleanParagraph(value, 180)].filter(Boolean);
}

function buildUrl(base, pathname, params = {}) {
  const url = new URL(pathname, base);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

async function fetchJsonOnce(url, timeoutMs = REQUEST_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      headers: {
        accept: 'application/json',
        'user-agent': 'CQNU-Plant-MAP/9.0 species-reference'
      },
      timeout: timeoutMs
    }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new AppError(ERROR_CODES.INTERNAL_ERROR, `参考 API 请求失败：HTTP ${response.statusCode}`));
          return;
        }
        try {
          resolve(JSON.parse(text));
        } catch (error) {
          reject(new AppError(ERROR_CODES.INVALID_JSON, '参考 API 返回了无效 JSON。', error));
        }
      });
    });

    request.on('timeout', () => {
      request.destroy(new AppError(ERROR_CODES.INTERNAL_ERROR, '参考 API 请求超时。'));
    });
    request.on('error', error => {
      reject(error instanceof AppError ? error : new AppError(ERROR_CODES.INTERNAL_ERROR, error.message || '参考 API 请求失败。', error));
    });
  });
}

async function fetchJson(url) {
  let lastError = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await fetchJsonOnce(url);
    } catch (error) {
      lastError = error;
      if (attempt === 0) {
        await new Promise(resolve => setTimeout(resolve, 600));
      }
    }
  }
  throw lastError;
}

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

async function safeDetail(url) {
  try {
    return await fetchJsonOnce(url, DETAIL_TIMEOUT_MS);
  } catch {
    return null;
  }
}

async function enrichGbifSuggestion(item) {
  if (!item?.key) return item;
  const key = item.key;
  const [descriptions, vernacularNames, media, profiles] = await Promise.all([
    safeDetail(buildUrl(GBIF_BASE_URL, `/v1/species/${key}/descriptions`, { limit: 5 })),
    safeDetail(buildUrl(GBIF_BASE_URL, `/v1/species/${key}/vernacularNames`, { limit: 12 })),
    safeDetail(buildUrl(GBIF_BASE_URL, `/v1/species/${key}/media`, { limit: 6 })),
    safeDetail(buildUrl(GBIF_BASE_URL, `/v1/species/${key}/speciesProfiles`, { limit: 6 }))
  ]);
  const normalizedMedia = normalizeGbifMedia(media?.results || []);
  const images = normalizedMedia.length ? normalizedMedia : item.images;
  const firstImage = images?.[0]?.url || item.photoUrl || '';
  const vernacular = normalizeGbifVernacularNames(vernacularNames?.results || []);
  return {
    ...item,
    commonName: item.commonName || vernacular[0] || '',
    photoUrl: item.photoUrl || firstImage,
    photoAttribution: item.photoAttribution || images?.[0]?.creator || '',
    descriptions: normalizeGbifDescriptions(descriptions?.results || []),
    vernacularNames: uniqueStrings([item.commonName, ...vernacular], 8),
    featureHints: normalizeGbifProfiles(profiles?.results || []),
    images
  };
}

async function enrichINaturalistSuggestion(item, locale = 'zh-CN') {
  if (!item?.key) return item;
  const detail = await safeDetail(buildUrl(INAT_BASE_URL, `/v1/taxa/${item.key}`, {
    locale
  }));
  const detailed = detail?.results?.[0];
  if (!detailed) return item;
  const normalized = normalizeINaturalistTaxon(detailed);
  return {
    ...item,
    ...normalized,
    id: item.id,
    source: item.source,
    sourceLabel: item.sourceLabel,
    sourceUrl: item.sourceUrl,
    key: item.key,
    matchType: item.matchType,
    summary: normalized.summary || item.summary
  };
}

async function enrichSuggestions(source, suggestions, locale = 'zh-CN') {
  const limited = suggestions.slice(0, DETAIL_ENRICH_LIMIT);
  const enriched = await Promise.all(limited.map(item => (
    source === 'gbif' ? enrichGbifSuggestion(item) : enrichINaturalistSuggestion(item, locale)
  )));
  return [...enriched, ...suggestions.slice(8)];
}

async function queryGbif(scientificName, commonName) {
  const urls = [];
  if (scientificName) {
    urls.push({
      type: 'match',
      url: buildUrl(GBIF_BASE_URL, '/v1/species/match', {
        name: scientificName,
        kingdom: 'Plantae',
        verbose: true
      })
    });
  }
  [scientificName, commonName].filter(Boolean).forEach(q => {
    urls.push({
      type: 'search',
      url: buildUrl(GBIF_BASE_URL, '/v1/species/search', {
        q,
        highertaxon_key: PLANT_KINGDOM_KEY,
        limit: 5
      })
    });
  });

  const responses = await Promise.all(urls.map(async item => ({
    type: item.type,
    url: item.url,
    data: await fetchJson(item.url)
  })));

  const suggestions = [];
  responses.forEach(response => {
    if (response.type === 'match') {
      const match = normalizeGbifMatch(response.data);
      if (match) suggestions.push(match);
      return;
    }
    (response.data?.results || []).forEach(item => {
      const candidate = normalizeGbifCandidate(item);
      if (candidate) suggestions.push(candidate);
    });
  });

  const deduped = dedupeSuggestions(suggestions);
  return {
    ok: true,
    queriedUrls: responses.map(item => item.url),
    suggestions: await enrichSuggestions('gbif', deduped)
  };
}

async function queryINaturalist(scientificName, commonName, locale) {
  const urls = [scientificName, commonName]
    .filter(Boolean)
    .map(q => buildUrl(INAT_BASE_URL, '/v1/taxa/autocomplete', {
      q,
      taxon_id: INAT_PLANT_TAXON_ID,
      per_page: 5,
      locale: locale || 'zh-CN'
    }));

  const responses = await Promise.all(urls.map(async url => ({
    url,
    data: await fetchJson(url)
  })));

  const suggestions = [];
  responses.forEach(response => {
    (response.data?.results || []).forEach(item => {
      const candidate = normalizeINaturalistTaxon(item);
      if (candidate) suggestions.push(candidate);
    });
  });

  const deduped = dedupeSuggestions(suggestions);
  return {
    ok: true,
    queriedUrls: responses.map(item => item.url),
    suggestions: await enrichSuggestions('inaturalist', deduped, locale || 'zh-CN')
  };
}

async function querySpeciesReference(payload = {}) {
  const scientificName = cleanText(payload.scientificName);
  const commonName = cleanText(payload.commonName);
  const locale = cleanText(payload.locale) || 'zh-CN';

  if (!scientificName && !commonName) {
    throw new AppError(ERROR_CODES.INVALID_PAYLOAD, '请先填写中文名或学名后再查询参考建议。');
  }

  const tasks = [
    ['gbif', queryGbif(scientificName, commonName)],
    ['inaturalist', queryINaturalist(scientificName, commonName, locale)]
  ];
  const settled = await Promise.allSettled(tasks.map(([, task]) => task));
  const sources = {};
  const suggestions = [];
  settled.forEach((result, index) => {
    const source = tasks[index][0];
    if (result.status === 'fulfilled') {
      sources[source] = {
        ok: true,
        queriedUrls: result.value.queriedUrls,
        count: result.value.suggestions.length
      };
      suggestions.push(...result.value.suggestions);
    } else {
      sources[source] = {
        ok: false,
        message: result.reason?.message || String(result.reason || 'API 请求失败')
      };
    }
  });

  if (!suggestions.length && Object.values(sources).every(item => !item.ok)) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, 'GBIF 与 iNaturalist 参考查询均失败。');
  }

  return {
    schema: 'cqnu-plant-species-reference-v1',
    queriedAt: new Date().toISOString(),
    input: { scientificName, commonName, locale },
    sources,
    suggestions: dedupeSuggestions(suggestions)
  };
}

module.exports = {
  querySpeciesReference,
  normalizeGbifMatch,
  normalizeGbifCandidate,
  normalizeINaturalistTaxon,
  dedupeSuggestions
};
