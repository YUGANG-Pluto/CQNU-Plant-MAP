async function persistProject() {
  if (!state.projectDir || !state.settings) return;
  if (typeof prepareProjectEditHistoryForSave === 'function') prepareProjectEditHistoryForSave();
  if (typeof notifyProjectSaveStarted === 'function') notifyProjectSaveStarted();
  try {
    const center = displayLatLngToStorageLatLng(state.map.getCenter());
    state.settings.mapCenter = [center.lat, center.lng];
    state.settings.mapCenterCoordSystem = 'WGS84';
    state.settings.mapZoom = state.map.getZoom();

    const payload = {
      projectDir: state.projectDir,
      storageFormat: state.storageFormat || 'json',
      settings: state.settings,
      zones: state.zones,
      points: state.points
    };
    const data = window.projectWorkflow?.save
      ? await window.projectWorkflow.save(payload)
      : await callIpc(window.platformAdapter.project.save(payload));

    state.projectModifiedTime = data.projectModifiedTime || Date.now();
    state.storageFormat = data.storageFormat || state.storageFormat || 'json';
    state.jsonFilesExist = Boolean(data.jsonFilesExist);
    state.sqliteDatabaseExists = Boolean(data.sqliteDatabaseExists);
    window.projectSessionStore?.setSavedProject({
      ...data,
      projectModifiedTime: state.projectModifiedTime,
      storageFormat: state.storageFormat,
      jsonFilesExist: state.jsonFilesExist,
      sqliteDatabaseExists: state.sqliteDatabaseExists
    });
    if (typeof notifyProjectSaveSucceeded === 'function') notifyProjectSaveSucceeded(state.projectModifiedTime);
  } catch (error) {
    if (typeof notifyProjectSaveFailed === 'function') notifyProjectSaveFailed();
    throw error;
  }
}

async function loadProjectIntoRenderer(projectDir, options = {}) {
  const payload = {
    projectDir,
    storageFormat: options.storageFormat || 'auto'
  };
  const data = window.projectWorkflow?.load
    ? await window.projectWorkflow.load(payload)
    : await callIpc(window.platformAdapter.project.load(payload));

  return applyLoadedProjectToRenderer(data);
}

