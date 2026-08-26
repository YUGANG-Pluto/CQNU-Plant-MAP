const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function createDesktopSqliteFixtureBytes() {
  const Database = require('better-sqlite3');
  const sqliteExchangeModel = require('../src/main/sqliteExchangeModel');
  const sqliteConversionService = require('../src/main/sqliteConversionService');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cqnu-web-sqlite-smoke-'));
  const databasePath = path.join(root, 'data.db');
  let database;
  try {
    database = new Database(databasePath);
    const model = sqliteExchangeModel.buildSqliteModelFromJsonProject({
      settings: { projectName: 'External SQLite smoke', language: 'zh', unknownSetting: true },
      zones: [{ id: 'zone-sqlite', zoneId: 'SQL', name: 'SQLite 测试分区', unknownZone: 1 }],
      points: [{
        id: 'point-sqlite',
        pointId: 'SQL001',
        zoneRef: 'zone-sqlite',
        plantNameSci: 'Osmanthus fragrans',
        family: 'Oleaceae',
        genus: 'Osmanthus',
        unknownPoint: { retained: true },
        phenologyEntries: [{ id: 'ph-sqlite', floweringState: '开花', unknownPhenology: 1 }],
        taxonomyCandidatesSummary: [{
          provider: 'GBIF', family: 'Oleaceae', genus: 'Osmanthus', selected: true, unknownCandidate: 1
        }]
      }]
    });
    sqliteConversionService.writeModelToDatabase(database, model);
    database.close();
    database = null;
    return fs.readFileSync(databasePath);
  } finally {
    database?.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
}

async function runExternalSqliteImportSmoke(window, bytes) {
  const encoded = bytes.toString('base64');
  return window.webContents.executeJavaScript(`(async () => {
    const binary = atob(${JSON.stringify(encoded)});
    const sourceBytes = Uint8Array.from(binary, character => character.charCodeAt(0));
    const sourceFile = new File([sourceBytes], 'data.db', {
      type: 'application/vnd.sqlite3',
      lastModified: 1770000000000
    });
    const digest = async file => [...new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer()))]
      .map(value => value.toString(16).padStart(2, '0'))
      .join('');
    const beforeHash = await digest(sourceFile);
    let writeAttempted = false;
    const information = {
      name: 'information',
      async getFileHandle(name, options) {
        if (options?.create) writeAttempted = true;
        if (name === 'data.db') return { getFile: async () => sourceFile };
        throw new DOMException('Not found', 'NotFoundError');
      },
      async getDirectoryHandle(name, options) {
        if (options?.create) writeAttempted = true;
        throw new DOMException('Not found', 'NotFoundError');
      }
    };
    const handle = {
      name: 'SQLite source directory',
      async isSameEntry(other) { return other === this; },
      async queryPermission() { return 'granted'; },
      async requestPermission() { return 'granted'; },
      async getDirectoryHandle(name, options) {
        if (options?.create) writeAttempted = true;
        if (name === 'information') return information;
        throw new DOMException('Not found', 'NotFoundError');
      },
      async getFileHandle(name, options) {
        if (options?.create) writeAttempted = true;
        throw new DOMException('Not found', 'NotFoundError');
      }
    };
    let filePickerCalled = false;
    let filePickerMultiple = null;
    Object.defineProperty(window, 'showOpenFilePicker', {
      configurable: true,
      value: options => {
        filePickerCalled = true;
        filePickerMultiple = options?.multiple;
        return Promise.resolve([{ getFile: async () => sourceFile }]);
      }
    });
    const chosen = await window.platformAdapter.project.chooseSqliteFile();
    if (!chosen.ok) return { ok: false, error: chosen.error };
    const loaded = await window.platformAdapter.project.load({
      projectDir: chosen.data.projectDir,
      storageFormat: 'sqlite'
    });
    if (!loaded.ok) return { ok: false, error: loaded.error };
    const saved = await window.platformAdapter.project.save({
      projectDir: chosen.data.projectDir,
      settings: { ...loaded.data.settings, smokeEdited: true },
      zones: loaded.data.zones,
      points: loaded.data.points
    });
    const afterHash = await digest(sourceFile);
    return {
      ok: true,
      externalSqliteImported: loaded.data.webExternalSqliteImported,
      sourceUnchangedFlag: loaded.data.webExternalSqliteSourceUnchanged,
      sourceHashUnchanged: beforeHash === afterHash,
      writeAttempted,
      filePickerCalled,
      filePickerMultiple,
      jsonFilesExist: saved.ok ? saved.data.jsonFilesExist : true,
      saved: saved.ok,
      zoneCount: loaded.data.zones.length,
      pointCount: loaded.data.points.length,
      unknownZone: loaded.data.zones[0]?.unknownZone,
      unknownPoint: loaded.data.points[0]?.unknownPoint?.retained,
      phenology: loaded.data.points[0]?.phenologyEntries?.[0]?.floweringState,
      taxonomyProvider: loaded.data.points[0]?.taxonomyCandidatesSummary?.[0]?.provider
    };
  })()`, true);
}

async function runStatsFullscreenLayerSmoke(window) {
  return window.webContents.executeJavaScript(`(async () => {
    const wait = duration => new Promise(resolve => window.setTimeout(resolve, duration));
    const layerCloseWait = () => {
      const raw = getComputedStyle(document.documentElement).getPropertyValue('--motion-duration').trim();
      const match = raw.match(/^([\\d.]+)\\s*(ms|s)?$/i);
      const duration = match
        ? Number(match[1]) * (String(match[2] || '').toLowerCase() === 's' ? 1000 : 1)
        : 580;
      return Math.min(2200, Math.max(850, duration + 420));
    };
    const statsButton = document.getElementById('btnOpenStats');
    if (!statsButton) return { ok: false, error: 'Statistics entry is missing' };
    statsButton.click();
    await wait(700);

    const statsModal = document.getElementById('statsModal');
    const fullscreenButton = statsModal?.querySelector('[data-stats-fullscreen]');
    if (!statsModal || !fullscreenButton) {
      return { ok: false, error: 'Statistics modal or fullscreen action is missing' };
    }
    fullscreenButton.click();
    await wait(360);

    const layer = document.getElementById('statsFullscreenLayer');
    const closeButton = layer?.querySelector('#btnCloseStatsFullscreen');
    const closeRect = closeButton?.getBoundingClientRect();
    const hit = closeRect
      ? document.elementFromPoint(closeRect.left + closeRect.width / 2, closeRect.top + closeRect.height / 2)
      : null;
    const layerZ = Number.parseInt(getComputedStyle(layer).zIndex, 10);
    const statsModalZ = Number.parseInt(getComputedStyle(statsModal).zIndex, 10);
    const result = {
      ok: true,
      mountedToBody: layer?.parentElement === document.body,
      visible: Boolean(layer && !layer.classList.contains('hidden') && !layer.classList.contains('is-closing')),
      layerZ: Number.isFinite(layerZ) ? layerZ : 0,
      statsModalZ: Number.isFinite(statsModalZ) ? statsModalZ : 0,
      closeHitVisible: Boolean(closeButton && (hit === closeButton || closeButton.contains(hit))),
      bodyLocked: document.body.classList.contains('has-open-layer-modal')
    };

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await wait(layerCloseWait());
    result.closedByEscape = Boolean(layer?.classList.contains('hidden'));
    result.closeStateAfterEscape = {
      className: layer?.className || '',
      closeTimer: layer?.dataset.closeTimer || '',
      layerOrder: layer?.dataset.layerOrder || '',
      topLayerId: window.cqnuLayerManager?.getTopLayer()?.id || '',
      managerVersion: window.cqnuLayerManager?.version || ''
    };
    result.statsModalStillVisible = !statsModal.classList.contains('hidden');
    statsModal.querySelector('#btnCloseStatsModal')?.click();
    await wait(layerCloseWait());
    result.statsModalClosed = statsModal.classList.contains('hidden');
    result.statsModalCloseState = {
      className: statsModal.className,
      closeTimer: statsModal.dataset.closeTimer || '',
      layerOrder: statsModal.dataset.layerOrder || ''
    };
    return result;
  })()`, true);
}

module.exports = {
  createDesktopSqliteFixtureBytes,
  runExternalSqliteImportSmoke,
  runStatsFullscreenLayerSmoke
};
