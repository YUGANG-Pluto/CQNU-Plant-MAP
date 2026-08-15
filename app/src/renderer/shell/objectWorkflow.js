const OBJECT_FEEDBACK_RESTORE_MS = 2800;
const OBJECT_FOCUS_FEEDBACK_MS = 360;
let objectWorkflowFeedbackTimer = null;
let objectSelectionPulseTimer = null;

function formatObjectWorkflowText(key, replacements = {}) {
  let text = t(key);
  Object.entries(replacements).forEach(([name, value]) => {
    text = text.replaceAll(`{${name}}`, String(value));
  });
  return text;
}

function getSelectedObjectDescriptor() {
  const point = typeof getSelectedPoint === 'function' ? getSelectedPoint() : null;
  if (point) {
    return {
      type: 'point',
      id: point.id,
      label: pointDisplayName(point),
      record: point
    };
  }

  const zone = typeof getSelectedZone === 'function' ? getSelectedZone() : null;
  if (zone) {
    return {
      type: 'zone',
      id: zone.id,
      label: zoneDisplayName(zone),
      record: zone
    };
  }

  return null;
}

function getObjectNavigationItems(type) {
  if (type === 'point') {
    const zonePoints = state.selectedZoneId
      ? state.points.filter(point => point.zoneRef === state.selectedZoneId)
      : [];
    return zonePoints.length ? zonePoints : state.points;
  }
  if (type === 'zone') return state.zones;
  return [];
}

function getObjectSelectionPosition(selection) {
  if (!selection) return { current: 0, total: 0 };
  const items = getObjectNavigationItems(selection.type);
  const index = items.findIndex(item => item.id === selection.id);
  return {
    current: index >= 0 ? index + 1 : 0,
    total: items.length
  };
}

function objectSelectionSummaryText(selection = getSelectedObjectDescriptor()) {
  if (!selection) return t('objectSelectionEmpty');
  const typeLabel = t(selection.type === 'point' ? 'objectTypePoint' : 'objectTypeZone');
  const position = getObjectSelectionPosition(selection);
  const positionText = position.total
    ? formatObjectWorkflowText('objectSelectionPosition', position)
    : '';
  return [typeLabel, selection.label, positionText].filter(Boolean).join(' · ');
}

function setObjectWorkflowFeedback(messageKey, tone = 'neutral', options = {}) {
  const node = ui.objectWorkflowFeedback;
  if (!node) return;
  const message = options.literal
    ? String(messageKey || '')
    : formatObjectWorkflowText(messageKey, options.replacements || {});

  if (objectWorkflowFeedbackTimer) {
    window.clearTimeout(objectWorkflowFeedbackTimer);
    objectWorkflowFeedbackTimer = null;
  }

  node.textContent = message;
  node.title = message;
  node.dataset.tone = tone;
  node.classList.remove('is-neutral', 'is-busy', 'is-success', 'is-warning', 'is-error');
  node.classList.add(`is-${tone}`);
  node.setAttribute('aria-busy', tone === 'busy' ? 'true' : 'false');

  if (options.restore !== false && tone !== 'neutral') {
    objectWorkflowFeedbackTimer = window.setTimeout(() => {
      objectWorkflowFeedbackTimer = null;
      setObjectWorkflowFeedback('objectWorkflowHint', 'neutral', { restore: false });
    }, options.restoreAfter || OBJECT_FEEDBACK_RESTORE_MS);
  }
}

function getObjectListItems(container) {
  return Array.from(container?.querySelectorAll('[data-object-type][data-object-id]') || []);
}

function normalizeObjectListTabStops(container) {
  const items = getObjectListItems(container).filter(item => !item.disabled);
  if (!items.length) return;
  const current = items.find(item => item.classList.contains('is-selected')) ||
    items.find(item => item.tabIndex === 0) ||
    items[0];
  items.forEach(item => {
    item.tabIndex = item === current ? 0 : -1;
  });
}

