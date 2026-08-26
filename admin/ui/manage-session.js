import { clearCsrfToken, managementApi } from './manage-api.js';
import {
  credentialFragment,
  elements,
  hasCapability,
  isUnauthorized,
  safeNextPath,
  safeRequestedView,
  showMessage,
  showToast,
  state,
  submitWithBusy,
  updateSessionState,
  warmWorkspaceAssets
} from './manage-context.js';
import { loadAuditEvents, loadMembers, installMemberController } from './manage-members.js';
import {
  installProfileController,
  renderAccountSummary,
  renderCapabilities
} from './manage-profile.js';

function stopHeartbeat() {
  if (state.heartbeatId) window.clearInterval(state.heartbeatId);
  state.heartbeatId = 0;
}

function showAuthForm(form) {
  stopHeartbeat();
  state.account = null;
  state.session = null;
  state.capabilities = [];
  elements.authStage.hidden = false;
  elements.manageShell.hidden = true;
  elements.authLoading.hidden = true;
  for (const candidate of [elements.loginForm, elements.activationForm, elements.tokenForm]) {
    candidate.hidden = candidate !== form;
  }
  requestAnimationFrame(() => form.querySelector('input:not([type="hidden"])')?.focus());
}

function resetToLogin(message = '') {
  clearCsrfToken();
  showAuthForm(elements.loginForm);
  showMessage(elements.loginForm, message);
}

function showActivation(data) {
  updateSessionState(data);
  const { activationForm } = elements;
  activationForm.elements.username.value = data.account.username || '';
  activationForm.elements.displayName.value = data.account.displayName || '';
  activationForm.elements.currentPassword.value = '';
  activationForm.elements.password.value = '';
  activationForm.elements.confirmPassword.value = '';
  showAuthForm(activationForm);
}

function switchView(viewName, options = {}) {
  const targetButton = document.querySelector(`[data-view-target="${CSS.escape(viewName)}"]`);
  if (!targetButton || targetButton.hidden) viewName = 'overview';
  const update = () => {
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
  };
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reducedMotion && document.startViewTransition && state.activeView !== viewName) {
    document.startViewTransition(update);
  } else {
    update();
  }
  if (options.updateUrl) {
    history.replaceState(null, '', `/manage?next=/manage&view=${encodeURIComponent(viewName)}`);
  }
  elements.manageContent.focus({ preventScroll: true });
  if (viewName === 'members') void loadMembers(resetToLogin);
  if (viewName === 'audit') void loadAuditEvents();
}

function showDashboard(data, options = {}) {
  updateSessionState(data);
  if (state.account.mustChangePassword) {
    showActivation(data);
    return;
  }
  const next = safeNextPath();
  if (options.followNext && next === '/workspace') {
    showMessage(elements.loginForm, '验证通过，正在进入工作区…');
    document.documentElement.dataset.authTransition = 'workspace';
    location.replace('/workspace');
    return;
  }
  if (options.followNext && next === '/manage') state.activeView = safeRequestedView();
  elements.authStage.hidden = true;
  elements.manageShell.hidden = false;
  renderAccountSummary();
  renderCapabilities();
  switchView(hasCapability('member.read') || state.activeView !== 'members' ? state.activeView : 'overview');
  updateOnlineUi();
  startHeartbeat();
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

function installAuthHandlers() {
  const { loginForm, activationForm, tokenForm } = elements;
  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    warmWorkspaceAssets();
    showMessage(loginForm, '正在验证并预载工作区…');
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
}

function installShellHandlers() {
  document.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;
    const viewButton = event.target.closest('[data-view-target]');
    if (viewButton) switchView(viewButton.dataset.viewTarget, { updateUrl: true });
    const accountButton = event.target.closest('[data-open-account]');
    if (accountButton) switchView('account', { updateUrl: true });
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
}

async function boot() {
  const credential = credentialFragment();
  if (credential) {
    elements.tokenForm.elements.token.value = credential.token;
    document.querySelector('[data-token-kicker]').textContent = credential.purpose === 'activation' ? '成员激活' : '密码重置';
    document.querySelector('[data-token-title]').textContent = credential.purpose === 'activation' ? '建立成员登录凭据' : '设置新密码';
    showAuthForm(elements.tokenForm);
    return;
  }
  try {
    showDashboard(await managementApi.refreshSession());
  } catch {
    resetToLogin();
  }
}

export function initializeManagementUi() {
  installProfileController(showDashboard);
  installMemberController(resetToLogin);
  installAuthHandlers();
  installShellHandlers();
  void boot();
}