async function applyLoadedProjectToRenderer(data) {
  state.projectDir = data.projectDir;
  state.projectModifiedTime = data.projectModifiedTime || Date.now();
  state.storageFormat = data.storageFormat || 'json';
  state.jsonFilesExist = Boolean(data.jsonFilesExist);
  state.sqliteDatabaseExists = Boolean(data.sqliteDatabaseExists);
  state.settings = ensureSettingsShape(data.settings);
  state.zones = (data.zones || []).map(normalizeZoneRecord);
  state.points = (data.points || []).map(point => normalizePointRecord({
    observer: '',
    surveyDate: '',
    habitat: '',
    abundance: '',
    growthForm: '',
    floweringState: '',
    cultivatedStatus: '',
    ...point
  }));
  if (typeof resetProjectEditHistory === 'function') {
    resetProjectEditHistory({ lastSavedAt: state.projectModifiedTime });
  }

  ui.projectPath.textContent = data.projectDir;
  clearAllLayers();

  if (state.settings.mapCenter) {
    const [lat, lng] = state.settings.mapCenter;
    const displayCenter = storageLngLatToDisplayLatLng(lng, lat);
    state.map.setView(displayCenter, state.settings.mapZoom || MAP_DEFAULT_ZOOM);
  }

  applyThemeVariables();
  if (typeof syncMaintenanceSafeModeUi === 'function') syncMaintenanceSafeModeUi();
  applyI18n();
  if (typeof syncMaintenanceSafeModeUi === 'function') syncMaintenanceSafeModeUi();
  applyActiveBaseMap();

  selectZone(null);
  renderAllDerived();
  if (window.projectSessionStore?.setLoadedProject) {
    window.projectSessionStore.setLoadedProject({
      ...data,
      projectDir: state.projectDir,
      projectModifiedTime: state.projectModifiedTime,
      storageFormat: state.storageFormat,
      settings: state.settings,
      zones: state.zones,
      points: state.points,
      jsonFilesExist: state.jsonFilesExist,
      sqliteDatabaseExists: state.sqliteDatabaseExists
    });
  } else {
    document.documentElement.dataset.projectLoaded = 'true';
    document.documentElement.dataset.projectSourceKind = data.webProjectSourceKind || '';
    document.documentElement.dataset.projectStorageFormat = state.storageFormat;
    document.documentElement.dataset.projectDirectoryPermission = data.webDirectoryPermissionStatus || '';
    document.documentElement.dataset.projectDirectoryReconnect = String(Boolean(data.webDirectoryReconnectRequired));
    document.documentElement.dataset.projectExternalSqlite = String(Boolean(data.webExternalSqliteImported));
    window.dispatchEvent(new CustomEvent('cqnu:project-loaded', {
      detail: {
        projectDir: data.projectDir,
        storageFormat: state.storageFormat,
        webAccessLevel: data.webAccessLevel || '',
        sourceKind: data.webProjectSourceKind || '',
        directoryPermissionStatus: data.webDirectoryPermissionStatus || '',
        directoryReconnectRequired: Boolean(data.webDirectoryReconnectRequired),
        externalSqliteImported: Boolean(data.webExternalSqliteImported),
        jsonFilesExist: state.jsonFilesExist,
        sqliteDatabaseExists: state.sqliteDatabaseExists
      }
    }));
  }

  requestAnimationFrame(() => {
    state.map.invalidateSize();
    fitMapToProjectData();
  });

  await maybeHandleExpiredBackups(data.projectDir);
  toast(t(
    data.webDirectoryReconnectRequired
      ? 'webDirectoryReconnectRequired'
      : data.webExternalSqliteImported
        ? 'webSqliteImportedReadOnlySource'
      : window.platformAdapter?.runtime === 'web'
        ? 'webProjectLoaded'
        : 'projectCreated'
  ));
  return data;
}

if (typeof window !== 'undefined' && window.platformAdapter?.runtime === 'web' && !window.projectRendererBridge) {
  const cloneCloudValue = value => (
    typeof structuredClone === 'function'
      ? structuredClone(value)
      : JSON.parse(JSON.stringify(value))
  );
  Object.defineProperty(window, 'projectRendererBridge', {
    configurable: false,
    enumerable: false,
    writable: false,
    value: Object.freeze({
      version: 'project-renderer-bridge-v1',
      snapshot() {
        if (!state.settings) return null;
        return cloneCloudValue(buildCloudProjectSnapshot({
          settings: state.settings,
          zones: state.zones,
          points: state.points
        }));
      },
      async importCloudProject(document) {
        const command = window.platformAdapter?.project?.importCloudSnapshot;
        if (typeof command !== 'function') throw new Error('当前工作区不支持云项目工作副本。');
        const selected = await callIpc(command({ document }));
        await loadProjectIntoRenderer(selected.projectDir, { storageFormat: 'sqlite' });
      },
      async backupCurrentProject(label = 'cloud_conflict') {
        if (!state.projectDir || !state.settings) throw new Error('当前没有可备份的本地项目。');
        await persistProject();
        const payload = {
          projectDir: state.projectDir,
          backupDir: 'web://downloads',
          label: String(label || 'cloud_conflict')
        };
        const data = window.projectWorkflow?.createBackup
          ? await window.projectWorkflow.createBackup(payload)
          : await callIpc(window.platformAdapter.backup.create(payload));
        return { filePath: String(data.filePath || '') };
      },
      async updateCloudSource(metadata) {
        const command = window.platformAdapter?.project?.updateCloudSource;
        if (typeof command !== 'function') return;
        await callIpc(command({ projectDir: state.projectDir, metadata }));
        window.projectSessionStore?.setCloudSource(
          String(metadata?.id || ''),
          Number(metadata?.revision || 0),
          String(metadata?.contentSha256 || '')
        );
      }
    })
  });
}

