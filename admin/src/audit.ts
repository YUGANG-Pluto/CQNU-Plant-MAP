import type { AdminAuditEvent, AuditSink } from './contracts.js';

export const ADMIN_AUDIT_METADATA_KEYS = Object.freeze([
  'releaseVersion',
  'result',
  'provider',
  'method',
  'route',
  'statusCode',
  'reasonCode',
  'role',
  'memberAction',
  'sessionAction',
  'attempt',
  'durationMs'
] as const);

const allowedMetadataKeys = new Set<string>(ADMIN_AUDIT_METADATA_KEYS);
const safeAuditIdentifier = /^[A-Za-z0-9._:-]{1,120}$/;

function sanitizeAuditText(value: string): string {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/(bearer\s+)[A-Za-z0-9._~+/=-]+/gi, '$1[REDACTED]')
    .replace(/\b(password|secret|token|cookie|authorization)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]')
    .replace(/\b[A-Za-z]:\\[^\s,;]+/g, '[LOCAL_PATH_REDACTED]')
    .replace(/\/(?:Users|home)\/[^\s,;]+/g, '[LOCAL_PATH_REDACTED]')
    .replace(/\b[A-Za-z0-9_-]{40,}\b/g, '[REDACTED]')
    .trim()
    .slice(0, 240);
}

export function sanitizeAuditMetadata(
  value: Record<string, unknown>
): AdminAuditEvent['metadata'] {
  const result: AdminAuditEvent['metadata'] = {};
  for (const [key, item] of Object.entries(value)) {
    if (!allowedMetadataKeys.has(key)) continue;
    if (typeof item === 'string') result[key] = sanitizeAuditText(item);
    if (typeof item === 'boolean') result[key] = item;
    if (typeof item === 'number' && Number.isFinite(item)) result[key] = item;
  }
  return result;
}

export class InMemoryAuditSink implements AuditSink {
  readonly #events: AdminAuditEvent[] = [];

  async append(event: AdminAuditEvent): Promise<void> {
    if (!safeAuditIdentifier.test(event.id)
      || !safeAuditIdentifier.test(event.principalId)
      || !safeAuditIdentifier.test(event.requestId)
      || !Number.isFinite(Date.parse(event.occurredAt))) {
      throw new Error('ADMIN_AUDIT_EVENT_INVALID');
    }
    this.#events.push(Object.freeze({
      ...event,
      metadata: Object.freeze(sanitizeAuditMetadata(event.metadata))
    }));
  }

  events(): AdminAuditEvent[] {
    return this.#events.map(event => ({ ...event, metadata: { ...event.metadata } }));
  }
}
