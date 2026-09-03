import { readJson } from './http-json.js';
import { clearAdminSessionCookie } from './session.js';
import { appendAudit, optionalTextField, responseForGrant, sessionData, textField } from './site-handler-support.js';
import { jsonResponse } from './site-http-response.js';
import type { AuthorizedSiteRouteInput } from './site-route-types.js';

export async function handleAccountSiteRoute(input: AuthorizedSiteRouteInput): Promise<Response | null> {
  const { route, request, runtime, sessionToken, account, sessionAccess, headers, audit } = input;
  const csrfToken = sessionAccess.replacement?.csrfToken;

  if (route.id === 'session.heartbeat') {
    return jsonResponse(
      {
        ok: true,
        data: sessionData(sessionAccess.session, account, csrfToken)
      },
      200,
      headers
    );
  }

  if (route.id === 'session.revoke') {
    await runtime.sessions.revoke(sessionToken);
    await appendAudit(runtime, {
      principalId: account.id,
      route,
      outcome: 'allowed',
      requestId: audit.requestId,
      statusCode: 200
    });
    return jsonResponse({ ok: true }, 200, {
      'set-cookie': clearAdminSessionCookie()
    });
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
      principalId: account.id,
      route,
      outcome: 'allowed',
      requestId: audit.requestId,
      statusCode: 200
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
      principalId: account.id,
      route,
      outcome: 'allowed',
      requestId: audit.requestId,
      statusCode: 200
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
      principalId: account.id,
      route,
      outcome: 'allowed',
      requestId: audit.requestId,
      statusCode: 200
    });
    return responseForGrant(result);
  }

  return null;
}
