import type { WebProjectSession } from '../webProject';
import { loadWebDatabaseClient } from './webDatabaseLoader';
import {
  assertExternalSqliteFile,
  projectDocumentFromExternalSqlite,
  SQLITE_FILE_PATTERN
} from './webSqliteProject';

export interface ExternalSqliteImportOptions {
  projectId?: string;
  label?: string;
}

function fileLabel(name: string): string {
  return name.replace(/\.(?:db|sqlite|sqlite3)$/i, '').trim() || 'SQLite 本地项目';
}

function projectDir(projectId: string): string {
  return `web://project/${encodeURIComponent(projectId)}`;
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return [...digest].map(value => value.toString(16).padStart(2, '0')).join('');
}

export function isExternalSqliteFile(file: Pick<File, 'name'>): boolean {
  return SQLITE_FILE_PATTERN.test(file.name);
}

export async function importExternalSqliteFile(
  file: File,
  options: ExternalSqliteImportOptions = {}
): Promise<WebProjectSession> {
  const header = await file.slice(0, 16).arrayBuffer();
  assertExternalSqliteFile(file, header);
  const bytes = await file.arrayBuffer();
  const hash = await sha256Hex(bytes);
  const result = await (await loadWebDatabaseClient()).readExternalDatabase(bytes);
  const project = projectDocumentFromExternalSqlite(result);
  const projectId = options.projectId || `sqlite-${hash.slice(0, 32)}`;
  const label = options.label?.trim() || result.project?.label || fileLabel(file.name);
  return {
    projectId,
    projectDir: projectDir(projectId),
    label,
    modifiedAt: file.lastModified || Date.now(),
    sourceKind: 'sqlite',
    settings: project.settings,
    zones: project.zones,
    points: project.points,
    importWarnings: [
      'SQLite 已作为浏览器本地副本导入，原数据库不会被改写。',
      ...result.warnings
    ],
    externalSqliteFormat: result.format
  };
}
