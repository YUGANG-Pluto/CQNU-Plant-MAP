import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADMIN_ROUTES,
  can,
  findAdminRoute,
  principalAllows,
  sanitizeAuditMetadata
} from '../dist/index.js';
import { validatePasswordPolicy } from '../dist/password.js';

const session = Object.freeze({
  id: 'session-1',
  tokenDigest: 'digest-1',
  tokenKeyId: 'k1',
  csrfDigest: 'csrf-1',
  csrfKeyId: 'k1',
  principalId: 'admin-1',
  username: 'admin',
  accountKind: 'admin',
  accessLevel: 'save',
  mustChangePassword: false,
  credentialVersion: 1,
  createdAt: '2026-08-23T00:00:00.000Z',
  rotatedAt: '2026-08-23T00:00:00.000Z',
  lastSeenAt: '2026-08-23T00:00:00.000Z',
  leaseExpiresAt: '2026-08-24T00:00:00.000Z',
  absoluteExpiresAt: '2026-08-24T08:00:00.000Z',
  authenticationMethod: 'password',
  rotationCounter: 0
});

test('workspace access levels are cumulative while member management remains administrator-only', () => {
  assert.equal(principalAllows('user', 'read', 'workspace.read'), true);
  assert.equal(principalAllows('user', 'read', 'workspace.edit'), false);
  assert.equal(principalAllows('user', 'edit', 'workspace.edit'), true);
  assert.equal(principalAllows('user', 'edit', 'workspace.save'), false);
  assert.equal(principalAllows('user', 'save', 'workspace.save'), true);
  assert.equal(principalAllows('user', 'save', 'member.manage'), false);
  assert.equal(principalAllows('admin', 'save', 'member.manage'), true);
});

test('revoked, expired, and forced-activation sessions cannot use capabilities', () => {
  const now = new Date('2026-08-23T12:00:00.000Z');
  assert.equal(can(session, 'site.publish', now), true);
  assert.equal(can({ ...session, mustChangePassword: true }, 'workspace.read', now), false);
  assert.equal(can({ ...session, revokedAt: now.toISOString() }, 'workspace.read', now), false);
  assert.equal(can({ ...session, leaseExpiresAt: '2026-08-22T00:00:00.000Z' }, 'workspace.read', now), false);
  assert.equal(can(null, 'workspace.read', now), false);
});

test('audit metadata allowlist redacts credentials and local paths', () => {
  assert.deepEqual(sanitizeAuditMetadata({
    releaseVersion: 'v1.1.0-beta.2',
    result: 'accepted',
    reasonCode: 'Bearer abc.def.ghi from D:\\private\\project',
    token: 'secret',
    projectPath: 'D:/private',
    durationMs: Number.NaN
  }), {
    releaseVersion: 'v1.1.0-beta.2',
    result: 'accepted',
    reasonCode: 'Bearer [REDACTED] from [LOCAL_PATH_REDACTED]'
  });
});

test('management routes expose only bounded cloud project operations and protect authenticated mutations', () => {
  assert.ok(findAdminRoute('POST', '/api/manage/site/publish'));
  assert.ok(findAdminRoute('PATCH', '/api/manage/members/account-1'));
  assert.equal(findAdminRoute('GET', '/api/projects')?.capability, 'workspace.read');
  assert.equal(findAdminRoute('GET', '/api/projects/usage')?.capability, 'workspace.read');
  assert.equal(findAdminRoute('GET', '/api/projects/cloud-project-1/revisions')?.capability, 'workspace.read');
  const historicalRead = findAdminRoute('GET', '/api/projects/cloud-project-1/revisions/2');
  assert.equal(historicalRead?.capability, 'workspace.read');
  assert.equal(historicalRead?.mutatesState, false);
  assert.equal(historicalRead?.csrfProtected, false);
  assert.equal(findAdminRoute('GET', '/api/manage/cloud-projects/usage')?.capability, 'site.read');
  assert.equal(findAdminRoute('PUT', '/api/projects/cloud-project-1/snapshot')?.capability, 'workspace.save');
  assert.equal(findAdminRoute('PATCH', '/api/projects/cloud-project-1')?.capability, 'workspace.save');
  assert.equal(findAdminRoute('DELETE', '/api/projects/cloud-project-1')?.capability, 'workspace.save');
  assert.equal(
    findAdminRoute('POST', '/api/projects/cloud-project-1/revisions/2/restore')?.capability,
    'workspace.save'
  );
  assert.equal(ADMIN_ROUTES.some(route => /point|zone|coordinate|image|local-path/i.test(route.path)), false);
  assert.equal(ADMIN_ROUTES
    .filter(route => route.sessionRequired && route.mutatesState)
    .every(route => route.csrfProtected), true);
});

test('password policy accepts non-blocked six-character credentials', () => {
  assert.equal(validatePasswordPolicy('Ab9!xy').valid, true);
  assert.equal(validatePasswordPolicy('A9!xy').code, 'PASSWORD_TOO_SHORT');
  assert.equal(validatePasswordPolicy('123456').code, 'PASSWORD_BLOCKED');
});
