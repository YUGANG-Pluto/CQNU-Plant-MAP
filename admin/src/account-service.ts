import type {
  AccountClock,
  AccountStore,
  CredentialTokenPurpose,
  CredentialTokenRecord,
  ManagementAccountRecord,
  PublicManagementAccount
} from './account-contracts.js';
import {
  BULK_ACCOUNT_RESET_CONFIRMATION,
  BULK_ACCOUNT_RESET_TEMPORARY_PASSWORD
} from './account-reset-policy.js';
import {
  accountToPrincipal,
  normalizeAccessLevel,
  normalizeAccountKind,
  normalizeAccountStatus,
  normalizeUsername,
  publicAccount,
  validateUsername
} from './account-policy.js';
import type {
  ManagementAccessLevel,
  ManagementAccountKind,
  ManagementAccountStatus
} from './contracts.js';
import { AuthKeyRing, randomBase64Url } from './keyring.js';
import type { PasswordHasher } from './password.js';
import { PBKDF2_BOOTSTRAP_ITERATIONS, validatePasswordPolicy } from './password.js';
import type { AdminSessionGrant } from './session.js';
import { AdminSessionManager } from './session.js';

const LOGIN_FAILURE_LIMIT = 5;
const LOGIN_LOCK_MS = 10 * 60 * 1000;
const ACTIVATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TOKEN_TTL_MS = 15 * 60 * 1000;

export interface BootstrapAccountInput {
  username: string;
  password: string;
  displayName: string;
  accountKind: ManagementAccountKind;
  accessLevel: ManagementAccessLevel;
}

export interface BootstrapAccountsInput {
  administrator: BootstrapAccountInput;
  user: BootstrapAccountInput;
}

export interface LoginResult {
  account: PublicManagementAccount;
  grant: AdminSessionGrant;
}

export interface CredentialTokenGrant {
  token: string;
  purpose: CredentialTokenPurpose;
  expiresAt: string;
  account: PublicManagementAccount;
}

export interface CreateMemberInput {
  username: string;
  displayName: string;
  accountKind: ManagementAccountKind;
  accessLevel: ManagementAccessLevel;
}

export interface UpdateMemberInput {
  displayName?: string;
  accountKind?: ManagementAccountKind;
  accessLevel?: ManagementAccessLevel;
  status?: ManagementAccountStatus;
}

export interface ConsumeCredentialTokenInput {
  token: string;
  username?: string;
  password: string;
  displayName?: string;
}

export interface ResetAllMemberCredentialsInput {
  currentPassword: string;
  confirmation: string;
}

export interface ResetAllMemberCredentialsResult {
  accountCount: number;
  revokedSessionCount: number;
  resetAt: string;
}

export interface AccountServiceOptions {
  store: AccountStore;
  sessions: AdminSessionManager;
  passwordHasher: PasswordHasher;
  keyRing: AuthKeyRing;
  clock?: AccountClock;
}

function defaultClock(): AccountClock {
  return {
    now: () => new Date(),
    randomId: prefix => `${prefix}_${randomBase64Url(18)}`
  };
}

function cleanDisplayName(value: string, fallback: string): string {
  const result = value.normalize('NFKC').trim().replace(/\s+/gu, ' ').slice(0, 80);
  return result || fallback;
}

function tokenParts(token: string): {
  purpose: CredentialTokenPurpose;
  keyId: string;
} | null {
  const match = /^(act|rst)\.([A-Za-z0-9_-]{1,32})\.[A-Za-z0-9_-]{20,}$/u.exec(token);
  if (!match) return null;
  return {
    purpose: match[1] === 'act' ? 'activation' : 'password-reset',
    keyId: match[2] || ''
  };
}

function withRevision(
  account: ManagementAccountRecord,
  changes: Partial<ManagementAccountRecord>,
  now: string
): ManagementAccountRecord {
  return {
    ...account,
    ...changes,
    updatedAt: now,
    revision: account.revision + 1
  };
}

export class ManagementAccountService {
  readonly #store: AccountStore;
  readonly #sessions: AdminSessionManager;
  readonly #passwordHasher: PasswordHasher;
  readonly #keyRing: AuthKeyRing;
  readonly #clock: AccountClock;

