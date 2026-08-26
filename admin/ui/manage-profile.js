import { managementApi } from './manage-api.js';
import { formatDateTime, label } from './manage-i18n.js';
import {
  elements,
  hasCapability,
  localProfile,
  showMessage,
  showToast,
  state,
  submitWithBusy
} from './manage-context.js';

function accountInitial() {
  const account = state.account;
  return (account?.displayName || account?.username || 'A').slice(0, 1).toUpperCase();
}

function renderAvatarNode(node, value) {
  if (!node) return;
  const image = node.querySelector('img');
  const fallback = node.querySelector('span');
  if (image) {
    image.hidden = !value;
    image.src = value || '';
  }
  if (fallback) {
    fallback.hidden = Boolean(value);
    fallback.textContent = accountInitial();
  }
  node.classList.toggle('has-image', Boolean(value));
}

export function renderLocalAvatar() {
  const value = state.account && localProfile ? localProfile.read(state.account.id) : '';
  renderAvatarNode(document.querySelector('[data-avatar]'), value);
  renderAvatarNode(document.querySelector('[data-avatar-preview]'), value);
  const removeButton = document.querySelector('[data-avatar-remove]');
  if (removeButton) removeButton.disabled = !value;
}

export function renderAccountSummary() {
  const account = state.account;
  const session = state.session;
  document.querySelector('[data-account-name]').textContent = account.displayName || account.username;
  document.querySelector('[data-account-role]').textContent = `${label('accountKind', account.accountKind)} · ${label('accessLevel', account.accessLevel)}`;
  renderLocalAvatar();
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

export function renderCapabilities() {
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

export function installProfileController(onSessionData) {
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
      onSessionData(data);
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
      onSessionData(data);
    } catch {
      form.elements.currentPassword.value = '';
      form.elements.password.value = '';
      form.elements.confirmPassword.value = '';
    }
  });

  document.querySelector('[data-avatar-select]').addEventListener('click', () => {
    const input = document.querySelector('[data-avatar-input]');
    input.value = '';
    input.click();
  });
  document.querySelector('[data-avatar-input]').addEventListener('change', async event => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file || !state.account) return;
    const button = document.querySelector('[data-avatar-select]');
    const message = document.querySelector('[data-avatar-message]');
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    message.textContent = '';
    try {
      if (!localProfile) throw new Error('当前浏览器未启用本地头像存储。');
      const value = await localProfile.prepare(file);
      localProfile.write(state.account.id, value);
      renderLocalAvatar();
      showToast('头像已保存在当前浏览器。');
    } catch (error) {
      message.textContent = error instanceof Error ? error.message : '头像未能保存。';
    } finally {
      button.disabled = false;
      button.removeAttribute('aria-busy');
      input.value = '';
    }
  });
  document.querySelector('[data-avatar-remove]').addEventListener('click', () => {
    if (!state.account || !localProfile) return;
    localProfile.remove(state.account.id);
    renderLocalAvatar();
    document.querySelector('[data-avatar-message]').textContent = '';
    showToast('已移除当前浏览器中的头像。');
  });
}
