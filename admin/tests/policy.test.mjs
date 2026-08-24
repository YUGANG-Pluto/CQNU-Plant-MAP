import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADMIN_ROUTES,
  can,
  findAdminRoute,
  roleAllows,
  sanitizeAuditMetadata
} from '../dist/index.js';

const ownerSession = Object.freeze({
  id: 'session-1',
  tokenDigest: 'digest-1',
  csrfDigest: 'csrf-1',
  principalId: 'owner-1',
  role: 'owner',
  createdAt: '2026-08-23T00:00:00.000Z',
  rotatedAt: '2026-08-23T00:00:00.000Z',
  lastSeenAt: '2026-08-23T00:00:00.000Z',
  expiresAt: '2026-08-24T00:00:00.000Z',
  absoluteExpiresAt: '2026-08-24T08:00:00.000Z',
  authenticationMethod: 'platform-owner-gate',
  rotationCounter: 0
});

test('owner-only mode denies non-owner, revoked, and expired sessions', () => {
  const now = new Date('2026-08-23T12:00:00.000Z');
  assert.equal(can(ownerSession, 'site.publish', now), true);
  assert.equal(can({ ...ownerSession, role: 'editor' }, 'site.publish', now), false);
  assert.equal(can({ ...ownerSession, revokedAt: now.toISOString() }, 'site.read', now), false);
  assert.equal(can({ ...ownerSession, expiresAt: '2026-08-22T00:00:00.000Z' }, 'site.read', now), false);
  assert.equal(can(null, 'site.read', now), false);
});

test('role capability definitions are explicit while active mode stays owner-only', () => {
  assert.equal(roleAllows('owner', 'member.manage'), true);
  assert.equal(roleAllows('editor', 'release.manage'), true);
  assert.equal(roleAllows('editor', 'member.manage'), false);
  assert.equal(roleAllows('viewer', 'site.read'), true);
  assert.equal(roleAllows('viewer', 'site.publish'), false);
});

test('audit metadata uses an allowlist and redacts credentials and local paths', () => {
  assert.deepEqual(sanitizeAuditMetadata({
    releaseVersion: 'v1.1.0-beta.2',
    result: 'accepted',
    reasonCode: 'Bearer abc.def.ghi from D:\\private\\project',
    token: 'secret',
    projectPath: 'D:/private',
    pointCount: 12,
    latitude: 29.6,
    durationMs: Number.NaN
  }), {
    releaseVersion: 'v1.1.0-beta.2',
    result: 'accepted',
    reasonCode: 'Bearer [REDACTED] from [LOCAL_PATH_REDACTED]'
  });
});

test('admin routes are deny-by-default, project-free, and protect every mutation', () => {
  assert.ok(findAdminRoute('POST', '/api/admin/site/publish'));
  assert.equal(findAdminRoute('GET', '/api/projects'), null);
  assert.equal(ADMIN_ROUTES.some(route => /project|point|zone|coordinate|image/i.test(route.path)), false);
  assert.equal(ADMIN_ROUTES.every(route => route.mutatesState === route.csrfProtected), true);
});
