const path = require('path');
const { pathToFileURL } = require('url');
const { AppError } = require('./errors');
const { ERROR_CODES } = require('./errorCodes');
const { normalizeSelectedImage } = require('./pathGuard');
const { cleanText, uniqueStrings, buildUrl } = require('./speciesReference/textUtils');
const {
  fetchJsonOnce,
  fetchJson,
  imageCompareFilters,
  postMultipartJson
} = require('./speciesReference/requestClient');
const {
  normalizeGbifDescriptions,
  normalizeGbifVernacularNames,
  normalizeGbifMedia,
  normalizeGbifProfiles,
  normalizeGbifMatch,
  normalizeGbifCandidate,
  normalizeINaturalistTaxon,
  normalizeVisionSuggestion,
  normalizeVisionResults,
  dedupeSuggestions
} = require('./speciesReference/normalizers');
const {
  normalizeProviderList,
  providerLabel,
  normalizeTaxonomyCandidates,
  summarizeTaxonomySuggestion
} = require('./speciesReference/taxonomySuggestion');

const GBIF_BASE_URL = 'https://api.gbif.org/v1';
const INAT_BASE_URL = 'https://api.inaturalist.org/v1';
const PLANT_KINGDOM_KEY = 6;
const INAT_PLANT_TAXON_ID = 47126;
const DETAIL_TIMEOUT_MS = 6500;
const DETAIL_ENRICH_LIMIT = 3;

async function queryTaxonomyProviders(queryName, queryType, providers, locale) {
  const tasks = providers.map(provider => {
    const scientificName = queryType === 'scientificName' ? queryName : '';
    const commonName = queryType === 'chineseName' ? queryName : '';
    const task = provider === 'gbif'
      ? queryGbif(scientificName, commonName)
      : queryINaturalist(scientificName, commonName, locale);
    return [provider, task];
  });
  const settled = await Promise.allSettled(tasks.map(([, task]) => task));
  const candidates = [];
  const failures = [];
  settled.forEach((result, index) => {
    const provider = tasks[index][0];
    if (result.status === 'fulfilled') {
      candidates.push(...normalizeTaxonomyCandidates(result.value.suggestions || [], queryName, queryName));
    } else {
      failures.push(`${providerLabel(provider)}：${result.reason?.message || '查询失败'}`);
    }
  });
  return { candidates, failures };
}

async function suggestTaxonomyFromReferences(payload = {}) {
  const scientificName = cleanText(payload.scientificName);
  const chineseName = cleanText(payload.chineseName || payload.commonName);
  const locale = cleanText(payload.locale) || 'zh-CN';
  const providers = normalizeProviderList(payload.providers);
  if (!scientificName && !chineseName) {
    return {
      ok: false,
      queryName: '',
      providersUsed: [],
      suggestedFamily: '',
      suggestedGenus: '',
      matchedName: '',
      source: 'unknown',
      confidence: null,
      confidenceLabel: 'unknown',
      verificationStatus: 'unverified',
      candidates: [],
      warnings: ['请先填写中文名或学名后再查询科属建议。']
    };
  }
  const attempts = [];
  if (scientificName) attempts.push(['scientificName', scientificName]);
  if (chineseName && chineseName !== scientificName) attempts.push(['chineseName', chineseName]);

  let collectedFailures = [];
  for (const [queryType, queryName] of attempts) {
    const result = await queryTaxonomyProviders(queryName, queryType, providers, locale);
    collectedFailures = [...collectedFailures, ...result.failures];
    if (result.candidates.length) {
      const summary = summarizeTaxonomySuggestion(payload, result.candidates, queryName, result.failures);
      if (queryType === 'chineseName' && scientificName) {
        summary.warnings.unshift('学名未返回可靠科属建议，已回退使用中文名查询。');
      }
      return summary;
    }
  }

  if (collectedFailures.length && collectedFailures.length >= providers.length * attempts.length) {
    return {
      ok: false,
      queryName: attempts[0]?.[1] || '',
      providersUsed: [],
      suggestedFamily: '',
      suggestedGenus: '',
      matchedName: '',
      source: 'unknown',
      confidence: null,
      confidenceLabel: 'unknown',
      verificationStatus: 'unverified',
      candidates: [],
      warnings: ['物种参考服务暂不可用，可手动填写科属。', ...collectedFailures]
    };
  }
  return summarizeTaxonomySuggestion(payload, [], attempts[0]?.[1] || '', collectedFailures);
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
  return [...enriched, ...suggestions.slice(DETAIL_ENRICH_LIMIT)];
}

async function querySpeciesImageCompare(payload = {}) {
  const locale = cleanText(payload.locale) || 'zh-CN';
  const token = cleanText(payload.token);
  const { dialog } = require('electron');
  const result = await dialog.showOpenDialog({
    title: '选择用于 iNaturalist 图像比对的图片',
    properties: ['openFile'],
    filters: imageCompareFilters()
  });

  if (result.canceled || !result.filePaths.length) {
    return { canceled: true };
  }

  const imagePath = normalizeSelectedImage(result.filePaths[0]);
  const response = await postMultipartJson(
    buildUrl(INAT_BASE_URL, '/v1/computervision/score_image', { locale }),
    imagePath,
    { locale },
    token
  );
  const suggestions = await enrichSuggestions('inaturalist', normalizeVisionResults(response.data), locale);

  return {
    canceled: false,
    schema: 'cqnu-plant-species-image-compare-v1',
    queriedAt: new Date().toISOString(),
    selectedImageName: path.basename(imagePath),
    selectedImageFileUrl: pathToFileURL(imagePath).toString(),
    uploadedBytes: response.uploadedBytes,
    sources: {
      inaturalistVision: {
        ok: true,
        count: suggestions.length,
        queriedUrls: [buildUrl(INAT_BASE_URL, '/v1/computervision/score_image')]
      }
    },
    suggestions: dedupeSuggestions(suggestions)
  };
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
  querySpeciesImageCompare,
  suggestTaxonomyFromReferences,
  summarizeTaxonomySuggestion,
  normalizeTaxonomyCandidates,
  normalizeGbifMatch,
  normalizeGbifCandidate,
  normalizeINaturalistTaxon,
  normalizeVisionSuggestion,
  dedupeSuggestions
};
