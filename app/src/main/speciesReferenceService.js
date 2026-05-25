const https = require('https');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { AppError } = require('./errors');
const { ERROR_CODES } = require('./errorCodes');
const { IMAGE_EXTENSIONS } = require('./constants');
const { normalizeSelectedImage } = require('./pathGuard');

const GBIF_BASE_URL = 'https://api.gbif.org/v1';
const INAT_BASE_URL = 'https://api.inaturalist.org/v1';
const PLANT_KINGDOM_KEY = 6;
const INAT_PLANT_TAXON_ID = 47126;
const REQUEST_TIMEOUT_MS = 12000;
const DETAIL_TIMEOUT_MS = 6500;
const DETAIL_ENRICH_LIMIT = 3;
const IMAGE_COMPARE_TIMEOUT_MS = 30000;
const MAX_COMPARE_IMAGE_BYTES = 8 * 1024 * 1024;

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

function imageCompareFilters() {
  return [{
    name: 'Images',
    extensions: [...IMAGE_EXTENSIONS].map(ext => ext.slice(1))
  }];
}

function mimeFromImagePath(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.bmp') return 'image/bmp';
  return 'application/octet-stream';
}

function safeFileName(filePath) {
  return path.basename(filePath).replace(/[^\w.\-()\u4e00-\u9fa5]+/g, '_');
}

function buildMultipartImageBody(filePath, fields = {}) {
  const boundary = `----cqnu-plant-map-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const fileBuffer = fs.readFileSync(filePath);
  if (fileBuffer.length > MAX_COMPARE_IMAGE_BYTES) {
    throw new AppError(ERROR_CODES.INVALID_PAYLOAD, '图片超过 8MB，无法用于轻量图像比对。');
  }
  const parts = [];
  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    parts.push(Buffer.from(
      `--${boundary}\r\n`
      + `Content-Disposition: form-data; name="${key}"\r\n\r\n`
      + `${String(value)}\r\n`,
      'utf8'
    ));
  });
  parts.push(Buffer.from(
    `--${boundary}\r\n`
    + `Content-Disposition: form-data; name="image"; filename="${safeFileName(filePath)}"\r\n`
    + `Content-Type: ${mimeFromImagePath(filePath)}\r\n\r\n`,
    'utf8'
  ));
  parts.push(fileBuffer);
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8'));
  return {
    boundary,
    body: Buffer.concat(parts),
    size: fileBuffer.length
  };
}

async function postMultipartJson(url, filePath, fields = {}, token = '') {
  const multipart = buildMultipartImageBody(filePath, fields);
  const headers = {
    accept: 'application/json',
    'content-type': `multipart/form-data; boundary=${multipart.boundary}`,
    'content-length': multipart.body.length,
    'user-agent': 'CQNU-Plant-MAP/9.0 species-image-compare'
  };
  const cleanToken = cleanText(token);
  if (cleanToken) {
    headers.authorization = /^Bearer\s+/i.test(cleanToken) ? cleanToken : `Bearer ${cleanToken}`;
  }

  return new Promise((resolve, reject) => {
    const request = https.request(url, {
      method: 'POST',
      headers,
      timeout: IMAGE_COMPARE_TIMEOUT_MS
    }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let data = null;
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          data = { message: text };
        }
        if (response.statusCode < 200 || response.statusCode >= 300) {
          const message = response.statusCode === 401
            ? 'iNaturalist 图像比对需要有效访问令牌；令牌只会用于本次请求，不会保存。'
            : (data?.error || data?.message || `iNaturalist 图像比对失败：HTTP ${response.statusCode}`);
          reject(new AppError(ERROR_CODES.INTERNAL_ERROR, message));
          return;
        }
        resolve({
          data,
          uploadedBytes: multipart.size
        });
      });
    });

    request.on('timeout', () => {
      request.destroy(new AppError(ERROR_CODES.INTERNAL_ERROR, 'iNaturalist 图像比对请求超时。'));
    });
    request.on('error', error => {
      reject(error instanceof AppError ? error : new AppError(ERROR_CODES.INTERNAL_ERROR, error.message || 'iNaturalist 图像比对失败。', error));
    });
    request.write(multipart.body);
    request.end();
  });
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
