function pointPhenologyLabels(point) {
  return getPhenologyEntries(point)
    .map(entry => entry.label || entry.floweringState)
    .filter(Boolean)
    .join(' / ');
}

function pointImageCount(point) {
  const entryImages = getPhenologyEntries(point)
    .flatMap(entry => normalizeImages(entry.images || []));
  const legacyImages = normalizeImages(point.images || []);
  return [...entryImages, ...legacyImages].length;
}

function pointHasPhenologyInfo(point) {
  return getPhenologyEntries(point).some(entry => [
    entry.label,
    entry.floweringState,
    entry.surveyDate,
    entry.habitat,
    entry.observer,
    entry.growthForm,
    entry.cultivatedStatus,
    entry.abundance,
    entry.note
  ].some(Boolean));
}

function pointCompletenessFlags(point) {
  return {
    missingScientificName: !String(point?.plantNameSci || '').trim(),
    missingCommonName: !String(point?.plantNameCn || '').trim(),
    missingPhenology: !pointHasPhenologyInfo(point),
    missingImage: pointImageCount(point) === 0
  };
}

function pointMatchesCompleteness(point, filter) {
  if (!filter) return true;
  return !!pointCompletenessFlags(point)[filter];
}

function queryFlagLabels(flags = {}) {
  return [
    flags.missingScientificName ? t('queryMissingScientificName') : '',
    flags.missingCommonName ? t('queryMissingCommonName') : '',
    flags.missingPhenology ? t('queryMissingPhenology') : '',
    flags.missingImage ? t('queryMissingImage') : ''
  ].filter(Boolean);
}

function renderZonePointList(){
  const zone=getSelectedZone();
  clearNode(ui.zonePointList);
  if(!zone){
    renderObjectListEmpty(ui.zonePointList, 'objectSelectZonePrompt', 'objectListKeyboardHint');
    if (typeof scheduleRightPanelDisplayMode === 'function') scheduleRightPanelDisplayMode('zone-list-empty-zone');
    syncObjectSelectionUi('zone-list-empty-zone');
    return;
  }
  const pts=state.points.filter(p=>p.zoneRef===zone.id);
  ui.zonePointList.classList.toggle('zone-point-list--dense', pts.length > 10);
  ui.rightModuleListCard?.classList.toggle('right-plant-module-dense', pts.length > 10);
  if(!pts.length){
    renderObjectListEmpty(ui.zonePointList, 'objectZoneHasNoPoints', 'objectWorkflowHint');
    if (typeof scheduleRightPanelDisplayMode === 'function') scheduleRightPanelDisplayMode('zone-list-empty');
    syncObjectSelectionUi('zone-list-empty');
    return;
  }
  pts.forEach(p=>{
    const entries = getPhenologyEntries(p);
    const labels = pointPhenologyLabels(p);
    const images = pointImageCount(p);
    const firstNote = entries.map(entry=>entry.note).find(Boolean) || '';
    const name = pointDisplayName(p);
    const sci = p.plantNameSci || '';
    const meta = [p.pointId, labels, images ? `${images} ${t('images')}` : '', firstNote].filter(Boolean).join(' / ');
    const metaText = meta || pointMeta(p) || p.pointId || '';
    const nameRow = el('div', { className: 'zone-plant-name-row' }, [
      el('div', { className: 'title zone-plant-name', text: name, title: name }),
      sci ? el('div', { className: 'zone-plant-sci', text: sci, title: sci }) : null
    ]);
    const card = el('button', { className: 'list-item zone-plant-item object-list-item' }, [
      nameRow,
      el('div', { className: 'meta zone-plant-meta', text: metaText, title: metaText })
    ]);
    card.type = 'button';
    card.title = [name, sci, meta].filter(Boolean).join('\n');
    configureObjectListItem(card, {
      type: 'point',
      id: p.id,
      label: name,
      meta: metaText
    });
    ui.zonePointList.appendChild(card);
  });
  syncObjectSelectionUi('zone-list-render');
  if (typeof scheduleRightPanelDisplayMode === 'function') scheduleRightPanelDisplayMode('zone-list-render');
}

function renderCounters(){ ui.zoneCount.textContent=String(state.zones.length); ui.pointCount.textContent=String(state.points.length); }
function updateStatusBar(){
  const modeText = t(state.currentMode==='browse'?'browse':state.currentMode==='drawZone'?'drawZone':'addPoint');
  const zoneText = getSelectedZone() ? zoneDisplayName(getSelectedZone()) : '-';
  const pointText = getSelectedPoint() ? pointDisplayName(getSelectedPoint()) : '-';
  ui.currentModeText.textContent = modeText;
  ui.currentModeText.title = modeText;
  ui.selectedZoneText.textContent = zoneText;
  ui.selectedZoneText.title = zoneText;
  ui.selectedPointText.textContent = pointText;
  ui.selectedPointText.title = pointText;
}
function populateQueryFilters(){
  const current = ui.queryZone?.value || '';
  if(!ui.queryZone) return;
  clearNode(ui.queryZone);
  ui.queryZone.appendChild(el('option', { value: '', text: t('notSelected') }));
  state.zones.forEach(zone => {
    ui.queryZone.appendChild(el('option', { value: zone.id, text: zoneDisplayName(zone) }));
  });
  ui.queryZone.value = current;
}

