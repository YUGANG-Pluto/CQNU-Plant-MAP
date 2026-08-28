import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AdminSessionManager,
  AuthKeyRing,
  CloudProjectService,
  InMemoryAccountStore,
  InMemoryAuditSink,
  InMemoryCloudProjectStore,
  InMemorySessionStore,
  ManagementAccountService,
  bytesToBase64Url,
  createManagementRequestHandler
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

class TestAuditSink extends InMemoryAuditSink {
  async listAuditEvents(limit = 100) {
    return this.events().slice(-limit).reverse();
  }
}

async function harness() {
  let id = 0;
  let random = 0;
  const keyRing = new AuthKeyRing({
    activeKeyId: 'k1',
    keys: { k1: bytesToBase64Url(Uint8Array.from({ length: 32 }, (_, index) => index + 24)) }
  });
  const accountStore = new InMemoryAccountStore();
  const sessionStore = new InMemorySessionStore();
  const sessions = new AdminSessionManager(sessionStore, {
    runtime: {
      now: () => new Date('2026-08-25T12:00:00.000Z'),
      randomToken: byteLength => `${String(++random).padStart(4, '0')}${'z'.repeat(byteLength * 2)}`,
      keyRing
    }
  });
  const accounts = new ManagementAccountService({
    store: accountStore,
    sessions,
    passwordHasher: new TestPasswordHasher(),
    keyRing,
    clock: {
      now: () => new Date('2026-08-25T12:00:00.000Z'),
      randomId: prefix => `${prefix}-${++id}`
    }
  });
  await accounts.ensureBootstrapAccounts({
    administrator: {
      username: 'admin', password: '000000', displayName: 'Administrator', accountKind: 'admin', accessLevel: 'save'
    },
    user: {
      username: 'user', password: '123456', displayName: 'Research user', accountKind: 'user', accessLevel: 'read'
    }
  });
  const audit = new TestAuditSink();
  return createManagementRequestHandler({
    accounts,
    accountStore,
    sessions,
    audit,
    cloudProjects: new CloudProjectService(new InMemoryCloudProjectStore(), {
      now: () => new Date('2026-08-25T12:00:00.000Z'),
      randomId: prefix => `${prefix}-http-${++id}`
    })
  });
}

