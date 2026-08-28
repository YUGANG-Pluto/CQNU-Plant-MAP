import type { ManagementAccessLevel } from '../contracts.js';
import type { ManagementSessionData } from '../management-ui-contracts.js';
import { managementApi } from './manage-api.js';
import { elements, hasCapability, localProfile, showMessage, showToast, state, submitWithBusy } from './manage-context.js';
import { formControl, requiredElement } from './manage-dom.js';
import { formatDateTime, label } from './manage-i18n.js';

type SessionDataHandler = (data: ManagementSessionData) => void;

function accountInitial(): string {
  const account = state.account;
  return (account?.displayName || account?.username || 'A').slice(0, 1).toUpperCase();
}

function renderAvatarNode(node: HTMLElement | null, value: string): void {
  if (!node) return;
  const image = node.querySelector<HTMLImageElement>('img');
  const fallback = node.querySelector<HTMLElement>('span');
  if (image) {
    image.hidden = !value;
    image.src = value;
  }
  if (fallback) {
    fallback.hidden = Boolean(value);
    fallback.textContent = accountInitial();
  }
  node.classList.toggle('has-image', Boolean(value));
}

export function renderLocalAvatar(): void {
  const value = state.account && localProfile ? localProfile.read(state.account.id) : '';
  renderAvatarNode(document.querySelector<HTMLElement>('[data-avatar]'), value);
  renderAvatarNode(document.querySelector<HTMLElement>('[data-avatar-preview]'), value);
  requiredElement<HTMLButtonElement>('[data-avatar-remove]').disabled = !value;
}

export function renderAccountSummary(): void {
  const { account, session } = state;
  if (!account || !session) return;
  requiredElement<HTMLElement>('[data-account-name]').textContent = account.displayName || account.username;
  requiredElement<HTMLElement>('[data-account-role]').textContent =
    `${label('accountKind', account.accountKind)} · ${label('accessLevel', account.accessLevel)}`;
  renderLocalAvatar();
  requiredElement<HTMLElement>('[data-overview-kind]').textContent = label('accountKind', account.accountKind);
  requiredElement<HTMLElement>('[data-overview-access]').textContent = label('accessLevel', account.accessLevel);
  requiredElement<HTMLElement>('[data-overview-status]').textContent = label('status', account.status);
  requiredElement<HTMLElement>('[data-overview-expiry]').textContent = formatDateTime(session.absoluteExpiresAt);
  requiredElement<HTMLElement>('[data-session-expiry]').textContent =
    `会话至 ${formatDateTime(session.absoluteExpiresAt)}`;
  const accessNotes: Record<ManagementAccessLevel, string> = {
    read: '查看项目，不写入变更',
    edit: '可编辑浏览器草稿，不提交本地项目',
    save: '可编辑并保存到用户授权的本地存储'
  };
  requiredElement<HTMLElement>('[data-overview-access-note]').textContent = accessNotes[account.accessLevel];
  for (const element of document.querySelectorAll<HTMLElement>('[data-admin-only]')) {
    element.hidden = !hasCapability('member.read')
      && !hasCapability('audit.read')
      && !hasCapability('site.read');
  }
  const usernameForm = requiredElement<HTMLFormElement>('[data-username-form]');
  formControl<HTMLInputElement>(usernameForm, 'username').value = account.username;
}

export function renderCapabilities(): void {
  const list = requiredElement<HTMLUListElement>('[data-capability-list]');
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

export function installProfileController(onSessionData: SessionDataHandler): void {
  const usernameForm = requiredElement<HTMLFormElement>('[data-username-form]');
  const username = formControl<HTMLInputElement>(usernameForm, 'username');
  const usernamePassword = formControl<HTMLInputElement>(usernameForm, 'currentPassword');
  usernameForm.addEventListener('submit', async event => {
    event.preventDefault();
    try {
      const data = await submitWithBusy(usernameForm, () => managementApi.changeUsername({
        username: username.value,
        currentPassword: usernamePassword.value
      }));
      usernamePassword.value = '';
      showToast('用户名已更新，其他会话已撤销。');
      onSessionData(data);
    } catch {
      usernamePassword.value = '';
    }
  });

  const passwordForm = requiredElement<HTMLFormElement>('[data-password-form]');
  const currentPassword = formControl<HTMLInputElement>(passwordForm, 'currentPassword');
  const password = formControl<HTMLInputElement>(passwordForm, 'password');
  const confirmPassword = formControl<HTMLInputElement>(passwordForm, 'confirmPassword');
  passwordForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (password.value !== confirmPassword.value) {
      showMessage(passwordForm, '两次输入的新密码不一致。');
      return;
    }
    try {
      const data = await submitWithBusy(passwordForm, () => managementApi.changePassword({
        currentPassword: currentPassword.value,
        password: password.value
      }));
      passwordForm.reset();
      showToast('密码已更新，其他会话已撤销。');
      onSessionData(data);
    } catch {
      currentPassword.value = '';
      password.value = '';
      confirmPassword.value = '';
    }
  });

  const avatarSelect = requiredElement<HTMLButtonElement>('[data-avatar-select]');
  const avatarInput = requiredElement<HTMLInputElement>('[data-avatar-input]');
  const avatarMessage = requiredElement<HTMLElement>('[data-avatar-message]');
  avatarSelect.addEventListener('click', () => {
    avatarInput.value = '';
    avatarInput.click();
  });
  avatarInput.addEventListener('change', async () => {
    const file = avatarInput.files?.[0];
    if (!file || !state.account) return;
    avatarSelect.disabled = true;
    avatarSelect.setAttribute('aria-busy', 'true');
    avatarMessage.textContent = '';
    try {
      if (!localProfile) throw new Error('当前浏览器未启用本地头像存储。');
      const value = await localProfile.prepare(file);
      localProfile.write(state.account.id, value);
      renderLocalAvatar();
      showToast('头像已保存在当前浏览器。');
    } catch (error) {
      avatarMessage.textContent = error instanceof Error ? error.message : '头像未能保存。';
    } finally {
      avatarSelect.disabled = false;
      avatarSelect.removeAttribute('aria-busy');
      avatarInput.value = '';
    }
  });
  requiredElement<HTMLButtonElement>('[data-avatar-remove]').addEventListener('click', () => {
    if (!state.account || !localProfile) return;
    localProfile.remove(state.account.id);
    renderLocalAvatar();
    avatarMessage.textContent = '';
    showToast('已移除当前浏览器中的头像。');
  });
}
