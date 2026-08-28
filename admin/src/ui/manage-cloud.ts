import type { ManagementCloudUsageAccount } from '../management-ui-contracts.js';
import { managementApi } from './manage-api.js';
import {
  errorMessage,
  isUnauthorized,
  showToast,
  tableCell
} from './manage-context.js';
import { requiredElement } from './manage-dom.js';
import { formatDateTime, label } from './manage-i18n.js';

type UnauthorizedHandler = (message: string) => void;

function formatBytes(value: number): string {
  const bytes = Math.max(0, Number(value) || 0);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
}

function usageRow(account: ManagementCloudUsageAccount): HTMLTableRowElement {
  const row = document.createElement('tr');
  const identity = document.createElement('td');
  const content = document.createElement('div');
  content.className = 'member-cell';
  const name = document.createElement('strong');
  name.textContent = account.displayName || account.username;
  const username = document.createElement('span');
  username.textContent = account.username;
  content.append(name, username);
  identity.append(content);
  row.append(
    identity,
    tableCell(`${label('accountKind', account.accountKind)} · ${label('accessLevel', account.accessLevel)}`),
    tableCell(String(account.projectCount)),
    tableCell(formatBytes(account.currentBytes)),
    tableCell(formatBytes(account.versionBytes)),
    tableCell(account.updatedAt ? formatDateTime(account.updatedAt) : '尚无云项目')
  );
  return row;
}

export async function loadCloudUsage(
  onUnauthorized: UnauthorizedHandler = () => undefined
): Promise<void> {
  const refresh = requiredElement<HTMLButtonElement>('[data-refresh-cloud-usage]');
  refresh.disabled = true;
  refresh.setAttribute('aria-busy', 'true');
  try {
    const data = await managementApi.getCloudUsage();
    const accounts = Array.isArray(data.accounts) ? data.accounts : [];
    requiredElement<HTMLElement>('[data-cloud-summary-projects]').textContent = String(data.summary.projectCount || 0);
    requiredElement<HTMLElement>('[data-cloud-summary-current]').textContent = formatBytes(data.summary.currentBytes);
    requiredElement<HTMLElement>('[data-cloud-summary-versions]').textContent = formatBytes(data.summary.versionBytes);
    requiredElement<HTMLElement>('[data-cloud-summary-accounts]').textContent = String(data.summary.accountCount || 0);
    requiredElement<HTMLTableSectionElement>('[data-cloud-usage-rows]')
      .replaceChildren(...accounts.map(usageRow));
    requiredElement<HTMLElement>('[data-cloud-usage-empty]').hidden = accounts.length > 0;
  } catch (error) {
    showToast(errorMessage(error), 'error');
    if (isUnauthorized(error)) onUnauthorized('会话已失效，请重新登录。');
  } finally {
    refresh.disabled = false;
    refresh.removeAttribute('aria-busy');
  }
}

export function installCloudUsageController(onUnauthorized: UnauthorizedHandler): void {
  requiredElement<HTMLButtonElement>('[data-refresh-cloud-usage]')
    .addEventListener('click', () => void loadCloudUsage(onUnauthorized));
}
