import type {
  AdminAuthenticationMethod,
  AdminPrincipal,
  AdminSession,
  AdminSessionRecord,
  SessionStore
} from './contracts.js';
import { ADMIN_MODE } from './contracts.js';
import { isSessionActive } from './policy.js';

export const ADMIN_SESSION_COOKIE_NAME = '__Host-cqnu_admin_session';
export const ADMIN_CSRF_HEADER_NAME = 'x-cqnu-csrf';

export interface AdminSessionPolicy {
  idleTtlMs: number;
  absoluteTtlMs: number;
  rotationIntervalMs: number;
  tokenBytes: number;
}

export const DEFAULT_ADMIN_SESSION_POLICY: Readonly<AdminSessionPolicy> = Object.freeze({
  idleTtlMs: 30 * 60 * 1000,
  absoluteTtlMs: 8 * 60 * 60 * 1000,
  rotationIntervalMs: 15 * 60 * 1000,
  tokenBytes: 32
});

export interface AdminSessionRuntime {
  now(): Date;
  randomToken(byteLength: number): string;
  digest(value: string): Promise<string>;
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

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
}

export function randomOpaqueToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

export async function digestOpaqueToken(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}

function defaultRuntime(): AdminSessionRuntime {
  return {
    now: () => new Date(),
    randomToken: randomOpaqueToken,
    digest: digestOpaqueToken
  };
}

function cloneSession(session: AdminSessionRecord): AdminSessionRecord {
  return { ...session };
}

function publicSession(session: AdminSessionRecord): AdminSession {
  return {
    id: session.id,
    principalId: session.principalId,
    role: session.role,
    createdAt: session.createdAt,
    rotatedAt: session.rotatedAt,
    lastSeenAt: session.lastSeenAt,
    expiresAt: session.expiresAt,
    absoluteExpiresAt: session.absoluteExpiresAt,
    authenticationMethod: session.authenticationMethod,
    rotationCounter: session.rotationCounter,
    ...(session.elevatedAt ? { elevatedAt: session.elevatedAt } : {}),
    ...(session.revokedAt ? { revokedAt: session.revokedAt } : {})
  };
}

function expiryAt(now: Date, absoluteExpiresAt: string, idleTtlMs: number): string {
  return new Date(Math.min(
    now.getTime() + idleTtlMs,
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
  if (Object.values(policy).some(value => !Number.isSafeInteger(value) || value <= 0)) {
    throw new Error('ADMIN_SESSION_POLICY_INVALID');
  }
  if (policy.tokenBytes < 32 || policy.tokenBytes > 64) throw new Error('ADMIN_SESSION_POLICY_INVALID');
}

export class InMemorySessionStore implements SessionStore {
  readonly #byId = new Map<string, AdminSessionRecord>();
  readonly #idByDigest = new Map<string, string>();

  async getByTokenDigest(tokenDigest: string): Promise<AdminSessionRecord | null> {
    const id = this.#idByDigest.get(tokenDigest);
    const session = id ? this.#byId.get(id) : null;
    return session ? cloneSession(session) : null;
  }

  async put(session: AdminSessionRecord): Promise<void> {
    const previous = this.#byId.get(session.id);
    if (previous) this.#idByDigest.delete(previous.tokenDigest);
    const copy = cloneSession(session);
    this.#byId.set(copy.id, copy);
    if (!copy.revokedAt) this.#idByDigest.set(copy.tokenDigest, copy.id);
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
    this.#idByDigest.delete(session.tokenDigest);
    this.#byId.set(session.id, { ...session, revokedAt });
    return true;
  }

  async revokePrincipal(principalId: string, revokedAt: string): Promise<number> {
    let revoked = 0;
    for (const session of this.#byId.values()) {
      if (session.principalId !== principalId || session.revokedAt) continue;
      this.#idByDigest.delete(session.tokenDigest);
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
      runtime?: Partial<AdminSessionRuntime>;
    } = {}
  ) {
    this.#store = store;
    this.#policy = { ...DEFAULT_ADMIN_SESSION_POLICY, ...(options.policy || {}) };
    validatePolicy(this.#policy);
    this.#runtime = { ...defaultRuntime(), ...(options.runtime || {}) };
  }

  now(): Date {
    return this.#runtime.now();
  }

  async issue(
    principal: AdminPrincipal,
    authenticationMethod: AdminAuthenticationMethod
  ): Promise<AdminSessionGrant> {
    if (!principal.enabled) throw new Error('ADMIN_PRINCIPAL_DISABLED');
    if (ADMIN_MODE === 'owner-only' && principal.role !== 'owner') {
      throw new Error('ADMIN_ROLE_DISABLED');
    }
    const now = this.now();
    const sessionToken = `adm_${this.#runtime.randomToken(this.#policy.tokenBytes)}`;
    const csrfToken = `csrf_${this.#runtime.randomToken(this.#policy.tokenBytes)}`;
    const absoluteExpiresAt = new Date(now.getTime() + this.#policy.absoluteTtlMs).toISOString();
    const record: AdminSessionRecord = {
      id: `ses_${this.#runtime.randomToken(16)}`,
      tokenDigest: await this.#runtime.digest(sessionToken),
      csrfDigest: await this.#runtime.digest(csrfToken),
      principalId: principal.id,
      role: principal.role,
      createdAt: now.toISOString(),
      rotatedAt: now.toISOString(),
      lastSeenAt: now.toISOString(),
      expiresAt: expiryAt(now, absoluteExpiresAt, this.#policy.idleTtlMs),
      absoluteExpiresAt,
      authenticationMethod,
      rotationCounter: 0
    };
    await this.#store.put(record);
    return {
      session: publicSession(record),
      sessionToken,
      csrfToken,
      setCookie: cookieFor(sessionToken, record.expiresAt, now),
      csrfHeaderName: ADMIN_CSRF_HEADER_NAME
    };
  }

  async inspect(sessionToken: string): Promise<AdminSessionRecord | null> {
    if (!sessionToken) return null;
    const tokenDigest = await this.#runtime.digest(sessionToken);
    const record = await this.#store.getByTokenDigest(tokenDigest);
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
    const expiresAt = expiryAt(now, record.absoluteExpiresAt, this.#policy.idleTtlMs);
    if (!rotationDue) {
      const next = { ...record, lastSeenAt: now.toISOString(), expiresAt };
      if (!await this.#store.replace(record.tokenDigest, next)) {
        throw new Error('ADMIN_SESSION_UPDATE_CONFLICT');
      }
      return {
        session: publicSession(next),
        setCookie: cookieFor(sessionToken, expiresAt, now)
      };
    }

    const nextToken = `adm_${this.#runtime.randomToken(this.#policy.tokenBytes)}`;
    const nextCsrf = `csrf_${this.#runtime.randomToken(this.#policy.tokenBytes)}`;
    const next: AdminSessionRecord = {
      ...record,
      tokenDigest: await this.#runtime.digest(nextToken),
      csrfDigest: await this.#runtime.digest(nextCsrf),
      rotatedAt: now.toISOString(),
      lastSeenAt: now.toISOString(),
      expiresAt,
      rotationCounter: record.rotationCounter + 1
    };
    if (!await this.#store.replace(record.tokenDigest, next)) {
      throw new Error('ADMIN_SESSION_ROTATION_CONFLICT');
    }
    return {
      session: publicSession(next),
      setCookie: cookieFor(nextToken, expiresAt, now),
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
