const CLOUD_SECRET_FIELD_PATTERN = /(?:password|passphrase|secret|authorization|token|api[_-]?key|private[_-]?key)$/iu;
const CLOUD_LOCAL_PATH_PATTERN = /^(?:[a-z]:[\\/]|\\\\|\/(?:Users|home|tmp|var|mnt|Volumes)(?:\/|$))/iu;
const CLOUD_URL_SECRET_PATTERN = /([?&])(key|token|api[_-]?key|access[_-]?token|secret)=([^&#]*)/giu;

function sanitizeCloudProjectString(value) {
  const normalizedValue = value.trim();
  if (normalizedValue.toLowerCase().startsWith('file://') || CLOUD_LOCAL_PATH_PATTERN.test(normalizedValue)) return '';
  return value.replace(CLOUD_URL_SECRET_PATTERN, (match, separator, name, rawValue) => {
    const decodedValue = (() => {
      try { return decodeURIComponent(rawValue); } catch { return rawValue; }
    })();
    return /^\{[^{}]+\}$/u.test(decodedValue)
      ? match
      : `${separator}${name}={${name}}`;
  });
}

function sanitizeCloudProjectValue(value, path = []) {
  const field = String(path.at(-1) || '');
  const baseMapKey = field.toLowerCase() === 'key'
    && path.some(item => String(item).toLowerCase() === 'basemaps');
  if ((baseMapKey || CLOUD_SECRET_FIELD_PATTERN.test(field)) && value !== '' && value !== null) return '';
  if (typeof value === 'string') return sanitizeCloudProjectString(value);
  if (Array.isArray(value)) {
    return value.map((item, index) => sanitizeCloudProjectValue(item, [...path, String(index)]));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
      key,
      sanitizeCloudProjectValue(item, [...path, key])
    ]));
  }
  return value;
}

function buildCloudProjectSnapshot(project) {
  return sanitizeCloudProjectValue({
    formatVersion: 1,
    settings: project.settings || {},
    zones: Array.isArray(project.zones) ? project.zones : [],
    points: Array.isArray(project.points) ? project.points : []
  });
}
