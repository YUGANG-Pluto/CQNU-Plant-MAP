import type {
  AdminCapability,
  AdminSessionRecord,
  ManagementAccessLevel,
  ManagementAccountKind
} from './contracts.js';

const ACCESS_RANK: Readonly<Record<ManagementAccessLevel, number>> = Object.freeze({
  read: 1,
  edit: 2,
  save: 3
});

const WORKSPACE_CAPABILITY_LEVEL: Partial<Record<AdminCapability, ManagementAccessLevel>> = {
  'workspace.read': 'read',
  'workspace.edit': 'edit',
  'workspace.save': 'save'
};

const ADMIN_ONLY = new Set<AdminCapability>([
  'site.read',
  'site.publish',
  'release.read',
  'release.manage',
  'member.read',
  'member.manage',
  'member.permission.manage',
  'member.password.reset',
  'audit.read'
]);

export function accessLevelAllows(
  accessLevel: ManagementAccessLevel,
  required: ManagementAccessLevel
): boolean {
  return ACCESS_RANK[accessLevel] >= ACCESS_RANK[required];
}

export function principalAllows(
  accountKind: ManagementAccountKind,
  accessLevel: ManagementAccessLevel,
  capability: AdminCapability
): boolean {
  const workspaceLevel = WORKSPACE_CAPABILITY_LEVEL[capability];
  if (workspaceLevel) return accessLevelAllows(accessLevel, workspaceLevel);
  return accountKind === 'admin' && ADMIN_ONLY.has(capability);
}

export function isSessionActive(
  session: AdminSessionRecord | null,
  now = new Date()
): boolean {
  if (!session || session.revokedAt) return false;
  const leaseExpiresAt = Date.parse(session.leaseExpiresAt);
  const absoluteExpiresAt = Date.parse(session.absoluteExpiresAt);
  return Number.isFinite(leaseExpiresAt)
    && Number.isFinite(absoluteExpiresAt)
    && leaseExpiresAt > now.getTime()
    && absoluteExpiresAt > now.getTime();
}

export function can(
  session: AdminSessionRecord | null,
  capability: AdminCapability,
  now = new Date()
): boolean {
  return Boolean(session
    && !session.mustChangePassword
    && isSessionActive(session, now)
    && principalAllows(session.accountKind, session.accessLevel, capability));
}

export function requireCapability(
  session: AdminSessionRecord | null,
  capability: AdminCapability,
  now = new Date()
): void {
  if (!can(session, capability, now)) throw new Error('ADMIN_ACCESS_DENIED');
}