function moveObjectListFocus(item, direction) {
  const container = item.closest('[role="listbox"], .object-list, #zonePointList, #queryResults');
  const items = getObjectListItems(container).filter(candidate => !candidate.disabled);
  const currentIndex = items.indexOf(item);
  if (currentIndex < 0 || !items.length) return;

  let nextIndex = currentIndex;
  if (direction === 'first') nextIndex = 0;
  else if (direction === 'last') nextIndex = items.length - 1;
  else nextIndex = (currentIndex + direction + items.length) % items.length;

  items.forEach(candidate => {
    candidate.tabIndex = candidate === items[nextIndex] ? 0 : -1;
  });
  items[nextIndex].focus({ preventScroll: true });
  items[nextIndex].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
}

function setObjectHover(type, id, active = true) {
  if (!['zone', 'point'].includes(type) || !id) return;
  const key = type === 'point' ? 'hoveredPointId' : 'hoveredZoneId';
  if (active) state[key] = id;
  else if (state[key] === id) state[key] = null;

  document.querySelectorAll('[data-object-type][data-object-id]').forEach(node => {
    const linked = active && node.dataset.objectType === type && node.dataset.objectId === id;
    node.classList.toggle('is-linked-hover', linked);
  });

  if (type === 'point' && typeof refreshPointStyles === 'function') refreshPointStyles();
  if (type === 'zone' && typeof refreshZoneStyles === 'function') refreshZoneStyles();
}

function configureObjectListItem(node, options = {}) {
  const { type, id, label = '', meta = '', onActivate, focusMap = true } = options;
  if (!node || !type || !id) return node;

  node.classList.add('object-list-item');
  node.dataset.objectType = type;
  node.dataset.objectId = id;
  node.setAttribute('role', 'option');
  node.setAttribute('aria-selected', 'false');
  node.setAttribute('aria-label', [label, meta].filter(Boolean).join(' · '));
  if (node.tagName === 'BUTTON') node.type = 'button';
  node.tabIndex = -1;

  const activate = () => {
    if (typeof onActivate === 'function') onActivate();
    else activateObjectSelection(type, id, { focusMap, source: 'list' });
  };

  node.addEventListener('click', activate);
  node.addEventListener('keydown', event => {
    if (event.target !== node) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      moveObjectListFocus(node, 1);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      moveObjectListFocus(node, -1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      moveObjectListFocus(node, 'first');
    } else if (event.key === 'End') {
      event.preventDefault();
      moveObjectListFocus(node, 'last');
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activate();
    }
  });
  node.addEventListener('pointerenter', () => setObjectHover(type, id, true));
  node.addEventListener('pointerleave', () => setObjectHover(type, id, false));
  node.addEventListener('focus', () => setObjectHover(type, id, true));
  node.addEventListener('blur', () => setObjectHover(type, id, false));
  return node;
}

function createObjectListButton(title, meta, options = {}) {
  const children = [el('span', { className: 'title', text: title, title })];
  if (meta) children.push(el('span', { className: 'meta', text: meta, title: meta }));
  const button = el('button', { className: 'list-item object-list-item' }, children);
  button.type = 'button';
  button.title = [title, meta].filter(Boolean).join('\n');
  return configureObjectListItem(button, {
    ...options,
    label: title,
    meta
  });
}

function renderObjectListEmpty(container, titleKey, detailKey = '') {
  if (!container) return null;
  const title = el('strong', { text: t(titleKey) });
  const children = [title];
  if (detailKey) children.push(el('span', { text: t(detailKey) }));
  const empty = el('div', { className: 'object-empty-state' }, children);
  empty.setAttribute('role', 'status');
  container.appendChild(empty);
  container.setAttribute('aria-busy', 'false');
  return empty;
}

function syncMapObjectLayerState(layer, type, id, selected, hovered) {
  const node = layer?.getElement?.();
  if (!node) return;
  node.classList.toggle('is-object-selected', selected);
  node.classList.toggle('is-object-hovered', hovered);
  node.setAttribute('aria-selected', selected ? 'true' : 'false');
  node.dataset.objectType = type;
  node.dataset.objectId = id;
}

