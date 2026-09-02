import type { ManagementAccountRecord } from './account-contracts.js';

export const BULK_ACCOUNT_RESET_CONFIRMATION = 'RESET ALL MEMBERS';
export const BULK_ACCOUNT_RESET_TEMPORARY_PASSWORD = '123456';

export interface ResetAllMemberCredentialsPreflight {
  accountCount: number;
  revisionTotal: number;
  activeCount: number;
  pendingActivationCount: number;
  disabledCount: number;
  administratorCount: number;
  userCount: number;
}

export interface OwnerRecoveryResetInput {
  confirmation: string;
  expectedAccountCount: number;
  expectedRevisionTotal: number;
}

export function buildResetPreflight(
  accounts: readonly ManagementAccountRecord[]
): ResetAllMemberCredentialsPreflight {
  return {
    accountCount: accounts.length,
    revisionTotal: accounts.reduce((total, account) => total + account.revision, 0),
    activeCount: accounts.filter(account => account.status === 'active').length,
    pendingActivationCount: accounts.filter(account => account.status === 'pending-activation').length,
    disabledCount: accounts.filter(account => account.status === 'disabled').length,
    administratorCount: accounts.filter(account => account.accountKind === 'admin').length,
    userCount: accounts.filter(account => account.accountKind === 'user').length
  };
}
