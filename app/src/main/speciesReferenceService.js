const https = require('https');
const { AppError } = require('./errors');
const { ERROR_CODES } = require('./errorCodes');

const GBIF_BASE_URL = 'https://api.gbif.org/v1';
const INAT_BASE_URL = 'https://api.inaturalist.org/v1';
const PLANT_KINGDOM_KEY = 6;
const INAT_PLANT_TAXON_ID = 47126;
const REQUEST_TIMEOUT_MS = 12000;

function cleanText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
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

async function fetchJsonOnce(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      headers: {
        accept: 'application/json',
        'user-agent': 'CQNU-Plant-MAP/9.0 species-reference'
      },
      timeout: REQUEST_TIMEOUT_MS
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

function normalizeGbifMatch(item) {
  if (!item || !item.usageKey) return null;
  return {
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
  };
}

function normalizeGbifCandidate(item) {
  if (!item || !item.key) return null;
  return {
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
  };
}

function normalizeINaturalistTaxon(item) {
  if (!item || !item.id) return null;
  const photo = item.default_photo || {};
  const conservation = item.conservation_status || {};
  return {
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
    classification: {
      kingdom: item.iconic_taxon_name || 'Plantae',
      phylum: '',
      className: '',
      order: '',
      family: '',
      genus: '',
      species: item.name || ''
    },
    summary: [
      item.rank ? `rank=${item.rank}` : '',
      Number.isFinite(item.observations_count) ? `observations=${item.observations_count}` : '',
      item.preferred_common_name ? `common=${item.preferred_common_name}` : '',
      conservation.status_name ? `iucn=${conservation.status_name}` : ''
    ].filter(Boolean).join(' / ')
  };
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

  return {
    ok: true,
    queriedUrls: responses.map(item => item.url),
    suggestions: dedupeSuggestions(suggestions)
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

  return {
    ok: true,
    queriedUrls: responses.map(item => item.url),
    suggestions: dedupeSuggestions(suggestions)
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
