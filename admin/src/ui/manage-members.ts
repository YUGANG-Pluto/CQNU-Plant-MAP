import type { PublicManagementAccount } from '../account-contracts.js';
import type { ManagementAccountKind, ManagementAccessLevel, ManagementAccountStatus } from '../contracts.js';
import type { ManagementCredentialGrant } from '../management-ui-contracts.js';
import { managementApi } from './manage-api.js';
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
import { eventElement, formControl, requiredElement } from './manage-dom.js';
import { formatDateTime, label } from './manage-i18n.js';

type UnauthorizedHandler = (message: string) => void;

function memberRow(member: PublicManagementAccount): HTMLTableRowElement {
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
  edit.disabled = member.id === state.account?.id;
  edit.title = edit.disabled ? '请在个人账户设置中修改自己的资料。' : '编辑成员权限与状态';
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'row-action';
  reset.dataset.memberReset = member.id;
  reset.textContent = '重置密码';
  reset.disabled = member.id === state.account?.id || member.status === 'disabled';
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

function renderMembers(): void {
  const search = requiredElement<HTMLInputElement>('[data-member-search]');
  const query = search.value.trim().toLocaleLowerCase();
  const visible = state.members.filter(member => (
    !query
    || member.username.toLocaleLowerCase().includes(query)
    || member.displayName.toLocaleLowerCase().includes(query)
  ));
  requiredElement<HTMLTableSectionElement>('[data-member-rows]').replaceChildren(...visible.map(memberRow));
  requiredElement<HTMLElement>('[data-member-count]').textContent = `${state.members.length} 名成员`;
  requiredElement<HTMLElement>('[data-member-empty]').hidden = visible.length > 0;
}

export async function loadMembers(onUnauthorized: UnauthorizedHandler = () => undefined): Promise<void> {
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

function openMemberDialog(member: PublicManagementAccount | null = null): void {
  const { memberDialog, memberForm } = elements;
  memberForm.reset();
  showMessage(memberForm);
  formControl<HTMLInputElement>(memberForm, 'memberId').value = member?.id || '';
  const username = formControl<HTMLInputElement>(memberForm, 'username');
  username.value = member?.username || '';
  username.disabled = Boolean(member);
  formControl<HTMLInputElement>(memberForm, 'displayName').value = member?.displayName || '';
  formControl<HTMLSelectElement>(memberForm, 'accountKind').value = member?.accountKind || 'user';
  formControl<HTMLSelectElement>(memberForm, 'accessLevel').value = member?.accessLevel || 'read';
  formControl<HTMLSelectElement>(memberForm, 'status').value = member?.status || 'pending-activation';
  requiredElement<HTMLElement>('[data-member-status-field]').hidden = !member;
  requiredElement<HTMLElement>('[data-member-dialog-kicker]').textContent = member ? '编辑成员' : '新增成员';
  requiredElement<HTMLElement>('[data-member-dialog-title]').textContent = member?.username || '配置访问权限';
  requiredElement<HTMLButtonElement>('[data-member-submit]').textContent = member
    ? '保存成员设置'
    : '创建并生成链接';
  syncMemberPermissionControls();
  memberDialog.showModal();
}

function syncMemberPermissionControls(): void {
  const accountKind = formControl<HTMLSelectElement>(elements.memberForm, 'accountKind');
  const accessLevel = formControl<HTMLSelectElement>(elements.memberForm, 'accessLevel');
  const administrator = accountKind.value === 'admin';
  if (administrator) accessLevel.value = 'save';
  accessLevel.disabled = administrator;
}

function showIssuedToken(data: ManagementCredentialGrant): void {
  const purpose = data.purpose === 'activation' ? 'activate' : 'reset';
  state.issuedLink = `${location.origin}/manage#${purpose}=${encodeURIComponent(data.token)}`;
  requiredElement<HTMLElement>('[data-issued-token-title]').textContent = data.purpose === 'activation'
    ? '激活成员账户'
    : '重置成员密码';
  requiredElement<HTMLInputElement>('[data-issued-token-link]').value = state.issuedLink;
  requiredElement<HTMLElement>('[data-issued-token-expiry]').textContent = formatDateTime(data.expiresAt);
  elements.tokenDialog.showModal();
}

async function resetMember(memberId: string): Promise<void> {
  const member = state.members.find(item => item.id === memberId);
  if (!member || !confirm(`为 ${member.username} 签发一次性密码重置链接？其现有会话将立即失效。`)) return;
  try {
    showIssuedToken(await managementApi.resetMemberPassword(member.id));
    showToast('已签发一次性密码重置链接。');
  } catch (error) {
    showToast(errorMessage(error), 'error');
  }
}

export async function loadAuditEvents(): Promise<void> {
  if (!hasCapability('audit.read')) return;
  try {
    const data = await managementApi.listAuditEvents(100);
    const events = Array.isArray(data.events) ? data.events : [];
    const body = requiredElement<HTMLTableSectionElement>('[data-audit-rows]');
    body.replaceChildren(...events.map(auditEvent => {
      const row = document.createElement('tr');
      const outcome = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = 'status-badge';
      badge.dataset.outcome = auditEvent.outcome;
      badge.textContent = label('auditOutcome', auditEvent.outcome);
      outcome.append(badge);
      row.append(
        tableCell(formatDateTime(auditEvent.occurredAt)),
        tableCell(label('action', auditEvent.action)),
        outcome,
        tableCell(auditEvent.principalId),
        tableCell(auditEvent.requestId)
      );
      return row;
    }));
    requiredElement<HTMLElement>('[data-audit-empty]').hidden = events.length > 0;
  } catch (error) {
    showToast(errorMessage(error), 'error');
  }
}

export function installMemberController(onUnauthorized: UnauthorizedHandler): void {
  const { memberDialog, memberForm, tokenDialog } = elements;
  memberForm.addEventListener('submit', async event => {
    event.preventDefault();
    const memberId = formControl<HTMLInputElement>(memberForm, 'memberId').value;
    let grant: ManagementCredentialGrant | null = null;
    try {
      if (memberId) {
        await submitWithBusy(memberForm, () => managementApi.updateMember(memberId, {
          displayName: formControl<HTMLInputElement>(memberForm, 'displayName').value,
          accountKind: formControl<HTMLSelectElement>(memberForm, 'accountKind').value as ManagementAccountKind,
          accessLevel: formControl<HTMLSelectElement>(memberForm, 'accessLevel').value as ManagementAccessLevel,
          status: formControl<HTMLSelectElement>(memberForm, 'status').value as ManagementAccountStatus
        }));
      } else {
        grant = await submitWithBusy(memberForm, () => managementApi.createMember({
          username: formControl<HTMLInputElement>(memberForm, 'username').value,
          displayName: formControl<HTMLInputElement>(memberForm, 'displayName').value,
          accountKind: formControl<HTMLSelectElement>(memberForm, 'accountKind').value as ManagementAccountKind,
          accessLevel: formControl<HTMLSelectElement>(memberForm, 'accessLevel').value as ManagementAccessLevel
        }));
      }
      memberDialog.close();
      await loadMembers(onUnauthorized);
      if (grant) showIssuedToken(grant);
      showToast(memberId ? '成员设置已更新。' : '成员已创建。');
    } catch {
      // The inline message remains inside the active dialog.
    }
  });

  document.addEventListener('click', event => {
    const target = eventElement(event);
    if (!target) return;
    const editButton = target.closest<HTMLElement>('[data-member-edit]');
    const editId = editButton?.dataset.memberEdit;
    if (editId) openMemberDialog(state.members.find(member => member.id === editId) || null);
    const resetButton = target.closest<HTMLElement>('[data-member-reset]');
    const resetId = resetButton?.dataset.memberReset;
    if (resetId) void resetMember(resetId);
  });
  requiredElement<HTMLButtonElement>('[data-open-create-member]').addEventListener('click', () => openMemberDialog());
  requiredElement<HTMLInputElement>('[data-member-search]').addEventListener('input', renderMembers);
  requiredElement<HTMLButtonElement>('[data-refresh-audit]').addEventListener('click', () => void loadAuditEvents());
  formControl<HTMLSelectElement>(memberForm, 'accountKind').addEventListener('change', syncMemberPermissionControls);
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-close-member-dialog]')) {
    button.addEventListener('click', () => memberDialog.close());
  }
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-close-token-dialog]')) {
    button.addEventListener('click', () => tokenDialog.close());
  }
  requiredElement<HTMLButtonElement>('[data-copy-token]').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(state.issuedLink);
      showToast('安全链接已复制。');
    } catch {
      const field = requiredElement<HTMLInputElement>('[data-issued-token-link]');
      field.focus();
      field.select();
      showToast('请使用系统复制命令复制已选中的链接。', 'error');
    }
  });
}
