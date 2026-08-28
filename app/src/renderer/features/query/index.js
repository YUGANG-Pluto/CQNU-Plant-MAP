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

function readQueryFilters() {
  return {
    text: ui.queryText?.value || '',
    zoneId: ui.queryZone?.value || '',
    completeness: ui.queryCompleteness?.value || '',
    growthForm: ui.queryGrowthForm?.value || '',
    floweringState: ui.queryFloweringState?.value || '',
    cultivatedStatus: ui.queryCultivatedStatus?.value || '',
    habitat: ui.queryHabitat?.value || '',
    observer: ui.queryObserver?.value || '',
    start: ui.queryDateStart?.value || '',
    end: ui.queryDateEnd?.value || ''
  };
}

function getQueryResults() {
  const items = window.researchQuery?.run(state.zones, state.points, readQueryFilters()) || [];
  return items.map(item => {
    const record =
      item.type === 'point'
        ? state.points.find(point => point.id === item.id)
        : state.zones.find(zone => zone.id === item.id);
    const title =
      item.type === 'point'
        ? record
          ? pointDisplayName(record)
          : item.displayName || t('unnamedPoint')
        : record
          ? zoneDisplayName(record)
          : item.displayName || t('unnamedZone');
    const zone = item.type === 'point' ? state.zones.find(candidate => candidate.id === item.zoneInternalId) : null;
    const meta =
      item.type === 'point'
        ? [zone ? zoneDisplayName(zone) : item.zoneName || t('unassignedZone'), item.phenologyLabels]
            .filter(Boolean)
            .join(' / ')
        : item.zoneCode;
    return { ...item, title, meta };
  });
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
