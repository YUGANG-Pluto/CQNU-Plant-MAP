import { clearCsrfToken, ManagementApiError, managementApi } from './manage-api.js';
import { formatDateTime, label } from './manage-i18n.js';

const state = {
  account: null,
  session: null,
  capabilities: [],
  members: [],
  activeView: 'overview',
  heartbeatId: 0,
  issuedLink: ''
};

const authStage = document.querySelector('[data-auth-stage]');
const manageShell = document.querySelector('[data-manage-shell]');
const authLoading = document.querySelector('[data-auth-loading]');
const loginForm = document.querySelector('[data-login-form]');
const activationForm = document.querySelector('[data-activation-form]');
const tokenForm = document.querySelector('[data-token-form]');
const manageContent = document.querySelector('[data-manage-content]');
const memberDialog = document.querySelector('[data-member-dialog]');
const memberForm = document.querySelector('[data-member-form]');
const tokenDialog = document.querySelector('[data-token-dialog]');

function messageTarget(form) {
  return form.querySelector('.form-message');
}

function showMessage(form, message = '') {
  const target = messageTarget(form);
  if (target) target.textContent = message;
}

function errorMessage(error) {
  if (error instanceof ManagementApiError) return error.message;
  return '请求未完成，请稍后重试。';
}

function isUnauthorized(error) {
  return error instanceof ManagementApiError && error.status === 401;
}

function safeNextPath() {
  const value = new URLSearchParams(location.search).get('next') || '';
  return /^\/(workspace|manage)$/u.test(value) ? value : '';
}

function credentialFragment() {
  const params = new URLSearchParams(location.hash.slice(1));
  const activation = params.get('activate');
  const reset = params.get('reset');
  if (activation) return { token: activation, purpose: 'activation' };
  if (reset) return { token: reset, purpose: 'password-reset' };
  return null;
}

function setBusy(form, busy) {
  form.setAttribute('aria-busy', String(busy));
  for (const control of form.querySelectorAll('button, input, select, textarea')) {
    control.disabled = busy;
  }
}

async function submitWithBusy(form, operation) {
  showMessage(form);
  setBusy(form, true);
  try {
    return await operation();
  } catch (error) {
    showMessage(form, errorMessage(error));
    throw error;
  } finally {
    setBusy(form, false);
  }
}

function showAuthForm(form) {
  stopHeartbeat();
  state.account = null;
  state.session = null;
  state.capabilities = [];
  authStage.hidden = false;
  manageShell.hidden = true;
  authLoading.hidden = true;
  for (const candidate of [loginForm, activationForm, tokenForm]) {
    candidate.hidden = candidate !== form;
  }
  requestAnimationFrame(() => form.querySelector('input:not([type="hidden"])')?.focus());
}

function resetToLogin(message = '') {
  clearCsrfToken();
  showAuthForm(loginForm);
  showMessage(loginForm, message);
}

function hasCapability(capability) {
  return state.capabilities.includes(capability);
}

function updateSessionState(data) {
  state.account = data.account;
  state.session = data.session;
  state.capabilities = Array.isArray(data.capabilities) ? data.capabilities : [];
}

function showActivation(data) {
  updateSessionState(data);
  activationForm.elements.username.value = data.account.username || '';
  activationForm.elements.displayName.value = data.account.displayName || '';
  activationForm.elements.currentPassword.value = '';
  activationForm.elements.password.value = '';
  activationForm.elements.confirmPassword.value = '';
  showAuthForm(activationForm);
}

