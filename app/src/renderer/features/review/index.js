const reviewWorkbenchSession = {
  queue: null,
  visibleTasks: [],
  selectedTaskId: '',
  filters: { issue: '', zone: '', severity: '', search: '' }
};

function isReviewWorkbenchOpen() {
  return Boolean(ui.reviewWorkbenchModal && !ui.reviewWorkbenchModal.classList.contains('hidden'));
}

function buildReviewWorkbenchQueue() {
  const bridge = window.researchReview;
  reviewWorkbenchSession.queue = bridge?.build(state.zones, state.points) || {
    totalPoints: state.points.length,
    readyPoints: state.points.length,
    pendingPoints: 0,
    openIssueCount: 0,
    progressPercent: state.points.length ? 100 : 0,
    tasks: [],
    issueCounts: {}
  };
  return reviewWorkbenchSession.queue;
}

function reviewZoneLabel(task) {
  const zone = state.zones.find(item => item.id === task?.zoneInternalId);
  return zone ? zoneDisplayName(zone) : t('unassignedZone');
}

function reviewSeverityLabel(severity) {
  return t({
    high: 'reviewSeverityHigh',
    medium: 'reviewSeverityMedium',
    low: 'reviewSeverityLow'
  }[severity] || 'reviewSeverityLow');
}

function reviewIssueDefinition(issueId) {
  return window.researchReview?.definitions.find(item => item.id === issueId) || null;
}

function reviewIssueLabel(issue) {
  return t(issue?.labelKey || reviewIssueDefinition(issue?.id)?.labelKey || 'reviewUnknownIssue');
}

function setReviewSelectOptions(select, options, currentValue = '') {
  if (!select) return '';
  clearNode(select);
  options.forEach(option => {
    select.appendChild(el('option', { value: option.value, text: option.label }));
  });
  const nextValue = options.some(option => option.value === currentValue) ? currentValue : '';
  select.value = nextValue;
  return nextValue;
}

function populateReviewFilters(queue) {
  const issueOptions = [{ value: '', label: t('reviewAllIssues') }];
  window.researchReview?.definitions.forEach(definition => {
    const count = Number(queue.issueCounts?.[definition.id] || 0);
    if (!count) return;
    issueOptions.push({ value: definition.id, label: `${t(definition.labelKey)} (${count})` });
  });
  reviewWorkbenchSession.filters.issue = setReviewSelectOptions(
    ui.reviewIssueFilter,
    issueOptions,
    reviewWorkbenchSession.filters.issue
  );

  const zoneIds = new Set(queue.tasks.map(task => task.zoneInternalId || '__unassigned__'));
  const zoneOptions = [{ value: '', label: t('reviewAllZones') }];
  state.zones.forEach(zone => {
    if (zoneIds.has(zone.id)) zoneOptions.push({ value: zone.id, label: zoneDisplayName(zone) });
  });
  if (zoneIds.has('__unassigned__')) zoneOptions.push({ value: '__unassigned__', label: t('unassignedZone') });
  reviewWorkbenchSession.filters.zone = setReviewSelectOptions(
    ui.reviewZoneFilter,
    zoneOptions,
    reviewWorkbenchSession.filters.zone
  );
  if (ui.reviewSeverityFilter) ui.reviewSeverityFilter.value = reviewWorkbenchSession.filters.severity;
  if (ui.reviewSearch && ui.reviewSearch.value !== reviewWorkbenchSession.filters.search) {
    ui.reviewSearch.value = reviewWorkbenchSession.filters.search;
  }
}

function reviewTaskMatchesFilters(task) {
  const filters = reviewWorkbenchSession.filters;
  if (filters.issue && !task.issues.some(issue => issue.id === filters.issue)) return false;
  if (filters.zone && (task.zoneInternalId || '__unassigned__') !== filters.zone) return false;
  if (filters.severity && task.severity !== filters.severity) return false;
  if (filters.search) {
    const zoneLabel = reviewZoneLabel(task).toLocaleLowerCase();
    const issueLabels = task.issues.map(reviewIssueLabel).join(' ').toLocaleLowerCase();
    if (!`${task.searchText} ${zoneLabel} ${issueLabels}`.includes(filters.search)) return false;
  }
  return true;
}

