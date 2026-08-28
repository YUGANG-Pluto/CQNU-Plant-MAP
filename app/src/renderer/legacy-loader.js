(() => {
  const sources = [
    './src/renderer/state/store.js',
    './src/renderer/dom/elements.js',
    './src/renderer/utils/ipc.js',
    './src/renderer/i18n/zh/core.js',
    './src/renderer/i18n/zh/project.js',
    './src/renderer/i18n/zh/appearance.js',
    './src/renderer/i18n/zh/map.js',
    './src/renderer/i18n/zh/species.js',
    './src/renderer/i18n/zh/stats.js',
    './src/renderer/i18n/zh/maintenance.js',
    './src/renderer/i18n/zh.js',
    './src/renderer/i18n/en/core.js',
    './src/renderer/i18n/en/project.js',
    './src/renderer/i18n/en/appearance.js',
    './src/renderer/i18n/en/map.js',
    './src/renderer/i18n/en/species.js',
    './src/renderer/i18n/en/stats.js',
    './src/renderer/i18n/en/maintenance.js',
    './src/renderer/i18n/en.js',
    './src/renderer/i18n/index.js',
    './src/renderer/utils/format.js',
    './src/renderer/utils/dialogs.js',
    './src/renderer/utils/errorHandler.js',
    './src/renderer/utils/dom.js',
    './src/renderer/data/normalize.js',
    './src/renderer/map/coordTransform.js',
    './src/renderer/map/map.js',
    './src/renderer/shell/objectWorkflow.js',
    './src/renderer/map/zones.js',
    './src/renderer/map/points.js',
    './src/renderer/features/phenology/draftState.js',
    './src/renderer/features/phenology/taxonomy.js',
    './src/renderer/features/phenology/form.js',
    './src/renderer/features/phenology/actions.js',
    './src/renderer/features/phenology/index.js',
    './src/renderer/features/review/index.js',
    './src/renderer/features/speciesReference/state.js',
    './src/renderer/features/speciesReference/links.js',
    './src/renderer/features/speciesReference/view.js',
    './src/renderer/features/speciesReference/queries.js',
    './src/renderer/features/speciesReference/actions.js',
    './src/renderer/features/speciesReference/index.js',
    './src/renderer/features/images/index.js',
    './src/renderer/features/basemap/model.js',
    './src/renderer/features/basemap/layers.js',
    './src/renderer/features/basemap/overlays.js',
    './src/renderer/features/basemap/index.js',
    './src/renderer/features/query/index.js',
    './src/renderer/features/stats/statsResearch/shared.js',
    './src/renderer/features/stats/statsResearch/diversity.js',
    './src/renderer/features/stats/statsResearch/similarity.js',
    './src/renderer/features/stats/statsResearch/quality.js',
    './src/renderer/features/stats/statsResearch/builders.js',
    './src/renderer/features/stats/statsResearch/exporters.js',
    './src/renderer/features/stats/statsResearch.js',
    './src/renderer/features/stats/charts.js',
    './src/renderer/features/stats/config.js',
    './src/renderer/features/stats/view.js',
    './src/renderer/features/stats/export.js',
    './src/renderer/features/stats/index.js',
    './src/renderer/features/recycleBin/index.js',
    './src/renderer/features/backup/index.js',
    './src/renderer/features/progress/index.js',
    './src/renderer/features/merge/index.js',
    './src/renderer/features/project/cloudSnapshot.js',
    './src/renderer/features/project/index.js',
    './src/renderer/shell/projectHistory.js',
    './src/renderer/features/maintenance/core.js',
    './src/renderer/features/maintenance/safeMode.js',
    './src/renderer/features/maintenance/diagnostics.js',
    './src/renderer/features/maintenance/repair.js',
    './src/renderer/features/maintenance/logs.js',
    './src/renderer/features/maintenance/settings.js',
    './src/renderer/features/maintenance/diagnosticsExport.js',
    './src/renderer/features/maintenance/storageView.js',
    './src/renderer/features/maintenance/storageWorkflow.js',
    './src/renderer/features/maintenance/storageActions.js',
    './src/renderer/features/maintenance/index.js',
    './src/renderer/shell/workspaceDrawer.js',
    './src/renderer/shell/rightPanel.js',
    './src/renderer/shell/commandRegistry.js',
    './src/renderer/shell/commandPalette.js',
    './src/renderer/shell/eventBindings.js',
    './src/renderer/app.js'
  ];

  globalThis.CQNU_LEGACY_RUNTIME_SOURCES = Object.freeze([...sources]);
  if (globalThis.CQNU_LEGACY_RUNTIME_MANIFEST_ONLY === true) return;

  document.documentElement.dataset.runtimeStatus = 'loading';

  function loadScript(source) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = source;
      script.async = false;
      script.addEventListener('load', resolve, { once: true });
      script.addEventListener('error', () => reject(new Error(`Unable to load ${source}`)), { once: true });
      document.body.appendChild(script);
    });
  }

  async function loadLegacyRuntime() {
    for (const source of sources) {
      await loadScript(source);
    }
    document.documentElement.dataset.runtimeStatus = 'ready';
  }

  void loadLegacyRuntime().catch(error => {
    document.documentElement.dataset.runtimeStatus = 'failed';
    console.error('[renderer:load]', error);
  });
})();
