import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';

import { D1ManagementStore, ensureManagementSchema } from '../dist/d1-store.js';

class SqliteD1Statement {
  #database;
  #query;
  #values;

  constructor(database, query, values = []) {
    this.#database = database;
    this.#query = query;
    this.#values = values;
  }

  bind(...values) {
    return new SqliteD1Statement(this.#database, this.#query, values);
  }

  async first() {
    return this.#database.prepare(this.#query).get(...this.#values) || null;
  }

  async all() {
    return { results: this.#database.prepare(this.#query).all(...this.#values) };
  }

  async run() {
    const result = this.#database.prepare(this.#query).run(...this.#values);
    return { success: true, meta: { changes: Number(result.changes) } };
  }
}

class SqliteD1Database {
  #database = new DatabaseSync(':memory:');

  prepare(query) {
    return new SqliteD1Statement(this.#database, query);
  }

  async batch(statements) {
    this.#database.exec('BEGIN IMMEDIATE');
    try {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      this.#database.exec('COMMIT');
      return results;
    } catch (error) {
      this.#database.exec('ROLLBACK');
      throw error;
    }
  }

  close() {
    this.#database.close();
  }
}

const initialAt = '2026-08-29T00:00:00.000Z';
const resetAt = '2026-08-29T01:00:00.000Z';

function account(id, username) {
  return {
    id,
    username,
    normalizedUsername: username.toLowerCase(),
    displayName: username,
    accountKind: id === 'acct_admin' ? 'admin' : 'user',
    accessLevel: id === 'acct_admin' ? 'save' : 'edit',
    status: 'active',
    passwordVerifier: null,
    mustChangePassword: false,
    passwordChangeRecommended: false,
    credentialVersion: 1,
    failedLoginCount: 0,
    lockedUntil: null,
    createdAt: initialAt,
    updatedAt: initialAt,
    activatedAt: initialAt,
    revision: 1
  };
}

function token(id, accountId) {
  return {
    id,
    accountId,
    purpose: 'activation',
    tokenDigest: `digest_${id}`,
    tokenKeyId: 'test-key',
    issuedByAccountId: 'acct_admin',
    createdAt: initialAt,
    expiresAt: '2026-08-30T00:00:00.000Z',
    consumedAt: null
  };
}

function resetUpdate(source) {
  return {
    expectedRevision: source.revision,
    account: {
      ...source,
      status: 'pending-activation',
      mustChangePassword: true,
      passwordChangeRecommended: true,
      credentialVersion: source.credentialVersion + 1,
      failedLoginCount: 0,
      lockedUntil: null,
      updatedAt: resetAt,
      activatedAt: null,
      revision: source.revision + 1
    }
  };
}

async function fixture() {
  const database = new SqliteD1Database();
  await ensureManagementSchema(database);
  await ensureManagementSchema(database);
  const store = new D1ManagementStore(database);
  const accounts = [account('acct_admin', 'admin'), account('acct_user', 'user')];
  await store.createAccounts(accounts);
  await store.putCredentialToken(token('token_admin', 'acct_admin'));
  await store.putCredentialToken(token('token_user', 'acct_user'));
  return { database, store, accounts };
}

test('D1 identity reset updates every account and consumes outstanding credential links atomically', async t => {
  const { database, store, accounts } = await fixture();
  t.after(() => database.close());

  await store.resetAccountsForActivation(accounts.map(resetUpdate), resetAt);

  const updated = await store.listAccounts();
  assert.ok(updated.every(item => item.status === 'pending-activation'));
  assert.ok(updated.every(item => item.passwordChangeRecommended === true));
  assert.ok(updated.every(item => item.revision === 2));
  assert.equal((await store.getCredentialToken('digest_token_admin', 'test-key')).consumedAt, resetAt);
  assert.equal((await store.getCredentialToken('digest_token_user', 'test-key')).consumedAt, resetAt);
});

test('D1 identity reset leaves accounts and links unchanged on a stale revision', async t => {
  const { database, store, accounts } = await fixture();
  t.after(() => database.close());
  const concurrent = {
    ...accounts[0],
    displayName: 'Concurrent administrator update',
    updatedAt: '2026-08-29T00:30:00.000Z',
    revision: 2
  };
  await store.updateAccount(concurrent, 1);

  await assert.rejects(
    store.resetAccountsForActivation(accounts.map(resetUpdate), resetAt),
    /ACCOUNT_UPDATE_CONFLICT/
  );

  const current = await store.listAccounts();
  assert.equal(current.find(item => item.id === concurrent.id).displayName, concurrent.displayName);
  assert.equal(current.find(item => item.id === 'acct_user').status, 'active');
  assert.equal((await store.getCredentialToken('digest_token_admin', 'test-key')).consumedAt, null);
  assert.equal((await store.getCredentialToken('digest_token_user', 'test-key')).consumedAt, null);
});