function configureMapObjectLayer(layer, options = {}) {
  const { type, id, label = '', onActivate } = options;
  if (!layer || !type || !id) return;

  const applyAccessibility = () => {
    const node = layer.getElement?.();
    if (!node || node.dataset.objectKeyboardBound === 'true') return;
    node.dataset.objectKeyboardBound = 'true';
    node.tabIndex = 0;
    node.setAttribute('role', 'button');
    node.setAttribute('aria-label', label);
    node.addEventListener('focus', () => setObjectHover(type, id, true));
    node.addEventListener('blur', () => setObjectHover(type, id, false));
    node.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      if (typeof onActivate === 'function') onActivate();
      else activateObjectSelection(type, id, { focusMap: false, source: 'map-keyboard' });
    });
    syncObjectSelectionUi('layer-accessibility');
  };

  layer.on?.('add', applyAccessibility);
  layer.on?.('mouseover', () => setObjectHover(type, id, true));
  layer.on?.('mouseout', () => setObjectHover(type, id, false));
  applyAccessibility();
  window.requestAnimationFrame(applyAccessibility);
}

function pulseSelectionStatus() {
  const nodes = [ui.selectedZoneText?.closest('.ui-status-chip'), ui.selectedPointText?.closest('.ui-status-chip')]
    .filter(Boolean);
  nodes.forEach(node => node.classList.remove('is-updated'));
  window.requestAnimationFrame(() => nodes.forEach(node => node.classList.add('is-updated')));
  if (objectSelectionPulseTimer) window.clearTimeout(objectSelectionPulseTimer);
  objectSelectionPulseTimer = window.setTimeout(() => {
    nodes.forEach(node => node.classList.remove('is-updated'));
    objectSelectionPulseTimer = null;
  }, 420);
}

function syncObjectSelectionUi(reason = 'sync', options = {}) {
  const selection = getSelectedObjectDescriptor();
  const contextZoneId = selection?.type === 'point' ? state.selectedZoneId : null;

  document.querySelectorAll('[data-object-type][data-object-id]').forEach(node => {
    const selected = Boolean(
      selection &&
      node.dataset.objectType === selection.type &&
      node.dataset.objectId === selection.id
    );
    const contextual = Boolean(
      contextZoneId &&
      node.dataset.objectType === 'zone' &&
      node.dataset.objectId === contextZoneId
    );
    node.classList.toggle('is-selected', selected);
    node.classList.toggle('selected', selected);
    node.classList.toggle('is-context', contextual && !selected);
    node.setAttribute('aria-selected', selected ? 'true' : 'false');
    if (selected) node.setAttribute('aria-current', 'true');
    else node.removeAttribute('aria-current');
  });

  document.querySelectorAll('[role="listbox"], .object-list, #zonePointList, #queryResults')
    .forEach(normalizeObjectListTabStops);

  state.zoneLayers?.forEach((layer, id) => {
    syncMapObjectLayerState(layer, 'zone', id, selection?.type === 'zone' && selection.id === id, state.hoveredZoneId === id);
  });
  state.pointLayers?.forEach((layer, id) => {
    syncMapObjectLayerState(layer, 'point', id, selection?.type === 'point' && selection.id === id, state.hoveredPointId === id);
  });

  const summary = objectSelectionSummaryText(selection);
  if (ui.objectSelectionSummary) {
    ui.objectSelectionSummary.textContent = summary;
    ui.objectSelectionSummary.title = summary;
  }
  if (ui.mapSelectionAnnouncer) {
    ui.mapSelectionAnnouncer.textContent = summary;
    ui.mapSelectionAnnouncer.title = summary;
  }

  const position = getObjectSelectionPosition(selection);
  const canNavigate = position.total > 1;
  if (ui.btnPreviousObject) ui.btnPreviousObject.disabled = !canNavigate;
  if (ui.btnNextObject) ui.btnNextObject.disabled = !canNavigate;
  if (ui.btnFocusSelection) ui.btnFocusSelection.disabled = !selection;

  if (ui.rightInspectorPanel) {
    ui.rightInspectorPanel.dataset.selectionType = selection?.type || 'none';
  }
  document.documentElement.dataset.objectSelection = selection?.type || 'none';

  if (options.announce) {
    setObjectWorkflowFeedback(
      selection ? 'objectWorkflowSynced' : 'objectWorkflowHint',
      selection ? 'success' : 'neutral'
    );
    pulseSelectionStatus();
  }

  if (state.activeRightDrawerModule && ui.rightDrawerSummary) {
    const definition = typeof rightPanelModuleDefinitions === 'function'
      ? rightPanelModuleDefinitions()[state.activeRightDrawerModule]
      : null;
    if (definition?.summary) ui.rightDrawerSummary.textContent = definition.summary();
  }

  return { reason, selection, position };
}

