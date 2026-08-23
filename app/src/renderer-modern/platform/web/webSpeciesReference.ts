import type {
  SpeciesReferenceImageCompareInput,
  SpeciesReferenceQueryInput,
  SpeciesReferenceResult,
  SpeciesReferenceSuggestion,
  TaxonomyReferenceCandidate,
  TaxonomyReferenceInput,
  TaxonomyReferenceResult
} from '../../../shared/types/species-reference';

type UnknownRecord = Record<string, unknown>;

const GBIF_BASE_URL = 'https://api.gbif.org/v1';
const INAT_BASE_URL = 'https://api.inaturalist.org/v1';
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function record(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as UnknownRecord : {};
}

function text(value: unknown): string {
  return String(value ?? '').trim();
}

function finite(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function buildUrl(base: string, path: string, parameters: UnknownRecord = {}): string {
  const url = new URL(path, base);
  Object.entries(parameters).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) url.searchParams.set(key, String(value));
  });
  return url.href;
}

async function fetchJson(url: string, options: RequestInit = {}, timeoutMs = 12_000): Promise<UnknownRecord> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      headers: { accept: 'application/json', ...options.headers },
      signal: controller.signal,
      credentials: 'omit',
      referrerPolicy: 'no-referrer'
    });
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('iNaturalist 图像比对需要有效访问令牌；令牌只用于本次请求。');
      }
      throw new Error(`物种参考服务返回 HTTP ${response.status}。`);
    }
    return record(await response.json());
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('物种参考查询超时，未修改当前记录。');
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

function classification(source: UnknownRecord): SpeciesReferenceSuggestion['classification'] {
  return {
    kingdom: text(source.kingdom || source.iconic_taxon_name),
    phylum: text(source.phylum),
    className: text(source.class || source.className),
    order: text(source.order),
    family: text(source.family),
    genus: text(source.genus),
    species: text(source.species || source.name)
  };
}

