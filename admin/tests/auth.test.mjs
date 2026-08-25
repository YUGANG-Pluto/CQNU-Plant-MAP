import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADMIN_CSRF_HEADER_NAME,
  ADMIN_SESSION_COOKIE_NAME,
  AdminSessionManager,
  AuthKeyRing,
  InMemoryAuditSink,
  InMemorySessionStore,
  OwnerIdentityAdapter,
  authorizeAdminRequest,
  bytesToBase64Url,
  clearAdminSessionCookie,
  validateAdminCsrf
} from '../dist/index.js';

const keyRing = new AuthKeyRing({
  activeKeyId: 'k1',
  keys: { k1: bytesToBase64Url(Uint8Array.from({ length: 32 }, (_, index) => index + 1)) }
});

const administrator = Object.freeze({
  id: 'owner-1',
  providerSubject: 'provider-owner',
  username: 'owner-1',
  displayName: 'Administrator',
  accountKind: 'admin',
  accessLevel: 'save',
  status: 'active',
  mustChangePassword: false,
  credentialVersion: 1,
  enabled: true
});

function sessionHarness(policy = {}) {
  let nowMs = Date.parse('2026-08-24T00:00:00.000Z');
  let randomCounter = 0;
  const store = new InMemorySessionStore();
  const manager = new AdminSessionManager(store, {
    policy,
    runtime: {
      now: () => new Date(nowMs),
      randomToken: byteLength => `${String(++randomCounter).padStart(4, '0')}${'x'.repeat(byteLength * 2)}`,
      keyRing
    }
  });
  return {
    store,
    manager,
    advance(milliseconds) {
      nowMs += milliseconds;
    }
  };
}

test('identity adapter maps a fresh configured owner assertion to an administrator principal', async () => {
  let verified = {
    subject: 'provider-owner',
    issuer: 'https://identity.example.test',
    audience: 'cqnu-admin',
    displayName: 'Verified Administrator',
    authenticatedAt: '2026-08-24T00:00:00.000Z',
    expiresAt: '2026-08-24T00:05:00.000Z',
    authenticationMethod: 'oidc'
  };
  const adapter = new OwnerIdentityAdapter({
    issuer: 'https://identity.example.test',
    audience: 'cqnu-admin',
    ownerSubject: 'provider-owner',
    ownerPrincipalId: 'owner-1',
    ownerDisplayName: 'Administrator',
    verifier: { verify: async () => verified }
  });

  const principal = await adapter.verify({}, {
    requestId: 'req-1',
    now: '2026-08-24T00:01:00.000Z'
  });
  assert.deepEqual(principal, { ...administrator, displayName: 'Verified Administrator' });

  verified = { ...verified, subject: 'different-subject' };
  assert.equal(await adapter.verify({}, {
    requestId: 'req-2',
    now: '2026-08-24T00:01:00.000Z'
  }), null);
});