function renderAccountSummary() {
  const account = state.account;
  const session = state.session;
  document.querySelector('[data-account-name]').textContent = account.displayName || account.username;
  document.querySelector('[data-account-role]').textContent = `${label('accountKind', account.accountKind)} · ${label('accessLevel', account.accessLevel)}`;
  document.querySelector('[data-avatar]').textContent = (account.displayName || account.username || 'A').slice(0, 1).toUpperCase();
  document.querySelector('[data-overview-kind]').textContent = label('accountKind', account.accountKind);
  document.querySelector('[data-overview-access]').textContent = label('accessLevel', account.accessLevel);
  document.querySelector('[data-overview-status]').textContent = label('status', account.status);
  document.querySelector('[data-overview-expiry]').textContent = formatDateTime(session.absoluteExpiresAt);
  document.querySelector('[data-session-expiry]').textContent = `会话至 ${formatDateTime(session.absoluteExpiresAt)}`;
  const accessNotes = {
    read: '查看项目，不写入变更',
    edit: '可编辑浏览器草稿，不提交本地项目',
    save: '可编辑并保存到用户授权的本地存储'
  };
  document.querySelector('[data-overview-access-note]').textContent = accessNotes[account.accessLevel] || '—';
  for (const element of document.querySelectorAll('[data-admin-only]')) {
    element.hidden = !hasCapability('member.read') && !hasCapability('audit.read');
  }
  document.querySelector('[data-username-form] input[name="username"]').value = account.username;
}

function renderCapabilities() {
  const list = document.querySelector('[data-capability-list]');
  list.replaceChildren();
  for (const capability of state.capabilities) {
    const item = document.createElement('li');
    const name = document.createElement('span');
    name.textContent = label('capability', capability);
    const enabled = document.createElement('strong');
    enabled.textContent = '已授权';
    item.append(name, enabled);
    list.append(item);
  }
  if (!state.capabilities.length) {
    const item = document.createElement('li');
    item.textContent = '当前账户尚未完成激活。';
    list.append(item);
  }
}

function showDashboard(data, options = {}) {
  updateSessionState(data);
  if (state.account.mustChangePassword) {
    showActivation(data);
    return;
  }
  const next = safeNextPath();
  if (options.followNext && next === '/workspace') {
    location.assign('/workspace');
    return;
  }
  authStage.hidden = true;
  manageShell.hidden = false;
  renderAccountSummary();
  renderCapabilities();
  switchView(hasCapability('member.read') || state.activeView !== 'members' ? state.activeView : 'overview');
  updateOnlineUi();
  startHeartbeat();
}

function switchView(viewName) {
  const targetButton = document.querySelector(`[data-view-target="${CSS.escape(viewName)}"]`);
  if (!targetButton || targetButton.hidden) viewName = 'overview';
  state.activeView = viewName;
  for (const button of document.querySelectorAll('[data-view-target]')) {
    if (button.dataset.viewTarget === viewName) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  }
  for (const view of document.querySelectorAll('[data-view]')) {
    const active = view.dataset.view === viewName;
    view.hidden = !active;
    view.classList.toggle('is-active', active);
  }
  manageContent.focus({ preventScroll: true });
  if (viewName === 'members') void loadMembers();
  if (viewName === 'audit') void loadAuditEvents();
}

function stopHeartbeat() {
  if (state.heartbeatId) window.clearInterval(state.heartbeatId);
  state.heartbeatId = 0;
}

async function heartbeat() {
  if (!navigator.onLine || !state.session) return;
  try {
    const data = await managementApi.heartbeat();
    updateSessionState(data);
    renderAccountSummary();
  } catch (error) {
    if (isUnauthorized(error)) resetToLogin('会话已失效，请重新登录。');
  }
}

function startHeartbeat() {
  stopHeartbeat();
  state.heartbeatId = window.setInterval(heartbeat, 45_000);
}

function updateOnlineUi() {
  const online = navigator.onLine;
  const stateElement = document.querySelector('[data-online-state]');
  stateElement.classList.toggle('is-offline', !online);
  stateElement.lastChild.textContent = online ? '在线' : '离线';
  document.querySelector('[data-offline-banner]').hidden = online;
  if (!online) stopHeartbeat();
}

function showToast(message, type = 'success') {
  const region = document.querySelector('[data-toast-region]');
  const toast = document.createElement('div');
  toast.className = `toast${type === 'error' ? ' is-error' : ''}`;
  toast.textContent = message;
  region.append(toast);
  window.setTimeout(() => {
    toast.classList.add('is-leaving');
    window.setTimeout(() => toast.remove(), 380);
  }, 3_600);
}

