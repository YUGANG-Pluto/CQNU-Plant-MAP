import { authorizeAdminRequest } from './access.js';
import { findAdminRoute } from './http-contract.js';
import { randomBase64Url } from './keyring.js';
import {
  productionManagementRuntime,
  type ManagementRequestRuntime,
  type ManagementWorkerEnvironment
} from './management-runtime.js';
import { ADMIN_CSRF_HEADER_NAME, ADMIN_SESSION_COOKIE_NAME, clearAdminSessionCookie } from './session.js';
import { handleAccountSiteRoute } from './site-account-routes.js';
import { handleCloudSiteRoute } from './site-cloud-routes.js';
import {
  accountForSession,
  appendAudit,
  cookieValue,
  responseHeadersForAccess,
  type SiteAuditContext
} from './site-handler-support.js';
import { errorStatus, failure, jsonResponse, normalizedFailureCode, publicError } from './site-http-response.js';
import { handleMemberSiteRoute } from './site-member-routes.js';
import { handlePublicSiteRoute } from './site-public-routes.js';

export type {
  ManagementAuditReader,
  ManagementRequestRuntime,
  ManagementWorkerEnvironment
} from './management-runtime.js';

function normalizedPath(url: URL): string {
  return url.pathname.length > 1 && url.pathname.endsWith('/') ? url.pathname.slice(0, -1) : url.pathname;
}

export function createManagementRequestHandler(runtime: ManagementRequestRuntime) {
  return async function handle(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = normalizedPath(url);
    const route = findAdminRoute(request.method, path);
    if (!route) return jsonResponse({ ok: false, error: publicError('ROUTE_DENIED') }, 404);

    const sessionToken = cookieValue(request, ADMIN_SESSION_COOKIE_NAME);
    const audit: SiteAuditContext = {
      principalId: 'anonymous',
      requestId: `req_${randomBase64Url(16)}`
    };

    try {
      const publicResponse = await handlePublicSiteRoute({
        runtime,
        route,
        request,
        sessionToken,
        audit
      });
      if (publicResponse) return publicResponse;

      const decision = await authorizeAdminRequest(
        {
          method: request.method,
          path,
          sessionToken,
          csrfToken: request.headers.get(ADMIN_CSRF_HEADER_NAME) || '',
          origin: request.headers.get('origin') || '',
          allowedOrigins: [url.origin]
        },
        runtime.sessions
      );
      if (!decision.allowed || !decision.session || !decision.sessionAccess) {
        await appendAudit(runtime, {
          principalId: decision.session?.principalId || 'anonymous',
          route,
          outcome: 'denied',
          requestId: audit.requestId,
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
      audit.principalId = account.id;
      const headers = responseHeadersForAccess(decision.sessionAccess);
      const authorizedInput = {
        runtime,
        route,
        path,
        url,
        request,
        sessionToken,
        audit,
        account,
        sessionAccess: decision.sessionAccess,
        headers
      };

      const accountResponse = await handleAccountSiteRoute(authorizedInput);
      if (accountResponse) return accountResponse;
      const memberResponse = await handleMemberSiteRoute(authorizedInput);
      if (memberResponse) return memberResponse;
      const cloudResponse = await handleCloudSiteRoute(authorizedInput);
      if (cloudResponse) return cloudResponse;

      if (route.id === 'site.read') {
        return jsonResponse(
          {
            ok: true,
            data: { access: 'private', projectDataStorage: 'browser-local' }
          },
          200,
          headers
        );
      }
      if (route.id === 'releases.list') {
        return jsonResponse({ ok: true, data: { releases: [] } }, 200, headers);
      }
      return jsonResponse({ ok: false, error: publicError('ROUTE_DENIED') }, 501, headers);
    } catch (error) {
      const response = failure(error);
      try {
        await appendAudit(runtime, {
          principalId: audit.principalId,
          route,
          outcome: 'failed',
          requestId: audit.requestId,
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

export async function handleManagementRequest(request: Request, env: ManagementWorkerEnvironment): Promise<Response> {
  try {
    return await createManagementRequestHandler(await productionManagementRuntime(env))(request);
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'management.request.failed',
        path: new URL(request.url).pathname.slice(0, 128),
        code: normalizedFailureCode(error)
      })
    );
    return failure(error);
  }
}