function updateReviewOverview(queue) {
  if (ui.reviewTotalPoints) ui.reviewTotalPoints.textContent = String(queue.totalPoints);
  if (ui.reviewReadyPoints) ui.reviewReadyPoints.textContent = String(queue.readyPoints);
  if (ui.reviewPendingPoints) ui.reviewPendingPoints.textContent = String(queue.pendingPoints);
  if (ui.reviewOpenIssueCount) ui.reviewOpenIssueCount.textContent = String(queue.openIssueCount);
  const progress = Math.max(0, Math.min(100, Number(queue.progressPercent || 0)));
  if (ui.reviewProgressPercent) ui.reviewProgressPercent.textContent = `${progress}%`;
  if (ui.reviewProgressBar) ui.reviewProgressBar.style.width = `${progress}%`;
  if (ui.reviewProgressTrack) {
    ui.reviewProgressTrack.setAttribute('aria-valuenow', String(progress));
    ui.reviewProgressTrack.setAttribute('aria-valuetext', `${progress}%`);
  }
}

function renderReviewEmpty(container, messageKey, detailKey = '') {
  const children = [el('strong', { text: t(messageKey) })];
  if (detailKey) children.push(el('span', { text: t(detailKey) }));
  container.appendChild(el('div', { className: 'review-empty-state' }, children));
}

function formatReviewIssueCount(count) {
  return t('reviewIssueCount').replace('{count}', String(count));
}

function createReviewTaskCard(task) {
  const zoneLabel = reviewZoneLabel(task);
  const title = task.displayName || task.pointId || t('unnamedPoint');
  const meta = `${zoneLabel} · ${task.pointId} · ${formatReviewIssueCount(task.issues.length)}`;
  const copy = el('span', { className: 'review-task-card__copy' }, [
    el('span', { className: 'review-task-card__title', text: title, title }),
    el('span', { className: 'review-task-card__meta', text: meta, title: meta })
  ]);
  const severity = el('span', {
    className: `review-severity-badge is-${task.severity}`,
    text: reviewSeverityLabel(task.severity)
  });
  const card = el('button', {
    className: `review-task-card${task.id === reviewWorkbenchSession.selectedTaskId ? ' is-selected' : ''}`,
    title: [title, task.scientificName, meta].filter(Boolean).join('\n'),
    dataset: { reviewTaskId: task.id }
  }, [copy, severity]);
  card.type = 'button';
  card.setAttribute('role', 'option');
  card.setAttribute('aria-selected', task.id === reviewWorkbenchSession.selectedTaskId ? 'true' : 'false');
  card.addEventListener('click', () => setReviewTaskSelection(task.id, { focus: false }));
  return card;
}

function currentReviewTask() {
  return reviewWorkbenchSession.visibleTasks.find(task => task.id === reviewWorkbenchSession.selectedTaskId) || null;
}

