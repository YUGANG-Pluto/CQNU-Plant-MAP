export const ADMIN_MODE = 'managed-access' as const;

export const ADMIN_CAPABILITIES = [
  'workspace.read',
  'workspace.edit',
  'workspace.save',
  'site.read',
  'site.publish',
  'release.read',
  'release.manage',
  'member.read',
  'member.manage',
  'member.permission.manage',
  'member.password.reset',
  'audit.read'
] as const;

export type AdminCapability = typeof ADMIN_CAPABILITIES[number];
export type ManagementAccountKind = 'user' | 'admin';
export type ManagementAccessLevel = 'read' | 'edit' | 'save';
export type ManagementAccountStatus = 'pending-activation' | 'active' | 'disabled';
export type AdminAuthenticationMethod = 'password' | 'platform-owner-gate' | 'oidc' | 'webauthn';
export type AdminAuditAction = AdminCapability
  | 'account.activate'
  | 'account.username.change'
  | 'account.password.change'
  | 'account.password.reset.issue'
  | 'account.password.reset.consume'
  | 'session.create'
  | 'session.heartbeat'
  | 'session.rotate'
  | 'session.revoke'
  | 'session.revoke_all';

export interface AdminPrincipal {
  id: string;
  username: string;
  displayName: string;
  accountKind: ManagementAccountKind;
  accessLevel: ManagementAccessLevel;
  status: ManagementAccountStatus;
  mustChangePassword: boolean;
  credentialVersion: number;
  enabled: boolean;
  providerSubject?: string;
}

export interface AdminSessionRecord {
  id: string;
  tokenDigest: string;
  tokenKeyId: string;
  csrfDigest: string;
  csrfKeyId: string;
  principalId: string;
  username: string;
  accountKind: ManagementAccountKind;
  accessLevel: ManagementAccessLevel;
  mustChangePassword: boolean;
  credentialVersion: number;
  createdAt: string;
  rotatedAt: string;
  lastSeenAt: string;
  leaseExpiresAt: string;
  absoluteExpiresAt: string;
  authenticationMethod: AdminAuthenticationMethod;
  rotationCounter: number;
  elevatedAt?: string;
  revokedAt?: string;
}

export type AdminSession = Omit<
  AdminSessionRecord,
  'tokenDigest' | 'tokenKeyId' | 'csrfDigest' | 'csrfKeyId'
>;

export interface AdminAuditEvent {
  id: string;
  occurredAt: string;
  principalId: string;
  action: AdminAuditAction;
  outcome: 'allowed' | 'denied' | 'failed';
  requestId: string;
  metadata: Record<string, string | number | boolean>;
}

export interface IdentityAdapterContext {
  requestId: string;
  now: string;
}

export interface IdentityAdapter {
  verify(assertion: unknown, context: IdentityAdapterContext): Promise<AdminPrincipal | null>;
}

export interface AuditSink {
  append(event: AdminAuditEvent): Promise<void>;
}

export interface SessionStore {
  getByTokenDigest(tokenDigest: string, tokenKeyId: string): Promise<AdminSessionRecord | null>;
  put(session: AdminSessionRecord): Promise<void>;
  replace(expectedTokenDigest: string, session: AdminSessionRecord): Promise<boolean>;
  revoke(sessionId: string, revokedAt: string): Promise<boolean>;
  revokePrincipal(principalId: string, revokedAt: string): Promise<number>;
}
