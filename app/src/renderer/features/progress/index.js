const progressTasks = new Map();

const PROGRESS_DEFAULTS = Object.freeze({
  height: 8,
  radius: 999,
  speed: 260,
  showPercent: true,
  showStage: true,
  mode: 'standard',
  glass: false
});


const PROGRESS_STATUS_ICONS = Object.freeze({
  running: '…',
  success: '✔',
  error: '❌',
  cancelled: '⚠'
});

function yieldToUi() {
  return new Promise(resolve => window.requestAnimationFrame(() => resolve()));
}

function calculateStageProgress(stageStart, stageEnd, completed, total) {
  const safeTotal = Math.max(1, Number(total) || 1);
  const ratio = Math.max(0, Math.min(1, (Number(completed) || 0) / safeTotal));
  return Math.round(stageStart + (stageEnd - stageStart) * ratio);
}

function ensureProgressRoot() {
  let root = document.getElementById('progressDock');
  if (root) return root;
  root = document.createElement('div');
  root.id = 'progressDock';
  root.className = 'progress-dock';
  document.body.appendChild(root);
  return root;
}

function progressSettings() {
  const settings = state.settings?.uiTheme?.progress || {};
  return { ...PROGRESS_DEFAULTS, ...settings };
}

function applyProgressVariables() {
  const cfg = progressSettings();
  const style = document.documentElement.style;
  style.setProperty('--progress-height', `${Number(cfg.height) || PROGRESS_DEFAULTS.height}px`);
  style.setProperty('--progress-radius', `${Number(cfg.radius) || PROGRESS_DEFAULTS.radius}px`);
  style.setProperty('--progress-speed', `${Number(cfg.speed) || PROGRESS_DEFAULTS.speed}ms`);
  document.documentElement.classList.toggle('progress-mode-compact', cfg.mode === 'compact');
  document.documentElement.classList.toggle('progress-mode-display', cfg.mode === 'display');
  document.documentElement.classList.toggle('progress-glass', !!cfg.glass);
}

function clampProgressPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.max(0, Math.min(100, number));
}

function createProgressTask({ type = 'task', title = '', stage = '', total = 0 } = {}) {
  const id = `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const cfg = progressSettings();
  const root = ensureProgressRoot();
  const node = document.createElement('section');
  node.className = 'progress-card running';
  node.dataset.taskId = id;
  node.innerHTML = `
    <div class="progress-head">
      <strong class="progress-title"><span class="progress-status-icon">${PROGRESS_STATUS_ICONS.running}</span>${escapeHtml(title || type)}</strong>
      <button class="progress-close" type="button" aria-label="close">×</button>
    </div>
    <div class="progress-stage">${escapeHtml(stage || t('progressPreparing'))}</div>
    <div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="progress-fill" style="transform:scaleX(0)"></div></div>
    <div class="progress-meta">
      <span class="progress-percent">${cfg.showPercent ? '0%' : ''}</span>
      <span class="progress-count"></span>
    </div>
  `;
  node.querySelector('.progress-close').addEventListener('click', () => removeProgressTask(id));
  root.appendChild(node);
  progressTasks.set(id, { id, type, total, completed: 0, percent: 0, status: 'running', node });
  return id;
}

function updateProgressTask(id, patch = {}) {
  const task = progressTasks.get(id);
  if (!task) return;
  const cfg = progressSettings();
  const node = task.node;
  const completed = Number(patch.completed ?? task.completed ?? 0);
  const total = Number(patch.total ?? task.total ?? 0);
  const rawPercent = clampProgressPercent(
    patch.percent ?? (total > 0 ? completed / total * 100 : null)
  );
  const status = patch.status || task.status || 'running';
  const percent = rawPercent === null ? null : Math.max(task.percent || 0, rawPercent);

  task.completed = completed;
  task.total = total;
  task.status = status;
  if (percent !== null) task.percent = percent;

  const statusIcon = node.querySelector('.progress-status-icon');
  if (statusIcon) statusIcon.textContent = PROGRESS_STATUS_ICONS[status] || PROGRESS_STATUS_ICONS.running;
  if (patch.stage && cfg.showStage) node.querySelector('.progress-stage').textContent = patch.stage;
  if (patch.message) node.querySelector('.progress-stage').textContent = patch.message;
  if (percent !== null) {
    node.classList.remove('indeterminate');
    node.querySelector('.progress-fill').style.transform = `scaleX(${(percent / 100).toFixed(3)})`;
    node.querySelector('.progress-percent').textContent = cfg.showPercent ? `${percent.toFixed(0)}%` : '';
    node.querySelector('.progress-track')?.setAttribute('aria-valuenow', String(Math.round(percent)));
  } else {
    node.classList.add('indeterminate');
    node.querySelector('.progress-percent').textContent = cfg.showPercent ? t('progressRunning') : '';
  }
  node.querySelector('.progress-count').textContent = total > 0 ? `${completed}/${total}` : '';
}

function finishProgressTask(id, message = '') {
  const task = progressTasks.get(id);
  if (!task) return;
  updateProgressTask(id, { percent: 100, message: message || t('progressDone'), status: 'success' });
  task.node.classList.remove('running', 'indeterminate');
  task.node.classList.add('success');
  window.setTimeout(() => removeProgressTask(id), 1800);
}

function failProgressTask(id, message = '') {
  const task = progressTasks.get(id);
  if (!task) return;
  updateProgressTask(id, { message: message || t('progressFailed'), status: 'error' });
  task.node.classList.remove('running', 'indeterminate');
  task.node.classList.add('error');
}

function cancelProgressTask(id, message = '') {
  const task = progressTasks.get(id);
  if (!task) return;
  updateProgressTask(id, { message: message || t('progressCancelled'), status: 'cancelled' });
  task.node.classList.remove('running', 'indeterminate');
  task.node.classList.add('cancelled');
  window.setTimeout(() => removeProgressTask(id), 1200);
}

function removeProgressTask(id) {
  const task = progressTasks.get(id);
  if (!task) return;
  task.node.remove();
  progressTasks.delete(id);
}

async function withProgressTask(options, runner) {
  const id = createProgressTask(options);
  try {
    updateProgressTask(id, { percent: 0, stage: options.stage || t('progressPreparing') });
    const result = await runner({
      id,
      update: patch => updateProgressTask(id, patch)
    });
    if (result === false || result?.cancelled || result?.canceled) {
      cancelProgressTask(id, options.cancelled || t('progressCancelled'));
      return result;
    }
    finishProgressTask(id, options.done || t('progressDone'));
    return result;
  } catch (error) {
    failProgressTask(id, error.message || String(error));
    throw error;
  }
}
