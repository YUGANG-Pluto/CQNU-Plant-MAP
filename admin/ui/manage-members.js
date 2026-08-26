import { managementApi } from './manage-api.js';
import { formatDateTime, label } from './manage-i18n.js';
import {
  elements,
  errorMessage,
  hasCapability,
  isUnauthorized,
  showMessage,
  showToast,
  state,
  submitWithBusy,
  tableCell
} from './manage-context.js';

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
    tableCell(label('accountKind', member.accountKind)),
    tableCell(label('accessLevel', member.accessLevel)),
    status,
    tableCell(formatDateTime(member.updatedAt)),
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

export async function loadMembers(onUnauthorized = () => undefined) {
  if (!hasCapability('member.read')) return;
  try {
    const data = await managementApi.listMembers();
    state.members = Array.isArray(data.members) ? data.members : [];
    renderMembers();
  } catch (error) {
    showToast(errorMessage(error), 'error');
    if (isUnauthorized(error)) onUnauthorized('会话已失效，请重新登录。');
  }
}

function openMemberDialog(member = null) {
  const { memberDialog, memberForm } = elements;
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
  const { memberForm } = elements;
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
  elements.tokenDialog.showModal();
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

export async function loadAuditEvents() {
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
        tableCell(formatDateTime(event.occurredAt)),
        tableCell(label('action', event.action)),
        outcome,
        tableCell(event.principalId),
        tableCell(event.requestId)
      );
      return row;
    }));
    document.querySelector('[data-audit-empty]').hidden = events.length > 0;
  } catch (error) {
    showToast(errorMessage(error), 'error');
  }
}

export function installMemberController(onUnauthorized) {
  const { memberDialog, memberForm, tokenDialog } = elements;
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
      await loadMembers(onUnauthorized);
      if (!memberId) showIssuedToken(result);
      showToast(memberId ? '成员设置已更新。' : '成员已创建。');
    } catch {
      // The inline message remains inside the active dialog.
    }
  });

  document.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;
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
}
