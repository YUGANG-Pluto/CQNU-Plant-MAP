export const ADMIN_MODE = 'owner-only' as const;

export const ADMIN_CAPABILITIES = [
  'site.read',
  'site.publish',
  'release.read',
  'release.manage',
  'member.read',
  'member.manage',
  'audit.read'
] as const;

export type AdminCapability = typeof ADMIN_CAPABILITIES[number];
export type AdminRole = 'owner' | 'editor' | 'viewer';
export type AdminAuthenticationMethod = 'platform-owner-gate' | 'oidc' | 'webauthn';
export type AdminAuditAction = AdminCapability
  | 'session.create'
  | 'session.rotate'
  | 'session.revoke'
  | 'session.revoke_all';

export interface AdminPrincipal {
  id: string;
  providerSubject: string;
  displayName: string;
  role: AdminRole;
  enabled: boolean;
}

export interface AdminSessionRecord {
  id: string;
  tokenDigest: string;
  csrfDigest: string;
  principalId: string;
  role: AdminRole;
  createdAt: string;
  rotatedAt: string;
  lastSeenAt: string;
  expiresAt: string;
  absoluteExpiresAt: string;
  authenticationMethod: AdminAuthenticationMethod;
  rotationCounter: number;
  elevatedAt?: string;
  revokedAt?: string;
}

export type AdminSession = Omit<AdminSessionRecord, 'tokenDigest' | 'csrfDigest'>;

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
  getByTokenDigest(tokenDigest: string): Promise<AdminSessionRecord | null>;
  put(session: AdminSessionRecord): Promise<void>;
  replace(expectedTokenDigest: string, session: AdminSessionRecord): Promise<boolean>;
  revoke(sessionId: string, revokedAt: string): Promise<boolean>;
  revokePrincipal(principalId: string, revokedAt: string): Promise<number>;
}
