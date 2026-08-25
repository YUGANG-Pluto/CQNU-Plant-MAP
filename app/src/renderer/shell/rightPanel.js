const RIGHT_PANEL_POINT_THRESHOLD = 10;
const RIGHT_PANEL_MODULE_THRESHOLD = 2;
const RIGHT_PANEL_MIN_SAFE_GAP = 8;
const RIGHT_PANEL_SMALL_VIEWPORT = 1180;
const RIGHT_PANEL_SEVERE_HEIGHT_RATIO = 1.28;
const RIGHT_PANEL_DENSE_HEIGHT_RATIO = 0.78;
let rightPanelResizeTimer = null;
let rightPanelRefreshFrame = null;
let rightPanelResizeObserver = null;
let rightPanelMutationObserver = null;
let rightDrawerMovedModule = null;
let rightDrawerReturnFocus = null;

function rightPanelModuleDefinitions() {
  return {
    zone: {
      card: ui.rightModuleZoneCard,
      button: ui.btnRightModuleZone,
      titleKey: 'zoneInfo',
      buttonKey: 'rightInspectorViewZoneInfo',
      order: 1,
      summary: () => getSelectedZone() ? zoneDisplayName(getSelectedZone()) : t('notSelected')
    },
    point: {
      card: ui.rightModulePointCard,
      button: ui.btnRightModulePoint,
      titleKey: 'pointAndPlant',
      buttonKey: 'rightInspectorViewPointInfo',
      order: 2,
      summary: () => getSelectedPoint() ? pointDisplayName(getSelectedPoint()) : t('notSelected')
    },
    list: {
      card: ui.rightModuleListCard,
      button: ui.btnRightModuleList,
      titleKey: 'zoneSpecies',
      buttonKey: 'rightInspectorViewPlantList',
      order: 3,
      summary: () => {
        const zone = getSelectedZone();
        const metrics = getRightPanelDensityMetrics();
        return zone ? `${zoneDisplayName(zone)} · ${metrics.currentPartitionPointCount}` : t('notSelected');
      }
    }
  };
}

function getRightPanelKeys() {
  return Object.keys(rightPanelModuleDefinitions());
}

function hasRectOverlap(rectA, rectB, gap = 0) {
  if (!rectA || !rectB) return false;
  if (rectA.width <= 0 || rectA.height <= 0 || rectB.width <= 0 || rectB.height <= 0) return false;
  return !(
    rectA.right + gap <= rectB.left ||
    rectA.left >= rectB.right + gap ||
    rectA.bottom + gap <= rectB.top ||
    rectA.top >= rectB.bottom + gap
  );
}

function getVisibleRightPanelModules() {
  return Object.entries(rightPanelModuleDefinitions())
    .map(([key, item]) => ({ key, ...item }))
    .filter(item => item.card && getComputedStyle(item.card).display !== 'none');
}

function getRightPanelDensityMetrics() {
  const selectedZone = getSelectedZone();
  const zonePoints = selectedZone ? state.points.filter(point => point.zoneRef === selectedZone.id) : [];
  const currentPartitionPointCount = zonePoints.length;
  const currentPartitionPlantRecordCount = zonePoints.reduce((sum, point) => sum + Math.max(1, getPhenologyEntries(point).length || 0), 0);
  const currentPartitionPlantListItemCount = ui.zonePointList
    ? Array.from(ui.zonePointList.children).filter(child => !child.classList.contains('empty')).length
    : currentPartitionPointCount;
  const selectedPointImageCount = normalizeImages(getSelectedPhenologyEntry(getSelectedPoint())?.images || getSelectedPoint()?.images || []).length;
  const densityRisk = currentPartitionPointCount > RIGHT_PANEL_POINT_THRESHOLD ||
    currentPartitionPlantRecordCount > RIGHT_PANEL_POINT_THRESHOLD ||
    currentPartitionPlantListItemCount > RIGHT_PANEL_POINT_THRESHOLD;

  return {
    currentPartitionPointCount,
    currentPartitionPlantRecordCount,
    currentPartitionPlantListItemCount,
    selectedPointImageCount,
    densityRisk
  };
}

