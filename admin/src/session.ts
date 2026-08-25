import type {
  AdminAuthenticationMethod,
  AdminPrincipal,
  AdminSession,
  AdminSessionRecord,
  SessionStore
} from './contracts.js';
import { AuthKeyRing, randomBase64Url } from './keyring.js';
import { isSessionActive } from './policy.js';

export const ADMIN_SESSION_COOKIE_NAME = '__Host-cqnu_manage_session';
export const ADMIN_CSRF_HEADER_NAME = 'x-cqnu-csrf';

export interface AdminSessionPolicy {
  leaseTtlMs: number;
  absoluteTtlMs: number;
  rotationIntervalMs: number;
  tokenBytes: number;
}

export const DEFAULT_ADMIN_SESSION_POLICY: Readonly<AdminSessionPolicy> = Object.freeze({
  leaseTtlMs: 2 * 60 * 1000,
  absoluteTtlMs: 24 * 60 * 60 * 1000,
  rotationIntervalMs: 15 * 60 * 1000,
  tokenBytes: 32
});

export interface AdminSessionRuntime {
  now(): Date;
  randomToken(byteLength: number): string;
  keyRing: AuthKeyRing;
}

export interface AdminSessionGrant {
  session: AdminSession;
  sessionToken: string;
  csrfToken: string;
  setCookie: string;
  csrfHeaderName: typeof ADMIN_CSRF_HEADER_NAME;
}

export interface AdminSessionAccess {
  session: AdminSession;
  setCookie: string;
  replacement?: Pick<AdminSessionGrant, 'sessionToken' | 'csrfToken' | 'csrfHeaderName'>;
}

function sessionIndex(tokenKeyId: string, tokenDigest: string): string {
  return `${tokenKeyId}:${tokenDigest}`;
}

function tokenKeyId(token: string, prefix: string): string | null {
  const match = new RegExp(`^${prefix}\\.([A-Za-z0-9_-]{1,32})\\.[A-Za-z0-9_-]{20,}$`, 'u').exec(token);
  return match?.[1] || null;
}

function cloneSession(session: AdminSessionRecord): AdminSessionRecord {
  return { ...session };
}

function publicSession(session: AdminSessionRecord): AdminSession {
  return {
    id: session.id,
    principalId: session.principalId,
    username: session.username,
    accountKind: session.accountKind,
    accessLevel: session.accessLevel,
    mustChangePassword: session.mustChangePassword,
    credentialVersion: session.credentialVersion,
    createdAt: session.createdAt,
    rotatedAt: session.rotatedAt,
    lastSeenAt: session.lastSeenAt,
    leaseExpiresAt: session.leaseExpiresAt,
    absoluteExpiresAt: session.absoluteExpiresAt,
    authenticationMethod: session.authenticationMethod,
    rotationCounter: session.rotationCounter,
    ...(session.elevatedAt ? { elevatedAt: session.elevatedAt } : {}),
    ...(session.revokedAt ? { revokedAt: session.revokedAt } : {})
  };
}

function leaseExpiryAt(now: Date, absoluteExpiresAt: string, leaseTtlMs: number): string {
  return new Date(Math.min(
    now.getTime() + leaseTtlMs,
    Date.parse(absoluteExpiresAt)
  )).toISOString();
}

