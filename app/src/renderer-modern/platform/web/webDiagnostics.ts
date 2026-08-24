import type { PlatformResponse } from '../../../shared/types/platform';
import type { WebProjectRepository } from './webProjectRepository';
import {
  asRecord,
  downloadPayload,
  failure,
  success,
  type UnknownRecord
} from './webPlatformSupport';

function sanitizeLogDetails(value: unknown): UnknownRecord {
  const source = asRecord(value);
  const blocked = /(token|path|directory|projectdir|file)/i;
  return Object.fromEntries(Object.entries(source)
    .filter(([key]) => !blocked.test(key))
    .slice(0, 30)
    .map(([key, item]) => [key, typeof item === 'string' ? item.slice(0, 300) : item]));
}

function webLogFileName(timestamp: string): string {
  return `browser-${timestamp.slice(0, 10) || 'session'}.log`;
}

function diagnoseWebLogs(values: unknown[]): UnknownRecord {
  const entries = values.map(asRecord);
  const issues = entries.filter(entry => ['error', 'warn'].includes(String(entry.level || '').toLowerCase()));
  const scopeCounts = new Map<string, number>();
  issues.forEach(entry => {
    const scope = String(entry.scope || 'web');
    scopeCounts.set(scope, (scopeCounts.get(scope) || 0) + 1);
  });
  return {
    status: issues.length ? 'issues' : 'pass',
    issueCount: issues.length,
    totalLines: entries.length,
    hotScopes: [...scopeCounts]
      .map(([scope, count]) => ({ scope, count }))
      .sort((left, right) => right.count - left.count),
    issues: issues.slice(0, 30),
    suggestions: issues.length ? ['按时间读取相关日志，核对最早出现的错误或警告。'] : []
  };
}

export function createWebDiagnostics(repository: WebProjectRepository) {
  let logLevel = 'info';

  async function report(payload?: unknown): Promise<PlatformResponse<UnknownRecord>> {
    const source = asRecord(payload);
    try {
      const database = await repository.database();
      const record = await database.appendLog({
        projectId: repository.activeProjectId(),
        level: String(source.level || 'info'),
        scope: String(source.scope || 'web'),
        message: String(source.message || '').slice(0, 2000),
        details: sanitizeLogDetails(source.details)
      });
      return success({ accepted: true, id: record.id });
    } catch (error) {
      return failure('WEB_LOG_WRITE_FAILED', error instanceof Error ? error.message : '浏览器日志无法写入。');
    }
  }

  async function listRecent(payload?: unknown): Promise<PlatformResponse<UnknownRecord>> {
    try {
      const limit = Math.max(1, Math.min(500, Number(asRecord(payload).limit || 80)));
      const entries = await (await repository.database()).listLogs(repository.activeProjectId(), limit);
      const fileMap = new Map<string, { name: string; size: number; modifiedAt: string }>();
      entries.forEach(entry => {
        const name = webLogFileName(entry.ts);
        const existing = fileMap.get(name) || { name, size: 0, modifiedAt: entry.ts };
        existing.size += JSON.stringify(entry).length + 1;
        if (entry.ts > existing.modifiedAt) existing.modifiedAt = entry.ts;
        fileMap.set(name, existing);
      });
      return success({
        config: { level: logLevel, retentionDays: null, maxFileBytes: null, cleanupPolicy: 'manual-only' },
        files: [...fileMap.values()],
        entries: entries.map(entry => ({ ...entry, fileName: webLogFileName(entry.ts) }))
      });
    } catch (error) {
      return failure('WEB_LOG_LIST_FAILED', error instanceof Error ? error.message : '浏览器日志无法读取。');
    }
  }

  async function readLog(payload?: unknown): Promise<PlatformResponse<UnknownRecord>> {
    const name = String(asRecord(payload).name || '');
    try {
      const entries = (await (await repository.database()).listLogs(repository.activeProjectId(), 500))
        .filter(entry => webLogFileName(entry.ts) === name);
      const content = entries.map(entry => JSON.stringify(entry)).join('\n');
      return success({ name, content, truncated: false, diagnosis: diagnoseWebLogs(entries) });
    } catch (error) {
      return failure('WEB_LOG_READ_FAILED', error instanceof Error ? error.message : '浏览器日志无法读取。');
    }
  }

  async function deleteLogs(payload?: unknown): Promise<PlatformResponse<UnknownRecord>> {
    const names = new Set(Array.isArray(asRecord(payload).names) ? asRecord(payload).names as string[] : []);
    try {
      const database = await repository.database();
      const entries = await database.listLogs(repository.activeProjectId(), 500);
      const ids = entries.filter(entry => names.has(webLogFileName(entry.ts))).map(entry => entry.id);
      return success(await database.deleteLogs(ids));
    } catch (error) {
      return failure('WEB_LOG_DELETE_FAILED', error instanceof Error ? error.message : '浏览器日志无法删除。');
    }
  }

  async function setLevel(payload?: unknown): Promise<PlatformResponse<UnknownRecord>> {
    logLevel = String(asRecord(payload).level || 'info');
    return success({ level: logLevel, retentionDays: null, cleanupPolicy: 'manual-only' });
  }

  async function cleanup(): Promise<PlatformResponse<UnknownRecord>> {
    return success({ deleted: 0, policy: 'manual-only' });
  }

  async function exportDiagnostics(payload?: unknown): Promise<PlatformResponse<UnknownRecord>> {
    return downloadPayload(payload, 'plant_diagnostics.json', 'application/json;charset=utf-8');
  }

  return Object.freeze({
    report,
    setLevel,
    listRecent,
    readLog,
    deleteLogs,
    cleanup,
    exportDiagnostics
  });
}