function renderReviewTaskDetail() {
  if (!ui.reviewTaskDetail) return;
  clearNode(ui.reviewTaskDetail);
  const task = currentReviewTask();
  const hasTask = Boolean(task);
  [ui.btnPreviousReviewTask, ui.btnNextReviewTask, ui.btnLocateReviewTask, ui.btnEditReviewTask]
    .forEach(button => { if (button) button.disabled = !hasTask; });
  if (!task) {
    if (ui.reviewSelectionPosition) ui.reviewSelectionPosition.textContent = t('reviewSelectTaskHint');
    renderReviewEmpty(
      ui.reviewTaskDetail,
      reviewWorkbenchSession.visibleTasks.length ? 'reviewSelectTask' : 'reviewNoMatchingTasks',
      reviewWorkbenchSession.visibleTasks.length ? '' : 'reviewAdjustFilters'
    );
    return;
  }

  const index = reviewWorkbenchSession.visibleTasks.findIndex(item => item.id === task.id);
  if (ui.reviewSelectionPosition) {
    ui.reviewSelectionPosition.textContent = t('reviewTaskPosition')
      .replace('{current}', String(index + 1))
      .replace('{total}', String(reviewWorkbenchSession.visibleTasks.length));
  }
  const zoneLabel = reviewZoneLabel(task);
  const identityMeta = [zoneLabel, task.pointId, task.scientificName].filter(Boolean).join(' · ');
  ui.reviewTaskDetail.appendChild(el('div', { className: 'review-detail-identity' }, [
    el('h4', { text: task.displayName, title: task.displayName }),
    el('p', { text: identityMeta, title: identityMeta })
  ]));
  const issueList = el('div', { className: 'review-issue-list' });
  task.issues.forEach(issue => {
    issueList.appendChild(el('article', { className: 'review-issue-row' }, [
      el('span', {
        className: `review-issue-badge is-${issue.severity}`,
        text: reviewSeverityLabel(issue.severity)
      }),
      el('div', {}, [
        el('strong', { text: reviewIssueLabel(issue) }),
        el('p', { text: t(issue.detailKey) })
      ])
    ]));
  });
  ui.reviewTaskDetail.appendChild(issueList);
}

function renderReviewTaskList() {
  if (!ui.reviewTaskList) return;
  clearNode(ui.reviewTaskList);
  if (ui.reviewVisibleCount) ui.reviewVisibleCount.textContent = String(reviewWorkbenchSession.visibleTasks.length);
  if (!reviewWorkbenchSession.visibleTasks.length) {
    const hasNoPoints = Number(reviewWorkbenchSession.queue?.totalPoints || 0) === 0;
    renderReviewEmpty(
      ui.reviewTaskList,
      reviewWorkbenchSession.queue?.tasks.length
        ? 'reviewNoMatchingTasks'
        : hasNoPoints ? 'reviewNoPoints' : 'reviewAllReady',
      reviewWorkbenchSession.queue?.tasks.length
        ? 'reviewAdjustFilters'
        : hasNoPoints ? 'reviewNoPointsHint' : 'reviewAllReadyHint'
    );
    renderReviewTaskDetail();
    return;
  }
  reviewWorkbenchSession.visibleTasks.forEach(task => ui.reviewTaskList.appendChild(createReviewTaskCard(task)));
  renderReviewTaskDetail();
}

function setReviewTaskSelection(taskId, options = {}) {
  const task = reviewWorkbenchSession.visibleTasks.find(item => item.id === taskId);
  if (!task) return false;
  reviewWorkbenchSession.selectedTaskId = task.id;
  Array.from(ui.reviewTaskList?.querySelectorAll('[data-review-task-id]') || []).forEach(node => {
    const selected = node.dataset.reviewTaskId === task.id;
    node.classList.toggle('is-selected', selected);
    node.setAttribute('aria-selected', selected ? 'true' : 'false');
  });
  activateObjectSelection('point', task.pointInternalId, { focusMap: false, source: 'review-workbench' });
  renderReviewTaskDetail();
  if (options.focus !== false) {
    ui.reviewTaskList?.querySelector(`[data-review-task-id="${CSS.escape(task.id)}"]`)?.focus();
  }
  return true;
}

function applyReviewFilters() {
  const queue = reviewWorkbenchSession.queue || buildReviewWorkbenchQueue();
  reviewWorkbenchSession.visibleTasks = queue.tasks.filter(reviewTaskMatchesFilters);
  if (!reviewWorkbenchSession.visibleTasks.some(task => task.id === reviewWorkbenchSession.selectedTaskId)) {
    reviewWorkbenchSession.selectedTaskId = reviewWorkbenchSession.visibleTasks[0]?.id || '';
  }
  renderReviewTaskList();
}

function refreshReviewWorkbench() {
  if (!isReviewWorkbenchOpen()) return;
  const queue = buildReviewWorkbenchQueue();
  updateReviewOverview(queue);
  populateReviewFilters(queue);
  applyReviewFilters();
}

