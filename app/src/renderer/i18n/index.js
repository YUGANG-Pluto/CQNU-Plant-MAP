const i18n = {
  zh: I18N_ZH,
  en: I18N_EN
};

function t(key) {
  const lang = state.settings?.language || 'zh';
  return i18n[lang]?.[key] ?? key;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}
