import type {
  AdminAuthenticationMethod,
  AdminPrincipal,
  IdentityAdapter,
  IdentityAdapterContext
} from './contracts.js';

export interface VerifiedIdentityAssertion {
  subject: string;
  issuer: string;
  audience: string;
  displayName: string;
  authenticatedAt: string;
  expiresAt: string;
  authenticationMethod: AdminAuthenticationMethod;
}

export interface IdentityAssertionVerifier {
  verify(assertion: unknown): Promise<VerifiedIdentityAssertion | null>;
}

export interface OwnerIdentityAdapterOptions {
  issuer: string;
  audience: string;
  ownerSubject: string;
  ownerPrincipalId: string;
  ownerDisplayName: string;
  verifier: IdentityAssertionVerifier;
  maxAssertionAgeMs?: number;
  clockSkewMs?: number;
}

function validTime(value: string): number | null {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export class OwnerIdentityAdapter implements IdentityAdapter {
  readonly #options: Required<Omit<OwnerIdentityAdapterOptions, 'verifier'>>;
  readonly #verifier: IdentityAssertionVerifier;

  constructor(options: OwnerIdentityAdapterOptions) {
    if (!options.issuer.trim()
      || !options.audience.trim()
      || !options.ownerSubject.trim()
      || !options.ownerPrincipalId.trim()
      || !options.ownerDisplayName.trim()) throw new Error('ADMIN_IDENTITY_CONFIG_INVALID');
    const maxAssertionAgeMs = options.maxAssertionAgeMs ?? 5 * 60 * 1000;
    const clockSkewMs = options.clockSkewMs ?? 60 * 1000;
    if (!Number.isSafeInteger(maxAssertionAgeMs)
      || maxAssertionAgeMs <= 0
      || !Number.isSafeInteger(clockSkewMs)
      || clockSkewMs < 0) throw new Error('ADMIN_IDENTITY_CONFIG_INVALID');
    this.#options = {
      issuer: options.issuer,
      audience: options.audience,
      ownerSubject: options.ownerSubject,
      ownerPrincipalId: options.ownerPrincipalId,
      ownerDisplayName: options.ownerDisplayName,
      maxAssertionAgeMs,
      clockSkewMs
    };
    this.#verifier = options.verifier;
  }

  async verify(assertion: unknown, context: IdentityAdapterContext): Promise<AdminPrincipal | null> {
    const verified = await this.#verifier.verify(assertion);
    if (!verified) return null;
    const now = validTime(context.now);
    const authenticatedAt = validTime(verified.authenticatedAt);
    const expiresAt = validTime(verified.expiresAt);
    if (now === null || authenticatedAt === null || expiresAt === null) return null;
    if (verified.issuer !== this.#options.issuer
      || verified.audience !== this.#options.audience
      || verified.subject !== this.#options.ownerSubject) return null;
    if (authenticatedAt > now + this.#options.clockSkewMs
      || now - authenticatedAt > this.#options.maxAssertionAgeMs
      || expiresAt <= now) return null;
    return {
      id: this.#options.ownerPrincipalId,
      providerSubject: verified.subject,
      displayName: verified.displayName.trim().slice(0, 120) || this.#options.ownerDisplayName,
      role: 'owner',
      enabled: true
    };
  }
}
