import type {
  ManagementAccessLevel,
  ManagementAccountKind,
  ManagementAccountStatus
} from './contracts.js';

export const MAX_ADMINISTRATORS = 3;

export interface PasswordVerifierRecord {
  algorithm: 'pbkdf2-hmac-sha256+hmac-sha256';
  iterations: number;
  salt: string;
  digest: string;
  keyId: string;
}

export interface ManagementAccountRecord {
  id: string;
  username: string;
  normalizedUsername: string;
  displayName: string;
  accountKind: ManagementAccountKind;
  accessLevel: ManagementAccessLevel;
  status: ManagementAccountStatus;
  passwordVerifier: PasswordVerifierRecord | null;
  mustChangePassword: boolean;
  passwordChangeRecommended?: boolean;
  credentialVersion: number;
  failedLoginCount: number;
  lockedUntil: string | null;
  createdAt: string;
  updatedAt: string;
  activatedAt: string | null;
  revision: number;
}

export interface AccountActivationResetUpdate {
  account: ManagementAccountRecord;
  expectedRevision: number;
}

export type PublicManagementAccount = Omit<
  ManagementAccountRecord,
  'passwordVerifier' | 'normalizedUsername' | 'failedLoginCount' | 'lockedUntil'
>;

export type CredentialTokenPurpose = 'activation' | 'password-reset';

export interface CredentialTokenRecord {
  id: string;
  accountId: string;
  purpose: CredentialTokenPurpose;
  tokenDigest: string;
  tokenKeyId: string;
  issuedByAccountId: string;
  createdAt: string;
  expiresAt: string;
  consumedAt: string | null;
}

export interface AccountStore {
  getAccountById(id: string): Promise<ManagementAccountRecord | null>;
  getAccountByUsername(normalizedUsername: string): Promise<ManagementAccountRecord | null>;
  listAccounts(): Promise<ManagementAccountRecord[]>;
  createAccount(account: ManagementAccountRecord): Promise<void>;
  createAccounts(accounts: readonly ManagementAccountRecord[]): Promise<void>;
  updateAccount(account: ManagementAccountRecord, expectedRevision: number): Promise<void>;
  resetAccountsForActivation(
    updates: readonly AccountActivationResetUpdate[],
    invalidatedAt: string
  ): Promise<void>;
  putCredentialToken(token: CredentialTokenRecord): Promise<void>;
  getCredentialToken(tokenDigest: string, tokenKeyId: string): Promise<CredentialTokenRecord | null>;
  consumeCredentialTokenAndUpdateAccount(
    id: string,
    consumedAt: string,
    account: ManagementAccountRecord,
    expectedRevision: number
  ): Promise<boolean>;
}

export interface AccountClock {
  now(): Date;
  randomId(prefix: string): string;
}
