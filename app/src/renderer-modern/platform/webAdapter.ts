import type {
  PlatformAdapter,
  PlatformFailure,
  PlatformResponse,
  PlatformSuccess
} from '../../shared/types/platform';
import {
  createWebProjectSession,
  selectWebProjectFiles,
  type WebProjectSession
} from './webProject';

type UnknownRecord = Record<string, unknown>;

let activeSession: WebProjectSession | null = null;

function success<T>(data: T): PlatformSuccess<T> {
  return { ok: true, data };
}

function failure(code: string, message: string): PlatformFailure {
  return { ok: false, error: { code, message } };
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : {};
}

function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

function unsupported(capability: string): () => Promise<PlatformFailure> {
  return async () => failure(
    'UNSUPPORTED_WEB_CAPABILITY',
    `浏览器只读工作区不支持${capability}。请在桌面端完成该操作。`
  );
}

function sanitizeFileName(value: unknown, fallback: string): string {
  const source = String(value || fallback).trim().split(/[\\/]/).pop() || fallback;
  const cleaned = source.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_').slice(0, 120);
  return cleaned || fallback;
}

async function downloadPayload(
  payload: unknown,
  fallbackName: string,
  contentType: string
): Promise<PlatformResponse<UnknownRecord>> {
  const record = asRecord(payload);
  const content = typeof record.content === 'string' ? record.content : '';
  if (!content) return failure('EMPTY_EXPORT_CONTENT', '没有可导出的内容。');
  const fileName = sanitizeFileName(record.defaultPath, fallbackName);
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.rel = 'noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
    return success({ canceled: false, fileName });
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

async function chooseProject(): Promise<PlatformResponse<UnknownRecord>> {
  try {
    const files = await selectWebProjectFiles();
    if (!files.length) return success({ canceled: true });
    activeSession = await createWebProjectSession(files);
    return success({
      canceled: false,
      projectDir: activeSession.projectDir,
      label: activeSession.label
    });
  } catch (error) {
    return failure(
      'WEB_PROJECT_PARSE_FAILED',
      error instanceof Error ? error.message : '本地项目文件无法读取。'
    );
  }
}

async function loadProject(payload?: unknown): Promise<PlatformResponse<UnknownRecord>> {
  const requestedDir = String(asRecord(payload).projectDir || '');
  if (!activeSession || requestedDir !== activeSession.projectDir) {
    return failure('WEB_PROJECT_NOT_SELECTED', '请先选择本地 JSON、CSV 或 GeoJSON 项目文件。');
  }
  return success({
    projectDir: activeSession.projectDir,
    projectModifiedTime: activeSession.modifiedAt,
    storageFormat: 'json',
    jsonFilesExist: true,
    sqliteDatabaseExists: false,
    settings: clone(activeSession.settings),
    zones: clone(activeSession.zones),
    points: clone(activeSession.points),
    webReadOnly: true
  });
}

async function getModifiedTime(): Promise<PlatformResponse<UnknownRecord>> {
  if (!activeSession) return failure('WEB_PROJECT_NOT_SELECTED', '当前没有已加载的浏览器项目。');
  return success({ modifiedTime: activeSession.modifiedAt });
}

async function toggleBrowserFullscreen(): Promise<PlatformResponse<UnknownRecord>> {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
    return success({ fullscreen: Boolean(document.fullscreenElement) });
  } catch (error) {
    return failure(
      'WEB_FULLSCREEN_FAILED',
      error instanceof Error ? error.message : '浏览器无法切换全屏。'
    );
  }
}

async function openBrowserExternal(payload?: unknown): Promise<PlatformResponse<UnknownRecord>> {
  const rawUrl = String(asRecord(payload).url || '').trim();
  try {
    const url = new URL(rawUrl);
    if (!['https:', 'http:'].includes(url.protocol)) {
      return failure('EXTERNAL_URL_NOT_ALLOWED', '仅允许打开 HTTP 或 HTTPS 链接。');
    }
    const opened = window.open(url.href, '_blank', 'noopener,noreferrer');
    if (!opened) return failure('EXTERNAL_URL_BLOCKED', '浏览器已拦截新窗口，请允许后重试。');
    opened.opener = null;
    return success({ opened: true });
  } catch {
    return failure('EXTERNAL_URL_INVALID', '链接地址无效。');
  }
}

export function createWebPlatformAdapter(): PlatformAdapter {
  const unavailableMerge = unsupported('项目合并');
  const unavailableWrite = unsupported('项目写入');
  const unavailableImport = unsupported('记录导入');
  const unavailableSettingsImport = unsupported('设置导入');
  const unavailableImage = unsupported('图片文件管理');
  const unavailableBackup = unsupported('备份与恢复');
  const unavailableLogs = unsupported('本地日志与诊断');
  const unavailableStorage = unsupported('SQLite 存储与转换');
  const unavailableSpecies = unsupported('第三方物种参考查询');

  return Object.freeze({
    runtime: 'web' as const,
    capabilities: Object.freeze({
      readProject: true,
      writeProject: false,
      importRecords: false,
      exportFiles: true,
      sqliteStorage: false,
      backups: false,
      diagnostics: false,
      speciesReference: false,
      externalLinks: true,
      nativeWindow: false,
      readOnly: true
    }),
    project: Object.freeze({
      chooseDir: chooseProject,
      chooseMergeDir: unavailableMerge,
      load: loadProject,
      save: unavailableWrite,
      getModifiedTime,
      importCsv: unavailableImport,
      exportCsv: (payload: unknown) => downloadPayload(payload, 'plant_records.csv', 'text/csv;charset=utf-8'),
      importGeoJson: unavailableImport,
      exportGeoJson: (payload: unknown) => downloadPayload(payload, 'plant_points.geojson', 'application/geo+json;charset=utf-8'),
      exportMarkdown: (payload: unknown) => downloadPayload(payload, 'statistics_summary.md', 'text/markdown;charset=utf-8'),
      exportSvg: (payload: unknown) => downloadPayload(payload, 'heatmap.svg', 'image/svg+xml;charset=utf-8')
    }),
    settings: Object.freeze({
      importJson: unavailableSettingsImport,
      exportJson: (payload: unknown) => downloadPayload(payload, 'statistics_full.json', 'application/json;charset=utf-8')
    }),
    image: Object.freeze({ import: unavailableImage, delete: unavailableImage }),
    backup: Object.freeze({
      chooseDir: unavailableBackup,
      create: unavailableBackup,
      inspectRestore: unavailableBackup,
      restore: unavailableBackup,
      listExpired: unavailableBackup,
      keepExpired: unavailableBackup,
      deleteExpired: unavailableBackup
    }),
    log: Object.freeze({
      report: async () => success({ accepted: true }),
      setLevel: unavailableLogs,
      listRecent: unavailableLogs,
      readLog: unavailableLogs,
      deleteLogs: unavailableLogs,
      cleanup: unavailableLogs,
      exportDiagnostics: unavailableLogs
    }),
    maintenance: Object.freeze({ checkImageRefs: unavailableLogs }),
    storage: Object.freeze({
      conversionPreflight: unavailableStorage,
      listArtifacts: unavailableStorage,
      deleteArtifacts: unavailableStorage,
      createSqliteFromJson: unavailableStorage,
      exportSqliteToJson: unavailableStorage
    }),
    species: Object.freeze({
      referenceQuery: unavailableSpecies,
      suggestTaxonomy: unavailableSpecies,
      imageCompare: unavailableSpecies
    }),
    window: Object.freeze({
      toggleFullscreen: toggleBrowserFullscreen,
      openExternal: openBrowserExternal
    })
  });
}
