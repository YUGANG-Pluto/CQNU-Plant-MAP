import type { ManagementSessionData } from '../management-ui-contracts.js';
import { clearCsrfToken, managementApi } from './manage-api.js';
import {
  credentialFragment,
  elements,
  hasCapability,
  isManagementView,
  isUnauthorized,
  safeNextPath,
  safeRequestedView,
  showMessage,
  showToast,
  state,
  submitWithBusy,
  updateSessionState,
  warmWorkspaceAssets,
  type ManagementView
} from './manage-context.js';
import { eventElement, formControl, requiredElement } from './manage-dom.js';
import { installMemberController, loadAuditEvents, loadMembers } from './manage-members.js';
import { installProfileController, renderAccountSummary, renderCapabilities } from './manage-profile.js';

interface DashboardOptions {
  followNext?: boolean;
}

interface ViewOptions {
  updateUrl?: boolean;
}

type TransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => unknown;
};

function stopHeartbeat(): void {
  if (state.heartbeatId) window.clearInterval(state.heartbeatId);
  state.heartbeatId = 0;
}

function showAuthForm(form: HTMLFormElement): void {
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
  requestAnimationFrame(() => form.querySelector<HTMLInputElement>('input:not([type="hidden"])')?.focus());
}

function resetToLogin(message = ''): void {
  clearCsrfToken();
  showAuthForm(elements.loginForm);
  showMessage(elements.loginForm, message);
}

function showActivation(data: ManagementSessionData): void {
  updateSessionState(data);
  const { activationForm } = elements;
  formControl<HTMLInputElement>(activationForm, 'username').value = data.account.username || '';
  formControl<HTMLInputElement>(activationForm, 'displayName').value = data.account.displayName || '';
  formControl<HTMLInputElement>(activationForm, 'currentPassword').value = '';
  formControl<HTMLInputElement>(activationForm, 'password').value = '';
  formControl<HTMLInputElement>(activationForm, 'confirmPassword').value = '';
  showAuthForm(activationForm);
}