function applyI18n() {
  applyThemeVariables();

  document.querySelectorAll('[data-i18n]').forEach(node => {
    const key = node.getAttribute('data-i18n');
    if (node.tagName === 'INPUT' && node.placeholder !== undefined) {
      node.placeholder = t(key);
      return;
    }
    node.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(node => {
    node.placeholder = t(node.getAttribute('data-i18n-placeholder'));
  });
  document.querySelectorAll('[data-i18n-aria-label]').forEach(node => {
    node.setAttribute('aria-label', t(node.getAttribute('data-i18n-aria-label')));
  });
  document.querySelectorAll('[data-i18n-title]').forEach(node => {
    node.title = t(node.getAttribute('data-i18n-title'));
  });

  if (ui.queryText) ui.queryText.placeholder = t('searchPlaceholder');
  document.querySelectorAll('.seg-btn[data-lang]').forEach(button => {
    button.classList.toggle('active', button.dataset.lang === (state.settings?.language || 'zh'));
  });

  renderBaseMapSelect();
  renderBasemapEditTargetSelect();
  renderAllDerived();
  if (typeof syncObjectSelectionUi === 'function') syncObjectSelectionUi('language-change');
  if (typeof refreshCommandPaletteI18n === 'function') refreshCommandPaletteI18n();
  if (typeof setObjectWorkflowFeedback === 'function') {
    setObjectWorkflowFeedback('objectWorkflowHint', 'neutral', { restore: false });
  }
  if (typeof syncMaintenanceSafeModeUi === 'function') syncMaintenanceSafeModeUi();
  if (typeof syncProjectHistoryUi === 'function') syncProjectHistoryUi();
}

function ensureZoneForImport(zoneId, zoneName = '') {
  let zone = state.zones.find(item => item.zoneId === zoneId || item.name === zoneName);
  if (zone) return zone;

  zone = {
    id: makeUid('zone'),
    zoneId: zoneId || `Z${state.zones.length + 1}`,
    name: zoneName || zoneId || t('unnamedZone'),
    description: '',
    geometry: null
  };
  state.zones.push(zone);
  return zone;
}

function createImportedPoint(record) {
  const zone = ensureZoneForImport(record.zoneId, record.zoneName);
  const point = normalizePointRecord({
    id: makeUid('point'),
    pointId: record.pointId || `P${String(state.points.length + 1).padStart(3, '0')}`,
    zoneRef: zone.id,
    plantNameCn: record.plantNameCn || '',
    plantNameSci: record.plantNameSci || '',
    family: record.family || '',
    genus: record.genus || '',
    identificationStatus: record.identificationStatus || 'draft',
    taxonomySource: record.taxonomySource || 'unknown',
    taxonomyMatchedName: record.taxonomyMatchedName || '',
    taxonomyConfidence: record.taxonomyConfidence || null,
    taxonomyConfidenceLabel: record.taxonomyConfidenceLabel || 'unknown',
    taxonomyVerificationStatus: record.taxonomyVerificationStatus || 'unverified',
    taxonomyUpdatedAt: record.taxonomyUpdatedAt || '',
    lat: Number(record.lat),
    lng: Number(record.lng),
    observer: record.observer || '',
    surveyDate: record.surveyDate || '',
    habitat: record.habitat || '',
    abundance: record.abundance || '',
    growthForm: record.growthForm || '',
    floweringState: record.floweringState || '',
    cultivatedStatus: record.cultivatedStatus || '',
    note: record.note || '',
    images: normalizeImages(record.images)
  });

  return point;
}

function parseCsvText(text) {
  const rows = [];
  let current = '';
  let row = [];
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(current);
      current = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(current);
      rows.push(row);
      row = [];
      current = '';
    } else {
      current += char;
    }
  }

  if (current || row.length) {
    row.push(current);
    rows.push(row);
  }

  return rows;
}

// CSV 导入按中文表头映射字段，保持导出文件可回导。
function normalizeCsvImportRows(text) {
  const rows = parseCsvText(text.replace(/^\uFEFF/, ''));
  if (!rows.length) return [];

  const header = rows[0].map(item => item.trim());
  const indexMap = new Map(EXPORT_COLUMNS_ZH.map(([key, label]) => [label, key]));

  return rows.slice(1).filter(row => row.some(Boolean)).map(row => {
    const record = {};
    header.forEach((label, index) => {
      const key = indexMap.get(label) || label;
      record[key] = row[index] || '';
    });
    return record;
  });
}

