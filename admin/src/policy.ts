import {
  ADMIN_CAPABILITIES,
  ADMIN_MODE,
  type AdminAuditEvent,
  type AdminCapability,
  type AdminSession
} from './contracts.js';

const blockedMetadataKey = /(password|secret|token|cookie|authorization|project|point|zone|coordinate|latitude|longitude|image|file|path|directory)/i;

export function isSessionActive(session: AdminSession | null, now = new Date()): session is AdminSession {
  if (!session || session.role !== 'owner') return false;
  const expiresAt = Date.parse(session.expiresAt);
  return Number.isFinite(expiresAt) && expiresAt > now.getTime();
}

export function can(
  session: AdminSession | null,
  capability: AdminCapability,
  now = new Date()
): boolean {
  return ADMIN_MODE === 'owner-only'
    && ADMIN_CAPABILITIES.includes(capability)
    && isSessionActive(session, now);
}

export function requireCapability(
  session: AdminSession | null,
  capability: AdminCapability,
  now = new Date()
): void {
  if (!can(session, capability, now)) {
    throw new Error('ADMIN_ACCESS_DENIED');
  }
}

export function sanitizeAuditMetadata(
  value: Record<string, unknown>
): AdminAuditEvent['metadata'] {
  return Object.fromEntries(Object.entries(value)
    .filter(([key, item]) => !blockedMetadataKey.test(key)
      && ['string', 'number', 'boolean'].includes(typeof item))
    .slice(0, 24)
    .map(([key, item]) => [key, typeof item === 'string' ? item.slice(0, 240) : item])) as AdminAuditEvent['metadata'];
}