function isTextOverflowing(element) {
  if (!element) return false;
  const style = getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT' || element.tagName === 'SELECT') return false;
  return element.scrollWidth > element.clientWidth + 2 || element.scrollHeight > element.clientHeight + 3;
}

function hasInteractiveOverlap(moduleItems) {
  const rects = moduleItems
    .filter(item => item?.card)
    .map(item => ({ key: item.key, element: item.card, rect: item.card.getBoundingClientRect() }));
  for (let i = 0; i < rects.length; i += 1) {
    for (let j = i + 1; j < rects.length; j += 1) {
      if (hasRectOverlap(rects[i].rect, rects[j].rect, RIGHT_PANEL_MIN_SAFE_GAP)) return true;
    }
  }
  return false;
}

function hasHiddenElementInterceptingClick(container) {
  if (!container) return false;
  return Array.from(container.querySelectorAll('[aria-hidden="true"], .hidden, .right-module-buttonized')).some(element => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== 'none' && style.pointerEvents !== 'none' && rect.width > 0 && rect.height > 0;
  });
}

function clearRightTextOverflowState(container = ui.rightInspectorPanel) {
  container?.querySelectorAll('.right-text-overflowing').forEach(element => {
    element.classList.remove('right-text-overflowing');
  });
  ui.rightInspectorPanel?.classList.remove('right-panel-text-risk', 'right-panel-density-risk');
  ui.rightModuleListCard?.classList.remove('right-plant-module-dense');
  ui.zonePointList?.classList.remove('zone-point-list--dense');
}

function collectRightPanelTextOverflow(moduleItems) {
  const textSelectors = [
    '.card-title-row h2',
    '.summary-box',
    '.subtle',
    '.pill',
    'button',
    'label',
    '.list-item .title',
    '.list-item .meta',
    '.zone-plant-name',
    '.zone-plant-sci',
    '.zone-plant-meta',
    '.zone-plant-note',
    '.zone-plant-file'
  ];
  const overflowing = [];
  moduleItems.forEach(item => {
    textSelectors.forEach(selector => {
      Array.from(item.card?.querySelectorAll(selector) || []).forEach(element => {
        if (isTextOverflowing(element)) overflowing.push({ key: item.key, element });
      });
    });
  });
  return overflowing;
}

function hasTextOverflowInRightPanel(moduleItems) {
  const overflowing = collectRightPanelTextOverflow(moduleItems);
  overflowing.forEach(({ element }) => {
    element.classList.add('right-text-overflowing');
    if (!element.title) element.title = element.textContent.trim();
  });
  return overflowing.length > 0;
}

function hasHitTestMismatch(moduleItems) {
  return moduleItems.some(item => Array.from(item.card?.querySelectorAll('button, input, textarea, select, [tabindex]') || []).some(element => {
    const style = getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.pointerEvents === 'none') return false;
    const rect = element.getBoundingClientRect();
    if (rect.width <= 2 || rect.height <= 2) return false;
    const x = Math.min(Math.max(rect.left + Math.min(rect.width / 2, 24), 0), window.innerWidth - 1);
    const y = Math.min(Math.max(rect.top + Math.min(rect.height / 2, 18), 0), window.innerHeight - 1);
    const hit = document.elementFromPoint(x, y);
    return !!hit && hit !== element && !element.contains(hit);
  }));
}

function getRightPanelRequiredStackHeight(panel, moduleItems) {
  if (!panel) return 0;
  const gap = RIGHT_PANEL_MIN_SAFE_GAP;
  const header = panel.querySelector('.right-inspector-header');
  return (header?.scrollHeight || 0) + moduleItems.reduce((sum, item) => sum + (item.card?.scrollHeight || 0), 0) + Math.max(0, moduleItems.length - 1) * gap;
}

