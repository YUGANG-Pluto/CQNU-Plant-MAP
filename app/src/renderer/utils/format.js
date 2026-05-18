function formatDateTimeLabel(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('zh-CN', { hour12: false });
}

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(dateStr, days) {
  const timestamp = Date.parse(dateStr);
  if (!Number.isFinite(timestamp)) return false;
  return Date.now() - timestamp <= days * 24 * 60 * 60 * 1000;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    formatDateTimeLabel,
    isoToday,
    daysBetween
  };
}
