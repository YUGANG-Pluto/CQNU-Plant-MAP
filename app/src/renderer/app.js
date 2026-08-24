function createInitialSettings() {
  return ensureSettingsShape({
    language: 'zh',
    mapCenter: MAP_DEFAULT_CENTER,
    mapZoom: MAP_DEFAULT_ZOOM,
    activeBaseMapId: 'osm-street',
    baseMaps: [],
    recycleBin: [],
    uiTheme: { ...THEME_DEFAULTS },
    statsCustom: {
      category: 'zone',
      chartType: 'combo',
      barMetric: 'speciesCount',
      lineMetric: 'pointCount'
    }
  });
}

function bootApp() {
  if (typeof installGlobalErrorHandlers === 'function') installGlobalErrorHandlers();
  initMap();
  refreshSuggestionLists();
  state.settings = createInitialSettings();
  applyThemeVariables();
  if (typeof syncMaintenanceSafeModeUi === 'function') syncMaintenanceSafeModeUi();
  bindEvents();
  applyI18n();
  if (typeof syncMaintenanceSafeModeUi === 'function') syncMaintenanceSafeModeUi();
  applyActiveBaseMap();
  showPendingControls(false);
  renderLists();
  renderStatsModal();
  if (typeof renderWorkspaceStatsSummary === 'function') renderWorkspaceStatsSummary();
  renderTrashList();
  populateQueryFilters();
  renderQueryResults();
  refreshRightPanelDisplayMode('boot');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootApp, { once: true });
} else {
  bootApp();
}