function getRightPanelPrimaryKey() {
  if (getSelectedPoint()) return 'point';
  if (getSelectedZone()) return 'zone';
  return 'zone';
}

function selectPrimaryVisibleModules(context) {
  const allKeys = getRightPanelKeys();
  if (!context?.shouldCompactLowerModules) return allKeys;
  const primary = getRightPanelPrimaryKey();
  const secondary = primary === 'point' ? 'zone' : 'point';
  const severe = context.isSmallViewport ||
    context.denseContent ||
    context.currentPartitionPointCount > RIGHT_PANEL_POINT_THRESHOLD ||
    context.currentPartitionPlantRecordCount > RIGHT_PANEL_POINT_THRESHOLD ||
    context.currentPartitionPlantListItemCount > RIGHT_PANEL_POINT_THRESHOLD ||
    context.requiredStackHeight > context.rightPanelHeight * RIGHT_PANEL_SEVERE_HEIGHT_RATIO;
  if (severe) return [primary];
  return Array.from(new Set([primary, secondary])).filter(key => allKeys.includes(key));
}

function evaluateRightPanelLayout() {
  const panel = ui.rightInspectorPanel;
  if (!panel || rightDrawerMovedModule) return null;
  const definitions = rightPanelModuleDefinitions();
  Object.values(definitions).forEach(item => {
    item.card?.classList.remove('right-module-buttonized', 'right-module-kept-visible');
    item.card?.setAttribute('aria-hidden', 'false');
    item.button?.classList.remove('active');
    item.button?.setAttribute('aria-pressed', 'false');
  });
  clearRightTextOverflowState(panel);
  panel.classList.remove('right-compact-mode');
  panel.classList.add('right-stack-mode');

  const moduleItems = Object.entries(definitions)
    .map(([key, item]) => ({ key, ...item }))
    .filter(item => item.card);
  const density = getRightPanelDensityMetrics();
  ui.zonePointList?.classList.toggle('zone-point-list--dense', density.currentPartitionPlantListItemCount > RIGHT_PANEL_POINT_THRESHOLD);
  ui.rightModuleListCard?.classList.toggle('right-plant-module-dense', density.densityRisk);
  panel.classList.toggle('right-panel-density-risk', density.densityRisk);

  const availableHeight = panel.clientHeight || 0;
  const requiredStackHeight = getRightPanelRequiredStackHeight(panel, moduleItems);
  const overflow = panel.scrollHeight > panel.clientHeight + RIGHT_PANEL_MIN_SAFE_GAP ||
    panel.scrollWidth > panel.clientWidth + RIGHT_PANEL_MIN_SAFE_GAP;
  const overlap = hasInteractiveOverlap(moduleItems);
  const textOverflow = hasTextOverflowInRightPanel(moduleItems);
  const hitTestMismatch = hasHitTestMismatch(moduleItems);
  const hiddenIntercept = hasHiddenElementInterceptingClick(panel);
  const isSmallViewport = window.innerWidth < RIGHT_PANEL_SMALL_VIEWPORT;
  const moduleHeightRisk = requiredStackHeight > availableHeight + RIGHT_PANEL_MIN_SAFE_GAP ||
    (density.densityRisk && requiredStackHeight > availableHeight * RIGHT_PANEL_DENSE_HEIGHT_RATIO);
  const denseContent = density.densityRisk || density.selectedPointImageCount > 6;
  const shouldCompactLowerModules = overlap || hitTestMismatch || hiddenIntercept || moduleHeightRisk || isSmallViewport ||
    overflow || (density.densityRisk && textOverflow);
  const context = {
    pointCount: state.points.length,
    visibleModuleCount: moduleItems.length,
    overflow,
    overlap,
    textOverflow,
    hitTestMismatch,
    hiddenIntercept,
    isSmallViewport,
    moduleHeightRisk,
    denseContent,
    rightPanelHeight: availableHeight,
    requiredStackHeight,
    shouldCompactLowerModules,
    ...density
  };
  panel.classList.toggle('right-panel-text-risk', textOverflow);
  context.modulesToKeepVisible = selectPrimaryVisibleModules(context);
  context.modulesToButtonize = shouldCompactLowerModules
    ? moduleItems.map(item => item.key).filter(key => !context.modulesToKeepVisible.includes(key))
    : [];
  return context;
}