function focusObjectSelection(selection = getSelectedObjectDescriptor()) {
  if (!selection) return false;
  if (selection.type === 'point') return focusPointOnMap(selection.id) !== false;
  if (selection.type === 'zone') return focusZoneOnMap(selection.id) !== false;
  return false;
}

function activateObjectSelection(type, id, options = {}) {
  const exists = type === 'point'
    ? state.points.some(point => point.id === id)
    : state.zones.some(zone => zone.id === id);
  if (!exists) {
    setObjectWorkflowFeedback('objectWorkflowMissingObject', 'error');
    return false;
  }

  if (options.focusMap !== false) {
    setObjectWorkflowFeedback('objectWorkflowLocating', 'busy', { restore: false });
  }
  if (type === 'point') selectPoint(id);
  else selectZone(id);
  syncObjectSelectionUi(`${options.source || 'workflow'}-activate`, { announce: options.focusMap === false });

  if (options.focusMap === false) return true;
  const focused = focusObjectSelection();
  window.setTimeout(() => {
    setObjectWorkflowFeedback(
      focused ? 'objectWorkflowLocated' : 'objectWorkflowNoGeometry',
      focused ? 'success' : 'warning'
    );
  }, OBJECT_FOCUS_FEEDBACK_MS);
  return focused;
}

function navigateObjectSelection(direction) {
  const selection = getSelectedObjectDescriptor();
  if (!selection) {
    setObjectWorkflowFeedback('objectWorkflowNoSelection', 'warning');
    return false;
  }
  const items = getObjectNavigationItems(selection.type);
  if (items.length < 2) {
    setObjectWorkflowFeedback('objectWorkflowSingleObject', 'neutral');
    return false;
  }
  const index = items.findIndex(item => item.id === selection.id);
  const nextIndex = (Math.max(index, 0) + direction + items.length) % items.length;
  return activateObjectSelection(selection.type, items[nextIndex].id, {
    focusMap: true,
    source: direction < 0 ? 'previous' : 'next'
  });
}

function focusCurrentObjectSelection() {
  const selection = getSelectedObjectDescriptor();
  if (!selection) {
    setObjectWorkflowFeedback('objectWorkflowNoSelection', 'warning');
    return false;
  }
  setObjectWorkflowFeedback('objectWorkflowLocating', 'busy', { restore: false });
  const focused = focusObjectSelection(selection);
  window.setTimeout(() => {
    setObjectWorkflowFeedback(
      focused ? 'objectWorkflowLocated' : 'objectWorkflowNoGeometry',
      focused ? 'success' : 'warning'
    );
  }, OBJECT_FOCUS_FEEDBACK_MS);
  return focused;
}

function bindObjectWorkflowEvents() {
  ui.btnPreviousObject?.addEventListener('click', () => navigateObjectSelection(-1));
  ui.btnFocusSelection?.addEventListener('click', focusCurrentObjectSelection);
  ui.btnNextObject?.addEventListener('click', () => navigateObjectSelection(1));
  syncObjectSelectionUi('bind');
}
