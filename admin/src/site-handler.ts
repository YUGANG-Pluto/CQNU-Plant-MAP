import type { PublicManagementAccount } from './account-contracts.js';
import { authorizeAdminRequest } from './access.js';
import { handleCloudProjectHttp } from './cloud-project-http.js';
import {
  CLOUD_PROJECT_MAX_BYTES,
  CLOUD_PROJECT_MAX_PER_ACCOUNT
} from './cloud-project-contracts.js';
import type {
  AdminAuditAction,
  AdminAuditEvent,
  AdminCapability,
  AdminSession
} from './contracts.js';
import { ADMIN_CAPABILITIES } from './contracts.js';
import {
  findAdminRoute,
  routeParameter,
  type AdminRouteContract
} from './http-contract.js';
import { readJson, type JsonObject } from './http-json.js';
import { randomBase64Url } from './keyring.js';
import {
  productionManagementRuntime,
  type ManagementRequestRuntime,
  type ManagementWorkerEnvironment
} from './management-runtime.js';
import type { ManagementSessionData } from './management-ui-contracts.js';
import { principalAllows } from './policy.js';
import {
  ADMIN_CSRF_HEADER_NAME,
  ADMIN_SESSION_COOKIE_NAME,
  clearAdminSessionCookie,
  type AdminSessionAccess,
  type AdminSessionGrant
} from './session.js';

export type {
  ManagementAuditReader,
  ManagementRequestRuntime,
  ManagementWorkerEnvironment
} from './management-runtime.js';

function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'content-security-policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
      'referrer-policy': 'no-referrer',
      'x-content-type-options': 'nosniff',
      ...headers
    }
  });
}

function errorStatus(code: string): number {
  if (code === 'LOGIN_FAILED' || code === 'SESSION_REQUIRED') return 401;
  if (code === 'ADMIN_ACCESS_DENIED' || code === 'CAPABILITY_DENIED' || code === 'CSRF_DENIED') return 403;
  if (code === 'ACCOUNT_NOT_FOUND' || code === 'ROUTE_DENIED') return 404;
  if (code === 'CLOUD_PROJECT_NOT_FOUND' || code === 'CLOUD_PROJECT_REVISION_NOT_FOUND') return 404;
  if (code.includes('CONFLICT') || code === 'ADMIN_LIMIT_REACHED' || code === 'LAST_ADMIN_REQUIRED' || code === 'CLOUD_PROJECT_LIMIT_REACHED') return 409;
  if (code === 'REQUEST_BODY_TOO_LARGE' || code === 'CLOUD_PROJECT_TOO_LARGE') return 413;
  if (code === 'MANAGEMENT_SERVICE_UNAVAILABLE') return 503;
  if (code === 'CLOUD_PROJECT_STORAGE_UNAVAILABLE') return 503;
  return 400;
}