function switchView(requestedView: ManagementView, options: ViewOptions = {}): void {
  let viewName = requestedView;
  const targetButton = document.querySelector<HTMLElement>(`[data-view-target="${CSS.escape(viewName)}"]`);
  if (!targetButton || targetButton.hidden) viewName = 'overview';
  const update = (): void => {
    state.activeView = viewName;
    for (const button of document.querySelectorAll<HTMLElement>('[data-view-target]')) {
      if (button.dataset.viewTarget === viewName) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    }
    for (const view of document.querySelectorAll<HTMLElement>('[data-view]')) {
      const active = view.dataset.view === viewName;
      view.hidden = !active;
      view.classList.toggle('is-active', active);
    }
  };
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const transitionDocument = document as TransitionDocument;
  if (!reducedMotion && transitionDocument.startViewTransition && state.activeView !== viewName) {
    transitionDocument.startViewTransition(update);
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

function showDashboard(data: ManagementSessionData, options: DashboardOptions = {}): void {
  updateSessionState(data);
  if (data.account.mustChangePassword) {
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

async function heartbeat(): Promise<void> {
  if (!navigator.onLine || !state.session) return;
  try {
    const data = await managementApi.heartbeat();
    updateSessionState(data);
    renderAccountSummary();
  } catch (error) {
    if (isUnauthorized(error)) resetToLogin('会话已失效，请重新登录。');
  }
}

function startHeartbeat(): void {
  stopHeartbeat();
  state.heartbeatId = window.setInterval(() => void heartbeat(), 45_000);
}

function updateOnlineUi(): void {
  const online = navigator.onLine;
  const stateElement = requiredElement<HTMLElement>('[data-online-state]');
  stateElement.classList.toggle('is-offline', !online);
  const labelNode = stateElement.lastChild;
  if (labelNode) labelNode.textContent = online ? '在线' : '离线';
  requiredElement<HTMLElement>('[data-offline-banner]').hidden = online;
  if (!online) stopHeartbeat();
}

function installAuthHandlers(): void {
  const { loginForm, activationForm, tokenForm } = elements;
  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    warmWorkspaceAssets();
    showMessage(loginForm, '正在验证并预载工作区…');
    const password = formControl<HTMLInputElement>(loginForm, 'password');
    try {
      const data = await submitWithBusy(loginForm, () => managementApi.login(
        formControl<HTMLInputElement>(loginForm, 'username').value,
        password.value
      ));
      password.value = '';
      showDashboard(data, { followNext: true });
    } catch {
      password.value = '';
    }
  });

  activationForm.addEventListener('submit', async event => {
    event.preventDefault();
    const password = formControl<HTMLInputElement>(activationForm, 'password');
    const confirmPassword = formControl<HTMLInputElement>(activationForm, 'confirmPassword');
    if (password.value !== confirmPassword.value) {
      showMessage(activationForm, '两次输入的新密码不一致。');
      return;
    }
    try {
      const data = await submitWithBusy(activationForm, () => managementApi.activate({
        currentPassword: formControl<HTMLInputElement>(activationForm, 'currentPassword').value,
        username: formControl<HTMLInputElement>(activationForm, 'username').value,
        displayName: formControl<HTMLInputElement>(activationForm, 'displayName').value,
        password: password.value
      }));
      activationForm.reset();
      showToast('账户已激活。');
      showDashboard(data, { followNext: true });
    } catch {
      formControl<HTMLInputElement>(activationForm, 'currentPassword').value = '';
      password.value = '';
      confirmPassword.value = '';
    }
  });

  tokenForm.addEventListener('submit', async event => {
    event.preventDefault();
    const password = formControl<HTMLInputElement>(tokenForm, 'password');
    const confirmPassword = formControl<HTMLInputElement>(tokenForm, 'confirmPassword');
    if (password.value !== confirmPassword.value) {
      showMessage(tokenForm, '两次输入的新密码不一致。');
      return;
    }
    try {
      const username = formControl<HTMLInputElement>(tokenForm, 'username').value;
      const displayName = formControl<HTMLInputElement>(tokenForm, 'displayName').value;
      const data = await submitWithBusy(tokenForm, () => managementApi.consumeCredentialToken({
        token: formControl<HTMLInputElement>(tokenForm, 'token').value,
        username: username || undefined,
        displayName: displayName || undefined,
        password: password.value
      }));
      history.replaceState(null, '', '/manage');
      tokenForm.reset();
      showToast('登录凭据已更新。');
      showDashboard(data, { followNext: true });
    } catch {
      password.value = '';
      confirmPassword.value = '';
    }
  });
}

function installShellHandlers(): void {
  document.addEventListener('click', event => {
    const target = eventElement(event);
    if (!target) return;
    const viewValue = target.closest<HTMLElement>('[data-view-target]')?.dataset.viewTarget;
    if (isManagementView(viewValue)) switchView(viewValue, { updateUrl: true });
    if (target.closest('[data-open-account]')) switchView('account', { updateUrl: true });
  });
  requiredElement<HTMLButtonElement>('[data-logout]').addEventListener('click', async () => {
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

async function boot(): Promise<void> {
  const credential = credentialFragment();
  if (credential) {
    formControl<HTMLInputElement>(elements.tokenForm, 'token').value = credential.token;
    requiredElement<HTMLElement>('[data-token-kicker]').textContent = credential.purpose === 'activation'
      ? '成员激活'
      : '密码重置';
    requiredElement<HTMLElement>('[data-token-title]').textContent = credential.purpose === 'activation'
      ? '建立成员登录凭据'
      : '设置新密码';
    showAuthForm(elements.tokenForm);
    return;
  }
  try {
    showDashboard(await managementApi.refreshSession());
  } catch {
    resetToLogin();
  }
}

export function initializeManagementUi(): void {
  installProfileController(showDashboard);
  installMemberController(resetToLogin);
  installAuthHandlers();
  installShellHandlers();
  void boot();
}
