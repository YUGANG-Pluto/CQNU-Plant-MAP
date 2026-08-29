import type { PublicManagementAccount } from '../account-contracts.js';
import type { AdminCapability, AdminSession } from '../contracts.js';
import { ManagementApiError } from './manage-api.js';
import { requiredElement } from './manage-dom.js';

export type ManagementView = 'overview' | 'members' | 'storage' | 'audit' | 'account';

interface LocalProfileStorage {
  read(accountId: string): string;
  write(accountId: string, value: string): void;
  remove(accountId: string): void;
  prepare(file: File): Promise<string>;
}

interface ManagementUiState {
  account: PublicManagementAccount | null;
  session: AdminSession | null;
  capabilities: AdminCapability[];
  members: PublicManagementAccount[];
  activeView: ManagementView;
  heartbeatId: number;
  issuedLink: string;
}

declare global {
  interface Window {
    cqnuLocalProfile?: LocalProfileStorage;
  }
}

export function safeNextPath(): '/workspace' | '/manage' {
  const value = new URLSearchParams(location.search).get('next') || '';
  return /^\/(workspace|manage)$/u.test(value) ? value as '/workspace' | '/manage' : '/workspace';
}

export function isManagementView(value: string | undefined): value is ManagementView {
  return value !== undefined && ['overview', 'members', 'storage', 'audit', 'account'].includes(value);
}

export function safeRequestedView(): ManagementView {
  const value = new URLSearchParams(location.search).get('view') || '';
  return isManagementView(value) ? value : 'overview';
}

export const state: ManagementUiState = {
  account: null,
  session: null,
  capabilities: [],
  members: [],
  activeView: safeRequestedView(),
  heartbeatId: 0,
  issuedLink: ''
};

export const elements = Object.freeze({
  authStage: requiredElement<HTMLElement>('[data-auth-stage]'),
  manageShell: requiredElement<HTMLElement>('[data-manage-shell]'),
  authLoading: requiredElement<HTMLElement>('[data-auth-loading]'),
  loginForm: requiredElement<HTMLFormElement>('[data-login-form]'),
  activationForm: requiredElement<HTMLFormElement>('[data-activation-form]'),
  tokenForm: requiredElement<HTMLFormElement>('[data-token-form]'),
  manageContent: requiredElement<HTMLElement>('[data-manage-content]'),
  memberDialog: requiredElement<HTMLDialogElement>('[data-member-dialog]'),
  memberForm: requiredElement<HTMLFormElement>('[data-member-form]'),
  tokenDialog: requiredElement<HTMLDialogElement>('[data-token-dialog]'),
  bulkResetDialog: requiredElement<HTMLDialogElement>('[data-bulk-reset-dialog]'),
  bulkResetForm: requiredElement<HTMLFormElement>('[data-bulk-reset-form]'),
  passwordChoiceDialog: requiredElement<HTMLDialogElement>('[data-password-choice-dialog]'),
  passwordChoiceForm: requiredElement<HTMLFormElement>('[data-password-choice-form]')
});

export const localProfile = window.cqnuLocalProfile;

const workspaceWarmAssets = [
  ['/renderer-dist/modern-shell.js', 'script'],
  ['/node_modules/leaflet/dist/leaflet.js', 'script'],
  ['/assets/legacy-runtime.js', 'script']
] as const;
let workspaceWarmupStarted = false;

export function warmWorkspaceAssets(): void {
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

export function showMessage(form: HTMLFormElement, message = ''): void {
  const target = form.querySelector<HTMLElement>('.form-message');
  if (target) target.textContent = message;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ManagementApiError) return error.message;
  return '请求未完成，请稍后重试。';
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof ManagementApiError && error.status === 401;
}

export function credentialFragment(): { token: string; purpose: 'activation' | 'password-reset' } | null {
  const params = new URLSearchParams(location.hash.slice(1));
  const activation = params.get('activate');
  const reset = params.get('reset');
  if (activation) return { token: activation, purpose: 'activation' };
  if (reset) return { token: reset, purpose: 'password-reset' };
  return null;
}

function setBusy(form: HTMLFormElement, busy: boolean): void {
  form.setAttribute('aria-busy', String(busy));
  for (const control of form.querySelectorAll<NamedFormControl>('button, input, select, textarea')) {
    control.disabled = busy;
  }
}

type NamedFormControl = HTMLButtonElement | HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export async function submitWithBusy<T>(form: HTMLFormElement, operation: () => Promise<T>): Promise<T> {
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

export function hasCapability(capability: AdminCapability): boolean {
  return state.capabilities.includes(capability);
}

export function updateSessionState(data: {
  account: PublicManagementAccount;
  session: AdminSession;
  capabilities: AdminCapability[];
}): void {
  state.account = data.account;
  state.session = data.session;
  state.capabilities = Array.isArray(data.capabilities) ? data.capabilities : [];
}

export function showToast(message: string, type: 'success' | 'error' = 'success'): void {
  const region = requiredElement<HTMLElement>('[data-toast-region]');
  const toast = document.createElement('div');
  toast.className = `toast${type === 'error' ? ' is-error' : ''}`;
  toast.textContent = message;
  region.append(toast);
  window.setTimeout(() => {
    toast.classList.add('is-leaving');
    window.setTimeout(() => toast.remove(), 380);
  }, 3_600);
}

export function tableCell(text: string, className = ''): HTMLTableCellElement {
  const element = document.createElement('td');
  if (className) element.className = className;
  element.textContent = text;
  element.title = text;
  return element;
}