async function pushImportedRecordsWithProgress(records, task, stageStart = 45, stageEnd = 78) {
  const total = Math.max(1, records.length);
  for (let index = 0; index < records.length; index += 1) {
    state.points.push(createImportedPoint(records[index]));
    if (index % 25 === 0 || index === records.length - 1) {
      task.update({
        completed: index + 1,
        total,
        percent: calculateStageProgress(stageStart, stageEnd, index + 1, total),
        stage: t('progressParsing')
      });
      await yieldToUi();
    }
  }
}

async function buildCsvStringWithProgress(task) {
  const header = EXPORT_COLUMNS_ZH.map(([, label]) => label).join(',');
  const rows = [];
  const total = Math.max(1, state.points.length);
  for (let index = 0; index < state.points.length; index += 1) {
    const point = state.points[index];
    const zone = state.zones.find(item => item.id === point.zoneRef) || {};
    const entry = getSelectedPhenologyEntry(point) || getPhenologyEntries(point)[0] || {};
    const record = {
      zoneId: zone.zoneId || '',
      zoneName: zone.name || '',
      ...point,
      ...entry,
      images: normalizeImages(entry.images).join(';'),
      lng: point.lng,
      lat: point.lat
    };
    rows.push(EXPORT_COLUMNS_ZH.map(([key]) => csvEscape(record[key])).join(','));
    if (index % 25 === 0 || index === state.points.length - 1) {
      task.update({
        completed: index + 1,
        total,
        percent: calculateStageProgress(10, 72, index + 1, total),
        stage: t('progressWriting')
      });
      await yieldToUi();
    }
  }
  return [header, ...rows].join('\n');
}

async function buildGeoJSONStringWithProgress(task) {
  const features = [];
  const total = Math.max(1, state.points.length);
  for (let index = 0; index < state.points.length; index += 1) {
    const point = state.points[index];
    const zone = state.zones.find(item => item.id === point.zoneRef) || {};
    const entry = getSelectedPhenologyEntry(point) || getPhenologyEntries(point)[0] || {};
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [point.lng, point.lat] },
      properties: { zoneId: zone.zoneId || '', zoneName: zone.name || '', ...point, ...entry }
    });
    if (index % 25 === 0 || index === state.points.length - 1) {
      task.update({
        completed: index + 1,
        total,
        percent: calculateStageProgress(10, 72, index + 1, total),
        stage: t('progressWriting')
      });
      await yieldToUi();
    }
  }
  return JSON.stringify({ type: 'FeatureCollection', features }, null, 2);
}

async function importRecordsCSV() {
  if (typeof guardMaintenanceReadOnlyAction === 'function' && guardMaintenanceReadOnlyAction('import-csv')) return;
  if (!state.projectDir) return showAlert(t('noProject'));

  await withProgressTask({ type: 'import', title: t('importCsv'), stage: t('progressReading') }, async task => {
    task.update({ percent: 5, stage: t('progressReading') });
    const result = await callIpc(window.platformAdapter.project.importCsv());
    if (result.canceled) return false;
    task.update({ percent: 30, stage: t('progressParsing') });
    const records = normalizeCsvImportRows(result.content);
    await pushImportedRecordsWithProgress(records, task, 35, 76);
    task.update({ percent: 84, stage: t('progressWriting') });
    await persistProject();
    task.update({ percent: 94, stage: t('progressReloading') });
    await loadProjectIntoRenderer(state.projectDir);
    showAlert(t('importSuccess'));
  });
}

