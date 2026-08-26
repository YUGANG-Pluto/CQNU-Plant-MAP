import type { PasswordVerifierRecord } from './account-contracts.js';
import {
  AuthKeyRing,
  base64UrlToBytes,
  bytesToBase64Url,
  constantTimeBytesEqual,
  randomBase64Url
} from './keyring.js';

export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 128;
export const PBKDF2_SHA256_ITERATIONS = 600_000;
export const PBKDF2_EDGE_ITERATIONS = 100_000;
export const PBKDF2_BOOTSTRAP_ITERATIONS = PBKDF2_EDGE_ITERATIONS;

const DEFAULT_BLOCKLIST = new Set([
  '000000',
  '111111',
  '123456',
  '12345678',
  'admin',
  'password',
  'qwerty',
  'cqnuplantmap'
]);

function bytesAsArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

export interface PasswordPolicyResult {
  valid: boolean;
  code: 'OK' | 'PASSWORD_TOO_SHORT' | 'PASSWORD_TOO_LONG' | 'PASSWORD_BLOCKED';
}

export interface PasswordHasher {
  hash(password: string, options?: {
    allowWeakBootstrap?: boolean;
    bootstrapIterations?: number;
  }): Promise<PasswordVerifierRecord>;
  verify(password: string, verifier: PasswordVerifierRecord): Promise<boolean>;
  needsRehash(verifier: PasswordVerifierRecord): boolean;
}

export function normalizePassword(password: string): string {
  return password.normalize('NFC');
}

export function validatePasswordPolicy(
  password: string,
  username = '',
  extraBlocked: readonly string[] = []
): PasswordPolicyResult {
  const normalized = normalizePassword(password);
  if (normalized.length < PASSWORD_MIN_LENGTH) {
    return { valid: false, code: 'PASSWORD_TOO_SHORT' };
  }
  if (normalized.length > PASSWORD_MAX_LENGTH) {
    return { valid: false, code: 'PASSWORD_TOO_LONG' };
  }
  const candidate = normalized.toLocaleLowerCase();
  const blocked = new Set([...DEFAULT_BLOCKLIST, ...extraBlocked.map(value => value.toLocaleLowerCase())]);
  if (username) {
    blocked.add(username.toLocaleLowerCase());
    blocked.add(`${username.toLocaleLowerCase()}123`);
  }
  if (blocked.has(candidate)) return { valid: false, code: 'PASSWORD_BLOCKED' };
  return { valid: true, code: 'OK' };
}

async function derivePasswordBytes(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  let key: CryptoKey;
  try {
    key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(normalizePassword(password)),
      'PBKDF2',
      false,
      ['deriveBits']
    );
  } catch (error) {
    throw new Error('PASSWORD_KDF_IMPORT_FAILED', { cause: error });
  }
  let bits: ArrayBuffer;
  try {
    bits = await crypto.subtle.deriveBits({
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: bytesAsArrayBuffer(salt),
      iterations
    }, key, 256);
  } catch (error) {
    throw new Error('PASSWORD_KDF_DERIVE_FAILED', { cause: error });
  }
  return new Uint8Array(bits);
}

export class Pbkdf2PasswordHasher implements PasswordHasher {
  readonly #keyRing: AuthKeyRing;
  readonly #iterations: number;

  constructor(keyRing: AuthKeyRing, iterations = PBKDF2_SHA256_ITERATIONS) {
    if (!Number.isSafeInteger(iterations) || iterations < 100_000 || iterations > 5_000_000) {
      throw new Error('PASSWORD_HASH_POLICY_INVALID');
    }
    this.#keyRing = keyRing;
    this.#iterations = iterations;
  }

  async hash(
    password: string,
    options: { allowWeakBootstrap?: boolean; bootstrapIterations?: number } = {}
  ): Promise<PasswordVerifierRecord> {
    if (!options.allowWeakBootstrap) {
      const policy = validatePasswordPolicy(password);
      if (!policy.valid) throw new Error(policy.code);
    }
    const normalized = normalizePassword(password);
    if (!normalized || normalized.length > PASSWORD_MAX_LENGTH) throw new Error('PASSWORD_LENGTH_INVALID');
    const iterations = options.bootstrapIterations ?? this.#iterations;
    if (!Number.isSafeInteger(iterations)
      || iterations < 100_000
      || iterations > this.#iterations
      || (options.bootstrapIterations !== undefined && !options.allowWeakBootstrap)) {
      throw new Error('PASSWORD_HASH_POLICY_INVALID');
    }
    const salt = base64UrlToBytes(randomBase64Url(16));
    const derived = await derivePasswordBytes(normalized, salt, iterations);
    let keyed;
    try {
      keyed = await this.#keyRing.digestBytes('password-pepper', derived);
    } catch (error) {
      throw new Error('PASSWORD_PEPPER_DIGEST_FAILED', { cause: error });
    }
    return {
      algorithm: 'pbkdf2-hmac-sha256+hmac-sha256',
      iterations,
      salt: bytesToBase64Url(salt),
      digest: keyed.digest,
      keyId: keyed.keyId
    };
  }

  async verify(password: string, verifier: PasswordVerifierRecord): Promise<boolean> {
    try {
      if (verifier.algorithm !== 'pbkdf2-hmac-sha256+hmac-sha256'
        || !Number.isSafeInteger(verifier.iterations)
        || verifier.iterations < 100_000
        || !this.#keyRing.hasKey(verifier.keyId)) return false;
      const derived = await derivePasswordBytes(
        normalizePassword(password).slice(0, PASSWORD_MAX_LENGTH + 1),
        base64UrlToBytes(verifier.salt),
        verifier.iterations
      );
      const actual = await this.#keyRing.digestBytes('password-pepper', derived, verifier.keyId);
      return constantTimeBytesEqual(
        base64UrlToBytes(actual.digest),
        base64UrlToBytes(verifier.digest)
      );
    } catch {
      return false;
    }
  }

  needsRehash(verifier: PasswordVerifierRecord): boolean {
    return verifier.algorithm !== 'pbkdf2-hmac-sha256+hmac-sha256'
      || verifier.iterations < this.#iterations
      || verifier.keyId !== this.#keyRing.activeKeyId();
  }
}
