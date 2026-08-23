import type { AdminCapability } from './contracts.js';

export interface AdminRouteContract {
  method: 'GET' | 'POST' | 'DELETE';
  path: string;
  capability: AdminCapability | null;
  mutatesState: boolean;
}

export const ADMIN_ROUTES = Object.freeze<AdminRouteContract[]>([
  { method: 'GET', path: '/api/admin/session', capability: null, mutatesState: false },
  { method: 'DELETE', path: '/api/admin/session', capability: null, mutatesState: true },
  { method: 'GET', path: '/api/admin/site', capability: 'site.read', mutatesState: false },
  { method: 'POST', path: '/api/admin/site/publish', capability: 'site.publish', mutatesState: true },
  { method: 'GET', path: '/api/admin/releases', capability: 'release.read', mutatesState: false },
  { method: 'POST', path: '/api/admin/releases', capability: 'release.manage', mutatesState: true },
  { method: 'GET', path: '/api/admin/members', capability: 'member.read', mutatesState: false },
  { method: 'POST', path: '/api/admin/members', capability: 'member.manage', mutatesState: true },
  { method: 'GET', path: '/api/admin/audit-events', capability: 'audit.read', mutatesState: false }
]);

export function findAdminRoute(method: string, path: string): AdminRouteContract | null {
  return ADMIN_ROUTES.find(route => route.method === method.toUpperCase() && route.path === path) || null;
}
