import type { AdminSession } from './contracts.js';
import { validateAdminCsrf } from './csrf.js';
import { findAdminRoute, type AdminRouteContract } from './http-contract.js';
import { can } from './policy.js';
import { AdminSessionManager, type AdminSessionAccess } from './session.js';

export type AdminAccessCode = 'ALLOWED'
  | 'ROUTE_DENIED'
  | 'SESSION_REQUIRED'
  | 'CAPABILITY_DENIED'
  | 'CSRF_DENIED'
  | 'ROUTE_SECURITY_INVALID';

export interface AdminRequestContext {
  method: string;
  path: string;
  sessionToken: string;
  csrfToken?: string;
  origin?: string;
  allowedOrigins: readonly string[];
}

export interface AdminAccessDecision {
  allowed: boolean;
  code: AdminAccessCode;
  route: AdminRouteContract | null;
  session?: AdminSession;
  sessionAccess?: AdminSessionAccess;
}

export async function authorizeAdminRequest(
  context: AdminRequestContext,
  sessions: AdminSessionManager
): Promise<AdminAccessDecision> {
  const route = findAdminRoute(context.method, context.path);
  if (!route) return { allowed: false, code: 'ROUTE_DENIED', route: null };
  if (route.sessionRequired && route.mutatesState !== route.csrfProtected) {
    return { allowed: false, code: 'ROUTE_SECURITY_INVALID', route };
  }
  if (!route.sessionRequired) return { allowed: true, code: 'ALLOWED', route };
  const record = await sessions.inspect(context.sessionToken);
  if (!record) return { allowed: false, code: 'SESSION_REQUIRED', route };
  if (record.mustChangePassword && !route.allowPendingActivation) {
    return { allowed: false, code: 'CAPABILITY_DENIED', route };
  }
  if (route.capability && !can(record, route.capability, sessions.now())) {
    return { allowed: false, code: 'CAPABILITY_DENIED', route };
  }
  if (route.csrfProtected && !await validateAdminCsrf({
    session: record,
    csrfToken: context.csrfToken || '',
    origin: context.origin || '',
    allowedOrigins: context.allowedOrigins,
    keyRing: sessions.keyRing()
  })) {
    return { allowed: false, code: 'CSRF_DENIED', route };
  }
  const access = await sessions.touch(context.sessionToken);
  if (!access) return { allowed: false, code: 'SESSION_REQUIRED', route };
  return {
    allowed: true,
    code: 'ALLOWED',
    route,
    session: access.session,
    sessionAccess: access
  };
}