function cell(text, className = '') {
  const element = document.createElement('td');
  if (className) element.className = className;
  element.textContent = text;
  element.title = text;
  return element;
}

function memberRow(member) {
  const row = document.createElement('tr');
  row.dataset.memberId = member.id;
  const identity = document.createElement('td');
  const identityContent = document.createElement('div');
  identityContent.className = 'member-cell';
  const displayName = document.createElement('strong');
  displayName.textContent = member.displayName || member.username;
  const username = document.createElement('span');
  username.textContent = member.username;
  identityContent.append(displayName, username);
  identity.append(identityContent);
  const status = document.createElement('td');
  const statusBadge = document.createElement('span');
  statusBadge.className = 'status-badge';
  statusBadge.dataset.status = member.status;
  statusBadge.textContent = label('status', member.status);
  status.append(statusBadge);
  const actions = document.createElement('td');
  const actionsWrap = document.createElement('div');
  actionsWrap.className = 'row-actions';
  const edit = document.createElement('button');
  edit.type = 'button';
  edit.className = 'row-action';
  edit.dataset.memberEdit = member.id;
  edit.textContent = '编辑';
  edit.disabled = member.id === state.account.id;
  edit.title = edit.disabled ? '请在个人账户设置中修改自己的资料。' : '编辑成员权限与状态';
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'row-action';
  reset.dataset.memberReset = member.id;
  reset.textContent = '重置密码';
  reset.disabled = member.id === state.account.id || member.status === 'disabled';
  actionsWrap.append(edit, reset);
  actions.append(actionsWrap);
  row.append(
    identity,
    cell(label('accountKind', member.accountKind)),
    cell(label('accessLevel', member.accessLevel)),
    status,
    cell(formatDateTime(member.updatedAt)),
    actions
  );
  return row;
}

function renderMembers() {
  const query = document.querySelector('[data-member-search]').value.trim().toLocaleLowerCase();
  const visible = state.members.filter(member => (
    !query || member.username.toLocaleLowerCase().includes(query) || member.displayName.toLocaleLowerCase().includes(query)
  ));
  const body = document.querySelector('[data-member-rows]');
  body.replaceChildren(...visible.map(memberRow));
  document.querySelector('[data-member-count]').textContent = `${state.members.length} 名成员`;
  document.querySelector('[data-member-empty]').hidden = visible.length > 0;
}

async function loadMembers() {
  if (!hasCapability('member.read')) return;
  try {
    const data = await managementApi.listMembers();
    state.members = Array.isArray(data.members) ? data.members : [];
    renderMembers();
  } catch (error) {
    showToast(errorMessage(error), 'error');
    if (isUnauthorized(error)) resetToLogin('会话已失效，请重新登录。');
  }
}

function openMemberDialog(member = null) {
  memberForm.reset();
  showMessage(memberForm);
  memberForm.elements.memberId.value = member?.id || '';
  memberForm.elements.username.value = member?.username || '';
  memberForm.elements.username.disabled = Boolean(member);
  memberForm.elements.displayName.value = member?.displayName || '';
  memberForm.elements.accountKind.value = member?.accountKind || 'user';
  memberForm.elements.accessLevel.value = member?.accessLevel || 'read';
  memberForm.elements.status.value = member?.status || 'pending-activation';
  document.querySelector('[data-member-status-field]').hidden = !member;
  document.querySelector('[data-member-dialog-kicker]').textContent = member ? '编辑成员' : '新增成员';
  document.querySelector('[data-member-dialog-title]').textContent = member ? member.username : '配置访问权限';
  document.querySelector('[data-member-submit]').textContent = member ? '保存成员设置' : '创建并生成链接';
  syncMemberPermissionControls();
  memberDialog.showModal();
}

function syncMemberPermissionControls() {
  const administrator = memberForm.elements.accountKind.value === 'admin';
  memberForm.elements.accessLevel.value = administrator ? 'save' : memberForm.elements.accessLevel.value;
  memberForm.elements.accessLevel.disabled = administrator;
}

