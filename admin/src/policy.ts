import {
  ADMIN_CAPABILITIES,
  ADMIN_MODE,
  type AdminCapability,
  type AdminRole,
  type AdminSessionRecord
} from './contracts.js';

const ROLE_CAPABILITIES = Object.freeze({
  owner: ADMIN_CAPABILITIES,
  editor: [
    'site.read',
    'site.publish',
    'release.read',
    'release.manage',
    'audit.read'
  ] as const,
  viewer: ['site.read', 'release.read', 'audit.read'] as const
}) satisfies Readonly<Record<AdminRole, readonly AdminCapability[]>>;

export function isSessionActive(
  session: AdminSessionRecord | null,
  now = new Date()
): boolean {
  if (!session || session.revokedAt) return false;
  const expiresAt = Date.parse(session.expiresAt);
  const absoluteExpiresAt = Date.parse(session.absoluteExpiresAt);
  return Number.isFinite(expiresAt)
    && Number.isFinite(absoluteExpiresAt)
    && expiresAt > now.getTime()
    && absoluteExpiresAt > now.getTime();
}

export function roleAllows(role: AdminRole, capability: AdminCapability): boolean {
  const capabilities: readonly AdminCapability[] = ROLE_CAPABILITIES[role];
  return capabilities.includes(capability);
}

export function can(
  session: AdminSessionRecord | null,
  capability: AdminCapability,
  now = new Date()
): boolean {
  if (!session || session.role !== 'owner') return false;
  return ADMIN_MODE === 'owner-only'
    && ADMIN_CAPABILITIES.includes(capability)
    && isSessionActive(session, now)
    && roleAllows(session.role, capability);
}

export function requireCapability(
  session: AdminSessionRecord | null,
  capability: AdminCapability,
  now = new Date()
): void {
  if (!can(session, capability, now)) throw new Error('ADMIN_ACCESS_DENIED');
}
