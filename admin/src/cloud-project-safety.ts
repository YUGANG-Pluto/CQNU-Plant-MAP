const SECRET_FIELD_PATTERN = /(?:password|passphrase|secret|authorization|token|api[_-]?key|private[_-]?key)$/iu;
const LOCAL_PATH_PATTERN = /^(?:[a-z]:[\\/]|\\\\|file:\/{2}|\/(?:Users|home|tmp|var|mnt|Volumes)(?:\/|$))/iu;
const URL_SECRET_PATTERN = /[?&](?:key|token|api[_-]?key|access[_-]?token|secret)=([^&#]*)/giu;

function hasInlineUrlSecret(value: string): boolean {
  for (const match of value.matchAll(URL_SECRET_PATTERN)) {
    const rawValue = match[1] || '';
    let decodedValue = rawValue;
    try { decodedValue = decodeURIComponent(rawValue); } catch { /* Preserve the raw value for validation. */ }
    if (decodedValue && !/^\{[^{}]+\}$/u.test(decodedValue)) return true;
  }
  return false;
}

export function assertCloudProjectSnapshotSafe(snapshot: unknown): void {
  const pending: Array<{ value: unknown; field: string; inBaseMaps: boolean }> = [
    { value: snapshot, field: '', inBaseMaps: false }
  ];
  let visited = 0;
  while (pending.length) {
    if (++visited > 250_000) throw new Error('CLOUD_PROJECT_INVALID');
    const { value, field, inBaseMaps } = pending.pop()!;
    const baseMapKey = field.toLowerCase() === 'key' && inBaseMaps;
    if ((baseMapKey || SECRET_FIELD_PATTERN.test(field))
      && value !== '' && value !== null && value !== undefined) {
      throw new Error('CLOUD_PROJECT_SENSITIVE_DATA');
    }
    if (typeof value === 'string') {
      if (LOCAL_PATH_PATTERN.test(value.trim()) || hasInlineUrlSecret(value)) {
        throw new Error('CLOUD_PROJECT_SENSITIVE_DATA');
      }
      continue;
    }
    if (Array.isArray(value)) {
      value.forEach(item => pending.push({ value: item, field: '', inBaseMaps }));
      continue;
    }
    if (value && typeof value === 'object') {
      Object.entries(value).forEach(([key, item]) => pending.push({
        value: item,
        field: key,
        inBaseMaps: inBaseMaps || key.toLowerCase() === 'basemaps'
      }));
    }
  }
}
