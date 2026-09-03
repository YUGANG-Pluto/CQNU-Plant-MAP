import { routeParameter } from './http-contract.js';
import { readJson } from './http-json.js';
import { clearAdminSessionCookie } from './session.js';
import { appendAudit, optionalTextField, textField } from './site-handler-support.js';
import { jsonResponse } from './site-http-response.js';
import type { AuthorizedSiteRouteInput } from './site-route-types.js';

export async function handleMemberSiteRoute(input: AuthorizedSiteRouteInput): Promise<Response | null> {
  const { route, request, runtime, path, url, account, headers, audit } = input;

  if (route.id === 'members.list') {
    return jsonResponse({ ok: true, data: { members: await runtime.accounts.listAccounts() } }, 200, headers);
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
      requestId: audit.requestId,
      statusCode: 201,
      targetAccountId: invitation.account.id
    });
    return jsonResponse({ ok: true, data: invitation }, 201, headers);
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
      requestId: audit.requestId,
      statusCode: 200,
      targetAccountId: memberId
    });
    return jsonResponse({ ok: true, data: { account: updated } }, 200, headers);
  }

  if (route.id === 'members.reset') {
    const memberId = routeParameter(route, path, 'memberId');
    if (!memberId) throw new Error('REQUEST_BODY_INVALID');
    const reset = await runtime.accounts.issuePasswordReset(account.id, memberId);
    await appendAudit(runtime, {
      principalId: account.id,
      route,
      outcome: 'allowed',
      requestId: audit.requestId,
      statusCode: 200,
      targetAccountId: memberId
    });
    return jsonResponse({ ok: true, data: reset }, 200, headers);
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
      requestId: audit.requestId,
      statusCode: 200,
      memberAction: 'reset-all-activation',
      accountCount: reset.accountCount,
      revokedSessionCount: reset.revokedSessionCount
    });
    return jsonResponse({ ok: true, data: { reset } }, 200, {
      ...headers,
      'set-cookie': clearAdminSessionCookie()
    });
  }

  if (route.id === 'audit.list') {
    const limit = Number(url.searchParams.get('limit') || 100);
    return jsonResponse(
      {
        ok: true,
        data: { events: await runtime.audit.listAuditEvents(limit) }
      },
      200,
      headers
    );
  }

  return null;
}