function openReviewWorkbench() {
  if (!requireProject()) return false;
  const queue = buildReviewWorkbenchQueue();
  updateReviewOverview(queue);
  populateReviewFilters(queue);
  applyReviewFilters();
  openLayerModal(ui.reviewWorkbenchModal, { focusTarget: ui.reviewIssueFilter });
  return true;
}

function closeReviewWorkbench() {
  closeLayerModal(ui.reviewWorkbenchModal, { returnFocus: ui.btnOpenReviewWorkbench });
}

function navigateReviewTask(direction) {
  const tasks = reviewWorkbenchSession.visibleTasks;
  if (!tasks.length) return false;
  const index = tasks.findIndex(task => task.id === reviewWorkbenchSession.selectedTaskId);
  const nextIndex = (Math.max(index, 0) + direction + tasks.length) % tasks.length;
  return setReviewTaskSelection(tasks[nextIndex].id);
}

function locateCurrentReviewTask() {
  const task = currentReviewTask();
  if (!task) return;
  closeReviewWorkbench();
  window.setTimeout(() => {
    activateObjectSelection('point', task.pointInternalId, { focusMap: true, source: 'review-locate' });
  }, getMotionDurationMs('--motion-duration-fast', 300) + 20);
}

function editCurrentReviewTask() {
  const task = currentReviewTask();
  if (!task) return;
  activateObjectSelection('point', task.pointInternalId, { focusMap: false, source: 'review-edit' });
  openPointEditor();
}

function resetReviewFilters() {
  reviewWorkbenchSession.filters = { issue: '', zone: '', severity: '', search: '' };
  populateReviewFilters(reviewWorkbenchSession.queue || buildReviewWorkbenchQueue());
  applyReviewFilters();
}

function syncReviewFilterState() {
  reviewWorkbenchSession.filters.issue = ui.reviewIssueFilter?.value || '';
  reviewWorkbenchSession.filters.zone = ui.reviewZoneFilter?.value || '';
  reviewWorkbenchSession.filters.severity = ui.reviewSeverityFilter?.value || '';
  reviewWorkbenchSession.filters.search = String(ui.reviewSearch?.value || '').trim().toLocaleLowerCase();
  applyReviewFilters();
}

function handleReviewTaskListKey(event) {
  const card = event.target?.closest?.('[data-review-task-id]');
  if (!card || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const tasks = reviewWorkbenchSession.visibleTasks;
  const currentIndex = tasks.findIndex(task => task.id === card.dataset.reviewTaskId);
  let nextIndex = currentIndex;
  if (event.key === 'ArrowDown') nextIndex = Math.min(tasks.length - 1, currentIndex + 1);
  if (event.key === 'ArrowUp') nextIndex = Math.max(0, currentIndex - 1);
  if (event.key === 'Home') nextIndex = 0;
  if (event.key === 'End') nextIndex = tasks.length - 1;
  if (tasks[nextIndex]) setReviewTaskSelection(tasks[nextIndex].id);
}

function bindReviewWorkbenchEvents() {
  ui.btnOpenReviewWorkbench?.addEventListener('click', openReviewWorkbench);
  ui.btnCloseReviewWorkbench?.addEventListener('click', closeReviewWorkbench);
  ui.reviewWorkbenchModal?.querySelector('.layer-modal-backdrop')?.addEventListener('click', closeReviewWorkbench);
  [ui.reviewIssueFilter, ui.reviewZoneFilter, ui.reviewSeverityFilter]
    .forEach(node => node?.addEventListener('change', syncReviewFilterState));
  ui.reviewSearch?.addEventListener('input', syncReviewFilterState);
  ui.btnResetReviewFilters?.addEventListener('click', resetReviewFilters);
  ui.btnPreviousReviewTask?.addEventListener('click', () => navigateReviewTask(-1));
  ui.btnNextReviewTask?.addEventListener('click', () => navigateReviewTask(1));
  ui.btnLocateReviewTask?.addEventListener('click', locateCurrentReviewTask);
  ui.btnEditReviewTask?.addEventListener('click', editCurrentReviewTask);
  ui.reviewTaskList?.addEventListener('keydown', handleReviewTaskListKey);
}