function publicError(code: string): { code: string; message: string } {
  const messages: Record<string, string> = {
    LOGIN_FAILED: '用户名或密码无效，或账户暂时不可用。',
    SESSION_REQUIRED: '登录会话已失效，请重新登录。',
    CSRF_DENIED: '请求验证失败，请刷新页面后重试。',
    CAPABILITY_DENIED: '当前账户没有执行此操作的权限。',
    ADMIN_ACCESS_DENIED: '当前账户没有管理员权限。',
    PASSWORD_TOO_SHORT: '新密码至少需要 6 个字符。',
    PASSWORD_TOO_LONG: '新密码不能超过 128 个字符。',
    PASSWORD_BLOCKED: '该密码过于常见，请更换更安全的密码。',
    CURRENT_PASSWORD_INVALID: '当前密码不正确。',
    CREDENTIAL_TOKEN_INVALID: '激活或重置链接无效、已使用或已过期。',
    ADMIN_LIMIT_REACHED: '启用的管理员最多为 3 名。',
    LAST_ADMIN_REQUIRED: '系统必须至少保留 1 名启用的管理员。',
    USE_SELF_ACCOUNT_SETTINGS: '请在个人账户设置中修改自己的资料或凭据。',
    ACCOUNT_USERNAME_CONFLICT: '该用户名已被使用。',
    ACCOUNT_UPDATE_CONFLICT: '账户信息已更新，请刷新后重试。',
    ACCOUNT_RESET_CONFIRMATION_INVALID: '全员重置确认信息不正确，操作未执行。',
    ACCOUNT_RESET_INVALID: '当前账户状态无法执行全员重置。',
    USERNAME_INVALID: '用户名需为 3 至 32 位字母、数字、点、下划线或短横线。',
    MANAGEMENT_SERVICE_UNAVAILABLE: '管理服务尚未完成安全配置。',
    REQUEST_BODY_TOO_LARGE: '提交的数据超过允许大小。',
    CLOUD_PROJECT_NAME_INVALID: '云项目名称需为 1 至 80 个可见字符。',
    CLOUD_PROJECT_INVALID: '云项目数据结构无效。',
    CLOUD_PROJECT_NOT_FOUND: '未找到该云项目，或当前账户无权访问。',
    CLOUD_PROJECT_CONFLICT: '云项目已被更新，请重新载入后再保存。',
    CLOUD_PROJECT_TOO_LARGE: '云项目记录快照超过 8 MiB，请精简记录后重试。',
    CLOUD_PROJECT_LIMIT_REACHED: '每个账户最多可建立 25 个云项目。',
    CLOUD_PROJECT_INTEGRITY_FAILED: '云项目完整性校验失败，未载入数据。',
    CLOUD_PROJECT_SENSITIVE_DATA: '云项目包含服务凭据或设备绝对路径，请清理后重试。',
    CLOUD_PROJECT_REVISION_INVALID: '云项目版本号无效。',
    CLOUD_PROJECT_REVISION_NOT_FOUND: '未找到该云项目历史版本。',
    CLOUD_PROJECT_STORAGE_UNAVAILABLE: '云项目存储暂不可用。'
  };
  return { code, message: messages[code] || '请求未完成，请检查输入后重试。' };
}

function normalizedFailureCode(error: unknown): string {
  if (!(error instanceof Error)) return 'REQUEST_FAILED';
  const embedded = error.message.match(/\b(CLOUD_PROJECT_CONFLICT|CLOUD_PROJECT_LIMIT_REACHED|ADMIN_LIMIT_REACHED|LAST_ADMIN_REQUIRED|ACCOUNT_UPDATE_CONFLICT)\b/u);
  if (embedded?.[1]) return embedded[1];
  const exact = error.message.match(/^([A-Z][A-Z0-9_]{2,63})(?::|$)/u);
  if (exact?.[1]) return exact[1];
  const errorName = error.name.replace(/([a-z])([A-Z])/gu, '$1_$2').toUpperCase();
  return /^[A-Z][A-Z0-9_]{2,63}$/u.test(errorName) ? errorName : 'REQUEST_FAILED';
}

function failure(error: unknown): Response {
  const code = normalizedFailureCode(error);
  return jsonResponse({ ok: false, error: publicError(code) }, errorStatus(code));
}

function textField(body: JsonObject, name: string, maxLength = 256): string {
  const value = body[name];
  if (typeof value !== 'string' || value.length > maxLength) throw new Error('REQUEST_BODY_INVALID');
  return value;
}

function optionalTextField(body: JsonObject, name: string, maxLength = 256): string | undefined {
  const value = body[name];
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.length > maxLength) throw new Error('REQUEST_BODY_INVALID');
  return value;
}

function cookieValue(request: Request, name: string): string {
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
  return ADMIN_CAPABILITIES.filter(capability => (
    principalAllows(session.accountKind, session.accessLevel, capability)
  ));
}

function sessionData(
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

function responseForGrant(result: {
  grant: AdminSessionGrant;
  account: PublicManagementAccount;
}): Response {
  return jsonResponse({
    ok: true,
    data: sessionData(result.grant.session, result.account, result.grant.csrfToken)
  }, 200, { 'set-cookie': result.grant.setCookie });
}

function responseHeadersForAccess(access?: AdminSessionAccess): Record<string, string> {
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
    'cloud-projects.admin-usage': 'site.read',
    'cloud-projects.create': 'workspace.save',
    'cloud-projects.save': 'workspace.save',
    'cloud-projects.rename': 'workspace.save',
    'cloud-projects.delete': 'workspace.save',
    'cloud-projects.restore': 'workspace.save'
  };
  return mapped[route.id] || route.capability || 'workspace.read';
}

