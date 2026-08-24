import type { StoredWebProject, WebBackupRecord, WebProjectRecord } from './webDatabaseProtocol';
import { getWebDatabaseClient, type WebDatabaseClient } from './webDatabaseClient';
import {
  importWebProjectFiles,
  deleteWebProjectJsonFiles,
  recoverWebDirectoryHandle,
  readWebProjectDirectory,
  selectWebDirectoryProject,
  supportsWebDirectoryProjects,
  writeWebProjectDirectory,
  type WebDirectoryPermissionStatus,
  type PermissionDirectoryHandle
} from './webFileSystem';
import {
  captureWebImageBackup,
  collectWebImageReferences,
  deleteWebImageBackup,
  hydrateWebImages,
  inspectWebImageBackup,
  readWebImageBackup,
  restoreWebImageAssets,
  restoreWebImageBackup
} from './webImageStore';
import {
  buildWebBackupArchive,
  webBackupArchiveName
} from './webBackupArchive';
import type { ImportedWebBackupArchive } from './webBackupImport';
import { webProjectDir, type WebProjectSession } from '../webProject';

interface ProjectContext {
  session: WebProjectSession;
  directoryHandle?: PermissionDirectoryHandle;
  directoryPermissionStatus: WebDirectoryPermissionStatus;
}

export interface WebProjectSaveInput {
  projectDir: string;
  settings: WebProjectRecord;
  zones: WebProjectRecord[];
  points: WebProjectRecord[];
}

export interface WebProjectSaveResult {
  projectDir: string;
  projectModifiedTime: number;
  storageFormat: 'sqlite';
  jsonFilesExist: boolean;
  sqliteDatabaseExists: true;
  mirrorWarning?: string;
}

function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

function projectIdFromDir(projectDir: string): string {
  const prefix = 'web://project/';
  if (!projectDir.startsWith(prefix)) return '';
  try {
    return decodeURIComponent(projectDir.slice(prefix.length));
  } catch {
    return '';
  }
}

function toStoredProject(session: WebProjectSession): StoredWebProject {
  return {
    projectId: session.projectId,
    label: session.label,
    modifiedAt: session.modifiedAt,
    sourceKind: session.sourceKind,
    settings: clone(session.settings),
    zones: clone(session.zones),
    points: clone(session.points)
  };
}

function toSession(project: StoredWebProject): WebProjectSession {
  return {
    projectId: project.projectId,
    projectDir: webProjectDir(project.projectId),
    label: project.label,
    modifiedAt: project.modifiedAt,
    sourceKind: project.sourceKind,
    settings: clone(project.settings),
    zones: clone(project.zones),
    points: clone(project.points)
  };
}

export class WebProjectRepository {
  readonly #contexts = new Map<string, ProjectContext>();
  #activeProjectId = '';

  async database(): Promise<WebDatabaseClient> {
    return getWebDatabaseClient();
  }

  activeProjectId(): string {
    return this.#activeProjectId;
  }

  activeContext(): ProjectContext | null {
    return this.#contexts.get(this.#activeProjectId) || null;
  }

  directoryHandle(projectDir = ''): PermissionDirectoryHandle | undefined {
    const projectId = projectIdFromDir(projectDir) || this.#activeProjectId;
    const context = this.#contexts.get(projectId);
    return context?.directoryPermissionStatus === 'granted' ? context.directoryHandle : undefined;
  }

  directoryPermissionStatus(projectDir = ''): WebDirectoryPermissionStatus {
    const projectId = projectIdFromDir(projectDir) || this.#activeProjectId;
    return this.#contexts.get(projectId)?.directoryPermissionStatus || 'missing';
  }

  hasDirectoryMirror(projectDir = ''): boolean {
    return Boolean(this.directoryHandle(projectDir));
  }

