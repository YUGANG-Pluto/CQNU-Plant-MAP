function getPointDateScore(point, fallback) {
  const dates = getPhenologyEntries(point)
    .map(entry => entry.surveyDate)
    .filter(Boolean)
    .sort();

  if (dates.length) {
    const timestamp = Date.parse(dates[0]);
    if (Number.isFinite(timestamp)) return timestamp;
  }

  return fallback || Date.now();
}

function normalizeSpeciesKey(point) {
  return String(point.plantNameSci || point.plantNameCn || '').trim().toLowerCase();
}

function distanceMeters(a, b) {
  const radius = 6371000;
  const toRad = value => value * Math.PI / 180;
  const dLat = toRad((a.lat || 0) - (b.lat || 0));
  const dLng = toRad((a.lng || 0) - (b.lng || 0));
  const lat1 = toRad(a.lat || 0);
  const lat2 = toRad(b.lat || 0);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * radius * Math.asin(Math.min(1, Math.sqrt(h)));
}

function cloneData(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function inferPointIdScheme(points) {
  let prefix = 'P';
  let width = 3;
  let maxNum = 0;

  points.forEach(point => {
    const id = String(point.pointId || '');
    const match = id.match(/^(.*?)(\d+)$/);
    if (!match) return;
    if (prefix === 'P') prefix = match[1] || 'P';
    width = Math.max(width, match[2].length);
    maxNum = Math.max(maxNum, Number(match[2] || 0));
  });

  return { prefix, width, next: maxNum + 1 };
}

function nextPointIdFactory(points) {
  const scheme = inferPointIdScheme(points);
  return () => `${scheme.prefix}${String(scheme.next++).padStart(scheme.width, '0')}`;
}

async function getProjectMtime(projectDir) {
  const data = await callIpc(window.platformAdapter.project.getModifiedTime({ projectDir }));
  return data.modifiedTime || Date.now();
}

async function chooseProjectDirectoryForMerge() {
  const result = await callIpc(window.platformAdapter.project.chooseMergeDir());
  return result.canceled ? '' : result.projectDir;
}

// 合并只沿用当前项目分区，外部点位需按编号、名称或空间位置重挂接。
function mapMergedZoneRef(point, otherZones) {
  if (!state.zones.length) return point.zoneRef || '';
  if (point.zoneRef && state.zones.some(zone => zone.id === point.zoneRef)) {
    return point.zoneRef;
  }

  const otherZone = otherZones.find(zone =>
    zone.id === point.zoneRef || zone.zoneId === point.zoneRef || zone.name === point.zoneRef
  );

  if (otherZone) {
    const exact = state.zones.find(zone =>
      (otherZone.zoneId && zone.zoneId === otherZone.zoneId) ||
      (otherZone.name && zone.name === otherZone.name)
    );
    if (exact) return exact.id;
  }

  if (Number.isFinite(point.lat) && Number.isFinite(point.lng)) {
    const latlng = { lat: point.lat, lng: point.lng };
    const containing = state.zones.find(zone =>
      zone.geometry && pointInPolygonStorage(latlng, zone.geometry.coordinates)
    );
    if (containing) return containing.id;
  }

  return '';
}

function updateMergePaths() {
  if (ui.mergeBasePath) {
    ui.mergeBasePath.textContent = dirnameLabel(state.mergeBaseDir || state.projectDir);
  }
  if (ui.mergeOtherPath) {
    ui.mergeOtherPath.textContent = dirnameLabel(state.mergeOtherDir);
  }
}

function renderMergeSummary(textMsg = '') {
  if (ui.mergeSummary) ui.mergeSummary.textContent = textMsg;
}

function openMergeCenter() {
  state.mergeBaseDir = state.projectDir || '';
  state.mergeOtherDir = '';
  updateMergePaths();
  renderMergeSummary('');
  openLayerModal(ui.mergeModal);
}

function renderMergeReview(items) {
  if (!ui.mergeReviewList) return;
  ui.mergeReviewList.innerHTML = '';

  if (!items.length) {
    ui.mergeReviewList.innerHTML = `
      <div class="list-item"><div class="title">${escapeHtml(t('resultsEmpty'))}</div></div>
    `;
    return;
  }

  items.forEach((item, idx) => {
    const card = document.createElement('label');
    card.className = 'list-item merge-review-item';
    const incomingName = item.incoming.pointId || pointDisplayName(item.incoming);
    const meta = `${item.current.pointId || ''} ↔ ${item.incoming.plantNameSci || item.incoming.plantNameCn || ''}`;
    card.innerHTML = `
      <div class="title">
        <input type="checkbox" data-idx="${idx}" checked /> ${escapeHtml(incomingName)}
      </div>
      <div class="meta">${escapeHtml(meta)}</div>
    `;
    ui.mergeReviewList.appendChild(card);
  });
}

function openMergeReview(items) {
  renderMergeReview(items);
  openLayerModal(ui.mergeReviewModal);
  return new Promise(resolve => {
    state.mergeReviewResolver = resolve;
  });
}

function settleMergeReview(result) {
  closeLayerModal(ui.mergeReviewModal);
  if (state.mergeReviewResolver) state.mergeReviewResolver(result);
  state.mergeReviewResolver = null;
}

function coordsReady(point) {
  return Number.isFinite(point?.lat) && Number.isFinite(point?.lng);
}

function samePhenologySignature(a, b) {
  const signature = point => getPhenologyEntries(point)
    .map(entry => [
      entry.label || entry.floweringState || '',
      entry.surveyDate || '',
      entry.habitat || '',
      entry.cultivatedStatus || ''
    ].join('|'))
    .sort()
    .join('||');

  return signature(a) === signature(b);
}

// ID 相同但物种、物候或图片差异过大时按新点处理，避免误覆盖。
function pointContentConflict(existing, incoming) {
  const speciesSame = normalizeSpeciesKey(existing) &&
    normalizeSpeciesKey(existing) === normalizeSpeciesKey(incoming);
  if (!speciesSame) return true;

  let diffCount = 0;
  ['plantNameCn', 'plantNameSci', 'observer'].forEach(key => {
    const a = String(existing[key] || '').trim();
    const b = String(incoming[key] || '').trim();
    if (a && b && a !== b) diffCount += 1;
  });

  if (!samePhenologySignature(existing, incoming)) diffCount += 1;

  const imgA = (existing.images || []).length;
  const imgB = (incoming.images || []).length;
  if (imgA && imgB && imgA !== imgB) diffCount += 1;

  return diffCount >= 2;
}

// 疑似重合要求物种一致，再按距离阈值或同分区进入人工确认。
function maybeMatchSuspect(existing, incoming) {
  const sameSpecies = normalizeSpeciesKey(existing) &&
    normalizeSpeciesKey(existing) === normalizeSpeciesKey(incoming);
  if (!sameSpecies) return false;

  if (coordsReady(existing) && coordsReady(incoming)) {
    return distanceMeters(existing, incoming) <= MERGE_OVERLAP_DISTANCE_METERS;
  }

  return existing.zoneRef && incoming.zoneRef && existing.zoneRef === incoming.zoneRef;
}

function assignMergedZone(point, otherZones) {
  point.zoneRef = mapMergedZoneRef(point, otherZones);
  return point;
}

function normalizeOtherPoints(other) {
  const otherZones = (other.zones || []).map(normalizeZoneRecord);
  return (other.points || [])
    .map(point => normalizePointRecord({
      observer: '',
      surveyDate: '',
      habitat: '',
      abundance: '',
      growthForm: '',
      floweringState: '',
      cultivatedStatus: '',
      ...cloneData(point)
    }))
    .map(point => assignMergedZone(point, otherZones));
}

function classifyIncomingPoint(incoming, context) {
  const existing = context.exactByPointId.get(incoming.pointId);
  if (!existing) {
    const suspect = state.points.find(point => maybeMatchSuspect(point, incoming));
    if (suspect) context.suspects.push({ current: suspect, incoming });
    else context.newPoints.push(incoming);
    return;
  }

  if (coordsReady(existing) && coordsReady(incoming)) {
    const dist = distanceMeters(existing, incoming);
    if (dist > MERGE_OVERLAP_DISTANCE_METERS) {
      context.newPoints.push(incoming);
      return;
    }
  }

  if (pointContentConflict(existing, incoming)) {
    context.newPoints.push(incoming);
    return;
  }

  const useIncoming = getPointDateScore(incoming, context.otherTime) <
    getPointDateScore(existing, state.projectModifiedTime);
  if (useIncoming) context.replacements.push({ target: existing, incoming });
}

async function reviewSuspects(context) {
  if (!context.suspects.length) return true;

  const result = await openMergeReview(context.suspects);
  if (!result) return false;

  context.suspects.forEach((item, idx) => {
    if (!result.mergeIdxs.includes(idx)) {
      context.newPoints.push(item.incoming);
      return;
    }

    const useIncoming = getPointDateScore(item.incoming, context.otherTime) <
      getPointDateScore(item.current, state.projectModifiedTime);
    if (useIncoming) {
      context.replacements.push({ target: item.current, incoming: item.incoming });
    }
  });

  return true;
}

// 新增点位统一重编号，避免把外部项目编号直接写入主项目。
function applyMergeResult(context) {
  const nextPointId = nextPointIdFactory(state.points);

  context.replacements.forEach(({ target, incoming }) => {
    const keepId = target.id;
    const keepPointId = target.pointId;
    Object.assign(target, cloneData(incoming));
    target.id = keepId;
    target.pointId = keepPointId;
    syncPointSummary(target);
  });

  context.newPoints.forEach(point => {
    point.id = makeUid('point');
    point.pointId = nextPointId();
    state.points.push(point);
  });
}

function rebuildProjectLayers() {
  if (typeof rerenderBusinessLayers === 'function') rerenderBusinessLayers('project-merge');
  else {
    clearAllLayers();
    state.zones.filter(zone => zone.geometry).forEach(addZoneLayer);
    state.points
      .filter(point => Number.isFinite(point.lat) && Number.isFinite(point.lng))
      .forEach(addPointLayer);
  }
  selectZone(null);
  renderAllDerived();
  fitMapToProjectData();
}

// 合并前自动备份两侧项目，降低误合并后的恢复成本。
async function performProjectMerge(baseDir, otherDir, task = null) {
  if (!baseDir || !otherDir) throw new Error(t('mergeNeedProjects'));

  if (state.projectDir !== baseDir) await loadProjectIntoRenderer(baseDir);
  else await persistProject();

  task?.update({ percent: 8, stage: t('progressBackup') });
  await autoBackupProjects([baseDir, otherDir], 'merge');
  task?.update({ percent: 26, stage: t('progressReading') });
  const other = await callIpc(window.platformAdapter.project.load({ projectDir: otherDir }));
  const otherPoints = normalizeOtherPoints(other);

  const context = {
    otherTime: other.projectModifiedTime,
    exactByPointId: new Map(state.points.map(point => [point.pointId, point])),
    suspects: [],
    newPoints: [],
    replacements: []
  };

  const total = Math.max(1, otherPoints.length);
  for (let index = 0; index < otherPoints.length; index += 1) {
    classifyIncomingPoint(otherPoints[index], context);
    if (index % 25 === 0 || index === otherPoints.length - 1) {
      task?.update({
        completed: index + 1,
        total,
        percent: calculateStageProgress(30, 68, index + 1, total),
        stage: t('progressMerging')
      });
      await yieldToUi();
    }
  }
  task?.update({ percent: 72, stage: t('progressReview') });
  const reviewed = await reviewSuspects(context);
  if (!reviewed) return false;

  task?.update({ percent: 82, stage: t('progressWriting') });
  applyMergeResult(context);
  rebuildProjectLayers();
  await persistProject();
  task?.update({ percent: 96, stage: t('progressDone') });
  return true;
}

async function resolveMergeDirs() {
  let baseDir = state.projectDir || state.mergeBaseDir;
  let otherDir = state.mergeOtherDir;

  if (!baseDir) {
    baseDir = await chooseProjectDirectoryForMerge();
    state.mergeBaseDir = baseDir;
  }
  if (!otherDir) {
    otherDir = await chooseProjectDirectoryForMerge();
    state.mergeOtherDir = otherDir;
  }

  if (!baseDir || !otherDir || baseDir === otherDir) {
    throw new Error(t('mergeNeedProjects'));
  }

  if (!state.projectDir) {
    const baseTime = await getProjectMtime(baseDir);
    const otherTime = await getProjectMtime(otherDir);
    if (otherTime < baseTime) {
      baseDir = state.mergeOtherDir;
      otherDir = state.mergeBaseDir;
    }
  }

  return { baseDir, otherDir };
}

async function runMergeFlow() {
  if (typeof guardMaintenanceReadOnlyAction === 'function' && guardMaintenanceReadOnlyAction('run-merge')) return;
  try {
    const { baseDir, otherDir } = await resolveMergeDirs();
    state.mergeBaseDir = baseDir;
    state.mergeOtherDir = otherDir;
    updateMergePaths();
    renderMergeSummary(`${dirnameLabel(baseDir)} ← ${dirnameLabel(otherDir)}`);

    const ok = await withProgressTask({ type: 'merge', title: t('runMerge'), stage: t('progressPreparing') }, async task => {
      const result = await performProjectMerge(baseDir, otherDir, task);
      task.update({ percent: 98, stage: t('progressDone') });
      return result;
    });
    if (ok) {
      closeLayerModal(ui.mergeModal);
      showAlert(t('mergeCompleted'));
    }
  } catch (error) {
    handleUiError(error, 'merge:run', {
      title: t('mergeFailed'),
      message: `${t('mergeFailed')} ${error.message || error}`
    });
  }
}
