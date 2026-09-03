import { readJson } from './http-json.js';
import { clearAdminSessionCookie } from './session.js';
import {
  accountForSession,
  appendAudit,
  optionalTextField,
  responseForGrant,
  sessionData,
  textField
} from './site-handler-support.js';
import { jsonResponse, publicError } from './site-http-response.js';
import type { PublicSiteRouteInput } from './site-route-types.js';

export async function handlePublicSiteRoute(input: PublicSiteRouteInput): Promise<Response | null> {
  const { route, request, runtime, sessionToken, audit } = input;
  if (route.id === 'login') {
    const body = await readJson(request);
    const result = await runtime.accounts.login(textField(body, 'username', 64), textField(body, 'password', 128));
    audit.principalId = result.account.id;
    await appendAudit(runtime, {
      principalId: result.account.id,
      route,
      outcome: 'allowed',
      requestId: audit.requestId,
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
    audit.principalId = result.account.id;
    await appendAudit(runtime, {
      principalId: result.account.id,
      route,
      outcome: 'allowed',
      requestId: audit.requestId,
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
    return jsonResponse(
      {
        ok: true,
        data: sessionData(access.session, account, access.replacement.csrfToken)
      },
      200,
      { 'set-cookie': access.setCookie }
    );
  }

  return null;
}