function cookieFor(token: string, expiresAt: string, now: Date): string {
  const maxAge = Math.max(0, Math.floor((Date.parse(expiresAt) - now.getTime()) / 1000));
  return `${ADMIN_SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;
}

export function clearAdminSessionCookie(): string {
  return `${ADMIN_SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

function validatePolicy(policy: AdminSessionPolicy): void {
  if (Object.values(policy).some(value => !Number.isSafeInteger(value) || value <= 0)
    || policy.tokenBytes < 32
    || policy.tokenBytes > 64
    || policy.leaseTtlMs > policy.absoluteTtlMs
    || policy.rotationIntervalMs > policy.absoluteTtlMs) {
    throw new Error('ADMIN_SESSION_POLICY_INVALID');
  }
}

export class InMemorySessionStore implements SessionStore {
  readonly #byId = new Map<string, AdminSessionRecord>();
  readonly #idByDigest = new Map<string, string>();

  async getByTokenDigest(tokenDigest: string, tokenKeyIdValue: string): Promise<AdminSessionRecord | null> {
    const id = this.#idByDigest.get(sessionIndex(tokenKeyIdValue, tokenDigest));
    const session = id ? this.#byId.get(id) : null;
    return session ? cloneSession(session) : null;
  }

  async put(session: AdminSessionRecord): Promise<void> {
    const previous = this.#byId.get(session.id);
    if (previous) this.#idByDigest.delete(sessionIndex(previous.tokenKeyId, previous.tokenDigest));
    const copy = cloneSession(session);
    this.#byId.set(copy.id, copy);
    if (!copy.revokedAt) this.#idByDigest.set(sessionIndex(copy.tokenKeyId, copy.tokenDigest), copy.id);
  }

  async replace(expectedTokenDigest: string, session: AdminSessionRecord): Promise<boolean> {
    const previous = this.#byId.get(session.id);
    if (!previous || previous.revokedAt || previous.tokenDigest !== expectedTokenDigest) return false;
    await this.put(session);
    return true;
  }

  async revoke(sessionId: string, revokedAt: string): Promise<boolean> {
    const session = this.#byId.get(sessionId);
    if (!session || session.revokedAt) return false;
    this.#idByDigest.delete(sessionIndex(session.tokenKeyId, session.tokenDigest));
    this.#byId.set(session.id, { ...session, revokedAt });
    return true;
  }

  async revokePrincipal(principalId: string, revokedAt: string): Promise<number> {
    let revoked = 0;
    for (const session of this.#byId.values()) {
      if (session.principalId !== principalId || session.revokedAt) continue;
      this.#idByDigest.delete(sessionIndex(session.tokenKeyId, session.tokenDigest));
      this.#byId.set(session.id, { ...session, revokedAt });
      revoked += 1;
    }
    return revoked;
  }

  snapshotRecords(): AdminSessionRecord[] {
    return [...this.#byId.values()].map(cloneSession);
  }
}

export class AdminSessionManager {
  readonly #store: SessionStore;
  readonly #policy: AdminSessionPolicy;
  readonly #runtime: AdminSessionRuntime;

  constructor(
    store: SessionStore,
    options: {
      policy?: Partial<AdminSessionPolicy>;
      runtime: AdminSessionRuntime;
    }
  ) {
    this.#store = store;
    this.#policy = { ...DEFAULT_ADMIN_SESSION_POLICY, ...(options.policy || {}) };
    validatePolicy(this.#policy);
    this.#runtime = options.runtime;
  }

  now(): Date {
    return this.#runtime.now();
  }

  keyRing(): AuthKeyRing {
    return this.#runtime.keyRing;
  }

  async issue(
    principal: AdminPrincipal,
    authenticationMethod: AdminAuthenticationMethod
  ): Promise<AdminSessionGrant> {
    if (!principal.enabled || principal.status === 'disabled') throw new Error('ADMIN_PRINCIPAL_DISABLED');
    const now = this.now();
    const keyId = this.#runtime.keyRing.activeKeyId();
    const sessionToken = `mgs.${keyId}.${this.#runtime.randomToken(this.#policy.tokenBytes)}`;
    const csrfToken = `mgc.${keyId}.${this.#runtime.randomToken(this.#policy.tokenBytes)}`;
    const sessionDigest = await this.#runtime.keyRing.digest('session', sessionToken, keyId);
    const csrfDigest = await this.#runtime.keyRing.digest('csrf', csrfToken, keyId);
    const absoluteExpiresAt = new Date(now.getTime() + this.#policy.absoluteTtlMs).toISOString();
    const record: AdminSessionRecord = {
      id: `ses_${this.#runtime.randomToken(16)}`,
      tokenDigest: sessionDigest.digest,
      tokenKeyId: sessionDigest.keyId,
      csrfDigest: csrfDigest.digest,
      csrfKeyId: csrfDigest.keyId,
      principalId: principal.id,
      username: principal.username,
      accountKind: principal.accountKind,
      accessLevel: principal.accessLevel,
      mustChangePassword: principal.mustChangePassword,
      credentialVersion: principal.credentialVersion,
      createdAt: now.toISOString(),
      rotatedAt: now.toISOString(),
      lastSeenAt: now.toISOString(),
      leaseExpiresAt: leaseExpiryAt(now, absoluteExpiresAt, this.#policy.leaseTtlMs),
      absoluteExpiresAt,
      authenticationMethod,
      rotationCounter: 0
    };
    await this.#store.put(record);
    return {
      session: publicSession(record),
      sessionToken,
      csrfToken,
      setCookie: cookieFor(sessionToken, record.leaseExpiresAt, now),
      csrfHeaderName: ADMIN_CSRF_HEADER_NAME
    };
  }

  async inspect(sessionToken: string): Promise<AdminSessionRecord | null> {
    const keyId = tokenKeyId(sessionToken, 'mgs');
    if (!keyId || !this.#runtime.keyRing.hasKey(keyId)) return null;
    const digest = await this.#runtime.keyRing.digest('session', sessionToken, keyId);
    const record = await this.#store.getByTokenDigest(digest.digest, keyId);
    const now = this.now();
    if (!isSessionActive(record, now)) {
      if (record && !record.revokedAt) await this.#store.revoke(record.id, now.toISOString());
      return null;
    }
    return record;
  }

  async touch(sessionToken: string, forceRotate = false): Promise<AdminSessionAccess | null> {
    const record = await this.inspect(sessionToken);
    if (!record) return null;
    const now = this.now();
    const rotationDue = forceRotate
      || now.getTime() - Date.parse(record.rotatedAt) >= this.#policy.rotationIntervalMs;
    const leaseExpiresAt = leaseExpiryAt(now, record.absoluteExpiresAt, this.#policy.leaseTtlMs);
    if (!rotationDue) {
      const next = { ...record, lastSeenAt: now.toISOString(), leaseExpiresAt };
      if (!await this.#store.replace(record.tokenDigest, next)) {
        throw new Error('ADMIN_SESSION_UPDATE_CONFLICT');
      }
      return {
        session: publicSession(next),
        setCookie: cookieFor(sessionToken, leaseExpiresAt, now)
      };
    }

    const keyId = this.#runtime.keyRing.activeKeyId();
    const nextToken = `mgs.${keyId}.${this.#runtime.randomToken(this.#policy.tokenBytes)}`;
    const nextCsrf = `mgc.${keyId}.${this.#runtime.randomToken(this.#policy.tokenBytes)}`;
    const tokenDigest = await this.#runtime.keyRing.digest('session', nextToken, keyId);
    const csrfDigest = await this.#runtime.keyRing.digest('csrf', nextCsrf, keyId);
    const next: AdminSessionRecord = {
      ...record,
      tokenDigest: tokenDigest.digest,
      tokenKeyId: tokenDigest.keyId,
      csrfDigest: csrfDigest.digest,
      csrfKeyId: csrfDigest.keyId,
      rotatedAt: now.toISOString(),
      lastSeenAt: now.toISOString(),
      leaseExpiresAt,
      rotationCounter: record.rotationCounter + 1
    };
    if (!await this.#store.replace(record.tokenDigest, next)) {
      throw new Error('ADMIN_SESSION_ROTATION_CONFLICT');
    }
    return {
      session: publicSession(next),
      setCookie: cookieFor(nextToken, leaseExpiresAt, now),
      replacement: {
        sessionToken: nextToken,
        csrfToken: nextCsrf,
        csrfHeaderName: ADMIN_CSRF_HEADER_NAME
      }
    };
  }

  async revoke(sessionToken: string): Promise<boolean> {
    const record = await this.inspect(sessionToken);
    return record ? this.#store.revoke(record.id, this.now().toISOString()) : false;
  }

  async revokeAllForPrincipal(principalId: string): Promise<number> {
    return this.#store.revokePrincipal(principalId, this.now().toISOString());
  }
}

export function defaultAdminSessionRuntime(keyRing: AuthKeyRing): AdminSessionRuntime {
  return {
    now: () => new Date(),
    randomToken: randomBase64Url,
    keyRing
  };
}
