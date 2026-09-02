import { constantTimeBytesEqual } from './keyring.js';
import type { ManagementRequestRuntime } from './management-runtime.js';
import { readJson, type JsonObject } from './http-json.js';
import { clearAdminSessionCookie } from './session.js';

export const OWNER_RECOVERY_HEADER_NAME = 'x-cqnu-owner-recovery';

const OWNER_RECOVERY_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43,128}$/u;

export interface OwnerRecoveryHandlerOptions {
  ownerRecoveryToken?: string;
}

export interface OwnerRecoveryAuditSummary {
  memberAction: string;
  accountCount: number;
  revokedSessionCount?: number;
}

export interface OwnerRecoveryRequestInput extends OwnerRecoveryHandlerOptions {
  request: Request;
  routeId: string;
  expectedOrigin: string;
  runtime: ManagementRequestRuntime;
  respond(body: unknown, status?: number, headers?: Record<string, string>): Response;
  audit(summary: OwnerRecoveryAuditSummary): Promise<void>;
  onAuthorized(): void;
}

export function assertOwnerRecoveryRequest(
  request: Request,
  expectedOrigin: string,
  configuredToken?: string
): void {
  if (!configuredToken || !OWNER_RECOVERY_TOKEN_PATTERN.test(configuredToken)) {
    throw new Error('OWNER_RECOVERY_UNAVAILABLE');
  }
  const suppliedToken = request.headers.get(OWNER_RECOVERY_HEADER_NAME) || '';
  if (request.headers.get('origin') !== expectedOrigin
    || !OWNER_RECOVERY_TOKEN_PATTERN.test(suppliedToken)
    || !constantTimeBytesEqual(
      new TextEncoder().encode(suppliedToken),
      new TextEncoder().encode(configuredToken)
    )) {
    throw new Error('OWNER_RECOVERY_DENIED');
  }
}

function textField(body: JsonObject, name: string, maxLength: number): string {
  const value = body[name];
  if (typeof value !== 'string' || value.length > maxLength) throw new Error('REQUEST_BODY_INVALID');
  return value;
}

function nonNegativeIntegerField(body: JsonObject, name: string): number {
  const value = body[name];
  if (!Number.isSafeInteger(value) || Number(value) < 0) throw new Error('REQUEST_BODY_INVALID');
  return Number(value);
}

export async function handleOwnerRecoveryRequest(
  input: OwnerRecoveryRequestInput
): Promise<Response | null> {
  if (input.routeId !== 'owner-recovery.preflight'
    && input.routeId !== 'owner-recovery.reset-all') return null;
  assertOwnerRecoveryRequest(input.request, input.expectedOrigin, input.ownerRecoveryToken);
  input.onAuthorized();
  if (input.routeId === 'owner-recovery.preflight') {
    const preflight = await input.runtime.accounts.previewAllMemberCredentialReset();
    await input.audit({
      memberAction: 'owner-recovery-preflight',
      accountCount: preflight.accountCount
    });
    return input.respond({ ok: true, data: { preflight } });
  }
  const body = await readJson(input.request);
  const reset = await input.runtime.accounts.resetAllMemberCredentialsForOwnerRecovery({
    confirmation: textField(body, 'confirmation', 64),
    expectedAccountCount: nonNegativeIntegerField(body, 'expectedAccountCount'),
    expectedRevisionTotal: nonNegativeIntegerField(body, 'expectedRevisionTotal')
  });
  await input.audit({
    memberAction: 'owner-recovery-reset-all-activation',
    accountCount: reset.accountCount,
    revokedSessionCount: reset.revokedSessionCount
  });
  return input.respond({ ok: true, data: { reset } }, 200, {
    'set-cookie': clearAdminSessionCookie()
  });
}
