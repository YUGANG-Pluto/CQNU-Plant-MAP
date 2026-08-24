import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AdminSessionManager,
  ADMIN_CSRF_HEADER_NAME,
  ADMIN_SESSION_COOKIE_NAME,
  InMemoryAuditSink,
  InMemorySessionStore,
  OwnerIdentityAdapter,
  authorizeAdminRequest,
  clearAdminSessionCookie,
  digestOpaqueToken,
  validateAdminCsrf
} from '../dist/index.js';

const owner = Object.freeze({
  id: 'owner-1',
  providerSubject: 'provider-owner',
  displayName: 'Owner',
  role: 'owner',
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
      randomToken: byteLength => `${byteLength}_${++randomCounter}`,
      digest: digestOpaqueToken
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

test('identity adapter accepts only a fresh assertion verified by the configured provider', async () => {
  let verified = {
    subject: 'provider-owner',
    issuer: 'https://identity.example.test',
    audience: 'cqnu-admin',
    displayName: 'Verified Owner',
    authenticatedAt: '2026-08-24T00:00:00.000Z',
    expiresAt: '2026-08-24T00:05:00.000Z',
    authenticationMethod: 'oidc'
  };
  const adapter = new OwnerIdentityAdapter({
    issuer: 'https://identity.example.test',
    audience: 'cqnu-admin',
    ownerSubject: 'provider-owner',
    ownerPrincipalId: 'owner-1',
    ownerDisplayName: 'Owner',
    verifier: { verify: async () => verified }
  });

  const principal = await adapter.verify({ signedProviderResponse: true }, {
    requestId: 'req-1',
    now: '2026-08-24T00:01:00.000Z'
  });
  assert.deepEqual(principal, { ...owner, displayName: 'Verified Owner' });

  verified = { ...verified, subject: 'different-subject' };
  assert.equal(await adapter.verify({}, {
    requestId: 'req-2',
    now: '2026-08-24T00:01:00.000Z'
  }), null);
  verified = { ...verified, subject: 'provider-owner', authenticatedAt: '2026-08-23T20:00:00.000Z' };
  assert.equal(await adapter.verify({}, {
    requestId: 'req-3',
    now: '2026-08-24T00:01:00.000Z'
  }), null);
});

test('session issue stores digests only and emits a hardened host cookie', async () => {
  const { manager, store } = sessionHarness();
  const grant = await manager.issue(owner, 'oidc');
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
  await assert.rejects(manager.issue({ ...owner, role: 'editor' }, 'oidc'), /ADMIN_ROLE_DISABLED/);
});

test('CSRF requires the exact configured origin and matching session token', async () => {
  const { manager, store } = sessionHarness();
  const grant = await manager.issue(owner, 'webauthn');
  const record = store.snapshotRecords()[0];
  const input = {
    session: record,
    csrfToken: grant.csrfToken,
    origin: 'https://admin.example.test',
    allowedOrigins: ['https://admin.example.test']
  };
  assert.equal(await validateAdminCsrf(input), true);
  assert.equal(await validateAdminCsrf({ ...input, csrfToken: 'csrf_wrong' }), false);
  assert.equal(await validateAdminCsrf({ ...input, origin: 'https://admin.example.test.evil.test' }), false);
  assert.equal(await validateAdminCsrf({ ...input, origin: 'https://admin.example.test/path' }), false);
  assert.equal(await validateAdminCsrf({
    ...input,
    origin: 'http://admin.example.test',
    allowedOrigins: ['http://admin.example.test']
  }), false);
});

test('access control denies unknown routes and mutations without CSRF', async () => {
  const { manager } = sessionHarness();
  const grant = await manager.issue(owner, 'platform-owner-gate');
  const base = {
    sessionToken: grant.sessionToken,
    allowedOrigins: ['https://admin.example.test']
  };
  const unknown = await authorizeAdminRequest({ ...base, method: 'GET', path: '/api/projects' }, manager);
  assert.equal(unknown.code, 'ROUTE_DENIED');

  const read = await authorizeAdminRequest({ ...base, method: 'GET', path: '/api/admin/site' }, manager);
  assert.equal(read.allowed, true);
  const denied = await authorizeAdminRequest({
    ...base,
    method: 'POST',
    path: '/api/admin/site/publish',
    origin: 'https://admin.example.test'
  }, manager);
  assert.equal(denied.code, 'CSRF_DENIED');
  const allowed = await authorizeAdminRequest({
    ...base,
    method: 'POST',
    path: '/api/admin/site/publish',
    origin: 'https://admin.example.test',
    csrfToken: grant.csrfToken
  }, manager);
  assert.equal(allowed.allowed, true);
});

test('session rotation invalidates the old token and idle/absolute limits revoke access', async () => {
  const { manager, advance } = sessionHarness({
    idleTtlMs: 1_000,
    absoluteTtlMs: 5_000,
    rotationIntervalMs: 500
  });
  const first = await manager.issue(owner, 'oidc');
  advance(600);
  const rotated = await manager.touch(first.sessionToken);
  assert.ok(rotated?.replacement);
  assert.equal(rotated.session.rotationCounter, 1);
  assert.equal(await manager.inspect(first.sessionToken), null);
  assert.ok(await manager.inspect(rotated.replacement.sessionToken));

  advance(1_100);
  assert.equal(await manager.inspect(rotated.replacement.sessionToken), null);

  const absoluteHarness = sessionHarness({
    idleTtlMs: 10_000,
    absoluteTtlMs: 5_000,
    rotationIntervalMs: 10_000
  });
  const second = await absoluteHarness.manager.issue(owner, 'oidc');
  absoluteHarness.advance(4_900);
  assert.ok(await absoluteHarness.manager.inspect(second.sessionToken));
  absoluteHarness.advance(101);
  assert.equal(await absoluteHarness.manager.inspect(second.sessionToken), null);
});

test('session manager can revoke one session or every session for a principal', async () => {
  const { manager } = sessionHarness();
  const first = await manager.issue(owner, 'oidc');
  const second = await manager.issue(owner, 'oidc');
  assert.equal(await manager.revoke(first.sessionToken), true);
  assert.equal(await manager.inspect(first.sessionToken), null);
  assert.ok(await manager.inspect(second.sessionToken));
  assert.equal(await manager.revokeAllForPrincipal(owner.id), 1);
  assert.equal(await manager.inspect(second.sessionToken), null);
});

test('audit sink stores sanitized immutable copies without project data or secrets', async () => {
  const sink = new InMemoryAuditSink();
  await sink.append({
    id: 'audit-1',
    occurredAt: '2026-08-24T00:00:00.000Z',
    principalId: owner.id,
    action: 'site.publish',
    outcome: 'denied',
    requestId: 'req-1',
    metadata: {
      route: '/api/admin/site/publish',
      reasonCode: 'token=top-secret',
      projectPath: 'D:/private'
    }
  });
  const events = sink.events();
  assert.deepEqual(events[0].metadata, {
    route: '/api/admin/site/publish',
    reasonCode: 'token=[REDACTED]'
  });
  events[0].metadata.route = 'changed';
  assert.equal(sink.events()[0].metadata.route, '/api/admin/site/publish');
  await assert.rejects(sink.append({
    ...events[0],
    id: 'audit-2',
    requestId: 'D:\\private\\request'
  }), /ADMIN_AUDIT_EVENT_INVALID/);
});
