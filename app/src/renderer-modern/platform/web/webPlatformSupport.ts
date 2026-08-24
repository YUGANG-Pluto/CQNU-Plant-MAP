import type {
  PlatformFailure,
  PlatformResponse,
  PlatformSuccess
} from '../../../shared/types/platform';

export type UnknownRecord = Record<string, unknown>;

export function success<T>(data: T): PlatformSuccess<T> {
  return { ok: true, data };
}

export function failure(code: string, message: string): PlatformFailure {
  return { ok: false, error: { code, message } };
}

export function failureFromError(
  error: unknown,
  fallbackCode: string,
  fallbackMessage: string
): PlatformFailure {
  const source = error && typeof error === 'object' ? error as { code?: unknown; message?: unknown } : {};
  const code = source.code === 'WEB_DATABASE_LOCKED' ? 'WEB_DATABASE_LOCKED' : fallbackCode;
  const message = typeof source.message === 'string' && source.message.trim()
    ? source.message
    : fallbackMessage;
  return failure(code, message);
}

export function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : {};
}

export function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

function sanitizeFileName(value: unknown, fallback: string): string {
  const source = String(value || fallback).trim().split(/[\\/]/).pop() || fallback;
  const cleaned = source.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_').slice(0, 120);
  return cleaned || fallback;
}

export async function downloadPayload(
  payload: unknown,
  fallbackName: string,
  contentType: string
): Promise<PlatformResponse<UnknownRecord>> {
  const record = asRecord(payload);
  const content = typeof record.content === 'string' ? record.content : '';
  if (!content) return failure('EMPTY_EXPORT_CONTENT', '没有可导出的内容。');
  const fileName = sanitizeFileName(record.defaultPath, fallbackName);
  return downloadBlob(new Blob([content], { type: contentType }), fileName);
}

export async function downloadBlob(
  blob: Blob,
  fileName: string
): Promise<PlatformResponse<UnknownRecord>> {
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = sanitizeFileName(fileName, 'cqnu-plant-map-export');
    link.rel = 'noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
    return success({ canceled: false, fileName: link.download });
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
