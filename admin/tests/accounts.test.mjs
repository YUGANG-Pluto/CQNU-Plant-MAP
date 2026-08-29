import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AdminSessionManager,
  AuthKeyRing,
  InMemoryAccountStore,
  InMemorySessionStore,
  ManagementAccountService,
  PBKDF2_BOOTSTRAP_ITERATIONS,
  PBKDF2_SHA256_ITERATIONS,
  Pbkdf2PasswordHasher,
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
    password: '123456',
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
  const login = await service.login('admin', '123456');
  return service.activateBootstrapAccount({
    accountId: login.account.id,
    currentPassword: '123456',
    username: 'admin',
    password: 'A secure administrator passphrase'
  });
}

test('bootstrap credentials are seeded once and require first-use activation', async () => {
  const { service } = harness();
  assert.equal(await service.ensureBootstrapAccounts(bootstrap), true);
  assert.equal(await service.ensureBootstrapAccounts(bootstrap), false);
  const login = await service.login('ADMIN', '123456');
  assert.equal(login.account.mustChangePassword, true);
  assert.equal(login.account.status, 'pending-activation');

  const activated = await service.activateBootstrapAccount({
    accountId: login.account.id,
    currentPassword: '123456',
    username: 'principal.admin',
    password: 'A secure research passphrase 2026'
  });
  assert.equal(activated.account.mustChangePassword, false);
  assert.equal(activated.account.status, 'active');
  assert.equal(activated.account.username, 'principal.admin');
});

test('bootstrap verifiers use a bounded cost and require an immediate production rehash', async () => {
  const passwordKeyRing = new AuthKeyRing({
    activeKeyId: 'k1',
    keys: { k1: bytesToBase64Url(Uint8Array.from({ length: 32 }, (_, index) => index + 17)) }
  });
  const hasher = new Pbkdf2PasswordHasher(passwordKeyRing, PBKDF2_SHA256_ITERATIONS);
  const verifier = await hasher.hash('123456', {
    allowWeakBootstrap: true,
    bootstrapIterations: PBKDF2_BOOTSTRAP_ITERATIONS
  });
  assert.equal(verifier.iterations, PBKDF2_BOOTSTRAP_ITERATIONS);
  assert.equal(await hasher.verify('123456', verifier), true);
  assert.equal(hasher.needsRehash(verifier), true);
  await assert.rejects(
    hasher.hash('A secure research passphrase', {
      bootstrapIterations: PBKDF2_BOOTSTRAP_ITERATIONS
    }),
    /PASSWORD_HASH_POLICY_INVALID/
  );
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

test('activation may retain the temporary password and recommends a later personal password', async () => {
  const { service } = harness();
  await service.ensureBootstrapAccounts(bootstrap);
  const login = await service.login('admin', '123456');
  const activated = await service.activateBootstrapAccount({
    accountId: login.account.id,
    currentPassword: '123456',
    username: 'admin'
  });
  assert.equal(activated.account.status, 'active');
  assert.equal(activated.account.mustChangePassword, false);
  assert.equal(activated.account.passwordChangeRecommended, true);
  const changed = await service.changePassword({
    accountId: activated.account.id,
    currentPassword: '123456',
    password: 'A personal administrator passphrase'
  });
  assert.equal(changed.account.passwordChangeRecommended, false);
  await assert.rejects(service.login('admin', '123456'), /LOGIN_FAILED/);
  assert.equal((await service.login('admin', 'A personal administrator passphrase')).account.id, activated.account.id);
});

test('administrator can reset every account to one audited temporary activation state', async () => {
  const { service, accountStore, sessionStore } = harness();
  await service.ensureBootstrapAccounts(bootstrap);
  const admin = await activateAdministrator(service);
  const userLogin = await service.login('user', '123456');
  await service.activateBootstrapAccount({
    accountId: userLogin.account.id,
    currentPassword: '123456',
    username: 'user',
    password: 'A personal research user passphrase'
  });
  const invitation = await service.createMember(admin.account.id, {
    username: 'field.writer',
    displayName: 'Field writer',
    accountKind: 'user',
    accessLevel: 'edit'
  });
  await assert.rejects(service.resetAllMemberCredentials(admin.account.id, {
    currentPassword: 'A secure administrator passphrase',
    confirmation: 'RESET SOME MEMBERS'
  }), /ACCOUNT_RESET_CONFIRMATION_INVALID/);

  const reset = await service.resetAllMemberCredentials(admin.account.id, {
    currentPassword: 'A secure administrator passphrase',
    confirmation: 'RESET ALL MEMBERS'
  });
  assert.equal(reset.accountCount, 3);
  assert.ok(reset.revokedSessionCount >= 2);
  const accounts = await accountStore.listAccounts();
  assert.ok(accounts.every(account => account.status === 'pending-activation'));
  assert.ok(accounts.every(account => account.mustChangePassword));
  assert.ok(accounts.every(account => account.passwordChangeRecommended));
  assert.ok(accounts.every(account => account.activatedAt === null));
  assert.ok(sessionStore.snapshotRecords().every(session => session.revokedAt));
  assert.ok(accountStore.snapshotTokens().every(token => token.consumedAt));
  await assert.rejects(service.login('admin', 'A secure administrator passphrase'), /LOGIN_FAILED/);
  assert.equal((await service.login('admin', '123456')).account.mustChangePassword, true);
  assert.equal((await service.login('field.writer', '123456')).account.mustChangePassword, true);
  await assert.rejects(service.consumeCredentialToken({
    token: invitation.token,
    password: 'A stale invitation password'
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