async function call(handler, path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body !== undefined) headers.set('content-type', 'application/json');
  const response = await handler(new Request(`https://example.test${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  }));
  return { response, payload: await response.json() };
}

function sessionSecurity(result) {
  return {
    cookie: result.response.headers.get('set-cookie').split(';', 1)[0],
    csrf: result.payload.data.csrfToken
  };
}

test('HTTP flow forces bootstrap activation before administrator capabilities are available', async () => {
  const handler = await harness();
  const login = await call(handler, '/api/manage/login', {
    method: 'POST', body: { username: 'admin', password: '000000' }
  });
  assert.equal(login.response.status, 200);
  assert.equal(login.payload.data.account.mustChangePassword, true);
  assert.deepEqual(login.payload.data.capabilities, []);
  assert.match(login.response.headers.get('set-cookie'), /HttpOnly/);
  assert.match(login.response.headers.get('set-cookie'), /SameSite=Strict/);
  const pendingSecurity = sessionSecurity(login);

  const denied = await call(handler, '/api/manage/members', {
    headers: { cookie: pendingSecurity.cookie }
  });
  assert.equal(denied.response.status, 403);

  const activation = await call(handler, '/api/manage/account/activate', {
    method: 'POST',
    headers: {
      cookie: pendingSecurity.cookie,
      origin: 'https://example.test',
      'x-cqnu-csrf': pendingSecurity.csrf
    },
    body: {
      currentPassword: '000000',
      username: 'admin.primary',
      displayName: 'Primary administrator',
      password: 'A secure administrator passphrase'
    }
  });
  assert.equal(activation.response.status, 200);
  assert.equal(activation.payload.data.account.username, 'admin.primary');
  assert.ok(activation.payload.data.capabilities.includes('member.manage'));
});

test('administrator can issue a single-use member activation link through CSRF-protected API', async () => {
  const handler = await harness();
  const login = await call(handler, '/api/manage/login', {
    method: 'POST', body: { username: 'admin', password: '000000' }
  });
  const pending = sessionSecurity(login);
  const activation = await call(handler, '/api/manage/account/activate', {
    method: 'POST',
    headers: { cookie: pending.cookie, origin: 'https://example.test', 'x-cqnu-csrf': pending.csrf },
    body: {
      currentPassword: '000000', username: 'admin', displayName: 'Administrator',
      password: 'A secure administrator passphrase'
    }
  });
  const active = sessionSecurity(activation);
  const created = await call(handler, '/api/manage/members', {
    method: 'POST',
    headers: { cookie: active.cookie, origin: 'https://example.test', 'x-cqnu-csrf': active.csrf },
    body: {
      username: 'survey.reader', displayName: 'Survey reader', accountKind: 'user', accessLevel: 'read'
    }
  });
  assert.equal(created.response.status, 201);
  assert.match(created.payload.data.token, /^act\.k1\./);
  assert.equal(created.payload.data.account.passwordVerifier, undefined);

  const consumed = await call(handler, '/api/manage/password-reset/consume', {
    method: 'POST',
    body: {
      token: created.payload.data.token,
      username: 'survey.reader',
      password: 'A secure survey reader passphrase'
    }
  });
  assert.equal(consumed.response.status, 200);
  assert.deepEqual(consumed.payload.data.capabilities, ['workspace.read']);
  const repeated = await call(handler, '/api/manage/password-reset/consume', {
    method: 'POST',
    body: {
      token: created.payload.data.token,
      password: 'Another secure survey reader passphrase'
    }
  });
  assert.equal(repeated.response.status, 400);
  assert.equal(repeated.payload.error.code, 'CREDENTIAL_TOKEN_INVALID');
});

test('session refresh rotates CSRF material without exposing session token in JSON', async () => {
  const handler = await harness();
  const login = await call(handler, '/api/manage/login', {
    method: 'POST', body: { username: 'user', password: '123456' }
  });
  const pending = sessionSecurity(login);
  const activation = await call(handler, '/api/manage/account/activate', {
    method: 'POST',
    headers: { cookie: pending.cookie, origin: 'https://example.test', 'x-cqnu-csrf': pending.csrf },
    body: {
      currentPassword: '123456', username: 'user', displayName: 'Research user',
      password: 'A secure research reader passphrase'
    }
  });
  const security = sessionSecurity(activation);
  const refreshed = await call(handler, '/api/manage/session', {
    headers: { cookie: security.cookie }
  });
  assert.equal(refreshed.response.status, 200);
  assert.ok(refreshed.payload.data.csrfToken);
  assert.equal(JSON.stringify(refreshed.payload).includes('mgs.k1.'), false);
});

test('save-level account can create, upload, and read an owner-scoped cloud project', async () => {
  const handler = await harness();
  const login = await call(handler, '/api/manage/login', {
    method: 'POST', body: { username: 'admin', password: '000000' }
  });
  const pending = sessionSecurity(login);
  const activation = await call(handler, '/api/manage/account/activate', {
    method: 'POST',
    headers: { cookie: pending.cookie, origin: 'https://example.test', 'x-cqnu-csrf': pending.csrf },
    body: {
      currentPassword: '000000', username: 'admin', displayName: 'Administrator',
      password: 'A secure administrator passphrase'
    }
  });
  const active = sessionSecurity(activation);
  const created = await call(handler, '/api/projects', {
    method: 'POST',
    headers: { cookie: active.cookie, origin: 'https://example.test', 'x-cqnu-csrf': active.csrf },
    body: { name: 'Campus survey' }
  });
  assert.equal(created.response.status, 201);
  assert.equal(created.payload.data.project.revision, 0);

  const saved = await call(handler, `/api/projects/${created.payload.data.project.id}/snapshot`, {
    method: 'PUT',
    headers: { cookie: active.cookie, origin: 'https://example.test', 'x-cqnu-csrf': active.csrf },
    body: {
      expectedRevision: 0,
      snapshot: {
        settings: { language: 'zh' },
        zones: [{ id: 'zone-1', name: '一区' }],
        points: [{ id: 'point-1', zoneId: 'zone-1' }]
      }
    }
  });
  assert.equal(saved.response.status, 200);
  assert.equal(saved.payload.data.project.revision, 1);
  assert.match(saved.payload.data.project.contentSha256, /^[a-f0-9]{64}$/);

  const loaded = await call(handler, `/api/projects/${created.payload.data.project.id}`, {
    headers: { cookie: active.cookie }
  });
  assert.equal(loaded.response.status, 200);
  assert.equal(loaded.payload.data.snapshot.zones[0].name, '一区');
  assert.equal(JSON.stringify(loaded.payload).includes('ownerId'), false);
});

test('read-only account can list cloud projects but cannot create or upload one', async () => {
  const handler = await harness();
  const login = await call(handler, '/api/manage/login', {
    method: 'POST', body: { username: 'user', password: '123456' }
  });
  const pending = sessionSecurity(login);
  const activation = await call(handler, '/api/manage/account/activate', {
    method: 'POST',
    headers: { cookie: pending.cookie, origin: 'https://example.test', 'x-cqnu-csrf': pending.csrf },
    body: {
      currentPassword: '123456', username: 'user', displayName: 'Research user',
      password: 'A secure research reader passphrase'
    }
  });
  const security = sessionSecurity(activation);
  const listed = await call(handler, '/api/projects', { headers: { cookie: security.cookie } });
  assert.equal(listed.response.status, 200);
  assert.deepEqual(listed.payload.data.projects, []);

  const denied = await call(handler, '/api/projects', {
    method: 'POST',
    headers: { cookie: security.cookie, origin: 'https://example.test', 'x-cqnu-csrf': security.csrf },
    body: { name: 'Denied project' }
  });
  assert.equal(denied.response.status, 403);
  assert.equal(denied.payload.error.code, 'CAPABILITY_DENIED');
});
