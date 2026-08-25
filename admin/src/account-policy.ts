import type {
  ManagementAccountRecord,
  PublicManagementAccount
} from './account-contracts.js';
import type {
  AdminPrincipal,
  ManagementAccessLevel,
  ManagementAccountKind,
  ManagementAccountStatus
} from './contracts.js';

const USERNAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{2,31}$/;

export function normalizeUsername(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase('en-US');
}

export function validateUsername(value: string): string {
  const username = value.normalize('NFKC').trim();
  if (!USERNAME_PATTERN.test(username)) throw new Error('USERNAME_INVALID');
  return username;
}

export function normalizeAccessLevel(value: unknown): ManagementAccessLevel {
  if (value === 'read' || value === 'edit' || value === 'save') return value;
  throw new Error('ACCESS_LEVEL_INVALID');
}

export function normalizeAccountKind(value: unknown): ManagementAccountKind {
  if (value === 'user' || value === 'admin') return value;
  throw new Error('ACCOUNT_KIND_INVALID');
}

export function normalizeAccountStatus(value: unknown): ManagementAccountStatus {
  if (value === 'pending-activation' || value === 'active' || value === 'disabled') return value;
  throw new Error('ACCOUNT_STATUS_INVALID');
}

export function publicAccount(account: ManagementAccountRecord): PublicManagementAccount {
  const {
    passwordVerifier: _passwordVerifier,
    normalizedUsername: _normalizedUsername,
    failedLoginCount: _failedLoginCount,
    lockedUntil: _lockedUntil,
    ...result
  } = account;
  return { ...result };
}

export function accountToPrincipal(account: ManagementAccountRecord): AdminPrincipal {
  return {
    id: account.id,
    username: account.username,
    displayName: account.displayName,
    accountKind: account.accountKind,
    accessLevel: account.accessLevel,
    status: account.status,
    mustChangePassword: account.mustChangePassword,
    credentialVersion: account.credentialVersion,
    enabled: account.status !== 'disabled'
  };
}

export function accountCanAuthenticate(account: ManagementAccountRecord, now = new Date()): boolean {
  if (account.status === 'disabled' || !account.passwordVerifier) return false;
  if (!account.lockedUntil) return true;
  const lockedUntil = Date.parse(account.lockedUntil);
  return Number.isFinite(lockedUntil) && lockedUntil <= now.getTime();
}