async function appendAudit(
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
      ...(input.revokedSessionCount === undefined
        ? {}
        : { revokedSessionCount: input.revokedSessionCount })
    }
  });
}

async function accountForSession(
  runtime: ManagementRequestRuntime,
  session: AdminSession
): Promise<PublicManagementAccount | null> {
  const account = await runtime.accountStore.getAccountById(session.principalId);
  if (!account
    || account.status === 'disabled'
    || account.credentialVersion !== session.credentialVersion) return null;
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

export function createManagementRequestHandler(runtime: ManagementRequestRuntime) {
  return async function handle(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.length > 1 && url.pathname.endsWith('/')
      ? url.pathname.slice(0, -1)
      : url.pathname;
    const route = findAdminRoute(request.method, path);
    if (!route) return jsonResponse({ ok: false, error: publicError('ROUTE_DENIED') }, 404);
    const requestId = `req_${randomBase64Url(16)}`;
    const sessionToken = cookieValue(request, ADMIN_SESSION_COOKIE_NAME);
    let auditPrincipalId = 'anonymous';

    try {
      if (route.id === 'login') {
        const body = await readJson(request);
        const result = await runtime.accounts.login(
          textField(body, 'username', 64),
          textField(body, 'password', 128)
        );
        auditPrincipalId = result.account.id;
        await appendAudit(runtime, {
          principalId: result.account.id,
          route,
          outcome: 'allowed',
          requestId,
          statusCode: 200
        });
        return responseForGrant(result);
      }

      if (route.id === 'reset.consume') {
        const body = await readJson(request);
        const result = await runtime.accounts.consumeCredentialToken({
          token: textField(body, 'token', 256),
          username: optionalTextField(body, 'username', 32),
          password: textField(body, 'password', 128),
          displayName: optionalTextField(body, 'displayName', 80)
        });
        auditPrincipalId = result.account.id;
        await appendAudit(runtime, {
          principalId: result.account.id,
          route,
          outcome: 'allowed',
          requestId,
          statusCode: 200
        });
        return responseForGrant(result);
      }

      if (route.id === 'session.read') {
        const access = sessionToken ? await runtime.sessions.touch(sessionToken, true) : null;
        const account = access ? await accountForSession(runtime, access.session) : null;
        if (!access || !account || !access.replacement) {
          return jsonResponse({ ok: false, error: publicError('SESSION_REQUIRED') }, 401, {
            'set-cookie': clearAdminSessionCookie()
          });
        }
        return jsonResponse({
          ok: true,
          data: sessionData(access.session, account, access.replacement.csrfToken)
        }, 200, { 'set-cookie': access.setCookie });
      }

      const decision = await authorizeAdminRequest({
        method: request.method,
        path,
        sessionToken,
        csrfToken: request.headers.get(ADMIN_CSRF_HEADER_NAME) || '',
        origin: request.headers.get('origin') || '',
        allowedOrigins: [url.origin]
      }, runtime.sessions);
      if (!decision.allowed || !decision.session || !decision.sessionAccess) {
        await appendAudit(runtime, {
          principalId: decision.session?.principalId || 'anonymous',
          route,
          outcome: 'denied',
          requestId,
          statusCode: errorStatus(decision.code),
          reasonCode: decision.code
        });
        return jsonResponse({ ok: false, error: publicError(decision.code) }, errorStatus(decision.code), {
          ...(decision.code === 'SESSION_REQUIRED' ? { 'set-cookie': clearAdminSessionCookie() } : {})
        });
      }
      const account = await accountForSession(runtime, decision.session);
      if (!account) {
        await runtime.sessions.revoke(sessionToken);
        return jsonResponse({ ok: false, error: publicError('SESSION_REQUIRED') }, 401, {
          'set-cookie': clearAdminSessionCookie()
        });
      }
      auditPrincipalId = account.id;
      const rotatedCsrf = decision.sessionAccess.replacement?.csrfToken;
      const commonHeaders = responseHeadersForAccess(decision.sessionAccess);

      if (route.id === 'session.heartbeat') {
        return jsonResponse({
          ok: true,
          data: sessionData(decision.sessionAccess.session, account, rotatedCsrf)
        }, 200, commonHeaders);
      }
      if (route.id === 'session.revoke') {
        await runtime.sessions.revoke(sessionToken);
        await appendAudit(runtime, {
          principalId: account.id, route, outcome: 'allowed', requestId, statusCode: 200
        });
        return jsonResponse({ ok: true }, 200, { 'set-cookie': clearAdminSessionCookie() });
      }

      if (route.id === 'account.activate') {
        const body = await readJson(request);
        const result = await runtime.accounts.activateBootstrapAccount({
          accountId: account.id,
          currentPassword: textField(body, 'currentPassword', 128),
          username: textField(body, 'username', 32),
          password: optionalTextField(body, 'password', 128),
          displayName: optionalTextField(body, 'displayName', 80)
        });
        await appendAudit(runtime, {
          principalId: account.id, route, outcome: 'allowed', requestId, statusCode: 200
        });
        return responseForGrant(result);
      }

      if (route.id === 'profile.username') {
        const body = await readJson(request);
        const result = await runtime.accounts.changeUsername({
          accountId: account.id,
          currentPassword: textField(body, 'currentPassword', 128),
          username: textField(body, 'username', 32)
        });
        await appendAudit(runtime, {
          principalId: account.id, route, outcome: 'allowed', requestId, statusCode: 200
        });
        return responseForGrant(result);
      }

      if (route.id === 'profile.password') {
        const body = await readJson(request);
        const result = await runtime.accounts.changePassword({
          accountId: account.id,
          currentPassword: textField(body, 'currentPassword', 128),
          password: textField(body, 'password', 128)
        });
        await appendAudit(runtime, {
          principalId: account.id, route, outcome: 'allowed', requestId, statusCode: 200
        });
        return responseForGrant(result);
      }

      if (route.id === 'members.list') {
        return jsonResponse({ ok: true, data: { members: await runtime.accounts.listAccounts() } }, 200, commonHeaders);
      }

      if (route.id === 'members.create') {
        const body = await readJson(request);
        const invitation = await runtime.accounts.createMember(account.id, {
          username: textField(body, 'username', 32),
          displayName: textField(body, 'displayName', 80),
          accountKind: textField(body, 'accountKind', 16) === 'admin' ? 'admin' : 'user',
          accessLevel: textField(body, 'accessLevel', 16) as 'read' | 'edit' | 'save'
        });
        await appendAudit(runtime, {
          principalId: account.id,
          route,
          outcome: 'allowed',
          requestId,
          statusCode: 201,
          targetAccountId: invitation.account.id
        });
        return jsonResponse({ ok: true, data: invitation }, 201, commonHeaders);
      }

      if (route.id === 'members.update') {
        const memberId = routeParameter(route, path, 'memberId');
        if (!memberId) throw new Error('REQUEST_BODY_INVALID');
        const body = await readJson(request);
        const accountKind = optionalTextField(body, 'accountKind', 16);
        const accessLevel = optionalTextField(body, 'accessLevel', 16);
        const status = optionalTextField(body, 'status', 24);
        const updated = await runtime.accounts.updateMember(account.id, memberId, {
          displayName: optionalTextField(body, 'displayName', 80),
          ...(accountKind ? { accountKind: accountKind as 'user' | 'admin' } : {}),
          ...(accessLevel ? { accessLevel: accessLevel as 'read' | 'edit' | 'save' } : {}),
          ...(status ? { status: status as 'pending-activation' | 'active' | 'disabled' } : {})
        });
        await appendAudit(runtime, {
          principalId: account.id,
          route,
          outcome: 'allowed',
          requestId,
          statusCode: 200,
          targetAccountId: memberId
        });
        return jsonResponse({ ok: true, data: { account: updated } }, 200, commonHeaders);
      }

      if (route.id === 'members.reset') {
        const memberId = routeParameter(route, path, 'memberId');
        if (!memberId) throw new Error('REQUEST_BODY_INVALID');
        const reset = await runtime.accounts.issuePasswordReset(account.id, memberId);
        await appendAudit(runtime, {
          principalId: account.id,
          route,
          outcome: 'allowed',
          requestId,
          statusCode: 200,
          targetAccountId: memberId
        });
        return jsonResponse({ ok: true, data: reset }, 200, commonHeaders);
      }

      if (route.id === 'members.reset-all') {
        const body = await readJson(request);
        const reset = await runtime.accounts.resetAllMemberCredentials(account.id, {
          currentPassword: textField(body, 'currentPassword', 128),
          confirmation: textField(body, 'confirmation', 64)
        });
        await appendAudit(runtime, {
          principalId: account.id,
          route,
          outcome: 'allowed',
          requestId,
          statusCode: 200,
          memberAction: 'reset-all-activation',
          accountCount: reset.accountCount,
          revokedSessionCount: reset.revokedSessionCount
        });
        return jsonResponse({ ok: true, data: { reset } }, 200, {
          ...commonHeaders,
          'set-cookie': clearAdminSessionCookie()
        });
      }

      if (route.id === 'audit.list') {
        const limit = Number(url.searchParams.get('limit') || 100);
        return jsonResponse({ ok: true, data: { events: await runtime.audit.listAuditEvents(limit) } }, 200, commonHeaders);
      }

      if (route.id.startsWith('cloud-projects.')) {
        if (!runtime.cloudProjects) throw new Error('CLOUD_PROJECT_STORAGE_UNAVAILABLE');
        if (route.id === 'cloud-projects.admin-usage') {
          const [accounts, storedUsage] = await Promise.all([
            runtime.accountStore.listAccounts(),
            runtime.cloudProjects.listUsage()
          ]);
          const usageByOwner = new Map(storedUsage.map(item => [item.ownerId, item]));
          const accountUsage = accounts.map(member => {
            const usage = usageByOwner.get(member.id);
            return {
              accountId: member.id,
              username: member.username,
              displayName: member.displayName,
              accountKind: member.accountKind,
              accessLevel: member.accessLevel,
              projectCount: usage?.projectCount || 0,
              currentBytes: usage?.currentBytes || 0,
              versionBytes: usage?.versionBytes || 0,
              updatedAt: usage?.updatedAt || null
            };
          });
          return jsonResponse({
            ok: true,
            data: {
              summary: {
                accountCount: accountUsage.length,
                projectCount: accountUsage.reduce((sum, item) => sum + item.projectCount, 0),
                currentBytes: accountUsage.reduce((sum, item) => sum + item.currentBytes, 0),
                versionBytes: accountUsage.reduce((sum, item) => sum + item.versionBytes, 0),
                maxProjectsPerAccount: CLOUD_PROJECT_MAX_PER_ACCOUNT,
                maxSnapshotBytes: CLOUD_PROJECT_MAX_BYTES
              },
              accounts: accountUsage
            }
          }, 200, commonHeaders);
        }
        return await handleCloudProjectHttp({
          route,
          path,
          request,
          ownerId: account.id,
          service: runtime.cloudProjects,
          headers: commonHeaders,
          respond: jsonResponse,
          audit: (targetProjectId, statusCode) => appendAudit(runtime, {
            principalId: account.id,
            route,
            outcome: 'allowed',
            requestId,
            statusCode,
            targetProjectId
          })
        });
      }

      if (route.id === 'site.read') {
        return jsonResponse({ ok: true, data: { access: 'private', projectDataStorage: 'browser-local' } }, 200, commonHeaders);
      }
      if (route.id === 'releases.list') {
        return jsonResponse({ ok: true, data: { releases: [] } }, 200, commonHeaders);
      }
      return jsonResponse({ ok: false, error: publicError('ROUTE_DENIED') }, 501, commonHeaders);
    } catch (error) {
      const response = failure(error);
      try {
        await appendAudit(runtime, {
          principalId: auditPrincipalId,
          route,
          outcome: 'failed',
          requestId,
          statusCode: response.status,
          reasonCode: error instanceof Error ? error.message : 'REQUEST_FAILED'
        });
      } catch {
        // The primary response remains deterministic if the audit backend is unavailable.
      }
      return response;
    }
  };
}

export async function handleManagementRequest(
  request: Request,
  env: ManagementWorkerEnvironment
): Promise<Response> {
  try {
    return await createManagementRequestHandler(await productionManagementRuntime(env))(request);
  } catch (error) {
    console.error(JSON.stringify({
      event: 'management.request.failed',
      path: new URL(request.url).pathname.slice(0, 128),
      code: normalizedFailureCode(error)
    }));
    return failure(error);
  }
}
