import {
  MAX_ADMINISTRATORS,
  type AccountStore,
  type CredentialTokenRecord,
  type ManagementAccountRecord
} from './account-contracts.js';

function clone<T>(value: T): T {
  return structuredClone(value);
}

function validateAccountSet(accounts: readonly ManagementAccountRecord[]): void {
  const usernames = new Set<string>();
  let enabledAdmins = 0;
  for (const account of accounts) {
    if (!account.id || usernames.has(account.normalizedUsername)) {
      throw new Error('ACCOUNT_USERNAME_CONFLICT');
    }
    usernames.add(account.normalizedUsername);
    if (account.accountKind === 'admin' && account.status !== 'disabled') enabledAdmins += 1;
    if (account.accountKind === 'admin' && account.accessLevel !== 'save') {
      throw new Error('ADMIN_ACCESS_LEVEL_INVALID');
    }
  }
  if (enabledAdmins > MAX_ADMINISTRATORS) throw new Error('ADMIN_LIMIT_REACHED');
  if (accounts.length && enabledAdmins < 1) throw new Error('LAST_ADMIN_REQUIRED');
}

export class InMemoryAccountStore implements AccountStore {
  readonly #accounts = new Map<string, ManagementAccountRecord>();
  readonly #accountIdByUsername = new Map<string, string>();
  readonly #tokens = new Map<string, CredentialTokenRecord>();
  #writeTail: Promise<void> = Promise.resolve();

  async #write<T>(operation: () => T | Promise<T>): Promise<T> {
    let release: () => void = () => undefined;
    const previous = this.#writeTail;
    this.#writeTail = new Promise<void>(resolve => { release = resolve; });
    await previous;
    try {
      return await operation();
    } finally {
      release();
    }
  }

  async getAccountById(id: string): Promise<ManagementAccountRecord | null> {
    const account = this.#accounts.get(id);
    return account ? clone(account) : null;
  }

  async getAccountByUsername(normalizedUsername: string): Promise<ManagementAccountRecord | null> {
    const id = this.#accountIdByUsername.get(normalizedUsername);
    return id ? this.getAccountById(id) : null;
  }

  async listAccounts(): Promise<ManagementAccountRecord[]> {
    return [...this.#accounts.values()]
      .map(clone)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  async createAccount(account: ManagementAccountRecord): Promise<void> {
    return this.createAccounts([account]);
  }

  async createAccounts(accounts: readonly ManagementAccountRecord[]): Promise<void> {
    await this.#write(() => {
      const incomingIds = new Set<string>();
      const incomingUsernames = new Set<string>();
      for (const account of accounts) {
        if (this.#accounts.has(account.id)
          || this.#accountIdByUsername.has(account.normalizedUsername)
          || incomingIds.has(account.id)
          || incomingUsernames.has(account.normalizedUsername)) {
          throw new Error('ACCOUNT_USERNAME_CONFLICT');
        }
        incomingIds.add(account.id);
        incomingUsernames.add(account.normalizedUsername);
      }
      const next = [...this.#accounts.values(), ...accounts.map(clone)];
      validateAccountSet(next);
      for (const account of accounts) {
        this.#accounts.set(account.id, clone(account));
        this.#accountIdByUsername.set(account.normalizedUsername, account.id);
      }
    });
  }

  async updateAccount(account: ManagementAccountRecord, expectedRevision: number): Promise<void> {
    await this.#write(() => {
      const previous = this.#accounts.get(account.id);
      if (!previous || previous.revision !== expectedRevision || account.revision !== expectedRevision + 1) {
        throw new Error('ACCOUNT_UPDATE_CONFLICT');
      }
      const duplicateId = this.#accountIdByUsername.get(account.normalizedUsername);
      if (duplicateId && duplicateId !== account.id) throw new Error('ACCOUNT_USERNAME_CONFLICT');
      const next = [...this.#accounts.values()].map(item => item.id === account.id ? clone(account) : item);
      validateAccountSet(next);
      this.#accountIdByUsername.delete(previous.normalizedUsername);
      this.#accounts.set(account.id, clone(account));
      this.#accountIdByUsername.set(account.normalizedUsername, account.id);
    });
  }

  async putCredentialToken(token: CredentialTokenRecord): Promise<void> {
    await this.#write(() => {
      if (!this.#accounts.has(token.accountId)) throw new Error('ACCOUNT_NOT_FOUND');
      const key = `${token.tokenKeyId}:${token.tokenDigest}`;
      if (this.#tokens.has(key)) throw new Error('CREDENTIAL_TOKEN_CONFLICT');
      this.#tokens.set(key, clone(token));
    });
  }

  async getCredentialToken(tokenDigest: string, tokenKeyId: string): Promise<CredentialTokenRecord | null> {
    const token = this.#tokens.get(`${tokenKeyId}:${tokenDigest}`);
    return token ? clone(token) : null;
  }

  async consumeCredentialTokenAndUpdateAccount(
    id: string,
    consumedAt: string,
    account: ManagementAccountRecord,
    expectedRevision: number
  ): Promise<boolean> {
    return this.#write(() => {
      const entry = [...this.#tokens.entries()].find(([, token]) => token.id === id);
      if (!entry || entry[1].consumedAt || entry[1].accountId !== account.id) return false;

      const previous = this.#accounts.get(account.id);
      if (!previous
        || previous.revision !== expectedRevision
        || account.revision !== expectedRevision + 1) return false;

      const duplicateId = this.#accountIdByUsername.get(account.normalizedUsername);
      if (duplicateId && duplicateId !== account.id) throw new Error('ACCOUNT_USERNAME_CONFLICT');
      const next = [...this.#accounts.values()].map(item => item.id === account.id ? clone(account) : item);
      validateAccountSet(next);

      this.#accountIdByUsername.delete(previous.normalizedUsername);
      this.#accounts.set(account.id, clone(account));
      this.#accountIdByUsername.set(account.normalizedUsername, account.id);
      this.#tokens.set(entry[0], { ...entry[1], consumedAt });
      return true;
    });
  }

  snapshotTokens(): CredentialTokenRecord[] {
    return [...this.#tokens.values()].map(clone);
  }
}