function getQueryResults(){
  const q = String(ui.queryText?.value || '').trim().toLowerCase();
  const filters = {
    zoneId: ui.queryZone?.value || '',
    completeness: ui.queryCompleteness?.value || '',
    growthForm: String(ui.queryGrowthForm?.value || '').trim().toLowerCase(),
    floweringState: String(ui.queryFloweringState?.value || '').trim().toLowerCase(),
    cultivatedStatus: String(ui.queryCultivatedStatus?.value || '').trim().toLowerCase(),
    habitat: String(ui.queryHabitat?.value || '').trim().toLowerCase(),
    observer: String(ui.queryObserver?.value || '').trim().toLowerCase(),
    start: ui.queryDateStart?.value || '',
    end: ui.queryDateEnd?.value || ''
  };
  const hasEntryFilters = !!(
    filters.growthForm ||
    filters.floweringState ||
    filters.cultivatedStatus ||
    filters.habitat ||
    filters.observer ||
    filters.start ||
    filters.end
  );
  const pointHits = state.points.filter(point => {
    const zone = state.zones.find(z=>z.id===point.zoneRef);
    const entries = getPhenologyEntries(point);
    const haystack = [
      point.pointId,
      point.plantNameCn,
      point.plantNameSci,
      zone?.zoneId,
      zone?.name,
      ...entries.flatMap(entry => [
        entry.label,
        entry.floweringState,
        entry.note,
        entry.habitat,
        entry.observer,
        entry.growthForm,
        entry.cultivatedStatus,
        ...(entry.images||[])
      ])
    ].join(' ').toLowerCase();
    if(q && !haystack.includes(q)) return false;
    if(filters.zoneId && point.zoneRef !== filters.zoneId) return false;
    if(!pointMatchesCompleteness(point, filters.completeness)) return false;
    if(!hasEntryFilters) return true;
    return entries.some(entry => {
      if(filters.growthForm && !String(entry.growthForm||'').toLowerCase().includes(filters.growthForm)) return false;
      if(filters.floweringState && !(`${entry.label||''} ${entry.floweringState||''}`).toLowerCase().includes(filters.floweringState)) return false;
      if(filters.cultivatedStatus && !String(entry.cultivatedStatus||'').toLowerCase().includes(filters.cultivatedStatus)) return false;
      if(filters.habitat && !String(entry.habitat||'').toLowerCase().includes(filters.habitat)) return false;
      if(filters.observer && !String(entry.observer||'').toLowerCase().includes(filters.observer)) return false;
      if(filters.start && (!entry.surveyDate || entry.surveyDate < filters.start)) return false;
      if(filters.end && (!entry.surveyDate || entry.surveyDate > filters.end)) return false;
      return true;
    });
  }).map(point => {
    const zone = state.zones.find(z=>z.id===point.zoneRef);
    const labels = pointPhenologyLabels(point);
    const flags = pointCompletenessFlags(point);
    return {
      type:'point',
      id:point.id,
      title:pointDisplayName(point),
      meta:[zoneDisplayName(zone), labels].filter(Boolean).join(' / '),
      flags
    };
  });
  const zoneHits = state.zones.filter(zone => {
    const haystack = [zone.zoneId, zone.name, zone.description].join(' ').toLowerCase();
    if(q && !haystack.includes(q)) return false;
    if(filters.zoneId && zone.id !== filters.zoneId) return false;
    return !filters.completeness && !hasEntryFilters;
  }).map(zone => ({ type:'zone', id:zone.id, title:zoneDisplayName(zone), meta:zone.zoneId || '', flags: {} }));
  return [...zoneHits, ...pointHits];
}

function renderQueryFlags(flags) {
  const labels = queryFlagLabels(flags);
  if (!labels.length) return null;
  return el('div', { className: 'query-result-flags' }, labels.map(label => (
    el('span', { className: 'query-result-flag', text: label })
  )));
}

function focusQueryResult(item) {
  activateObjectSelection(item.type, item.id, { focusMap: true, source: 'query' });
}

function openReferenceFromQueryResult(item, event) {
  event.stopPropagation();
  if (item.type !== 'point') return;
  activateObjectSelection('point', item.id, { focusMap: true, source: 'query-reference' });
  closeLayerModal(ui.queryModal);
  openSpeciesReferenceCenter();
}

function renderQueryResultCard(item) {
  const body = el('div', { className: 'query-result-body' }, [
    el('div', { className: 'title', text: item.title }),
    item.meta ? el('div', { className: 'meta', text: item.meta }) : null,
    renderQueryFlags(item.flags)
  ]);
  const actions = item.type === 'point'
    ? el('button', { className: 'btn btn-soft query-reference-btn', text: t('openSpeciesReference') })
    : null;
  const card = el('div', { className: 'list-item query-result-item' }, [body, actions]);
  configureObjectListItem(card, {
    type: item.type,
    id: item.id,
    label: item.title,
    meta: item.meta,
    onActivate: () => {
      focusQueryResult(item);
      closeLayerModal(ui.queryModal);
    }
  });
  actions?.addEventListener('click', event => openReferenceFromQueryResult(item, event));
  return card;
}

function renderQueryResults(){
  if(!ui.queryResults) return;
  const items = getQueryResults();
  clearNode(ui.queryResults);
  ui.queryResultCount.textContent = String(items.length);
  if(!items.length){
    renderObjectListEmpty(ui.queryResults, 'resultsEmpty', 'objectWorkflowHint');
    return;
  }
  items.forEach(item => {
    ui.queryResults.appendChild(renderQueryResultCard(item));
  });
  syncObjectSelectionUi('query-results-render');
}