function rightPanelModeReason(context) {
  if (!context) return t('rightInspectorStackSafe');
  if (!context.shouldCompactLowerModules) return t('rightInspectorStackSafe');
  if (context.denseContent || context.currentPartitionPointCount > RIGHT_PANEL_POINT_THRESHOLD ||
    context.currentPartitionPlantRecordCount > RIGHT_PANEL_POINT_THRESHOLD ||
    context.currentPartitionPlantListItemCount > RIGHT_PANEL_POINT_THRESHOLD) {
    return t('rightInspectorButtonizeByZoneDensity');
  }
  if (context.isSmallViewport) return t('rightInspectorButtonizeByViewport');
  if (context.overlap) return t('rightInspectorButtonizeByOverlap');
  if (context.hitTestMismatch || context.hiddenIntercept) return t('rightInspectorButtonizeByHitTest');
  if (context.textOverflow) return t('rightInspectorButtonizeByText');
  if (context.overflow || context.requiredStackHeight > context.rightPanelHeight) return t('rightInspectorButtonizeByOverflow');
  return t('rightInspectorButtonizeGeneric');
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

function setRightPanelDisplayMode(context, reason = '') {
  const panel = ui.rightInspectorPanel;
  if (!panel) return;
  const modulesToButtonize = new Set(context?.modulesToButtonize || []);
  const hasButtonizedModules = modulesToButtonize.size > 0;
  panel.classList.toggle('right-compact-mode', hasButtonizedModules);
  panel.classList.toggle('right-stack-mode', !hasButtonizedModules);
  panel.dataset.rightPanelMode = hasButtonizedModules ? 'compact' : 'stack';
  state.rightPanelMode = hasButtonizedModules ? 'compact' : 'stack';
  Object.entries(rightPanelModuleDefinitions()).forEach(([key, item]) => {
    const isButtonized = modulesToButtonize.has(key);
    item.card?.classList.toggle('right-module-buttonized', isButtonized);
    item.card?.classList.toggle('right-module-kept-visible', !isButtonized);
    item.card?.setAttribute('aria-hidden', isButtonized ? 'true' : 'false');
    if (item.button) {
      item.button.hidden = !isButtonized;
      item.button.setAttribute('aria-hidden', isButtonized ? 'false' : 'true');
      const buttonText = t(item.buttonKey || item.titleKey);
      if (item.button.textContent !== buttonText) item.button.textContent = buttonText;
      const buttonTitle = item.card?.querySelector('.card-title-row h2')?.textContent?.trim() || t(item.titleKey);
      if (item.button.title !== buttonTitle) item.button.title = buttonTitle;
    }
  });
  if (ui.rightPanelModeNote) {
    const noteText = reason || rightPanelModeReason(context);
    if (ui.rightPanelModeNote.textContent !== noteText) ui.rightPanelModeNote.textContent = noteText;
    if (ui.rightPanelModeNote.title !== noteText) ui.rightPanelModeNote.title = noteText;
  }
  if (!hasButtonizedModules) closeRightInspectorDrawer({ instant: true });
}

function scheduleRightPanelDisplayMode(reason = 'refresh') {
  if (!ui.rightInspectorPanel) return;
  if (rightPanelResizeTimer) window.clearTimeout(rightPanelResizeTimer);
  rightPanelResizeTimer = window.setTimeout(() => {
    if (rightPanelRefreshFrame) window.cancelAnimationFrame(rightPanelRefreshFrame);
    rightPanelRefreshFrame = window.requestAnimationFrame(() => {
      rightPanelRefreshFrame = null;
      refreshRightPanelDisplayMode(reason);
    });
  }, 80);
}

function refreshRightPanelDisplayMode(reason = 'refresh') {
  if (!ui.rightInspectorPanel) return;
  if (rightDrawerMovedModule) return;
  const context = evaluateRightPanelLayout();
  if (!context) return;
  context.reason = reason;
  state.rightPanelDiagnostics = context;
  setRightPanelDisplayMode(context, rightPanelModeReason(context));
}

function openRightInspectorDrawer(moduleKey) {
  const modules = rightPanelModuleDefinitions();
  const target = modules[moduleKey];
  if (!target?.card || !ui.rightInspectorDrawer || !ui.rightDrawerBody) return;
  if (state.activeRightDrawerModule === moduleKey && !ui.rightInspectorDrawer.classList.contains('hidden')) {
    closeRightInspectorDrawer({ returnFocus: target.button });
    return;
  }
  const context = state.rightPanelDiagnostics || evaluateRightPanelLayout();
  if (context && !context.modulesToButtonize?.includes(moduleKey)) {
    context.modulesToButtonize = Array.from(new Set([...(context.modulesToButtonize || []), moduleKey]));
    context.modulesToKeepVisible = (context.modulesToKeepVisible || []).filter(key => key !== moduleKey);
    context.shouldCompactLowerModules = true;
    setRightPanelDisplayMode(context, rightPanelModeReason(context));
  }
  returnRightDrawerModule();
  const placeholder = document.createComment(`right-module:${moduleKey}`);
  target.card.parentNode?.insertBefore(placeholder, target.card);
  target.card.classList.remove('right-module-buttonized', 'right-module-kept-visible');
  target.card.classList.add('right-module-in-drawer');
  target.card.setAttribute('aria-hidden', 'false');
  ui.rightDrawerBody.innerHTML = '';
  ui.rightDrawerBody.appendChild(target.card);
  if (ui.rightDrawerTitle) ui.rightDrawerTitle.textContent = t(target.titleKey);
  if (ui.rightDrawerSummary) {
    ui.rightDrawerSummary.textContent = target.summary();
    ui.rightDrawerSummary.title = ui.rightDrawerSummary.textContent;
  }
  rightDrawerMovedModule = { key: moduleKey, card: target.card, placeholder };
  rightDrawerReturnFocus = target.button || null;
  state.activeRightDrawerModule = moduleKey;
  setRightPanelButtonState(moduleKey);
  ui.rightInspectorDrawer.classList.add('right-drawer-layer');
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
    scheduleRightPanelDisplayMode('drawer-close');
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
  ui.rightInspectorPanel?.addEventListener('load', () => scheduleRightPanelDisplayMode('asset-load'), true);
  ui.rightInspectorDrawer?.addEventListener('load', () => scheduleRightPanelDisplayMode('drawer-asset-load'), true);
  if (typeof ResizeObserver !== 'undefined' && ui.rightInspectorPanel) {
    rightPanelResizeObserver = new ResizeObserver(() => scheduleRightPanelDisplayMode('right-panel-resize-observer'));
    rightPanelResizeObserver.observe(ui.rightInspectorPanel);
    Object.values(rightPanelModuleDefinitions()).forEach(item => item.card && rightPanelResizeObserver.observe(item.card));
  }
  if (typeof MutationObserver !== 'undefined' && ui.rightInspectorPanel) {
    rightPanelMutationObserver = new MutationObserver(() => scheduleRightPanelDisplayMode('right-panel-content-mutation'));
    rightPanelMutationObserver.observe(ui.rightInspectorPanel, { childList: true, characterData: true, subtree: true });
  }
}
