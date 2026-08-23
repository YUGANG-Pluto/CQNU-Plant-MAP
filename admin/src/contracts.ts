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
export type AdminRole = 'owner' | 'maintainer' | 'reviewer' | 'viewer';

export interface AdminPrincipal {
  id: string;
  displayName: string;
  role: AdminRole;
  enabled: boolean;
}

export interface AdminSession {
  id: string;
  principalId: string;
  role: AdminRole;
  createdAt: string;
  expiresAt: string;
  authenticationMethod: 'platform-owner-gate' | 'oidc' | 'webauthn';
  elevatedAt?: string;
}

export interface AdminAuditEvent {
  id: string;
  occurredAt: string;
  principalId: string;
  action: AdminCapability | 'session.create' | 'session.revoke';
  outcome: 'allowed' | 'denied' | 'failed';
  requestId: string;
  metadata: Record<string, string | number | boolean>;
}

export interface IdentityProvider {
  resolveOwner(request: { requestId: string }): Promise<AdminPrincipal | null>;
}

export interface AuditSink {
  append(event: AdminAuditEvent): Promise<void>;
}

export interface SessionStore {
  get(sessionId: string): Promise<AdminSession | null>;
  put(session: AdminSession): Promise<void>;
  revoke(sessionId: string): Promise<void>;
}