  constructor(options: AccountServiceOptions) {
    this.#store = options.store;
    this.#sessions = options.sessions;
    this.#passwordHasher = options.passwordHasher;
    this.#keyRing = options.keyRing;
    this.#clock = options.clock || defaultClock();
  }

  async ensureBootstrapAccounts(input: BootstrapAccountsInput): Promise<boolean> {
    if ((await this.#store.listAccounts()).length) return false;
    const now = this.#clock.now().toISOString();
    const records = [input.administrator, input.user];
    if (records.filter(item => item.accountKind === 'admin').length !== 1) {
      throw new Error('BOOTSTRAP_ACCOUNT_CONFIG_INVALID');
    }
    const normalized = new Set<string>();
    const prepared: Array<BootstrapAccountInput & {
      username: string;
      normalizedUsername: string;
    }> = [];
    for (const item of records) {
      const username = validateUsername(item.username);
      const normalizedUsername = normalizeUsername(username);
      if (normalized.has(normalizedUsername)) throw new Error('BOOTSTRAP_ACCOUNT_CONFIG_INVALID');
      normalized.add(normalizedUsername);
      prepared.push({ ...item, username, normalizedUsername });
    }
    const accounts = await Promise.all(prepared.map(async item => {
      const passwordVerifier = await this.#passwordHasher.hash(item.password, {
        allowWeakBootstrap: true,
        bootstrapIterations: PBKDF2_BOOTSTRAP_ITERATIONS
      });
      return {
        id: this.#clock.randomId('acct'),
        username: item.username,
        normalizedUsername: item.normalizedUsername,
        displayName: cleanDisplayName(item.displayName, item.username),
        accountKind: item.accountKind,
        accessLevel: item.accountKind === 'admin' ? 'save' : normalizeAccessLevel(item.accessLevel),
        status: 'pending-activation',
        passwordVerifier,
        mustChangePassword: true,
        passwordChangeRecommended: true,
        credentialVersion: 1,
        failedLoginCount: 0,
        lockedUntil: null,
        createdAt: now,
        updatedAt: now,
        activatedAt: null,
        revision: 1
      } satisfies ManagementAccountRecord;
    }));
    try {
      await this.#store.createAccounts(accounts);
    } catch (error) {
      if ((await this.#store.listAccounts()).length >= accounts.length) return false;
      throw error;
    }
    return true;
  }

  async login(usernameInput: string, password: string): Promise<LoginResult> {
    const now = this.#clock.now();
    const account = await this.#store.getAccountByUsername(normalizeUsername(usernameInput));
    const verifier = account?.passwordVerifier || null;
    const fallbackVerifier = verifier || (await this.#store.listAccounts())
      .find(item => item.passwordVerifier)?.passwordVerifier || null;
    const usable = account
      && account.status !== 'disabled'
      && verifier
      && (!account.lockedUntil || Date.parse(account.lockedUntil) <= now.getTime());
    const comparedPassword = fallbackVerifier
      ? await this.#passwordHasher.verify(password, fallbackVerifier)
      : false;
    const passwordValid = Boolean(usable && verifier && comparedPassword);
    if (!account || !usable || !passwordValid) {
      if (account && account.status !== 'disabled') await this.#recordLoginFailure(account, now);
      throw new Error('LOGIN_FAILED');
    }

    let current = account;
    if (account.failedLoginCount || account.lockedUntil || this.#passwordHasher.needsRehash(verifier)) {
      const passwordVerifier = this.#passwordHasher.needsRehash(verifier)
        ? await this.#passwordHasher.hash(password, {
          allowWeakBootstrap: account.mustChangePassword || account.passwordChangeRecommended === true
        })
        : verifier;
      current = withRevision(account, {
        passwordVerifier,
        failedLoginCount: 0,
        lockedUntil: null
      }, now.toISOString());
      await this.#store.updateAccount(current, account.revision);
    }
    const grant = await this.#sessions.issue(accountToPrincipal(current), 'password');
    return { account: publicAccount(current), grant };
  }

  async activateBootstrapAccount(input: {
    accountId: string;
    currentPassword: string;
    username: string;
    password?: string;
    displayName?: string;
  }): Promise<LoginResult> {
    const account = await this.#requiredAccount(input.accountId);
    if (!account.passwordVerifier
      || !account.mustChangePassword
      || !await this.#passwordHasher.verify(input.currentPassword, account.passwordVerifier)) {
      throw new Error('ACTIVATION_FAILED');
    }
    const updated = input.password
      ? await this.#replaceCredentials(account, {
        username: input.username,
        password: input.password,
        displayName: input.displayName,
        status: 'active'
      })
      : await this.#activateWithCurrentPassword(account, input);
    await this.#sessions.revokeAllForPrincipal(account.id);
    const grant = await this.#sessions.issue(accountToPrincipal(updated), 'password');
    return { account: publicAccount(updated), grant };
  }

  async changeUsername(input: {
    accountId: string;
    currentPassword: string;
    username: string;
  }): Promise<LoginResult> {
    const account = await this.#requiredActiveAccount(input.accountId);
    await this.#verifyCurrentPassword(account, input.currentPassword);
    const now = this.#clock.now().toISOString();
    const username = validateUsername(input.username);
    const updated = withRevision(account, {
      username,
      normalizedUsername: normalizeUsername(username),
      credentialVersion: account.credentialVersion + 1
    }, now);
    await this.#store.updateAccount(updated, account.revision);
    await this.#sessions.revokeAllForPrincipal(account.id);
    const grant = await this.#sessions.issue(accountToPrincipal(updated), 'password');
    return { account: publicAccount(updated), grant };
  }

  async changePassword(input: {
    accountId: string;
    currentPassword: string;
    password: string;
  }): Promise<LoginResult> {
    const account = await this.#requiredActiveAccount(input.accountId);
    await this.#verifyCurrentPassword(account, input.currentPassword);
    const updated = await this.#replaceCredentials(account, { password: input.password });
    await this.#sessions.revokeAllForPrincipal(account.id);
    const grant = await this.#sessions.issue(accountToPrincipal(updated), 'password');
    return { account: publicAccount(updated), grant };
  }

  async listAccounts(): Promise<PublicManagementAccount[]> {
    return (await this.#store.listAccounts()).map(publicAccount);
  }

  async resetAllMemberCredentials(
    actorId: string,
    input: ResetAllMemberCredentialsInput
  ): Promise<ResetAllMemberCredentialsResult> {
    const actor = await this.#requiredAdministrator(actorId);
    await this.#verifyCurrentPassword(actor, input.currentPassword);
    if (input.confirmation !== BULK_ACCOUNT_RESET_CONFIRMATION) {
      throw new Error('ACCOUNT_RESET_CONFIRMATION_INVALID');
    }
    const accounts = await this.#store.listAccounts();
    if (!accounts.length) throw new Error('ACCOUNT_RESET_INVALID');
    const resetAt = this.#clock.now().toISOString();
    const updates = await Promise.all(accounts.map(async account => ({
      account: withRevision(account, {
        passwordVerifier: await this.#passwordHasher.hash(BULK_ACCOUNT_RESET_TEMPORARY_PASSWORD, {
          allowWeakBootstrap: true
        }),
        status: 'pending-activation',
        mustChangePassword: true,
        passwordChangeRecommended: true,
        credentialVersion: account.credentialVersion + 1,
        failedLoginCount: 0,
        lockedUntil: null,
        activatedAt: null
      }, resetAt),
      expectedRevision: account.revision
    })));
    await this.#store.resetAccountsForActivation(updates, resetAt);
    let revokedSessionCount = 0;
    for (const account of accounts) {
      revokedSessionCount += await this.#sessions.revokeAllForPrincipal(account.id);
    }
    return { accountCount: accounts.length, revokedSessionCount, resetAt };
  }

  async createMember(actorId: string, input: CreateMemberInput): Promise<CredentialTokenGrant> {
    await this.#requiredAdministrator(actorId);
    const now = this.#clock.now().toISOString();
    const username = validateUsername(input.username);
    const account: ManagementAccountRecord = {
      id: this.#clock.randomId('acct'),
      username,
      normalizedUsername: normalizeUsername(username),
      displayName: cleanDisplayName(input.displayName, username),
      accountKind: normalizeAccountKind(input.accountKind),
      accessLevel: input.accountKind === 'admin' ? 'save' : normalizeAccessLevel(input.accessLevel),
      status: 'pending-activation',
      passwordVerifier: null,
      mustChangePassword: true,
      passwordChangeRecommended: false,
      credentialVersion: 1,
      failedLoginCount: 0,
      lockedUntil: null,
      createdAt: now,
      updatedAt: now,
      activatedAt: null,
      revision: 1
    };
    await this.#store.createAccount(account);
    return this.#issueCredentialToken(account, actorId, 'activation');
  }

  async updateMember(actorId: string, memberId: string, input: UpdateMemberInput): Promise<PublicManagementAccount> {
    await this.#requiredAdministrator(actorId);
    if (actorId === memberId) throw new Error('USE_SELF_ACCOUNT_SETTINGS');
    const account = await this.#requiredAccount(memberId);
    const accountKind = normalizeAccountKind(input.accountKind ?? account.accountKind);
    const accessLevel = accountKind === 'admin'
      ? 'save'
      : normalizeAccessLevel(input.accessLevel ?? account.accessLevel);
    const updated = withRevision(account, {
      ...(input.displayName === undefined
        ? {}
        : { displayName: cleanDisplayName(input.displayName, account.username) }),
      accountKind,
      accessLevel,
      status: normalizeAccountStatus(input.status ?? account.status),
      credentialVersion: account.credentialVersion + 1
    }, this.#clock.now().toISOString());
    await this.#store.updateAccount(updated, account.revision);
    await this.#sessions.revokeAllForPrincipal(account.id);
    return publicAccount(updated);
  }

  async issuePasswordReset(actorId: string, memberId: string): Promise<CredentialTokenGrant> {
    await this.#requiredAdministrator(actorId);
    if (actorId === memberId) throw new Error('USE_SELF_PASSWORD_CHANGE');
    const account = await this.#requiredAccount(memberId);
    await this.#sessions.revokeAllForPrincipal(account.id);
    return this.#issueCredentialToken(account, actorId, 'password-reset');
  }

  async consumeCredentialToken(input: ConsumeCredentialTokenInput): Promise<LoginResult> {
    const parts = tokenParts(input.token);
    if (!parts || !this.#keyRing.hasKey(parts.keyId)) throw new Error('CREDENTIAL_TOKEN_INVALID');
    const digest = await this.#keyRing.digest(parts.purpose, input.token, parts.keyId);
    const token = await this.#store.getCredentialToken(digest.digest, parts.keyId);
    const now = this.#clock.now();
    if (!token
      || token.purpose !== parts.purpose
      || token.consumedAt
      || Date.parse(token.expiresAt) <= now.getTime()) throw new Error('CREDENTIAL_TOKEN_INVALID');
    const account = await this.#requiredAccount(token.accountId);
    const username = validateUsername(input.username || account.username);
    const policy = validatePasswordPolicy(input.password, username);
    if (!policy.valid) throw new Error(policy.code);
    const updated = withRevision(account, {
      username,
      normalizedUsername: normalizeUsername(username),
      displayName: cleanDisplayName(input.displayName || account.displayName, username),
      passwordVerifier: await this.#passwordHasher.hash(input.password),
      status: 'active',
      mustChangePassword: false,
      passwordChangeRecommended: false,
      credentialVersion: account.credentialVersion + 1,
      failedLoginCount: 0,
      lockedUntil: null,
      activatedAt: account.activatedAt || now.toISOString()
    }, now.toISOString());
    const consumed = await this.#store.consumeCredentialTokenAndUpdateAccount(
      token.id,
      now.toISOString(),
      updated,
      account.revision
    );
    if (!consumed) throw new Error('CREDENTIAL_TOKEN_INVALID');
    await this.#sessions.revokeAllForPrincipal(account.id);
    const grant = await this.#sessions.issue(accountToPrincipal(updated), 'password');
    return { account: publicAccount(updated), grant };
  }

  async #recordLoginFailure(account: ManagementAccountRecord, now: Date): Promise<void> {
    const failedLoginCount = account.failedLoginCount + 1;
    const lockedUntil = failedLoginCount >= LOGIN_FAILURE_LIMIT
      ? new Date(now.getTime() + LOGIN_LOCK_MS).toISOString()
      : null;
    const updated = withRevision(account, { failedLoginCount, lockedUntil }, now.toISOString());
    try {
      await this.#store.updateAccount(updated, account.revision);
    } catch (error) {
      if (!(error instanceof Error) || error.message !== 'ACCOUNT_UPDATE_CONFLICT') throw error;
    }
  }

  async #replaceCredentials(
    account: ManagementAccountRecord,
    input: {
      username?: string;
      password: string;
      displayName?: string;
      status?: ManagementAccountStatus;
    }
  ): Promise<ManagementAccountRecord> {
    const username = validateUsername(input.username || account.username);
    const policy = validatePasswordPolicy(input.password, username);
    if (!policy.valid) throw new Error(policy.code);
    const now = this.#clock.now().toISOString();
    const updated = withRevision(account, {
      username,
      normalizedUsername: normalizeUsername(username),
      displayName: cleanDisplayName(input.displayName || account.displayName, username),
      passwordVerifier: await this.#passwordHasher.hash(input.password),
      status: input.status || account.status,
      mustChangePassword: false,
      passwordChangeRecommended: false,
      credentialVersion: account.credentialVersion + 1,
      failedLoginCount: 0,
      lockedUntil: null,
      activatedAt: account.activatedAt || now
    }, now);
    await this.#store.updateAccount(updated, account.revision);
    return updated;
  }

  async #activateWithCurrentPassword(
    account: ManagementAccountRecord,
    input: { username: string; displayName?: string }
  ): Promise<ManagementAccountRecord> {
    const username = validateUsername(input.username || account.username);
    const now = this.#clock.now().toISOString();
    const updated = withRevision(account, {
      username,
      normalizedUsername: normalizeUsername(username),
      displayName: cleanDisplayName(input.displayName || account.displayName, username),
      status: 'active',
      mustChangePassword: false,
      passwordChangeRecommended: true,
      credentialVersion: account.credentialVersion + 1,
      failedLoginCount: 0,
      lockedUntil: null,
      activatedAt: account.activatedAt || now
    }, now);
    await this.#store.updateAccount(updated, account.revision);
    return updated;
  }

  async #verifyCurrentPassword(account: ManagementAccountRecord, password: string): Promise<void> {
    if (!account.passwordVerifier || !await this.#passwordHasher.verify(password, account.passwordVerifier)) {
      throw new Error('CURRENT_PASSWORD_INVALID');
    }
  }

  async #requiredAccount(id: string): Promise<ManagementAccountRecord> {
    const account = await this.#store.getAccountById(id);
    if (!account) throw new Error('ACCOUNT_NOT_FOUND');
    return account;
  }

  async #requiredActiveAccount(id: string): Promise<ManagementAccountRecord> {
    const account = await this.#requiredAccount(id);
    if (account.status !== 'active' || account.mustChangePassword) throw new Error('ACCOUNT_NOT_ACTIVE');
    return account;
  }

  async #requiredAdministrator(id: string): Promise<ManagementAccountRecord> {
    const account = await this.#requiredActiveAccount(id);
    if (account.accountKind !== 'admin') throw new Error('ADMIN_ACCESS_DENIED');
    return account;
  }

  async #issueCredentialToken(
    account: ManagementAccountRecord,
    issuedByAccountId: string,
    purpose: CredentialTokenPurpose
  ): Promise<CredentialTokenGrant> {
    const now = this.#clock.now();
    const keyId = this.#keyRing.activeKeyId();
    const token = `${purpose === 'activation' ? 'act' : 'rst'}.${keyId}.${randomBase64Url(32)}`;
    const digest = await this.#keyRing.digest(purpose, token, keyId);
    const expiresAt = new Date(now.getTime() + (
      purpose === 'activation' ? ACTIVATION_TOKEN_TTL_MS : PASSWORD_RESET_TOKEN_TTL_MS
    )).toISOString();
    const record: CredentialTokenRecord = {
      id: this.#clock.randomId(purpose === 'activation' ? 'activation' : 'reset'),
      accountId: account.id,
      purpose,
      tokenDigest: digest.digest,
      tokenKeyId: digest.keyId,
      issuedByAccountId,
      createdAt: now.toISOString(),
      expiresAt,
      consumedAt: null
    };
    await this.#store.putCredentialToken(record);
    return { token, purpose, expiresAt, account: publicAccount(account) };
  }
}
