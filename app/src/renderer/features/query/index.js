function renderZonePointList(){
  const zone=getSelectedZone();
  clearNode(ui.zonePointList);
  if(!zone){
    if (typeof scheduleRightPanelDisplayMode === 'function') scheduleRightPanelDisplayMode('zone-list-empty-zone');
    return;
  }
  const pts=state.points.filter(p=>p.zoneRef===zone.id);
  ui.zonePointList.classList.toggle('zone-point-list--dense', pts.length > 10);
  ui.rightModuleListCard?.classList.toggle('right-plant-module-dense', pts.length > 10);
  if(!pts.length){
    const title = el('div', {
      className: 'title zone-plant-name',
      text: t('resultsEmpty'),
      title: t('resultsEmpty')
    });
    const card = el('div', { className: 'list-item empty zone-plant-item' }, [title]);
    ui.zonePointList.appendChild(card);
    if (typeof scheduleRightPanelDisplayMode === 'function') scheduleRightPanelDisplayMode('zone-list-empty');
    return;
  }
  pts.forEach(p=>{
    const entries = getPhenologyEntries(p);
    const labels = entries.map(entry=>entry.label || entry.floweringState).filter(Boolean).join(' / ');
    const images = normalizeImages(getSelectedPhenologyEntry(p)?.images || p.images || []);
    const firstNote = entries.map(entry=>entry.note).find(Boolean) || '';
    const name = pointDisplayName(p);
    const sci = p.plantNameSci || '';
    const meta = [p.pointId, labels, images.length ? `${images.length} ${t('images')}` : '', firstNote].filter(Boolean).join(' · ');
    const metaText = meta || pointMeta(p) || p.pointId || '';
    const nameRow = el('div', { className: 'zone-plant-name-row' }, [
      el('div', { className: 'title zone-plant-name', text: name, title: name }),
      sci ? el('div', { className: 'zone-plant-sci', text: sci, title: sci }) : null
    ]);
    const card = el('div', { className: 'list-item zone-plant-item' }, [
      nameRow,
      el('div', { className: 'meta zone-plant-meta', text: metaText, title: metaText })
    ]);
    card.title = [name, sci, meta].filter(Boolean).join('\n');
    card.addEventListener('click',()=>{ selectPoint(p.id); focusPointOnMap(p.id); });
    ui.zonePointList.appendChild(card);
  });
  if (typeof scheduleRightPanelDisplayMode === 'function') scheduleRightPanelDisplayMode('zone-list-render');
}

function renderCounters(){ ui.zoneCount.textContent=String(state.zones.length); ui.pointCount.textContent=String(state.points.length); }
function updateStatusBar(){ ui.currentModeText.textContent = t(state.currentMode==='browse'?'browse':state.currentMode==='drawZone'?'drawZone':'addPoint'); ui.selectedZoneText.textContent = getSelectedZone() ? zoneDisplayName(getSelectedZone()) : '—'; ui.selectedPointText.textContent = getSelectedPoint() ? pointDisplayName(getSelectedPoint()) : '—'; }
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
// 查询同时覆盖点位、分区和物候字段，保证旧版单字段检索习惯不丢失。
function getQueryResults(){
  const q = String(ui.queryText?.value || '').trim().toLowerCase();
  const filters = {
    zoneId: ui.queryZone?.value || '',
    growthForm: String(ui.queryGrowthForm?.value || '').trim().toLowerCase(),
    floweringState: String(ui.queryFloweringState?.value || '').trim().toLowerCase(),
    cultivatedStatus: String(ui.queryCultivatedStatus?.value || '').trim().toLowerCase(),
    habitat: String(ui.queryHabitat?.value || '').trim().toLowerCase(),
    observer: String(ui.queryObserver?.value || '').trim().toLowerCase(),
    start: ui.queryDateStart?.value || '',
    end: ui.queryDateEnd?.value || ''
  };
  const pointHits = state.points.filter(point => {
    const zone = state.zones.find(z=>z.id===point.zoneRef);
    const entries = getPhenologyEntries(point);
    const haystack = [point.pointId, point.plantNameCn, point.plantNameSci, zone?.zoneId, zone?.name, ...entries.flatMap(entry => [entry.label, entry.floweringState, entry.note, entry.habitat, entry.observer, entry.growthForm, entry.cultivatedStatus, ...(entry.images||[])])].join(' ').toLowerCase();
    if(q && !haystack.includes(q)) return false;
    if(filters.zoneId && point.zoneRef !== filters.zoneId) return false;
    const matchedEntry = entries.find(entry => {
      if(filters.growthForm && !String(entry.growthForm||'').toLowerCase().includes(filters.growthForm)) return false;
      if(filters.floweringState && !(`${entry.label||''} ${entry.floweringState||''}`).toLowerCase().includes(filters.floweringState)) return false;
      if(filters.cultivatedStatus && !String(entry.cultivatedStatus||'').toLowerCase().includes(filters.cultivatedStatus)) return false;
      if(filters.habitat && !String(entry.habitat||'').toLowerCase().includes(filters.habitat)) return false;
      if(filters.observer && !String(entry.observer||'').toLowerCase().includes(filters.observer)) return false;
      if(filters.start && (!entry.surveyDate || entry.surveyDate < filters.start)) return false;
      if(filters.end && (!entry.surveyDate || entry.surveyDate > filters.end)) return false;
      return true;
    });
    const noStructured = !filters.growthForm && !filters.floweringState && !filters.cultivatedStatus && !filters.habitat && !filters.observer && !filters.start && !filters.end;
    return noStructured || !!matchedEntry;
  }).map(point => {
    const zone = state.zones.find(z=>z.id===point.zoneRef);
    const labels = getPhenologyEntries(point).map(x=>x.label).join(' / ');
    return { type:'point', id:point.id, title:pointDisplayName(point), meta:[zoneDisplayName(zone), labels].filter(Boolean).join(' · ') };
  });
  const zoneHits = state.zones.filter(zone => {
    const haystack = [zone.zoneId, zone.name, zone.description].join(' ').toLowerCase();
    if(q && !haystack.includes(q)) return false;
    if(filters.zoneId && zone.id !== filters.zoneId) return false;
    return !filters.growthForm && !filters.floweringState && !filters.cultivatedStatus && !filters.habitat && !filters.observer && !filters.start && !filters.end;
  }).map(zone => ({ type:'zone', id:zone.id, title:zoneDisplayName(zone), meta:zone.zoneId || '' }));
  return [...zoneHits, ...pointHits];
}
function renderQueryResults(){
  if(!ui.queryResults) return;
  const items = getQueryResults();
  clearNode(ui.queryResults);
  ui.queryResultCount.textContent = String(items.length);
  if(!items.length){
    ui.queryResults.appendChild(listTextItem(t('resultsEmpty')));
    return;
  }
  items.forEach(item => {
    const card = listTextItem(item.title, item.meta || '');
    card.addEventListener('click', ()=> { if(item.type==='zone'){ selectZone(item.id); focusZoneOnMap(item.id); } else { selectPoint(item.id); focusPointOnMap(item.id); } closeLayerModal(ui.queryModal); });
    ui.queryResults.appendChild(card);
  });
}
