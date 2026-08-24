import type { AdminSessionRecord } from './contracts.js';
import { digestOpaqueToken } from './session.js';

export function constantTimeTextEqual(left: string, right: string): boolean {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

function configuredOrigin(value: string): string | null {
  try {
    const parsed = new URL(value);
    if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password) return null;
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
    if (parsed.protocol !== 'https:' && !loopback) return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

export function isAllowedAdminOrigin(origin: string, allowedOrigins: readonly string[]): boolean {
  const raw = origin.trim();
  const normalized = configuredOrigin(raw);
  if (!normalized || normalized !== raw) return false;
  return allowedOrigins
    .map(configuredOrigin)
    .some(allowed => allowed !== null && constantTimeTextEqual(allowed, normalized));
}

export async function validateAdminCsrf(input: {
  session: AdminSessionRecord;
  csrfToken: string;
  origin: string;
  allowedOrigins: readonly string[];
  digest?: (value: string) => Promise<string>;
}): Promise<boolean> {
  if (!input.csrfToken || !isAllowedAdminOrigin(input.origin, input.allowedOrigins)) return false;
  const digest = await (input.digest || digestOpaqueToken)(input.csrfToken);
  return constantTimeTextEqual(digest, input.session.csrfDigest);
}