function normalizeGbif(source: unknown, match = false): SpeciesReferenceSuggestion | null {
  const item = record(source);
  const key = text(item.usageKey || item.key);
  if (!key) return null;
  const vernacularNames = Array.isArray(item.vernacularNames) ? item.vernacularNames.map(record) : [];
  const media = Array.isArray(item.media) ? item.media.map(record) : [];
  const image = media.find(entry => /^https?:\/\//i.test(text(entry.identifier)));
  return {
    id: `gbif-${match ? 'match' : 'search'}-${key}`,
    source: 'gbif',
    sourceLabel: 'GBIF',
    sourceUrl: `https://www.gbif.org/species/${key}`,
    scientificName: text(item.scientificName),
    canonicalName: text(item.canonicalName || item.species || item.scientificName),
    commonName: text(vernacularNames.find(name => text(name.language).toLowerCase() === 'zho')?.vernacularName),
    rank: text(item.rank),
    status: text(item.status || item.taxonomicStatus),
    matchType: text(item.matchType || (match ? 'MATCH' : 'SEARCH')),
    confidence: finite(item.confidence),
    observationsCount: finite(item.numOccurrences),
    photoUrl: text(image?.identifier),
    photoAttribution: text(image?.creator || image?.license),
    classification: classification(item),
    images: image ? [{
      url: text(image.identifier),
      creator: text(image.creator),
      license: text(image.license),
      source: 'GBIF'
    }] : [],
    summary: [text(item.rank), text(item.taxonomicStatus || item.status)].filter(Boolean).join(' / ')
  };
}

function iNaturalistClassification(item: UnknownRecord): SpeciesReferenceSuggestion['classification'] {
  const values: UnknownRecord = { kingdom: item.iconic_taxon_name || 'Plantae', species: item.name };
  const ancestors = Array.isArray(item.ancestors) ? item.ancestors.map(record) : [];
  [...ancestors, item].forEach(ancestor => {
    const rank = text(ancestor.rank).toLowerCase();
    const name = text(ancestor.name);
    if (rank === 'kingdom') values.kingdom = name;
    else if (rank === 'phylum') values.phylum = name;
    else if (rank === 'class') values.className = name;
    else if (rank === 'order') values.order = name;
    else if (rank === 'family') values.family = name;
    else if (rank === 'genus') values.genus = name;
    else if (rank === 'species') values.species = name;
  });
  return classification(values);
}

function normalizeINaturalist(source: unknown, visionScore: number | null = null): SpeciesReferenceSuggestion | null {
  const item = record(source);
  const id = text(item.id);
  if (!id) return null;
  const photo = record(item.default_photo);
  const photoUrl = text(photo.medium_url || photo.square_url || photo.url);
  const conservation = record(item.conservation_status);
  return {
    id: `inat-${visionScore === null ? '' : 'vision-'}${id}`,
    source: 'inaturalist',
    sourceLabel: visionScore === null ? 'iNaturalist' : 'iNaturalist CV',
    sourceUrl: `https://www.inaturalist.org/taxa/${id}`,
    wikipediaUrl: text(item.wikipedia_url),
    scientificName: text(item.name),
    canonicalName: text(item.name),
    commonName: text(item.preferred_common_name || item.english_common_name),
    rank: text(item.rank),
    status: item.is_active === false ? 'INACTIVE' : 'ACTIVE',
    matchType: visionScore === null ? text(item.matched_term ? `MATCHED: ${item.matched_term}` : 'AUTOCOMPLETE') : 'IMAGE',
    confidence: visionScore,
    observationsCount: finite(item.observations_count),
    photoUrl,
    photoAttribution: text(photo.attribution),
    conservationStatus: text(conservation.status_name || conservation.status),
    classification: iNaturalistClassification(item),
    descriptions: text(item.wikipedia_summary)
      ? [{ source: 'iNaturalist / Wikipedia', description: text(item.wikipedia_summary).slice(0, 520) }]
      : [],
    vernacularNames: [...new Set([text(item.preferred_common_name), text(item.english_common_name)].filter(Boolean))],
    images: photoUrl ? [{
      url: photoUrl,
      creator: text(photo.attribution),
      license: text(photo.license_code),
      source: 'iNaturalist'
    }] : [],
    summary: [text(item.rank), finite(item.observations_count) !== null ? `observations=${item.observations_count}` : '']
      .filter(Boolean).join(' / ')
  };
}

function dedupeSuggestions(items: SpeciesReferenceSuggestion[]): SpeciesReferenceSuggestion[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const name = text(item.scientificName || item.canonicalName).toLowerCase();
    const key = `${item.source}:${name}`;
    if (!name || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 12);
}

async function queryGbif(scientificName: string, commonName: string): Promise<{ urls: string[]; suggestions: SpeciesReferenceSuggestion[] }> {
  const requests: Array<{ url: string; match: boolean }> = [];
  if (scientificName) {
    requests.push({
      match: true,
      url: buildUrl(GBIF_BASE_URL, '/v1/species/match', { name: scientificName, kingdom: 'Plantae', verbose: true })
    });
  }
  [...new Set([scientificName, commonName].filter(Boolean))].forEach(query => {
    requests.push({
      match: false,
      url: buildUrl(GBIF_BASE_URL, '/v1/species/search', { q: query, highertaxon_key: 6, limit: 5 })
    });
  });
  const responses = await Promise.all(requests.map(async request => ({
    ...request,
    data: await fetchJson(request.url)
  })));
  const suggestions: SpeciesReferenceSuggestion[] = [];
  responses.forEach(response => {
    if (response.match) {
      const item = normalizeGbif(response.data, true);
      if (item) suggestions.push(item);
      return;
    }
    (Array.isArray(response.data.results) ? response.data.results : []).forEach(item => {
      const normalized = normalizeGbif(item);
      if (normalized) suggestions.push(normalized);
    });
  });
  return { urls: requests.map(item => item.url), suggestions: dedupeSuggestions(suggestions) };
}

async function enrichINaturalist(source: unknown, locale: string): Promise<UnknownRecord> {
  const item = record(source);
  if (Array.isArray(item.ancestors) && item.ancestors.length) return item;
  const id = text(item.id);
  if (!id) return item;
  try {
    const details = await fetchJson(buildUrl(INAT_BASE_URL, `/v1/taxa/${id}`, { locale }), {}, 6500);
    const detail = Array.isArray(details.results) ? record(details.results[0]) : {};
    return Object.keys(detail).length ? { ...item, ...detail } : item;
  } catch {
    return item;
  }
}

async function queryINaturalist(scientificName: string, commonName: string, locale: string): Promise<{ urls: string[]; suggestions: SpeciesReferenceSuggestion[] }> {
  const urls = [...new Set([scientificName, commonName].filter(Boolean))].map(query => (
    buildUrl(INAT_BASE_URL, '/v1/taxa/autocomplete', {
      q: query,
      taxon_id: 47126,
      per_page: 5,
      locale: locale || 'zh-CN'
    })
  ));
  const responses = await Promise.all(urls.map(url => fetchJson(url)));
  const raw = responses.flatMap(response => Array.isArray(response.results) ? response.results : []).slice(0, 6);
  const enriched = await Promise.all(raw.map(item => enrichINaturalist(item, locale)));
  return {
    urls,
    suggestions: dedupeSuggestions(enriched.map(item => normalizeINaturalist(item)).filter(Boolean) as SpeciesReferenceSuggestion[])
  };
}

async function queryProviders(
  scientificName: string,
  commonName: string,
  locale: string,
  providers = ['gbif', 'inaturalist']
): Promise<SpeciesReferenceResult> {
  const tasks = providers.map(provider => ({
    provider,
    promise: provider === 'gbif'
      ? queryGbif(scientificName, commonName)
      : queryINaturalist(scientificName, commonName, locale)
  }));
  const settled = await Promise.allSettled(tasks.map(item => item.promise));
  const sources: NonNullable<SpeciesReferenceResult['sources']> = {};
  const suggestions: SpeciesReferenceSuggestion[] = [];
  settled.forEach((result, index) => {
    const provider = tasks[index].provider;
    if (result.status === 'fulfilled') {
      suggestions.push(...result.value.suggestions);
      sources[provider] = { ok: true, count: result.value.suggestions.length, queriedUrls: result.value.urls };
    } else {
      sources[provider] = { ok: false, error: result.reason instanceof Error ? result.reason.message : '查询失败' };
    }
  });
  if (!suggestions.length && Object.values(sources).every(source => !source.ok)) {
    throw new Error('GBIF 与 iNaturalist 参考查询均失败。');
  }
  return {
    schema: 'cqnu-plant-species-reference-v1',
    queriedAt: new Date().toISOString(),
    input: { scientificName, commonName, locale },
    sources,
    suggestions: dedupeSuggestions(suggestions)
  };
}

export async function queryWebSpeciesReference(input: SpeciesReferenceQueryInput): Promise<SpeciesReferenceResult> {
  const scientificName = text(input.scientificName);
  const commonName = text(input.commonName);
  if (!scientificName && !commonName) throw new Error('请先填写中文名或学名后再查询参考建议。');
  return queryProviders(scientificName, commonName, text(input.locale) || 'zh-CN');
}

function taxonomyCandidates(
  suggestions: SpeciesReferenceSuggestion[],
  queryName: string
): Array<TaxonomyReferenceCandidate & { exactMatch: boolean }> {
  const seen = new Set<string>();
  const input = queryName.toLowerCase();
  return suggestions.map(suggestion => {
    const provider = suggestion.source === 'gbif' ? 'GBIF' : 'iNaturalist';
    const family = text(suggestion.classification?.family);
    const genus = text(suggestion.classification?.genus);
    const canonicalName = text(suggestion.canonicalName || suggestion.scientificName);
    const exactMatch = [suggestion.scientificName, canonicalName]
      .map(value => text(value).toLowerCase()).includes(input);
    let occurrenceWeight = 1;
    if (exactMatch) occurrenceWeight += 1;
    if (text(suggestion.rank).toLowerCase() === 'species') occurrenceWeight += 0.5;
    const score = finite(suggestion.confidence);
    if (score !== null && (score >= 80 || (score <= 1 && score >= 0.8))) occurrenceWeight += 0.5;
    return {
      provider,
      matchedName: text(suggestion.scientificName || canonicalName || suggestion.commonName),
      scientificName: text(suggestion.scientificName),
      canonicalName,
      family,
      genus,
      rank: text(suggestion.rank),
      score,
      matchType: text(suggestion.matchType),
      rawNameUsed: queryName,
      occurrenceWeight,
      exactMatch
    };
  }).filter(candidate => {
    if (!candidate.family && !candidate.genus) return false;
    const key = `${candidate.provider}:${candidate.canonicalName.toLowerCase()}:${candidate.family}:${candidate.genus}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function vote(candidates: Array<TaxonomyReferenceCandidate & { exactMatch: boolean }>, field: 'family' | 'genus') {
  const groups = new Map<string, { value: string; weight: number; exact: number; species: number; providers: Set<string> }>();
  candidates.forEach(candidate => {
    const value = text(candidate[field]);
    if (!value) return;
    const key = value.toLowerCase();
    const group = groups.get(key) || { value, weight: 0, exact: 0, species: 0, providers: new Set<string>() };
    group.weight += candidate.occurrenceWeight;
    group.exact += candidate.exactMatch ? 1 : 0;
    group.species += candidate.rank.toLowerCase() === 'species' ? 1 : 0;
    group.providers.add(candidate.provider);
    groups.set(key, group);
  });
  const ranked = [...groups.values()].sort((left, right) => (
    right.weight - left.weight || right.exact - left.exact || right.species - left.species
    || right.providers.size - left.providers.size || left.value.localeCompare(right.value)
  ));
  if (!ranked.length) return { value: '', ratio: 0, conflict: false };
  const [top, second] = ranked;
  const conflict = Boolean(second && top.weight === second.weight && top.exact === second.exact
    && top.species === second.species && top.providers.size === second.providers.size);
  const total = ranked.reduce((sum, group) => sum + group.weight, 0);
  return { value: conflict ? '' : top.value, ratio: conflict || !total ? 0 : top.weight / total, conflict };
}

function summarizeTaxonomy(
  input: TaxonomyReferenceInput,
  queryName: string,
  candidates: Array<TaxonomyReferenceCandidate & { exactMatch: boolean }>,
  warnings: string[]
): TaxonomyReferenceResult {
  const family = vote(candidates, 'family');
  const genus = vote(candidates, 'genus');
  if (family.conflict || genus.conflict) warnings.unshift('存在多个候选，请人工选择或手动填写。');
  const ratios = [family.ratio, genus.ratio].filter(value => value > 0);
  let confidence = ratios.length ? ratios.reduce((sum, value) => sum + value, 0) / ratios.length : null;
  const providersUsed = [...new Set(candidates.map(candidate => candidate.provider))];
  if (confidence !== null && providersUsed.length > 1) confidence = Math.min(1, confidence + 0.08);
  if (confidence !== null && candidates.some(candidate => candidate.exactMatch)) confidence = Math.min(1, confidence + 0.06);
  const rounded = confidence === null ? null : Math.round(confidence * 1000) / 1000;
  return {
    ok: true,
    queryName,
    providersUsed,
    suggestedFamily: family.value,
    suggestedGenus: genus.value,
    matchedName: candidates.find(candidate => candidate.exactMatch)?.matchedName || candidates[0]?.matchedName || '',
    source: providersUsed.join('+') || 'unknown',
    confidence: rounded,
    confidenceLabel: rounded === null ? 'unknown' : rounded >= 0.8 ? 'high' : rounded >= 0.6 ? 'medium' : 'low',
    verificationStatus: candidates.length ? 'suggested' : 'unverified',
    candidates: candidates.slice(0, 5).map(({ exactMatch: _exactMatch, ...candidate }) => candidate),
    warnings: candidates.length ? warnings : ['未找到可靠科属建议，请手动填写或稍后重试。', ...warnings]
  };
}

export function summarizeWebTaxonomySuggestions(
  input: TaxonomyReferenceInput,
  queryName: string,
  suggestions: SpeciesReferenceSuggestion[],
  warnings: string[] = []
): TaxonomyReferenceResult {
  return summarizeTaxonomy(input, queryName, taxonomyCandidates(suggestions, queryName), [...warnings]);
}

export async function suggestWebTaxonomy(input: TaxonomyReferenceInput): Promise<TaxonomyReferenceResult> {
  const scientificName = text(input.scientificName);
  const chineseName = text(input.chineseName || input.commonName);
  if (!scientificName && !chineseName) {
    return summarizeTaxonomy(input, '', [], ['请先填写中文名或学名后再查询科属建议。']);
  }
  const providers = (input.providers?.length ? input.providers : ['GBIF', 'iNaturalist'])
    .map(provider => provider === 'GBIF' ? 'gbif' : 'inaturalist');
  const attempts = [scientificName, chineseName].filter((name, index, names) => name && names.indexOf(name) === index);
  const failures: string[] = [];
  for (const queryName of attempts) {
    try {
      const result = await queryProviders(scientificName === queryName ? queryName : '', scientificName === queryName ? '' : queryName, text(input.locale) || 'zh-CN', providers);
      const candidates = taxonomyCandidates(result.suggestions || [], queryName);
      if (candidates.length) {
        const warnings = scientificName && queryName !== scientificName
          ? ['学名未返回可靠科属建议，已回退使用中文名查询。']
          : [];
        return summarizeTaxonomy(input, queryName, candidates, warnings);
      }
    } catch (error) {
      failures.push(error instanceof Error ? error.message : '查询失败');
    }
  }
  return summarizeTaxonomy(input, attempts[0] || '', [], failures.length
    ? ['物种参考服务暂不可用，可手动填写科属。', ...failures]
    : []);
}

async function chooseCompareImage(): Promise<File | null> {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp,image/gif,image/bmp';
    input.hidden = true;
    const finish = () => {
      const file = input.files?.[0] || null;
      input.remove();
      resolve(file);
    };
    input.addEventListener('change', finish, { once: true });
    input.addEventListener('cancel', finish, { once: true });
    document.body.appendChild(input);
    input.click();
  });
}

export async function compareWebSpeciesImage(input: SpeciesReferenceImageCompareInput): Promise<SpeciesReferenceResult> {
  const file = await chooseCompareImage();
  if (!file) return { canceled: true };
  if (file.size > MAX_IMAGE_BYTES) throw new Error('图片超过 8MB，无法用于轻量图像比对。');
  const form = new FormData();
  form.append('locale', text(input.locale) || 'zh-CN');
  form.append('image', file, file.name);
  const token = text(input.token);
  const response = await fetchJson(
    buildUrl(INAT_BASE_URL, '/v1/computervision/score_image', { locale: text(input.locale) || 'zh-CN' }),
    {
      method: 'POST',
      body: form,
      headers: token ? { authorization: /^Bearer\s+/i.test(token) ? token : `Bearer ${token}` } : {}
    },
    30_000
  );
  const results = [response.results, response.suggestions, response.predictions].find(Array.isArray) || [];
  const suggestions = (results as unknown[]).map(result => {
    const source = record(result);
    const scoreValue = finite(source.combined_score ?? source.vision_score ?? source.score ?? source.probability);
    const score = scoreValue === null ? null : scoreValue <= 1 ? Math.round(scoreValue * 1000) / 10 : scoreValue;
    return normalizeINaturalist(source.taxon || source, score);
  }).filter(Boolean).sort((left, right) => Number(right?.confidence || 0) - Number(left?.confidence || 0)).slice(0, 8) as SpeciesReferenceSuggestion[];
  return {
    canceled: false,
    schema: 'cqnu-plant-species-image-compare-v1',
    queriedAt: new Date().toISOString(),
    selectedImageName: file.name,
    selectedImageFileUrl: URL.createObjectURL(file),
    uploadedBytes: file.size,
    sources: { inaturalistVision: { ok: true, count: suggestions.length } },
    suggestions
  };
}