test('session records contain keyed digests only and use a hardened host cookie', async () => {
  const { manager, store } = sessionHarness();
  const grant = await manager.issue(administrator, 'password');
  const records = store.snapshotRecords();

  assert.equal(records.length, 1);
  assert.notEqual(records[0].tokenDigest, grant.sessionToken);
  assert.notEqual(records[0].csrfDigest, grant.csrfToken);
  assert.equal(JSON.stringify(records).includes(grant.sessionToken), false);
  assert.equal(grant.csrfHeaderName, ADMIN_CSRF_HEADER_NAME);
  assert.match(grant.setCookie, new RegExp(`^${ADMIN_SESSION_COOKIE_NAME}=`));
  assert.match(grant.setCookie, /Path=\//);
  assert.match(grant.setCookie, /HttpOnly/);
  assert.match(grant.setCookie, /Secure/);
  assert.match(grant.setCookie, /SameSite=Strict/);
  assert.match(clearAdminSessionCookie(), /Max-Age=0/);
  await assert.rejects(manager.issue({ ...administrator, enabled: false }, 'password'), /ADMIN_PRINCIPAL_DISABLED/);
});

test('CSRF requires the exact configured origin and matching keyed token', async () => {
  const { manager, store } = sessionHarness();
  const grant = await manager.issue(administrator, 'password');
  const record = store.snapshotRecords()[0];
  const input = {
    session: record,
    csrfToken: grant.csrfToken,
    origin: 'https://admin.example.test',
    allowedOrigins: ['https://admin.example.test'],
    keyRing
  };
  assert.equal(await validateAdminCsrf(input), true);
  assert.equal(await validateAdminCsrf({ ...input, csrfToken: 'invalid' }), false);
  assert.equal(await validateAdminCsrf({ ...input, origin: 'https://admin.example.test.evil.test' }), false);
  assert.equal(await validateAdminCsrf({ ...input, origin: 'https://admin.example.test/path' }), false);
});

test('access control is deny-by-default and protects authenticated mutations with CSRF', async () => {
  const { manager } = sessionHarness();
  const grant = await manager.issue(administrator, 'password');
  const base = {
    sessionToken: grant.sessionToken,
    allowedOrigins: ['https://admin.example.test']
  };
  const unknown = await authorizeAdminRequest({ ...base, method: 'GET', path: '/api/projects' }, manager);
  assert.equal(unknown.code, 'ROUTE_DENIED');

  const read = await authorizeAdminRequest({ ...base, method: 'GET', path: '/api/manage/site' }, manager);
  assert.equal(read.allowed, true);
  const denied = await authorizeAdminRequest({
    ...base,
    method: 'POST',
    path: '/api/manage/site/publish',
    origin: 'https://admin.example.test'
  }, manager);
  assert.equal(denied.code, 'CSRF_DENIED');
  const allowed = await authorizeAdminRequest({
    ...base,
    method: 'POST',
    path: '/api/manage/site/publish',
    origin: 'https://admin.example.test',
    csrfToken: grant.csrfToken
  }, manager);
  assert.equal(allowed.allowed, true);
});

test('online lease renewal, rotation, and the absolute boundary are independent', async () => {
  const { manager, advance } = sessionHarness({
    leaseTtlMs: 1_000,
    absoluteTtlMs: 5_000,
    rotationIntervalMs: 500
  });
  const first = await manager.issue(administrator, 'password');
  advance(600);
  const rotated = await manager.touch(first.sessionToken);
  assert.ok(rotated?.replacement);
  assert.equal(rotated.session.rotationCounter, 1);
  assert.equal(await manager.inspect(first.sessionToken), null);
  assert.ok(await manager.inspect(rotated.replacement.sessionToken));

  advance(1_100);
  assert.equal(await manager.inspect(rotated.replacement.sessionToken), null);

  const absolute = sessionHarness({
    leaseTtlMs: 5_000,
    absoluteTtlMs: 5_000,
    rotationIntervalMs: 5_000
  });
  const second = await absolute.manager.issue(administrator, 'password');
  absolute.advance(4_900);
  assert.ok(await absolute.manager.inspect(second.sessionToken));
  absolute.advance(101);
  assert.equal(await absolute.manager.inspect(second.sessionToken), null);
});

test('audit sink keeps only allowlisted, redacted metadata', async () => {
  const sink = new InMemoryAuditSink();
  await sink.append({
    id: 'audit-1',
    occurredAt: '2026-08-24T00:00:00.000Z',
    principalId: administrator.id,
    action: 'site.publish',
    outcome: 'denied',
    requestId: 'req-1',
    metadata: {
      route: '/api/manage/site/publish',
      reasonCode: 'token=top-secret',
      projectPath: 'D:/private'
    }
  });
  assert.deepEqual(sink.events()[0].metadata, {
    route: '/api/manage/site/publish',
    reasonCode: 'token=[REDACTED]'
  });
});
