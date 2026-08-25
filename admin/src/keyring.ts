export type AuthTokenPurpose = 'session' | 'csrf' | 'activation' | 'password-reset' | 'password-pepper';

export interface AuthKeyRingConfig {
  activeKeyId: string;
  keys: Readonly<Record<string, string>>;
}

export interface KeyedDigest {
  keyId: string;
  digest: string;
}

const SAFE_KEY_ID = /^[A-Za-z0-9_-]{1,32}$/;

function bytesAsArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach(value => { binary += String.fromCharCode(value); });
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

export function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

export function parseAuthKeyRingConfig(source: string): AuthKeyRingConfig {
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    throw new Error('AUTH_KEYRING_CONFIG_INVALID');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('AUTH_KEYRING_CONFIG_INVALID');
  }
  const record = value as Record<string, unknown>;
  const activeKeyId = String(record.activeKeyId || '');
  const keysValue = record.keys;
  if (!SAFE_KEY_ID.test(activeKeyId)
    || !keysValue
    || typeof keysValue !== 'object'
    || Array.isArray(keysValue)) {
    throw new Error('AUTH_KEYRING_CONFIG_INVALID');
  }
  const keys: Record<string, string> = {};
  for (const [keyId, encoded] of Object.entries(keysValue as Record<string, unknown>)) {
    if (!SAFE_KEY_ID.test(keyId) || typeof encoded !== 'string') {
      throw new Error('AUTH_KEYRING_CONFIG_INVALID');
    }
    const bytes = base64UrlToBytes(encoded);
    if (bytes.byteLength < 32 || bytes.byteLength > 64) {
      throw new Error('AUTH_KEYRING_CONFIG_INVALID');
    }
    keys[keyId] = encoded;
  }
  if (!keys[activeKeyId]) throw new Error('AUTH_KEYRING_CONFIG_INVALID');
  return Object.freeze({ activeKeyId, keys: Object.freeze(keys) });
}

export function randomBase64Url(byteLength = 32): string {
  if (!Number.isSafeInteger(byteLength) || byteLength < 16 || byteLength > 64) {
    throw new Error('AUTH_RANDOM_LENGTH_INVALID');
  }
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

export function constantTimeBytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  const length = Math.max(left.byteLength, right.byteLength);
  let difference = left.byteLength ^ right.byteLength;
  for (let index = 0; index < length; index += 1) {
    difference |= (left[index] || 0) ^ (right[index] || 0);
  }
  return difference === 0;
}

export class AuthKeyRing {
  readonly #config: AuthKeyRingConfig;
  readonly #imported = new Map<string, Promise<CryptoKey>>();

  constructor(config: AuthKeyRingConfig) {
    this.#config = parseAuthKeyRingConfig(JSON.stringify(config));
  }

  activeKeyId(): string {
    return this.#config.activeKeyId;
  }

  hasKey(keyId: string): boolean {
    return Boolean(this.#config.keys[keyId]);
  }

  #key(keyId: string): Promise<CryptoKey> {
    const existing = this.#imported.get(keyId);
    if (existing) return existing;
    const encoded = this.#config.keys[keyId];
    if (!encoded) return Promise.reject(new Error('AUTH_KEY_NOT_FOUND'));
    const imported = crypto.subtle.importKey(
      'raw',
      bytesAsArrayBuffer(base64UrlToBytes(encoded)),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );
    this.#imported.set(keyId, imported);
    return imported;
  }

  async digestBytes(
    purpose: AuthTokenPurpose,
    value: Uint8Array,
    keyId = this.activeKeyId()
  ): Promise<KeyedDigest> {
    const prefix = new TextEncoder().encode(`cqnu-auth-v1:${purpose}\0`);
    const input = new Uint8Array(prefix.byteLength + value.byteLength);
    input.set(prefix, 0);
    input.set(value, prefix.byteLength);
    const signature = await crypto.subtle.sign('HMAC', await this.#key(keyId), bytesAsArrayBuffer(input));
    return { keyId, digest: bytesToBase64Url(new Uint8Array(signature)) };
  }

  digest(
    purpose: AuthTokenPurpose,
    value: string,
    keyId = this.activeKeyId()
  ): Promise<KeyedDigest> {
    return this.digestBytes(purpose, new TextEncoder().encode(value), keyId);
  }

  async verify(
    purpose: AuthTokenPurpose,
    value: string,
    expectedDigest: string,
    keyId: string
  ): Promise<boolean> {
    if (!this.hasKey(keyId)) return false;
    const actual = await this.digest(purpose, value, keyId);
    return constantTimeBytesEqual(
      base64UrlToBytes(actual.digest),
      base64UrlToBytes(expectedDigest)
    );
  }
}
