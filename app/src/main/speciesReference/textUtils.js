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

module.exports = {
  cleanText,
  cleanParagraph,
  uniqueStrings,
  toFeatureLines,
  buildUrl
};
