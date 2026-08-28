import type {
  PlatformCommand,
  PlatformNoPayloadCommand,
  PlatformResponse
} from '../../../shared/types/platform';
import {
  collectWebImageReferences,
  hydrateWebImages
} from './webImageStore';
import type { WebProjectRepository } from './webProjectRepository';
import {
  asRecord,
  clone,
  failure,
  failureFromError,
  success,
  type UnknownRecord
} from './webPlatformSupport';
import type { WebWorkspaceAccess } from './webWorkspaceAccess';

interface WebDraftProject {
  modifiedAt: number;
  settings: UnknownRecord;
  zones: UnknownRecord[];
  points: UnknownRecord[];
}

export interface WebProjectCommands {
  readonly chooseDir: PlatformNoPayloadCommand;
  readonly choosePortableDir: PlatformNoPayloadCommand;
  readonly chooseSqliteFile: PlatformNoPayloadCommand;
  readonly chooseJsonFiles: PlatformNoPayloadCommand;
  readonly importCloudSnapshot: PlatformCommand;
  readonly chooseMergeDir: PlatformNoPayloadCommand;
  readonly load: PlatformCommand;
  readonly save: PlatformCommand;
  readonly getModifiedTime: PlatformCommand;
}

export function createWebProjectCommands(
  repository: WebProjectRepository,
  access: WebWorkspaceAccess
): WebProjectCommands {
  const drafts = new Map<string, WebDraftProject>();

  async function chooseProject(): Promise<PlatformResponse<UnknownRecord>> {
    try {
      access.requireRead();
      const session = await repository.choose(true, {
        allowCreate: access.canEdit,
        persist: access.canSave,
        directoryAccessMode: access.canSave ? 'readwrite' : 'read'
      });
      if (!session) return success({ canceled: true });
      return success({
        canceled: false,
        projectDir: session.projectDir,
        label: session.label,
        storageFormat: 'sqlite',
        sourceKind: session.sourceKind,
        externalSqliteImported: session.sourceKind === 'sqlite'
      });
    } catch (error) {
      return failure(
        'WEB_PROJECT_OPEN_FAILED',
        error instanceof Error ? error.message : '浏览器本地项目无法打开。'
      );
    }
  }

  async function choosePortableProject(): Promise<PlatformResponse<UnknownRecord>> {
    try {
      access.requireRead();
      const session = await repository.choose(true, {
        allowCreate: false,
        persist: access.canSave,
        directoryAccessMode: 'read',
        selectionMode: 'portable-folder'
      });
      if (!session) return success({ canceled: true });
      return success({
        canceled: false,
        projectDir: session.projectDir,
        label: session.label,
        storageFormat: 'sqlite',
        portableImport: true,
        sourceKind: session.sourceKind,
        externalSqliteImported: session.sourceKind === 'sqlite'
      });
    } catch (error) {
      return failure(
        'WEB_PROJECT_FOLDER_IMPORT_FAILED',
        error instanceof Error ? error.message : '所选文件夹无法作为浏览器本地项目导入。'
      );
    }
  }

  async function chooseImportedProject(
    selectionMode: 'sqlite-file' | 'json-files'
  ): Promise<PlatformResponse<UnknownRecord>> {
    try {
      access.requireRead();
      const session = await repository.choose(true, {
        allowCreate: false,
        persist: access.canSave,
        directoryAccessMode: 'read',
        selectionMode
      });
      if (!session) return success({ canceled: true });
      return success({
        canceled: false,
        projectDir: session.projectDir,
        label: session.label,
        storageFormat: 'sqlite',
        sourceKind: session.sourceKind,
        externalSqliteImported: session.sourceKind === 'sqlite'
      });
    } catch (error) {
      return failure(
        selectionMode === 'sqlite-file' ? 'WEB_SQLITE_IMPORT_FAILED' : 'WEB_JSON_IMPORT_FAILED',
        error instanceof Error ? error.message : '所选项目文件无法读取。'
      );
    }
  }

  async function chooseMergeProject(): Promise<PlatformResponse<UnknownRecord>> {
    try {
      access.requireRead();
      const session = await repository.choose(false, {
        allowCreate: false,
        persist: false,
        directoryAccessMode: 'read'
      });
      if (!session) return success({ canceled: true });
      return success({ canceled: false, projectDir: session.projectDir, label: session.label });
    } catch (error) {
      return failure(
        'WEB_MERGE_PROJECT_OPEN_FAILED',
        error instanceof Error ? error.message : '待合并的浏览器本地项目无法打开。'
      );
    }
  }

  async function importCloudSnapshot(payload?: unknown): Promise<PlatformResponse<UnknownRecord>> {
    try {
      access.requireRead();
      const source = asRecord(payload);
      const document = asRecord(source.document);
      const metadata = asRecord(document.metadata);
      const snapshot = document.snapshot === null ? null : asRecord(document.snapshot);
      const session = await repository.importCloudProject({
        metadata: {
          id: String(metadata.id || ''),
          name: String(metadata.name || ''),
          revision: Number(metadata.revision || 0),
          formatVersion: 1,
          byteSize: Number(metadata.byteSize || 0),
          contentSha256: String(metadata.contentSha256 || ''),
          createdAt: String(metadata.createdAt || ''),
          updatedAt: String(metadata.updatedAt || '')
        },
        snapshot: snapshot ? {
          formatVersion: 1,
          settings: asRecord(snapshot.settings),
          zones: Array.isArray(snapshot.zones) ? snapshot.zones.filter(item => item && typeof item === 'object') as UnknownRecord[] : [],
          points: Array.isArray(snapshot.points) ? snapshot.points.filter(item => item && typeof item === 'object') as UnknownRecord[] : []
        } : null
      }, access.canSave);
      return success({
        canceled: false,
        projectDir: session.projectDir,
        label: session.label,
        storageFormat: 'sqlite',
        sourceKind: 'cloud',
        cloudProjectId: metadata.id,
        cloudRevision: metadata.revision
      });
    } catch (error) {
      return failureFromError(error, 'WEB_CLOUD_PROJECT_IMPORT_FAILED', '云项目无法载入本地工作副本。');
    }
  }

  async function loadProject(payload?: unknown): Promise<PlatformResponse<UnknownRecord>> {
    const source = asRecord(payload);
    const requestedDir = String(source.projectDir || '');
    const requestedFormat = ['sqlite', 'json'].includes(String(source.storageFormat || ''))
      ? String(source.storageFormat) as 'sqlite' | 'json'
      : 'auto';
    try {
      access.requireRead();
      const session = await repository.load(requestedDir, requestedFormat);
      if (!session) {
        return failure('WEB_PROJECT_NOT_SELECTED', '请先选择浏览器本地项目或可写项目目录。');
      }
      const draft = drafts.get(session.projectDir);
      const effective = draft || session;
      await hydrateWebImages(
        collectWebImageReferences(effective.points),
        repository.directoryHandle(session.projectDir)
      );
      const sqliteDatabaseExists = await repository.hasDatabaseProject(session.projectDir);
      const jsonFilesExist = repository.hasDirectoryMirror(session.projectDir);
      const storageFormat = jsonFilesExist
        && (requestedFormat === 'json' || !sqliteDatabaseExists)
        ? 'json'
        : 'sqlite';
      const directoryPermissionStatus = repository.directoryPermissionStatus(session.projectDir);
      return success({
        projectDir: session.projectDir,
        projectModifiedTime: effective.modifiedAt,
        storageFormat,
        jsonFilesExist,
        sqliteDatabaseExists,
        settings: clone(effective.settings),
        zones: clone(effective.zones),
        points: clone(effective.points),
        webReadOnly: !access.canEdit,
        webDraftOnly: Boolean(draft) || (access.canEdit && !access.canSave),
        webAccessLevel: access.managementAccess?.accessLevel || 'save',
        webStorageMode: 'opfs-sahpool',
        webProjectSourceKind: session.sourceKind,
        webExternalSqliteImported: session.sourceKind === 'sqlite',
        webExternalSqliteSourceUnchanged: session.sourceKind === 'sqlite',
        webDirectoryPermissionStatus: directoryPermissionStatus,
        webDirectoryReconnectRequired: ['prompt', 'denied'].includes(directoryPermissionStatus)
      });
    } catch (error) {
      return failureFromError(error, 'WEB_PROJECT_LOAD_FAILED', '浏览器本地项目无法读取。');
    }
  }

  async function saveProject(payload?: unknown): Promise<PlatformResponse<UnknownRecord>> {
    const source = asRecord(payload);
    try {
      access.requireEdit();
      const projectDir = String(source.projectDir || '');
      const zones = Array.isArray(source.zones)
        ? source.zones.filter(item => item && typeof item === 'object') as UnknownRecord[]
        : [];
      const points = Array.isArray(source.points)
        ? source.points.filter(item => item && typeof item === 'object') as UnknownRecord[]
        : [];
      if (!access.canSave) {
        const modifiedAt = Date.now();
        drafts.set(projectDir, {
          modifiedAt,
          settings: clone(asRecord(source.settings)),
          zones: clone(zones),
          points: clone(points)
        });
        return success({
          projectDir,
          projectModifiedTime: modifiedAt,
          storageFormat: 'sqlite',
          jsonFilesExist: repository.hasDirectoryMirror(projectDir),
          sqliteDatabaseExists: await repository.hasDatabaseProject(projectDir),
          draftOnly: true
        });
      }
      const result = await repository.save({
        projectDir,
        settings: asRecord(source.settings),
        zones,
        points
      });
      drafts.delete(projectDir);
      return success({ ...result });
    } catch (error) {
      return failureFromError(error, 'WEB_PROJECT_SAVE_FAILED', '浏览器本地项目无法保存。');
    }
  }

  async function getModifiedTime(payload?: unknown): Promise<PlatformResponse<UnknownRecord>> {
    try {
      const session = await repository.load(String(asRecord(payload).projectDir || ''));
      if (!session) return failure('WEB_PROJECT_NOT_SELECTED', '当前没有已加载的浏览器项目。');
      return success({ modifiedTime: session.modifiedAt });
    } catch (error) {
      return failure(
        'WEB_PROJECT_TIME_FAILED',
        error instanceof Error ? error.message : '无法读取浏览器项目更新时间。'
      );
    }
  }

  return Object.freeze({
    chooseDir: chooseProject,
    choosePortableDir: choosePortableProject,
    chooseSqliteFile: () => chooseImportedProject('sqlite-file'),
    chooseJsonFiles: () => chooseImportedProject('json-files'),
    importCloudSnapshot,
    chooseMergeDir: chooseMergeProject,
    load: loadProject,
    save: saveProject,
    getModifiedTime
  });
}