  async choose(makeActive = true): Promise<WebProjectSession | null> {
    const database = await this.database();
    let context: ProjectContext | null = null;

    if (supportsWebDirectoryProjects()) {
      const selection = await selectWebDirectoryProject();
      if (!selection) return null;
      const existing = await database.getProject(selection.session.projectId);
      const useExisting = Boolean(existing && existing.modifiedAt > selection.session.modifiedAt && !selection.created);
      const session = useExisting && existing ? toSession(existing) : selection.session;
      if (!useExisting) await database.putProject(toStoredProject(session));
      if (selection.created) await writeWebProjectDirectory(selection.directoryHandle, session);
      context = {
        session,
        directoryHandle: selection.directoryHandle,
        directoryPermissionStatus: 'granted'
      };
    } else {
      const session = await importWebProjectFiles();
      if (!session) return null;
      await database.putProject(toStoredProject(session));
      context = { session, directoryPermissionStatus: 'unsupported' };
    }

    this.#contexts.set(context.session.projectId, context);
    if (makeActive) this.#activeProjectId = context.session.projectId;
    return clone(context.session);
  }

  async load(projectDir: string, preferredFormat: 'auto' | 'sqlite' | 'json' = 'auto'): Promise<WebProjectSession | null> {
    const projectId = projectIdFromDir(projectDir);
    if (!projectId) return null;
    const existingContext = this.#contexts.get(projectId);
    const recovered = await recoverWebDirectoryHandle(projectId, false);
    const directoryHandle = recovered.directoryHandle || existingContext?.directoryHandle;
    const directoryPermissionStatus = recovered.directoryHandle
      ? recovered.status
      : existingContext?.directoryPermissionStatus || recovered.status;
    const readableDirectoryHandle = directoryPermissionStatus === 'granted'
      ? directoryHandle
      : undefined;
    const directorySession = preferredFormat === 'json' && readableDirectoryHandle
      ? await readWebProjectDirectory(readableDirectoryHandle, projectId)
      : null;
    const project = directorySession ? null : await (await this.database()).getProject(projectId);
    const fallbackDirectory = !project && !directorySession && readableDirectoryHandle
      ? await readWebProjectDirectory(readableDirectoryHandle, projectId)
      : null;
    const session = directorySession || fallbackDirectory || (project ? toSession(project) : null);
    if (!session) return null;
    this.#contexts.set(projectId, {
      session,
      directoryPermissionStatus,
      ...(readableDirectoryHandle ? { directoryHandle: readableDirectoryHandle } : {})
    });
    this.#activeProjectId = projectId;
    return clone(session);
  }

  async hasDatabaseProject(projectDir: string): Promise<boolean> {
    const projectId = projectIdFromDir(projectDir);
    return Boolean(projectId && await (await this.database()).getProject(projectId));
  }

  async deleteDatabaseProject(projectDir: string): Promise<boolean> {
    const projectId = projectIdFromDir(projectDir);
    if (!projectId) return false;
    return (await (await this.database()).deleteProject(projectId)).deleted;
  }

  async deleteDirectoryMirror(projectDir: string): Promise<number> {
    const handle = this.directoryHandle(projectDir);
    if (!handle) return 0;
    return deleteWebProjectJsonFiles(handle);
  }

  async save(input: WebProjectSaveInput): Promise<WebProjectSaveResult> {
    const projectId = projectIdFromDir(input.projectDir);
    if (!projectId) throw new Error('浏览器项目标识无效。');
    const context = this.#contexts.get(projectId);
    const existing = await (await this.database()).getProject(projectId);
    const modifiedAt = Date.now();
    const project: StoredWebProject = {
      projectId,
      label: context?.session.label || existing?.label || '浏览器本地项目',
      modifiedAt,
      sourceKind: context?.session.sourceKind || existing?.sourceKind || 'opfs',
      settings: clone(input.settings),
      zones: clone(input.zones),
      points: clone(input.points)
    };
    await (await this.database()).putProject(project);

    let mirrorWarning = '';
    if (context?.directoryHandle) {
      try {
        await writeWebProjectDirectory(context.directoryHandle, project);
      } catch (error) {
        mirrorWarning = error instanceof Error ? error.message : '项目目录镜像写入失败。';
      }
    }

    const session = toSession(project);
    this.#contexts.set(projectId, {
      session,
      directoryPermissionStatus: context?.directoryPermissionStatus || 'missing',
      ...(context?.directoryHandle ? { directoryHandle: context.directoryHandle } : {})
    });
    this.#activeProjectId = projectId;
    return {
      projectDir: session.projectDir,
      projectModifiedTime: modifiedAt,
      storageFormat: 'sqlite',
      jsonFilesExist: Boolean(context?.directoryHandle),
      sqliteDatabaseExists: true,
      ...(mirrorWarning ? { mirrorWarning } : {})
    };
  }

  async mirrorActiveProject(): Promise<void> {
    const context = this.activeContext();
    if (!context?.directoryHandle) return;
    const project = await (await this.database()).getProject(context.session.projectId);
    if (!project) return;
    await writeWebProjectDirectory(context.directoryHandle, project);
  }

  async createBackup(projectDir: string, label = 'manual'): Promise<WebBackupRecord> {
    const projectId = projectIdFromDir(projectDir);
    if (!projectId) throw new Error('浏览器项目标识无效。');
    const database = await this.database();
    const backup = await database.createBackup(projectId, label);
    const stored = await database.getBackup(backup.id);
    const snapshot = stored?.snapshot && typeof stored.snapshot === 'object' && !Array.isArray(stored.snapshot)
      ? stored.snapshot as WebProjectRecord
      : {};
    const points = Array.isArray(snapshot.points) ? snapshot.points as WebProjectRecord[] : [];
    try {
      const captured = await captureWebImageBackup(
        backup.id,
        collectWebImageReferences(points),
        this.directoryHandle(projectDir)
      );
      return {
        ...backup,
        imageCount: captured.entries.length,
        missingImageCount: captured.missingReferences.length
      };
    } catch (error) {
      await database.deleteBackups([backup.id]);
      await deleteWebImageBackup(backup.id);
      throw error;
    }
  }

  async listBackups(projectDir: string): Promise<WebBackupRecord[]> {
    const projectId = projectIdFromDir(projectDir);
    if (!projectId) return [];
    return (await this.database()).listBackups(projectId);
  }

  async deleteBackupsByName(projectDir: string, names: string[]): Promise<number> {
    const wanted = new Set(names);
    const backups = await this.listBackups(projectDir);
    const ids = backups
      .filter(item => wanted.has(item.name))
      .map(item => item.id)
      .filter(Boolean);
    if (!ids.length) return 0;
    const deleted = (await (await this.database()).deleteBackups(ids)).deleted;
    await Promise.all(ids.map(id => deleteWebImageBackup(id)));
    return deleted;
  }

  async inspectBackup(projectDir: string, name: string): Promise<WebProjectRecord | null> {
    const backup = (await this.listBackups(projectDir)).find(item => item.name === name);
    if (!backup?.id) return null;
    return (await (await this.database()).getBackup(backup.id)) as WebProjectRecord | null;
  }

  async inspectBackupImages(projectDir: string, name: string) {
    const backup = (await this.listBackups(projectDir)).find(item => item.name === name);
    return backup?.id
      ? inspectWebImageBackup(backup.id)
      : { entries: [], missingReferences: [] };
  }

  async exportBackupArchive(projectDir: string, name: string) {
    const backup = (await this.listBackups(projectDir)).find(item => item.name === name);
    if (!backup?.id) throw new Error('未找到所选浏览器备份。');
    const stored = await (await this.database()).getBackup(backup.id);
    const snapshot = stored?.snapshot && typeof stored.snapshot === 'object' && !Array.isArray(stored.snapshot)
      ? stored.snapshot as WebProjectRecord
      : {};
    const images = await readWebImageBackup(backup.id);
    const imageSummary = await inspectWebImageBackup(backup.id);
    return {
      blob: await buildWebBackupArchive({
        backup,
        snapshot,
        images,
        missingImageReferences: imageSummary.missingReferences
      }),
      fileName: webBackupArchiveName(backup.name),
      imageCount: images.length,
      missingImageCount: imageSummary.missingReferences.length
    };
  }

  async #restoreSnapshot(
    projectDir: string,
    name: string,
    source: WebProjectRecord,
    restoreImages: (directoryHandle?: PermissionDirectoryHandle) => Promise<{
      restored: number;
      skipped: number;
      entries: number;
    }>,
    missingImageReferences: string[]
  ): Promise<WebProjectRecord> {
    const projectId = projectIdFromDir(projectDir);
    if (!projectId) throw new Error('浏览器项目标识无效。');
    const safetyBackup = await this.createBackup(projectDir, 'pre_restore');
    const sourceKind = ['directory', 'import', 'opfs'].includes(String(source.sourceKind || ''))
      ? source.sourceKind as StoredWebProject['sourceKind']
      : 'opfs';
    const restored: StoredWebProject = {
      projectId,
      label: String(source.label || this.#contexts.get(projectId)?.session.label || '浏览器本地项目'),
      modifiedAt: Date.now(),
      sourceKind,
      settings: clone(source.settings && typeof source.settings === 'object' ? source.settings as WebProjectRecord : {}),
      zones: clone(Array.isArray(source.zones) ? source.zones as WebProjectRecord[] : []),
      points: clone(Array.isArray(source.points) ? source.points as WebProjectRecord[] : [])
    };
    await (await this.database()).putProject(restored);
    const context = this.#contexts.get(projectId);
    const session = toSession(restored);
    this.#contexts.set(projectId, {
      session,
      directoryPermissionStatus: context?.directoryPermissionStatus || 'missing',
      ...(context?.directoryHandle ? { directoryHandle: context.directoryHandle } : {})
    });
    const warnings: string[] = [];
    let restoredDirectoryHandle = context?.directoryPermissionStatus === 'granted'
      ? context.directoryHandle
      : undefined;
    let hasJsonStorage = false;
    if (restoredDirectoryHandle) {
      try {
        await writeWebProjectDirectory(restoredDirectoryHandle, restored);
        hasJsonStorage = true;
      } catch {
        warnings.push('项目目录权限不可用，已恢复浏览器数据库，但未写回 JSON 镜像。');
        restoredDirectoryHandle = undefined;
        this.#contexts.set(projectId, { session, directoryPermissionStatus: 'denied' });
      }
    }
    const imageRestore = await restoreImages(restoredDirectoryHandle);
    await hydrateWebImages(collectWebImageReferences(restored.points), restoredDirectoryHandle);
    if (missingImageReferences.length) {
      warnings.push(`创建备份时有 ${missingImageReferences.length} 个图片引用无法读取。`);
    }
    if (imageRestore.skipped) {
      warnings.push(`有 ${imageRestore.skipped} 张目录图片因目录权限不可用而未写回。`);
    }
    return {
      backupName: name,
      restoredFileCount: 3 + imageRestore.restored,
      hasSqliteStorage: true,
      hasJsonStorage,
      restoredImageCount: imageRestore.restored,
      skippedBackupEntries: imageRestore.skipped + missingImageReferences.length,
      safetyBackupFile: safetyBackup.name,
      warnings
    };
  }

  async restoreBackup(projectDir: string, name: string): Promise<WebProjectRecord> {
    const backup = await this.inspectBackup(projectDir, name);
    const snapshot = backup?.snapshot;
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
      throw new Error('所选浏览器备份无法读取。');
    }
    const backupId = String(backup.id || '');
    const imageSummary = await inspectWebImageBackup(backupId);
    return this.#restoreSnapshot(
      projectDir,
      name,
      snapshot as WebProjectRecord,
      directoryHandle => restoreWebImageBackup(backupId, directoryHandle),
      imageSummary.missingReferences
    );
  }

  async restoreImportedBackup(
    projectDir: string,
    archive: ImportedWebBackupArchive
  ): Promise<WebProjectRecord> {
    return this.#restoreSnapshot(
      projectDir,
      archive.fileName,
      archive.snapshot,
      directoryHandle => restoreWebImageAssets(archive.images, directoryHandle),
      archive.manifest.missingImageReferences
    );
  }
}