// GeoJSON 点坐标按标准 [lng, lat] 读取，再转入内部 lat/lng 字段。
async function importGeoJSON() {
  if (typeof guardMaintenanceReadOnlyAction === 'function' && guardMaintenanceReadOnlyAction('import-geojson')) return;
  if (!state.projectDir) return showAlert(t('noProject'));

  await withProgressTask({ type: 'import', title: t('importGeoJSON'), stage: t('progressReading') }, async task => {
    task.update({ percent: 5, stage: t('progressReading') });
    const result = await callIpc(window.platformAdapter.project.importGeoJson());
    if (result.canceled) return false;
    task.update({ percent: 30, stage: t('progressParsing') });
    const geo = JSON.parse(result.content);
    const features = Array.isArray(geo.features) ? geo.features : [];
    const pointFeatures = features.filter(feature => feature.geometry?.type === 'Point');
    const total = Math.max(1, pointFeatures.length);

    for (let index = 0; index < pointFeatures.length; index += 1) {
      const feature = pointFeatures[index];
      const [lng, lat] = feature.geometry.coordinates || [];
      state.points.push(createImportedPoint({
        ...(feature.properties || {}),
        lng,
        lat
      }));
      if (index % 25 === 0 || index === pointFeatures.length - 1) {
        task.update({
          completed: index + 1,
          total,
          percent: calculateStageProgress(35, 76, index + 1, total),
          stage: t('progressParsing')
        });
        await yieldToUi();
      }
    }

    task.update({ percent: 84, stage: t('progressWriting') });
    await persistProject();
    task.update({ percent: 94, stage: t('progressReloading') });
    await loadProjectIntoRenderer(state.projectDir);
    showAlert(t('importSuccess'));
  });
}

function csvEscape(value) {
  const text = String(value ?? '');
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function exportCsvString() {
  const header = EXPORT_COLUMNS_ZH.map(([, label]) => label).join(',');
  const rows = state.points.map(point => {
    const zone = state.zones.find(item => item.id === point.zoneRef) || {};
    const entry = getSelectedPhenologyEntry(point) || getPhenologyEntries(point)[0] || {};
    const record = {
      zoneId: zone.zoneId || '',
      zoneName: zone.name || '',
      ...point,
      ...entry,
      images: normalizeImages(entry.images).join(';'),
      lng: point.lng,
      lat: point.lat
    };
    return EXPORT_COLUMNS_ZH.map(([key]) => csvEscape(record[key])).join(',');
  });

  return [header, ...rows].join('\n');
}

// GeoJSON 导出恢复为 [lng, lat]，便于外部 GIS 软件识别。
function exportGeoJSONString() {
  const features = state.points.map(point => {
    const zone = state.zones.find(item => item.id === point.zoneRef) || {};
    const entry = getSelectedPhenologyEntry(point) || getPhenologyEntries(point)[0] || {};
    return {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [point.lng, point.lat] },
      properties: { zoneId: zone.zoneId || '', zoneName: zone.name || '', ...point, ...entry }
    };
  });

  return JSON.stringify({ type: 'FeatureCollection', features }, null, 2);
}

async function exportRecordsCSV() {
  if (typeof guardMaintenanceReadOnlyAction === 'function' && guardMaintenanceReadOnlyAction('export-csv')) return;
  if (!state.projectDir) return showAlert(t('noProject'));

  await withProgressTask({ type: 'export', title: t('exportCsv'), stage: t('progressWriting') }, async task => {
    const content = await buildCsvStringWithProgress(task);
    task.update({ percent: 82, stage: t('progressWriting') });
    const result = await callIpc(window.platformAdapter.project.exportCsv({
      defaultPath: 'plant_records.csv',
      content: `\uFEFF${content}`
    }));

    if (result.canceled) return false;
    showAlert(t('exportSuccess'));
  });
}

async function exportGeoJSON() {
  if (typeof guardMaintenanceReadOnlyAction === 'function' && guardMaintenanceReadOnlyAction('export-geojson')) return;
  if (!state.projectDir) return showAlert(t('noProject'));

  await withProgressTask({ type: 'export', title: t('exportGeoJSON'), stage: t('progressWriting') }, async task => {
    const content = await buildGeoJSONStringWithProgress(task);
    task.update({ percent: 82, stage: t('progressWriting') });
    const result = await callIpc(window.platformAdapter.project.exportGeoJson({
      defaultPath: 'plant_points.geojson',
      content
    }));

    if (result.canceled) return false;
    showAlert(t('exportSuccess'));
  });
}