function showIssuedToken(data) {
  const purpose = data.purpose === 'activation' ? 'activate' : 'reset';
  state.issuedLink = `${location.origin}/manage#${purpose}=${encodeURIComponent(data.token)}`;
  document.querySelector('[data-issued-token-title]').textContent = data.purpose === 'activation'
    ? '激活成员账户'
    : '重置成员密码';
  document.querySelector('[data-issued-token-link]').value = state.issuedLink;
  document.querySelector('[data-issued-token-expiry]').textContent = formatDateTime(data.expiresAt);
  tokenDialog.showModal();
}

async function resetMember(memberId) {
  const member = state.members.find(item => item.id === memberId);
  if (!member || !confirm(`为 ${member.username} 签发一次性密码重置链接？其现有会话将立即失效。`)) return;
  try {
    showIssuedToken(await managementApi.resetMemberPassword(member.id));
    showToast('已签发一次性密码重置链接。');
  } catch (error) {
    showToast(errorMessage(error), 'error');
  }
}

async function loadAuditEvents() {
  if (!hasCapability('audit.read')) return;
  try {
    const data = await managementApi.listAuditEvents(100);
    const events = Array.isArray(data.events) ? data.events : [];
    const body = document.querySelector('[data-audit-rows]');
    body.replaceChildren(...events.map(event => {
      const row = document.createElement('tr');
      const outcome = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = 'status-badge';
      badge.dataset.outcome = event.outcome;
      badge.textContent = label('auditOutcome', event.outcome);
      outcome.append(badge);
      row.append(
        cell(formatDateTime(event.occurredAt)),
        cell(label('action', event.action)),
        outcome,
        cell(event.principalId),
        cell(event.requestId)
      );
      return row;
    }));
    document.querySelector('[data-audit-empty]').hidden = events.length > 0;
  } catch (error) {
    showToast(errorMessage(error), 'error');
  }
}

loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  try {
    const data = await submitWithBusy(loginForm, () => managementApi.login(
      loginForm.elements.username.value,
      loginForm.elements.password.value
    ));
    loginForm.elements.password.value = '';
    showDashboard(data, { followNext: true });
  } catch {
    loginForm.elements.password.value = '';
  }
});

activationForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (activationForm.elements.password.value !== activationForm.elements.confirmPassword.value) {
    showMessage(activationForm, '两次输入的新密码不一致。');
    return;
  }
  try {
    const data = await submitWithBusy(activationForm, () => managementApi.activate({
      currentPassword: activationForm.elements.currentPassword.value,
      username: activationForm.elements.username.value,
      displayName: activationForm.elements.displayName.value,
      password: activationForm.elements.password.value
    }));
    activationForm.reset();
    showToast('账户已激活。');
    showDashboard(data, { followNext: true });
  } catch {
    activationForm.elements.currentPassword.value = '';
    activationForm.elements.password.value = '';
    activationForm.elements.confirmPassword.value = '';
  }
});

tokenForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (tokenForm.elements.password.value !== tokenForm.elements.confirmPassword.value) {
    showMessage(tokenForm, '两次输入的新密码不一致。');
    return;
  }
  try {
    const data = await submitWithBusy(tokenForm, () => managementApi.consumeCredentialToken({
      token: tokenForm.elements.token.value,
      username: tokenForm.elements.username.value || undefined,
      displayName: tokenForm.elements.displayName.value || undefined,
      password: tokenForm.elements.password.value
    }));
    history.replaceState(null, '', '/manage');
    tokenForm.reset();
    showToast('登录凭据已更新。');
    showDashboard(data, { followNext: true });
  } catch {
    tokenForm.elements.password.value = '';
    tokenForm.elements.confirmPassword.value = '';
  }
});

