import { ManagementApiError } from './manage-api.js';

export function safeNextPath() {
  const value = new URLSearchParams(location.search).get('next') || '';
  return /^\/(workspace|manage)$/u.test(value) ? value : '/workspace';
}

export function safeRequestedView() {
  const value = new URLSearchParams(location.search).get('view') || '';
  return ['overview', 'members', 'audit', 'account'].includes(value) ? value : 'overview';
}

export const state = {
  account: null,
  session: null,
  capabilities: [],
  members: [],
  activeView: safeRequestedView(),
  heartbeatId: 0,
  issuedLink: ''
};

export const elements = Object.freeze({
  authStage: document.querySelector('[data-auth-stage]'),
  manageShell: document.querySelector('[data-manage-shell]'),
  authLoading: document.querySelector('[data-auth-loading]'),
  loginForm: document.querySelector('[data-login-form]'),
  activationForm: document.querySelector('[data-activation-form]'),
  tokenForm: document.querySelector('[data-token-form]'),
  manageContent: document.querySelector('[data-manage-content]'),
  memberDialog: document.querySelector('[data-member-dialog]'),
  memberForm: document.querySelector('[data-member-form]'),
  tokenDialog: document.querySelector('[data-token-dialog]')
});

export const localProfile = window.cqnuLocalProfile;

const workspaceWarmAssets = [
  ['/renderer-dist/modern-shell.js', 'script'],
  ['/node_modules/leaflet/dist/leaflet.js', 'script'],
  ['/assets/legacy-runtime.js', 'script']
];
let workspaceWarmupStarted = false;

export function warmWorkspaceAssets() {
  if (workspaceWarmupStarted) return;
  workspaceWarmupStarted = true;
  for (const [href, as] of workspaceWarmAssets) {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    link.as = as;
    document.head.append(link);
  }
}

export function showMessage(form, message = '') {
  const target = form.querySelector('.form-message');
  if (target) target.textContent = message;
}

export function errorMessage(error) {
  if (error instanceof ManagementApiError) return error.message;
  return '请求未完成，请稍后重试。';
}

export function isUnauthorized(error) {
  return error instanceof ManagementApiError && error.status === 401;
}

export function credentialFragment() {
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

export async function submitWithBusy(form, operation) {
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

export function hasCapability(capability) {
  return state.capabilities.includes(capability);
}

export function updateSessionState(data) {
  state.account = data.account;
  state.session = data.session;
  state.capabilities = Array.isArray(data.capabilities) ? data.capabilities : [];
}

export function showToast(message, type = 'success') {
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

export function tableCell(text, className = '') {
  const element = document.createElement('td');
  if (className) element.className = className;
  element.textContent = text;
  element.title = text;
  return element;
}
