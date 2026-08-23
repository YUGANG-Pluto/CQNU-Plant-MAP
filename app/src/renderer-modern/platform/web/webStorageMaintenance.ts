import type { PlatformResponse } from '../../../shared/types/platform';
import { collectWebImageReferences } from './webImageStore';
import type { WebProjectRepository } from './webProjectRepository';
import {
  asRecord,
  downloadBlob,
  failure,
  success,
  type UnknownRecord
} from './webPlatformSupport';

function projectCounts(session: Awaited<ReturnType<WebProjectRepository['load']>>): UnknownRecord {
  const points = session?.points || [];
  return {
    zones: session?.zones.length || 0,
    points: points.length,
    phenologyEntries: points.reduce((total, point) => {
      const entries = [point.phenologyEntries, point.phenology, point.phenologyRecords].find(Array.isArray);
      return total + (Array.isArray(entries) ? entries.length : 0);
    }, 0),
    imageReferences: collectWebImageReferences(points).length,
    taxonomyCandidates: points.reduce((total, point) => (
      total + (Array.isArray(point.taxonomyCandidatesSummary) ? point.taxonomyCandidatesSummary.length : 0)
    ), 0)
  };
}

export function createWebStorageMaintenance(repository: WebProjectRepository) {
  async function inventory(projectDir: string): Promise<UnknownRecord> {
    const databaseExists = await repository.hasDatabaseProject(projectDir);
    const jsonFilesExist = repository.hasDirectoryMirror(projectDir);
    const backups = await repository.listBackups(projectDir);
    let databaseSize = 0;
    if (databaseExists) databaseSize = (await (await repository.database()).exportDatabase()).byteLength;
    return {
      activeStorageFormat: databaseExists ? 'sqlite' : jsonFilesExist ? 'json' : '',
      availableStorageFormats: [databaseExists ? 'sqlite' : '', jsonFilesExist ? 'json' : ''].filter(Boolean),
      databaseExists,
      databaseFile: 'browser-opfs.sqlite3',
      sqliteDatabase: {
        exists: databaseExists,
        name: 'browser-opfs.sqlite3',
        size: databaseSize,
        modifiedAt: new Date().toISOString()
      },
      jsonFilesExist,
      jsonFiles: jsonFilesExist
        ? ['settings.json', 'zones.json', 'points.json'].map(name => ({ name, size: 0 }))
        : [],
      backupFiles: backups.map(item => ({
        name: item.name,
        size: item.size,
        modifiedAt: new Date(item.createdAt).toISOString()
      }))
    };
  }

  async function conversionPreflight(payload?: unknown): Promise<PlatformResponse<UnknownRecord>> {
    const projectDir = String(asRecord(payload).projectDir || '');
    try {
      const session = await repository.load(projectDir);
      const storage = await inventory(projectDir);
      return success({
        ok: Boolean(session),
        status: session ? 'completed' : 'failed',
        ...storage,
        counts: projectCounts(session),
        warnings: session ? [] : ['当前浏览器项目没有可读取的数据源。']
      });
    } catch (error) {
      return failure('WEB_STORAGE_PREFLIGHT_FAILED', error instanceof Error ? error.message : '浏览器存储预检失败。');
    }
  }

  async function listArtifacts(payload?: unknown): Promise<PlatformResponse<UnknownRecord>> {
    try {
      return success(await inventory(String(asRecord(payload).projectDir || '')));
    } catch (error) {
      return failure('WEB_STORAGE_LIST_FAILED', error instanceof Error ? error.message : '浏览器存储清单无法读取。');
    }
  }

  async function deleteArtifacts(payload?: unknown): Promise<PlatformResponse<UnknownRecord>> {
    const source = asRecord(payload);
    const projectDir = String(source.projectDir || '');
    try {
      if (source.deleteSqliteDatabase === true) await repository.deleteDatabaseProject(projectDir);
      if (source.deleteJsonFiles === true) await repository.deleteDirectoryMirror(projectDir);
      const backupNames = Array.isArray(source.backupNames) ? source.backupNames.map(String) : [];
      const deletedBackups = await repository.deleteBackupsByName(projectDir, backupNames);
      const storage = await inventory(projectDir);
      return success({ status: 'completed', deletedBackups, inventory: storage, ...storage });
    } catch (error) {
      return failure('WEB_STORAGE_DELETE_FAILED', error instanceof Error ? error.message : '浏览器存储项目无法删除。');
    }
  }

  async function createSqliteFromJson(payload?: unknown): Promise<PlatformResponse<UnknownRecord>> {
    const projectDir = String(asRecord(payload).projectDir || '');
    try {
      const session = await repository.load(projectDir, 'json');
      if (!session) return failure('WEB_JSON_SOURCE_MISSING', '当前没有可用于创建浏览器 SQLite 主库的 JSON 数据。');
      const backup = await repository.createBackup(projectDir, 'json_turn_sqlite');
      const result = await repository.save({
        projectDir,
        settings: session.settings,
        zones: session.zones,
        points: session.points
      });
      return success({
        status: 'completed',
        activeStorageFormat: 'sqlite',
        databaseExists: true,
        databaseFile: 'browser-opfs.sqlite3',
        jsonFilesKept: repository.hasDirectoryMirror(projectDir),
        backupFile: backup.name,
        counts: projectCounts(session),
        ...result
      });
    } catch (error) {
      return failure('WEB_SQLITE_CREATE_FAILED', error instanceof Error ? error.message : '浏览器 SQLite 主库无法创建。');
    }
  }

  async function exportSqliteToJson(payload?: unknown): Promise<PlatformResponse<UnknownRecord>> {
    const projectDir = String(asRecord(payload).projectDir || '');
    try {
      const session = await repository.load(projectDir, 'sqlite');
      if (!session) return failure('WEB_SQLITE_SOURCE_MISSING', '当前没有可导出的浏览器 SQLite 项目。');
      const backup = await repository.createBackup(projectDir, 'sqlite_turn_json');
      if (repository.hasDirectoryMirror(projectDir)) {
        await repository.mirrorActiveProject();
      } else {
        await downloadBlob(
          new Blob([JSON.stringify({ settings: session.settings, zones: session.zones, points: session.points }, null, 2)], {
            type: 'application/json;charset=utf-8'
          }),
          'cqnu_plant_map_project.json'
        );
      }
      return success({
        status: 'completed',
        activeStorageFormat: 'sqlite',
        databaseExists: true,
        jsonFilesKept: repository.hasDirectoryMirror(projectDir),
        backupFile: backup.name,
        counts: projectCounts(session),
        warnings: repository.hasDirectoryMirror(projectDir)
          ? []
          : ['项目 JSON 已下载；浏览器未持有可写目录权限，因此未创建目录镜像。']
      });
    } catch (error) {
      return failure('WEB_JSON_EXPORT_FAILED', error instanceof Error ? error.message : '浏览器项目 JSON 无法导出。');
    }
  }

  return Object.freeze({
    conversionPreflight,
    listArtifacts,
    deleteArtifacts,
    createSqliteFromJson,
    exportSqliteToJson
  });
}