memberForm.addEventListener('submit', async event => {
  event.preventDefault();
  const memberId = memberForm.elements.memberId.value;
  try {
    const result = await submitWithBusy(memberForm, () => memberId
      ? managementApi.updateMember(memberId, {
          displayName: memberForm.elements.displayName.value,
          accountKind: memberForm.elements.accountKind.value,
          accessLevel: memberForm.elements.accessLevel.value,
          status: memberForm.elements.status.value
        })
      : managementApi.createMember({
          username: memberForm.elements.username.value,
          displayName: memberForm.elements.displayName.value,
          accountKind: memberForm.elements.accountKind.value,
          accessLevel: memberForm.elements.accessLevel.value
        }));
    memberDialog.close();
    await loadMembers();
    if (!memberId) showIssuedToken(result);
    showToast(memberId ? '成员设置已更新。' : '成员已创建。');
  } catch {
    // The inline message is kept inside the active dialog.
  }
});

document.querySelector('[data-username-form]').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  try {
    const data = await submitWithBusy(form, () => managementApi.changeUsername({
      username: form.elements.username.value,
      currentPassword: form.elements.currentPassword.value
    }));
    form.elements.currentPassword.value = '';
    showToast('用户名已更新，其他会话已撤销。');
    showDashboard(data);
  } catch {
    form.elements.currentPassword.value = '';
  }
});

document.querySelector('[data-password-form]').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  if (form.elements.password.value !== form.elements.confirmPassword.value) {
    showMessage(form, '两次输入的新密码不一致。');
    return;
  }
  try {
    const data = await submitWithBusy(form, () => managementApi.changePassword({
      currentPassword: form.elements.currentPassword.value,
      password: form.elements.password.value
    }));
    form.reset();
    showToast('密码已更新，其他会话已撤销。');
    showDashboard(data);
  } catch {
    form.elements.currentPassword.value = '';
    form.elements.password.value = '';
    form.elements.confirmPassword.value = '';
  }
});

document.addEventListener('click', event => {
  const viewButton = event.target.closest('[data-view-target]');
  if (viewButton) switchView(viewButton.dataset.viewTarget);
  const editButton = event.target.closest('[data-member-edit]');
  if (editButton) openMemberDialog(state.members.find(member => member.id === editButton.dataset.memberEdit));
  const resetButton = event.target.closest('[data-member-reset]');
  if (resetButton) void resetMember(resetButton.dataset.memberReset);
});

document.querySelector('[data-open-create-member]').addEventListener('click', () => openMemberDialog());
document.querySelector('[data-member-search]').addEventListener('input', renderMembers);
document.querySelector('[data-refresh-audit]').addEventListener('click', loadAuditEvents);
memberForm.elements.accountKind.addEventListener('change', syncMemberPermissionControls);
for (const button of document.querySelectorAll('[data-close-member-dialog]')) {
  button.addEventListener('click', () => memberDialog.close());
}
for (const button of document.querySelectorAll('[data-close-token-dialog]')) {
  button.addEventListener('click', () => tokenDialog.close());
}
document.querySelector('[data-copy-token]').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(state.issuedLink);
    showToast('安全链接已复制。');
  } catch {
    const field = document.querySelector('[data-issued-token-link]');
    field.focus();
    field.select();
    showToast('请使用系统复制命令复制已选中的链接。', 'error');
  }
});
document.querySelector('[data-logout]').addEventListener('click', async () => {
  try {
    await managementApi.logout();
  } catch {
    clearCsrfToken();
  }
  resetToLogin('已退出登录。');
});

window.addEventListener('offline', () => {
  updateOnlineUi();
  showToast('网络已断开，管理会话将在在线租约结束后失效。', 'error');
});
window.addEventListener('online', async () => {
  updateOnlineUi();
  try {
    showDashboard(await managementApi.refreshSession());
  } catch {
    resetToLogin('离线期间会话已失效，请重新登录。');
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void heartbeat();
});

async function boot() {
  const credential = credentialFragment();
  if (credential) {
    tokenForm.elements.token.value = credential.token;
    document.querySelector('[data-token-kicker]').textContent = credential.purpose === 'activation' ? '成员激活' : '密码重置';
    document.querySelector('[data-token-title]').textContent = credential.purpose === 'activation' ? '建立成员登录凭据' : '设置新密码';
    showAuthForm(tokenForm);
    return;
  }
  try {
    showDashboard(await managementApi.refreshSession());
  } catch {
    resetToLogin();
  }
}

void boot();
