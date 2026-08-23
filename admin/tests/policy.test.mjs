import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADMIN_ROUTES,
  can,
  findAdminRoute,
  sanitizeAuditMetadata
} from '../dist/index.js';

const ownerSession = Object.freeze({
  id: 'session-1',
  principalId: 'owner-1',
  role: 'owner',
  createdAt: '2026-08-23T00:00:00.000Z',
  expiresAt: '2026-08-24T00:00:00.000Z',
  authenticationMethod: 'platform-owner-gate'
});

test('owner-only mode denies non-owner and expired sessions', () => {
  const now = new Date('2026-08-23T12:00:00.000Z');
  assert.equal(can(ownerSession, 'site.publish', now), true);
  assert.equal(can({ ...ownerSession, role: 'maintainer' }, 'site.publish', now), false);
  assert.equal(can({ ...ownerSession, expiresAt: '2026-08-22T00:00:00.000Z' }, 'site.publish', now), false);
  assert.equal(can(null, 'site.read', now), false);
});

test('audit metadata excludes credentials and project-local data', () => {
  assert.deepEqual(sanitizeAuditMetadata({
    release: 'v1.1.0-beta.2',
    result: 'accepted',
    token: 'secret',
    projectPath: 'D:/private',
    pointCount: 12,
    latitude: 29.6
  }), {
    release: 'v1.1.0-beta.2',
    result: 'accepted'
  });
});

test('admin routes contain no project-data endpoint', () => {
  assert.ok(findAdminRoute('POST', '/api/admin/site/publish'));
  assert.equal(findAdminRoute('GET', '/api/projects'), null);
  assert.equal(ADMIN_ROUTES.some(route => /project|point|zone|image/i.test(route.path)), false);
});
