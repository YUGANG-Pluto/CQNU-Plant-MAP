const RIGHT_PANEL_COMPACT_VIEWPORT = 1180;
let rightPanelResizeTimer = null;
let rightDrawerMovedModule = null;
let rightDrawerReturnFocus = null;

function rightPanelModuleDefinitions() {
  return {
    zone: {
      card: ui.rightModuleZoneCard,
      button: ui.btnRightModuleZone,
      titleKey: 'zoneInfo',
      buttonKey: 'rightInspectorViewZoneInfo',
      summary: () => getSelectedZone() ? zoneDisplayName(getSelectedZone()) : t('notSelected')
    },
    point: {
      card: ui.rightModulePointCard,
      button: ui.btnRightModulePoint,
      titleKey: 'pointAndPlant',
      buttonKey: 'rightInspectorViewPointInfo',
      summary: () => getSelectedPoint() ? pointDisplayName(getSelectedPoint()) : t('notSelected')
    },
    list: {
      card: ui.rightModuleListCard,
      button: ui.btnRightModuleList,
      titleKey: 'zoneSpecies',
      buttonKey: 'rightInspectorViewPlantList',
      summary: () => {
        const zone = getSelectedZone();
        if (!zone) return t('notSelected');
        const pointCount = state.points.filter(point => point.zoneRef === zone.id).length;
        return `${zoneDisplayName(zone)} · ${pointCount}`;
      }
    }
  };
}

function getRightPanelContext() {
  const selectionType = getSelectedPoint()
    ? 'point'
    : getSelectedZone()
      ? 'zone'
      : 'none';
  const compact = window.innerWidth < RIGHT_PANEL_COMPACT_VIEWPORT;

  if (selectionType === 'point') {
    return {
      selectionType,
      compact,
      availableKeys: ['point', 'zone', 'list'],
      visibleKeys: ['point'],
      noteKey: 'rightInspectorPointContext'
    };
  }

  if (selectionType === 'zone') {
    return {
      selectionType,
      compact,
      availableKeys: ['zone', 'list'],
      visibleKeys: compact ? ['zone'] : ['zone', 'list'],
      noteKey: 'rightInspectorZoneContext'
    };
  }

  return {
    selectionType,
    compact,
    availableKeys: [],
    visibleKeys: [],
    noteKey: 'rightInspectorSelectPrompt'
  };
}

function returnRightDrawerModule() {
  if (!rightDrawerMovedModule) return;
  const { card, placeholder } = rightDrawerMovedModule;
  card.classList.remove('right-module-in-drawer');
  if (placeholder?.parentNode) {
    placeholder.parentNode.insertBefore(card, placeholder);
    placeholder.remove();
  } else {
    ui.rightInspectorPanel?.appendChild(card);
  }
  rightDrawerMovedModule = null;
}

function setRightPanelButtonState(activeKey = '') {
  Object.entries(rightPanelModuleDefinitions()).forEach(([key, item]) => {
    item.button?.classList.toggle('active', key === activeKey);
    item.button?.setAttribute('aria-pressed', key === activeKey ? 'true' : 'false');
  });
}

function setRightPanelDisplayMode(context) {
  const panel = ui.rightInspectorPanel;
  if (!panel) return;
  const visibleKeys = new Set(context.visibleKeys);
  const availableKeys = new Set(context.availableKeys);
  const buttonKeys = new Set(context.availableKeys.filter(key => !visibleKeys.has(key)));

  panel.dataset.rightPanelMode = 'context';
  panel.dataset.selectionType = context.selectionType;
  panel.classList.toggle('right-compact-mode', context.compact);
  panel.classList.toggle('right-stack-mode', !context.compact);

  Object.entries(rightPanelModuleDefinitions()).forEach(([key, item]) => {
    const visible = visibleKeys.has(key);
    const buttonVisible = buttonKeys.has(key);
    item.card?.classList.toggle('right-module-kept-visible', visible);
    item.card?.classList.toggle('right-module-buttonized', !visible);
    item.card?.setAttribute('aria-hidden', visible ? 'false' : 'true');
    if (item.button) {
      item.button.hidden = !buttonVisible;
      item.button.setAttribute('aria-hidden', buttonVisible ? 'false' : 'true');
      item.button.disabled = !availableKeys.has(key);
      const buttonText = t(item.buttonKey || item.titleKey);
      if (item.button.textContent !== buttonText) item.button.textContent = buttonText;
      item.button.title = buttonText;
    }
  });

  if (ui.rightModuleButtons) {
    ui.rightModuleButtons.hidden = buttonKeys.size === 0;
    ui.rightModuleButtons.setAttribute('aria-hidden', buttonKeys.size === 0 ? 'true' : 'false');
  }
  if (ui.rightPanelModeNote) {
    const noteText = t(context.noteKey);
    ui.rightPanelModeNote.textContent = noteText;
    ui.rightPanelModeNote.title = noteText;
  }
}

