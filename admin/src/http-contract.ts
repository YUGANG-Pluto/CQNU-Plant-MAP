import type { AdminCapability } from './contracts.js';

export interface AdminRouteContract {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  capability: AdminCapability | null;
  mutatesState: boolean;
  csrfProtected: boolean;
  sessionRequired: boolean;
  allowPendingActivation: boolean;
}

export const ADMIN_ROUTES = Object.freeze<AdminRouteContract[]>([
  { id: 'login', method: 'POST', path: '/api/manage/login', capability: null, mutatesState: true, csrfProtected: false, sessionRequired: false, allowPendingActivation: true },
  { id: 'reset.consume', method: 'POST', path: '/api/manage/password-reset/consume', capability: null, mutatesState: true, csrfProtected: false, sessionRequired: false, allowPendingActivation: true },
  { id: 'session.read', method: 'GET', path: '/api/manage/session', capability: null, mutatesState: false, csrfProtected: false, sessionRequired: true, allowPendingActivation: true },
  { id: 'session.heartbeat', method: 'POST', path: '/api/manage/session/heartbeat', capability: null, mutatesState: true, csrfProtected: true, sessionRequired: true, allowPendingActivation: true },
  { id: 'session.revoke', method: 'DELETE', path: '/api/manage/session', capability: null, mutatesState: true, csrfProtected: true, sessionRequired: true, allowPendingActivation: true },
  { id: 'account.activate', method: 'POST', path: '/api/manage/account/activate', capability: null, mutatesState: true, csrfProtected: true, sessionRequired: true, allowPendingActivation: true },
  { id: 'profile.username', method: 'PATCH', path: '/api/manage/profile/username', capability: 'workspace.read', mutatesState: true, csrfProtected: true, sessionRequired: true, allowPendingActivation: false },
  { id: 'profile.password', method: 'PATCH', path: '/api/manage/profile/password', capability: 'workspace.read', mutatesState: true, csrfProtected: true, sessionRequired: true, allowPendingActivation: false },
  { id: 'members.list', method: 'GET', path: '/api/manage/members', capability: 'member.read', mutatesState: false, csrfProtected: false, sessionRequired: true, allowPendingActivation: false },
  { id: 'members.create', method: 'POST', path: '/api/manage/members', capability: 'member.manage', mutatesState: true, csrfProtected: true, sessionRequired: true, allowPendingActivation: false },
  { id: 'members.update', method: 'PATCH', path: '/api/manage/members/:memberId', capability: 'member.permission.manage', mutatesState: true, csrfProtected: true, sessionRequired: true, allowPendingActivation: false },
  { id: 'members.reset', method: 'POST', path: '/api/manage/members/:memberId/password-reset', capability: 'member.password.reset', mutatesState: true, csrfProtected: true, sessionRequired: true, allowPendingActivation: false },
  { id: 'audit.list', method: 'GET', path: '/api/manage/audit-events', capability: 'audit.read', mutatesState: false, csrfProtected: false, sessionRequired: true, allowPendingActivation: false },
  { id: 'site.read', method: 'GET', path: '/api/manage/site', capability: 'site.read', mutatesState: false, csrfProtected: false, sessionRequired: true, allowPendingActivation: false },
  { id: 'site.publish', method: 'POST', path: '/api/manage/site/publish', capability: 'site.publish', mutatesState: true, csrfProtected: true, sessionRequired: true, allowPendingActivation: false },
  { id: 'releases.list', method: 'GET', path: '/api/manage/releases', capability: 'release.read', mutatesState: false, csrfProtected: false, sessionRequired: true, allowPendingActivation: false },
  { id: 'releases.manage', method: 'POST', path: '/api/manage/releases', capability: 'release.manage', mutatesState: true, csrfProtected: true, sessionRequired: true, allowPendingActivation: false },
  { id: 'cloud-projects.list', method: 'GET', path: '/api/projects', capability: 'workspace.read', mutatesState: false, csrfProtected: false, sessionRequired: true, allowPendingActivation: false },
  { id: 'cloud-projects.create', method: 'POST', path: '/api/projects', capability: 'workspace.save', mutatesState: true, csrfProtected: true, sessionRequired: true, allowPendingActivation: false },
  { id: 'cloud-projects.read', method: 'GET', path: '/api/projects/:projectId', capability: 'workspace.read', mutatesState: false, csrfProtected: false, sessionRequired: true, allowPendingActivation: false },
  { id: 'cloud-projects.save', method: 'PUT', path: '/api/projects/:projectId/snapshot', capability: 'workspace.save', mutatesState: true, csrfProtected: true, sessionRequired: true, allowPendingActivation: false }
]);

function pathMatches(pattern: string, path: string): boolean {
  const expected = pattern.split('/');
  const actual = path.split('/');
  if (expected.length !== actual.length) return false;
  return expected.every((segment, index) => {
    const value = actual[index] || '';
    return segment.startsWith(':')
      ? /^[A-Za-z0-9_-]{1,80}$/u.test(value)
      : segment === value;
  });
}

export function findAdminRoute(method: string, path: string): AdminRouteContract | null {
  return ADMIN_ROUTES.find(route => (
    route.method === method.toUpperCase()
    && pathMatches(route.path, path)
  )) || null;
}

export function routeParameter(contract: AdminRouteContract, path: string, name: string): string | null {
  const expected = contract.path.split('/');
  const actual = path.split('/');
  const index = expected.indexOf(`:${name}`);
  return index >= 0 ? actual[index] || null : null;
}
