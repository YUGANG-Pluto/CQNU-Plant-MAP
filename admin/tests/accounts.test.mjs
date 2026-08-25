import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AdminSessionManager,
  AuthKeyRing,
  InMemoryAccountStore,
  InMemorySessionStore,
  ManagementAccountService,
  bytesToBase64Url
} from '../dist/index.js';

class TestPasswordHasher {
  async hash(password) {
    return {
      algorithm: 'pbkdf2-hmac-sha256+hmac-sha256',
      iterations: 600_000,
      salt: 'test-salt',
      digest: `digest:${password}`,
      keyId: 'k1'
    };
  }

  async verify(password, verifier) {
    return verifier.digest === `digest:${password}`;
  }

  needsRehash() {
    return false;
  }
}

function harness() {
  let nowMs = Date.parse('2026-08-25T00:00:00.000Z');
  let id = 0;
  let random = 0;
  const keyRing = new AuthKeyRing({
    activeKeyId: 'k1',
    keys: { k1: bytesToBase64Url(Uint8Array.from({ length: 32 }, (_, index) => 255 - index)) }
  });
  const accountStore = new InMemoryAccountStore();
  const sessionStore = new InMemorySessionStore();
  const sessions = new AdminSessionManager(sessionStore, {
    runtime: {
      now: () => new Date(nowMs),
      randomToken: byteLength => `${String(++random).padStart(4, '0')}${'y'.repeat(byteLength * 2)}`,
      keyRing
    }
  });
  const service = new ManagementAccountService({
    store: accountStore,
    sessions,
    passwordHasher: new TestPasswordHasher(),
    keyRing,
    clock: {
      now: () => new Date(nowMs),
      randomId: prefix => `${prefix}-${++id}`
    }
  });
  return {
    service,
    accountStore,
    sessionStore,
    advance: milliseconds => { nowMs += milliseconds; }
  };
}

const bootstrap = {
  administrator: {
    username: 'admin',
    password: '000000',
    displayName: 'Administrator',
    accountKind: 'admin',
    accessLevel: 'save'
  },
  user: {
    username: 'user',
    password: '123456',
    displayName: 'Research user',
    accountKind: 'user',
    accessLevel: 'read'
  }
};

async function activateAdministrator(service) {
  const login = await service.login('admin', '000000');
  return service.activateBootstrapAccount({
    accountId: login.account.id,
    currentPassword: '000000',
    username: 'admin',
    password: 'A secure administrator passphrase'
  });
}

test('bootstrap credentials are seeded once and require first-use activation', async () => {
  const { service } = harness();
  assert.equal(await service.ensureBootstrapAccounts(bootstrap), true);
  assert.equal(await service.ensureBootstrapAccounts(bootstrap), false);
  const login = await service.login('ADMIN', '000000');
  assert.equal(login.account.mustChangePassword, true);
  assert.equal(login.account.status, 'pending-activation');

  const activated = await service.activateBootstrapAccount({
    accountId: login.account.id,
    currentPassword: '000000',
    username: 'principal.admin',
    password: 'A secure research passphrase 2026'
  });
  assert.equal(activated.account.mustChangePassword, false);
  assert.equal(activated.account.status, 'active');
  assert.equal(activated.account.username, 'principal.admin');
});

test('login failures use a generic error and lock the account after five attempts', async () => {
  const { service, accountStore, advance } = harness();
  await service.ensureBootstrapAccounts(bootstrap);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await assert.rejects(service.login('user', 'incorrect'), /LOGIN_FAILED/);
  }
  await assert.rejects(service.login('user', '123456'), /LOGIN_FAILED/);
  const account = await accountStore.getAccountByUsername('user');
  assert.ok(account.lockedUntil);
  advance(10 * 60 * 1000 + 1);
  assert.equal((await service.login('user', '123456')).account.username, 'user');
});

test('activation tokens are single-use and account update is atomic', async () => {
  const { service } = harness();
  await service.ensureBootstrapAccounts(bootstrap);
  const admin = await activateAdministrator(service);
  const invitation = await service.createMember(admin.account.id, {
    username: 'field.reader',
    displayName: 'Field reader',
    accountKind: 'user',
    accessLevel: 'read'
  });
  const activated = await service.consumeCredentialToken({
    token: invitation.token,
    username: 'field.reader.renamed',
    password: 'A secure field reader passphrase'
  });
  assert.equal(activated.account.username, 'field.reader.renamed');
  await assert.rejects(service.consumeCredentialToken({
    token: invitation.token,
    password: 'Another secure field reader passphrase'
  }), /CREDENTIAL_TOKEN_INVALID/);
});

test('administrator limit and last-enabled-administrator rules are enforced by the store', async () => {
  const { service } = harness();
  await service.ensureBootstrapAccounts(bootstrap);
  const admin = await activateAdministrator(service);
  await assert.rejects(
    service.updateMember(admin.account.id, admin.account.id, { status: 'disabled' }),
    /USE_SELF_ACCOUNT_SETTINGS/
  );
  await service.createMember(admin.account.id, {
    username: 'admin.two', displayName: 'Admin 2', accountKind: 'admin', accessLevel: 'save'
  });
  await service.createMember(admin.account.id, {
    username: 'admin.three', displayName: 'Admin 3', accountKind: 'admin', accessLevel: 'save'
  });
  await assert.rejects(service.createMember(admin.account.id, {
    username: 'admin.four', displayName: 'Admin 4', accountKind: 'admin', accessLevel: 'save'
  }), /ADMIN_LIMIT_REACHED/);
});
