import type {
  PlatformCommand,
  PlatformNoPayloadCommand,
  PlatformResponse
} from '../../../shared/types/platform';
import {
  selectAndInspectWebBackupArchive,
  type ImportedWebBackupArchive
} from './webBackupImport';
import type { WebProjectRepository } from './webProjectRepository';
import {
  asRecord,
  downloadBlob,
  failure,
  failureFromError,
  success,
  type UnknownRecord
} from './webPlatformSupport';
import type { WebWorkspaceAccess } from './webWorkspaceAccess';

const EXTERNAL_BACKUP_IMPORT_TTL = 15 * 60 * 1000;

export interface WebBackupCommands {
  readonly chooseDir: PlatformNoPayloadCommand;
  readonly create: PlatformCommand;
  readonly inspectRestore: PlatformCommand;
  readonly restore: PlatformCommand;
  readonly importArchive: PlatformCommand;
  readonly restoreImported: PlatformCommand;
  readonly listExpired: PlatformCommand;
  readonly keepExpired: PlatformCommand;
  readonly deleteExpired: PlatformCommand;
}

export function createWebBackupCommands(
  repository: WebProjectRepository,
  access: WebWorkspaceAccess
): WebBackupCommands {
  let pendingExternalBackup: {
    token: string;
    projectDir: string;
    expiresAt: number;
    archive: ImportedWebBackupArchive;
  } | null = null;

  async function chooseDirectory(): Promise<PlatformResponse<UnknownRecord>> {
    return success({ canceled: false, backupDir: 'web://downloads', label: '浏览器下载与 OPFS 备份' });
  }

  async function createBackup(payload?: unknown): Promise<PlatformResponse<UnknownRecord>> {
    const source = asRecord(payload);
    const projectDir = String(source.projectDir || '');
    const label = String(source.label || 'manual');
    try {
      access.requireSave();
      const backup = await repository.createBackup(projectDir, label);
      let filePath = backup.name;
      if (String(source.backupDir || '') === 'web://downloads') {
        const archive = await repository.exportBackupArchive(projectDir, backup.name);
        await downloadBlob(archive.blob, archive.fileName);
        filePath = archive.fileName;
      }
      return success({ filePath, ...backup });
    } catch (error) {
      return failureFromError(error, 'WEB_BACKUP_CREATE_FAILED', '浏览器备份无法创建。');
    }
  }

  async function inspectBackup(payload?: unknown): Promise<PlatformResponse<UnknownRecord>> {
    const source = asRecord(payload);
    try {
      const projectDir = String(source.projectDir || '');
      const backupName = String(source.backupName || '');
      const backup = await repository.inspectBackup(projectDir, backupName);
      if (!backup) return failure('WEB_BACKUP_NOT_FOUND', '未找到所选浏览器备份。');
      const snapshot = asRecord(backup.snapshot);
      const imageSummary = await repository.inspectBackupImages(projectDir, backupName);
      return success({
        ok: true,
        backupName: String(backup.name || backupName),
        restoreFileCount: 3 + imageSummary.entries.length,
        hasSqliteStorage: true,
        hasJsonStorage: Boolean(snapshot.settings || snapshot.zones || snapshot.points),
        imageCount: imageSummary.entries.length,
        missingImageCount: imageSummary.missingReferences.length,
        skippedBackupEntries: imageSummary.missingReferences.length,
        createsSafetyBackup: true,
        warnings: imageSummary.missingReferences.length
          ? [`创建备份时有 ${imageSummary.missingReferences.length} 个图片引用无法读取。`]
          : []
      });
    } catch (error) {
      return failureFromError(error, 'WEB_BACKUP_INSPECT_FAILED', '浏览器备份无法检查。');
    }
  }

  async function restoreBackup(payload?: unknown): Promise<PlatformResponse<UnknownRecord>> {
    const source = asRecord(payload);
    if (source.confirmRestore !== true) {
      return failure('WEB_BACKUP_CONFIRM_REQUIRED', '恢复备份需要明确确认。');
    }
    try {
      access.requireSave();
      return success(await repository.restoreBackup(
        String(source.projectDir || ''),
        String(source.backupName || '')
      ));
    } catch (error) {
      return failureFromError(error, 'WEB_BACKUP_RESTORE_FAILED', '浏览器备份无法恢复。');
    }
  }

  async function importExternalBackup(payload?: unknown): Promise<PlatformResponse<UnknownRecord>> {
    try {
      access.requireSave();
      const projectDir = String(asRecord(payload).projectDir || '');
      if (!projectDir || repository.activeContext()?.session.projectDir !== projectDir) {
        return failure('WEB_PROJECT_NOT_SELECTED', '请先打开当前项目，再导入外部备份。');
      }
      const archive = await selectAndInspectWebBackupArchive();
      if (!archive) return success({ canceled: true });
      const token = crypto.randomUUID();
      pendingExternalBackup = {
        token,
        projectDir,
        expiresAt: Date.now() + EXTERNAL_BACKUP_IMPORT_TTL,
        archive
      };
      const snapshot = asRecord(archive.snapshot);
      return success({
        canceled: false,
        ok: true,
        importToken: token,
        backupName: archive.fileName,
        sourceProjectLabel: archive.manifest.projectLabel,
        sourceGeneratedAt: archive.manifest.generatedAt,
        archiveBytes: archive.archiveBytes,
        uncompressedBytes: archive.uncompressedBytes,
        restoreFileCount: 3 + archive.images.length,
        imageCount: archive.images.length,
        missingImageCount: archive.manifest.missingImageReferences.length,
        zoneCount: Array.isArray(snapshot.zones) ? snapshot.zones.length : 0,
        pointCount: Array.isArray(snapshot.points) ? snapshot.points.length : 0,
        hasSqliteStorage: true,
        hasJsonStorage: true,
        skippedBackupEntries: archive.manifest.missingImageReferences.length,
        createsSafetyBackup: true,
        warnings: archive.warnings
      });
    } catch (error) {
      pendingExternalBackup = null;
      return failureFromError(error, 'WEB_BACKUP_IMPORT_FAILED', '外部浏览器备份无法读取。');
    }
  }

  async function restoreImportedBackup(payload?: unknown): Promise<PlatformResponse<UnknownRecord>> {
    const source = asRecord(payload);
    if (source.confirmRestore !== true) {
      return failure('WEB_BACKUP_CONFIRM_REQUIRED', '恢复外部备份需要明确确认。');
    }
    const pending = pendingExternalBackup;
    if (!pending
      || pending.token !== String(source.importToken || '')
      || pending.projectDir !== String(source.projectDir || '')
      || pending.expiresAt <= Date.now()) {
      pendingExternalBackup = null;
      return failure('WEB_BACKUP_IMPORT_EXPIRED', '外部备份预览已失效，请重新选择并检测 ZIP。');
    }
    try {
      access.requireSave();
      const result = await repository.restoreImportedBackup(pending.projectDir, pending.archive);
      pendingExternalBackup = null;
      return success(result);
    } catch (error) {
      return failureFromError(error, 'WEB_BACKUP_IMPORT_RESTORE_FAILED', '外部浏览器备份无法恢复。');
    }
  }

  async function listExpiredBackups(): Promise<PlatformResponse<UnknownRecord>> {
    return success({ items: [], policy: 'manual-only' });
  }

  async function keepExpiredBackups(): Promise<PlatformResponse<UnknownRecord>> {
    return success({ kept: 0, policy: 'manual-only' });
  }

  async function deleteExpiredBackups(payload?: unknown): Promise<PlatformResponse<UnknownRecord>> {
    const source = asRecord(payload);
    const names = Array.isArray(source.paths) ? source.paths.map(String) : [];
    try {
      access.requireSave();
      return success({
        deleted: await repository.deleteBackupsByName(String(source.projectDir || ''), names)
      });
    } catch (error) {
      return failure(
        'WEB_BACKUP_DELETE_FAILED',
        error instanceof Error ? error.message : '浏览器备份无法删除。'
      );
    }
  }

  return Object.freeze({
    chooseDir: chooseDirectory,
    create: createBackup,
    inspectRestore: inspectBackup,
    restore: restoreBackup,
    importArchive: importExternalBackup,
    restoreImported: restoreImportedBackup,
    listExpired: listExpiredBackups,
    keepExpired: keepExpiredBackups,
    deleteExpired: deleteExpiredBackups
  });
}
