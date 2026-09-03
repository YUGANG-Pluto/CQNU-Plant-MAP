import type { PublicManagementAccount } from './account-contracts.js';
import {
  ADMIN_CAPABILITIES,
  type AdminAuditAction,
  type AdminAuditEvent,
  type AdminCapability,
  type AdminSession
} from './contracts.js';
import type { AdminRouteContract } from './http-contract.js';
import type { JsonObject } from './http-json.js';
import { randomBase64Url } from './keyring.js';
import type { ManagementRequestRuntime } from './management-runtime.js';
import type { ManagementSessionData } from './management-ui-contracts.js';
import { principalAllows } from './policy.js';
import { ADMIN_CSRF_HEADER_NAME, type AdminSessionAccess, type AdminSessionGrant } from './session.js';
import { jsonResponse } from './site-http-response.js';

export interface SiteAuditContext {
  principalId: string;
  requestId: string;
}

export function textField(body: JsonObject, name: string, maxLength = 256): string {
  const value = body[name];
  if (typeof value !== 'string' || value.length > maxLength) throw new Error('REQUEST_BODY_INVALID');
  return value;
}

export function optionalTextField(body: JsonObject, name: string, maxLength = 256): string | undefined {
  const value = body[name];
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.length > maxLength) throw new Error('REQUEST_BODY_INVALID');
  return value;
}

export function cookieValue(request: Request, name: string): string {
  const cookie = request.headers.get('cookie') || '';
  for (const entry of cookie.split(';')) {
    const separator = entry.indexOf('=');
    if (separator < 0 || entry.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(entry.slice(separator + 1).trim());
    } catch {
      return '';
    }
  }
  return '';
}

function capabilitiesFor(session: AdminSession): AdminCapability[] {
  if (session.mustChangePassword) return [];
  return ADMIN_CAPABILITIES.filter((capability) =>
    principalAllows(session.accountKind, session.accessLevel, capability)
  );
}

export function sessionData(
  session: AdminSession,
  account: PublicManagementAccount,
  csrfToken?: string
): ManagementSessionData {
  return {
    session,
    account,
    capabilities: capabilitiesFor(session),
    csrfHeaderName: ADMIN_CSRF_HEADER_NAME,
    ...(csrfToken ? { csrfToken } : {})
  };
}

export function responseForGrant(result: { grant: AdminSessionGrant; account: PublicManagementAccount }): Response {
  return jsonResponse(
    {
      ok: true,
      data: sessionData(result.grant.session, result.account, result.grant.csrfToken)
    },
    200,
    { 'set-cookie': result.grant.setCookie }
  );
}

export function responseHeadersForAccess(access?: AdminSessionAccess): Record<string, string> {
  return {
    ...(access?.setCookie ? { 'set-cookie': access.setCookie } : {}),
    ...(access?.replacement?.csrfToken ? { 'x-cqnu-csrf': access.replacement.csrfToken } : {})
  };
}

function actionForRoute(route: AdminRouteContract): AdminAuditAction {
  const mapped: Record<string, AdminAuditAction> = {
    login: 'session.create',
    'reset.consume': 'account.password.reset.consume',
    'session.read': 'workspace.read',
    'session.heartbeat': 'session.heartbeat',
    'session.revoke': 'session.revoke',
    'account.activate': 'account.activate',
    'profile.username': 'account.username.change',
    'profile.password': 'account.password.change',
    'members.reset': 'account.password.reset.issue',
    'members.reset-all': 'account.identity.reset-all',
    'cloud-projects.list': 'workspace.read',
    'cloud-projects.read': 'workspace.read',
    'cloud-projects.usage': 'workspace.read',
    'cloud-projects.revisions': 'workspace.read',
    'cloud-projects.revision.read': 'workspace.read',
    'cloud-projects.admin-usage': 'site.read',
    'cloud-projects.create': 'workspace.save',
    'cloud-projects.save': 'workspace.save',
    'cloud-projects.rename': 'workspace.save',
    'cloud-projects.delete': 'workspace.save',
    'cloud-projects.restore': 'workspace.save'
  };
  return mapped[route.id] || route.capability || 'workspace.read';
}

export async function appendAudit(
  runtime: ManagementRequestRuntime,
  input: {
    principalId: string;
    route: AdminRouteContract;
    outcome: AdminAuditEvent['outcome'];
    requestId: string;
    statusCode: number;
    reasonCode?: string;
    targetAccountId?: string;
    targetProjectId?: string;
    memberAction?: string;
    accountCount?: number;
    revokedSessionCount?: number;
  }
): Promise<void> {
  await runtime.audit.append({
    id: `audit_${randomBase64Url(18)}`,
    occurredAt: new Date().toISOString(),
    principalId: input.principalId || 'anonymous',
    action: actionForRoute(input.route),
    outcome: input.outcome,
    requestId: input.requestId,
    metadata: {
      route: input.route.path,
      statusCode: input.statusCode,
      ...(input.reasonCode ? { reasonCode: input.reasonCode } : {}),
      ...(input.targetAccountId ? { targetAccountId: input.targetAccountId } : {}),
      ...(input.targetProjectId ? { targetProjectId: input.targetProjectId } : {}),
      ...(input.memberAction ? { memberAction: input.memberAction } : {}),
      ...(input.accountCount === undefined ? {} : { accountCount: input.accountCount }),
      ...(input.revokedSessionCount === undefined ? {} : { revokedSessionCount: input.revokedSessionCount })
    }
  });
}

export async function accountForSession(
  runtime: ManagementRequestRuntime,
  session: AdminSession
): Promise<PublicManagementAccount | null> {
  const account = await runtime.accountStore.getAccountById(session.principalId);
  if (!account || account.status === 'disabled' || account.credentialVersion !== session.credentialVersion) return null;
  return {
    id: account.id,
    username: account.username,
    displayName: account.displayName,
    accountKind: account.accountKind,
    accessLevel: account.accessLevel,
    status: account.status,
    mustChangePassword: account.mustChangePassword,
    passwordChangeRecommended: account.passwordChangeRecommended === true,
    credentialVersion: account.credentialVersion,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
    activatedAt: account.activatedAt,
    revision: account.revision
  };
}