function scheduleRightPanelDisplayMode() {
  if (!ui.rightInspectorPanel) return;
  if (rightPanelResizeTimer) window.clearTimeout(rightPanelResizeTimer);
  rightPanelResizeTimer = window.setTimeout(refreshRightPanelDisplayMode, 80);
}

function refreshRightPanelDisplayMode() {
  if (!ui.rightInspectorPanel || rightDrawerMovedModule) return;
  const context = getRightPanelContext();
  setRightPanelDisplayMode(context);
}

function openRightInspectorDrawer(moduleKey) {
  const modules = rightPanelModuleDefinitions();
  const target = modules[moduleKey];
  const context = getRightPanelContext();
  if (!target?.card || !context.availableKeys.includes(moduleKey) || !ui.rightInspectorDrawer || !ui.rightDrawerBody) return;
  if (state.activeRightDrawerModule === moduleKey && !ui.rightInspectorDrawer.classList.contains('hidden')) {
    closeRightInspectorDrawer({ returnFocus: target.button });
    return;
  }

  returnRightDrawerModule();
  const placeholder = document.createComment(`right-module:${moduleKey}`);
  target.card.parentNode?.insertBefore(placeholder, target.card);
  target.card.classList.remove('right-module-buttonized', 'right-module-kept-visible');
  target.card.classList.add('right-module-in-drawer');
  target.card.setAttribute('aria-hidden', 'false');
  ui.rightDrawerBody.replaceChildren(target.card);
  if (ui.rightDrawerTitle) ui.rightDrawerTitle.textContent = t(target.titleKey);
  if (ui.rightDrawerSummary) {
    ui.rightDrawerSummary.textContent = target.summary();
    ui.rightDrawerSummary.title = ui.rightDrawerSummary.textContent;
  }
  rightDrawerMovedModule = { key: moduleKey, card: target.card, placeholder };
  rightDrawerReturnFocus = target.button || null;
  state.activeRightDrawerModule = moduleKey;
  setRightPanelButtonState(moduleKey);
  openLayerModal(ui.rightInspectorDrawer, { focusTarget: ui.btnCloseRightDrawer });
}

function closeRightInspectorDrawer(options = {}) {
  if (!ui.rightInspectorDrawer) return;
  const returnFocus = options.returnFocus || rightDrawerReturnFocus;
  if (ui.rightInspectorDrawer.classList.contains('hidden')) {
    returnRightDrawerModule();
    state.activeRightDrawerModule = '';
    setRightPanelButtonState('');
    return;
  }
  closeLayerModal(ui.rightInspectorDrawer, { instant: !!options.instant, returnFocus });
  const duration = options.instant ? 0 : getMotionDurationMs('--motion-duration', 580);
  window.setTimeout(() => {
    returnRightDrawerModule();
    state.activeRightDrawerModule = '';
    setRightPanelButtonState('');
    rightDrawerReturnFocus = null;
    refreshRightPanelDisplayMode('drawer-close');
  }, duration + 20);
}

function bindRightPanelEvents() {
  Object.entries(rightPanelModuleDefinitions()).forEach(([key, item]) => {
    item.button?.addEventListener('click', () => openRightInspectorDrawer(key));
  });
  ui.btnCloseRightDrawer?.addEventListener('click', () => closeRightInspectorDrawer());
  ui.rightInspectorDrawer?.querySelector('.layer-modal-backdrop')?.addEventListener('click', () => closeRightInspectorDrawer());
  window.addEventListener('resize', () => scheduleRightPanelDisplayMode('resize'));
  document.addEventListener('fullscreenchange', () => scheduleRightPanelDisplayMode('fullscreenchange'));
}
