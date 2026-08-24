import type {
  PlatformAdapter,
  PlatformResponse
} from '../../shared/types/platform';
import type {
  SpeciesReferenceImageCompareInput,
  SpeciesReferenceQueryInput,
  SpeciesReferenceResult,
  TaxonomyReferenceInput,
  TaxonomyReferenceResult
} from '../../shared/types/species-reference';
import { selectWebTextFile } from './web/webFileSystem';
import {
  collectWebImageReferences,
  deleteWebImage,
  hydrateWebImages,
  importWebImage,
  inspectWebImageReferences,
  installWebImageResolver
} from './web/webImageStore';
import { WebProjectRepository } from './web/webProjectRepository';
import {
  compareWebSpeciesImage,
  queryWebSpeciesReference,
  suggestWebTaxonomy
} from './web/webSpeciesReference';
import { createWebDiagnostics } from './web/webDiagnostics';
import {
  asRecord,
  clone,
  downloadBlob,
  downloadPayload,
  failure,
  failureFromError,
  success,
  type UnknownRecord
} from './web/webPlatformSupport';
import { createWebStorageMaintenance } from './web/webStorageMaintenance';
import {
  selectAndInspectWebBackupArchive,
  type ImportedWebBackupArchive
} from './web/webBackupImport';
import {
  assessWebRuntimeCapabilities,
  webRuntimeUnavailableMessage
} from './web/webCapabilities';

const repository = new WebProjectRepository();
const diagnostics = createWebDiagnostics(repository);
const storageMaintenance = createWebStorageMaintenance(repository);
const webCapabilityReport = Object.freeze(assessWebRuntimeCapabilities());
const EXTERNAL_BACKUP_IMPORT_TTL = 15 * 60 * 1000;

let pendingExternalBackup: {
  token: string;
  projectDir: string;
  expiresAt: number;
  archive: ImportedWebBackupArchive;
} | null = null;

function requireWebWorkspace(): void {
  if (!webCapabilityReport.workspaceReady) {
    throw new Error(webRuntimeUnavailableMessage(webCapabilityReport));
  }
}

async function chooseProject(): Promise<PlatformResponse<UnknownRecord>> {
  try {
    requireWebWorkspace();
    const session = await repository.choose(true);
    if (!session) return success({ canceled: true });
    return success({
      canceled: false,
      projectDir: session.projectDir,
      label: session.label,
      storageFormat: 'sqlite'
    });
  } catch (error) {
    return failure(
      'WEB_PROJECT_OPEN_FAILED',
      error instanceof Error ? error.message : '浏览器本地项目无法打开。'
    );
  }
}

async function chooseMergeProject(): Promise<PlatformResponse<UnknownRecord>> {
  try {
    requireWebWorkspace();
    const session = await repository.choose(false);
    if (!session) return success({ canceled: true });
    return success({ canceled: false, projectDir: session.projectDir, label: session.label });
  } catch (error) {
    return failure(
      'WEB_MERGE_PROJECT_OPEN_FAILED',
      error instanceof Error ? error.message : '待合并的浏览器本地项目无法打开。'
    );
  }
}

async function loadProject(payload?: unknown): Promise<PlatformResponse<UnknownRecord>> {
  const source = asRecord(payload);
  const requestedDir = String(source.projectDir || '');
  const requestedFormat = ['sqlite', 'json'].includes(String(source.storageFormat || ''))
    ? String(source.storageFormat) as 'sqlite' | 'json'
    : 'auto';
  try {
    requireWebWorkspace();
    const session = await repository.load(requestedDir, requestedFormat);
    if (!session) {
      return failure('WEB_PROJECT_NOT_SELECTED', '请先选择浏览器本地项目或可写项目目录。');
    }
    await hydrateWebImages(
      collectWebImageReferences(session.points),
      repository.directoryHandle(session.projectDir)
    );
    const sqliteDatabaseExists = await repository.hasDatabaseProject(session.projectDir);
    const jsonFilesExist = repository.hasDirectoryMirror(session.projectDir);
    const storageFormat = jsonFilesExist
      && (requestedFormat === 'json' || !sqliteDatabaseExists)
      ? 'json'
      : 'sqlite';
    return success({
      projectDir: session.projectDir,
      projectModifiedTime: session.modifiedAt,
      storageFormat,
      jsonFilesExist,
      sqliteDatabaseExists,
      settings: clone(session.settings),
      zones: clone(session.zones),
      points: clone(session.points),
      webReadOnly: false,
      webStorageMode: 'opfs-sahpool',
      webDirectoryPermissionStatus: repository.directoryPermissionStatus(session.projectDir),
      webDirectoryReconnectRequired: ['prompt', 'denied'].includes(
        repository.directoryPermissionStatus(session.projectDir)
      )
    });
  } catch (error) {
    return failureFromError(
      error,
      'WEB_PROJECT_LOAD_FAILED',
      '浏览器本地项目无法读取。'
    );
  }
}

async function saveProject(payload?: unknown): Promise<PlatformResponse<UnknownRecord>> {
  const source = asRecord(payload);
  try {
    requireWebWorkspace();
    const result = await repository.save({
      projectDir: String(source.projectDir || ''),
      settings: asRecord(source.settings),
      zones: Array.isArray(source.zones) ? source.zones.filter(item => item && typeof item === 'object') as UnknownRecord[] : [],
      points: Array.isArray(source.points) ? source.points.filter(item => item && typeof item === 'object') as UnknownRecord[] : []
    });
    return success({ ...result });
  } catch (error) {
    return failureFromError(
      error,
      'WEB_PROJECT_SAVE_FAILED',
      '浏览器本地项目无法保存。'
    );
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

async function importTextFile(accept: string): Promise<PlatformResponse<UnknownRecord>> {
  try {
    const file = await selectWebTextFile(accept);
    if (!file) return success({ canceled: true });
    return success({ canceled: false, content: await file.text(), fileName: file.name });
  } catch (error) {
    return failure('WEB_IMPORT_FAILED', error instanceof Error ? error.message : '本地文件无法读取。');
  }
}

async function importImage(payload?: unknown): Promise<PlatformResponse<UnknownRecord>> {
  const projectDir = String(asRecord(payload).projectDir || '');
  try {
    return success(await importWebImage(projectDir, repository.directoryHandle(projectDir)));
  } catch (error) {
    return failure('WEB_IMAGE_IMPORT_FAILED', error instanceof Error ? error.message : '浏览器图片无法导入。');
  }
}

async function removeImage(payload?: unknown): Promise<PlatformResponse<UnknownRecord>> {
  const source = asRecord(payload);
  const projectDir = String(source.projectDir || '');
  try {
    const deleted = await deleteWebImage(
      String(source.relativePath || ''),
      repository.directoryHandle(projectDir)
    );
    return success({ deleted });
  } catch (error) {
    return failure('WEB_IMAGE_DELETE_FAILED', error instanceof Error ? error.message : '浏览器图片无法删除。');
  }
}

async function chooseBackupDirectory(): Promise<PlatformResponse<UnknownRecord>> {
  return success({ canceled: false, backupDir: 'web://downloads', label: '浏览器下载与 OPFS 备份' });
}

async function createBackup(payload?: unknown): Promise<PlatformResponse<UnknownRecord>> {
  const source = asRecord(payload);
  const projectDir = String(source.projectDir || '');
  const label = String(source.label || 'manual');
  try {
    requireWebWorkspace();
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
    const backup = await repository.inspectBackup(String(source.projectDir || ''), String(source.backupName || ''));
    if (!backup) return failure('WEB_BACKUP_NOT_FOUND', '未找到所选浏览器备份。');
    const snapshot = asRecord(backup.snapshot);
    const imageSummary = await repository.inspectBackupImages(
      String(source.projectDir || ''),
      String(source.backupName || '')
    );
    return success({
      ok: true,
      backupName: String(backup.name || source.backupName || ''),
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
  if (source.confirmRestore !== true) return failure('WEB_BACKUP_CONFIRM_REQUIRED', '恢复备份需要明确确认。');
  try {
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
    requireWebWorkspace();
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
    requireWebWorkspace();
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
    return success({ deleted: await repository.deleteBackupsByName(String(source.projectDir || ''), names) });
  } catch (error) {
    return failure('WEB_BACKUP_DELETE_FAILED', error instanceof Error ? error.message : '浏览器备份无法删除。');
  }
}

async function checkWebImageRefs(payload?: unknown): Promise<PlatformResponse<UnknownRecord>> {
  const refs = Array.isArray(asRecord(payload).refs) ? asRecord(payload).refs as string[] : [];
  try {
    const projectDir = String(asRecord(payload).projectDir || '');
    return success({
      items: await inspectWebImageReferences(refs, repository.directoryHandle(projectDir))
    });
  } catch (error) {
    return failure('WEB_IMAGE_CHECK_FAILED', error instanceof Error ? error.message : '浏览器图片引用无法检查。');
  }
}

async function webSpeciesReference(
  payload: SpeciesReferenceQueryInput
): Promise<PlatformResponse<SpeciesReferenceResult>> {
  try {
    return success(await queryWebSpeciesReference(payload));
  } catch (error) {
    return failure('WEB_SPECIES_REFERENCE_FAILED', error instanceof Error ? error.message : '物种参考服务暂不可用。');
  }
}

async function webTaxonomySuggestion(
  payload: TaxonomyReferenceInput
): Promise<PlatformResponse<TaxonomyReferenceResult>> {
  try {
    return success(await suggestWebTaxonomy(payload));
  } catch (error) {
    return failure('WEB_TAXONOMY_SUGGEST_FAILED', error instanceof Error ? error.message : '科属建议暂不可用。');
  }
}

async function webImageCompare(
  payload: SpeciesReferenceImageCompareInput
): Promise<PlatformResponse<SpeciesReferenceResult>> {
  try {
    return success(await compareWebSpeciesImage(payload));
  } catch (error) {
    return failure('WEB_IMAGE_COMPARE_FAILED', error instanceof Error ? error.message : '图像比对暂不可用。');
  }
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
    const link = document.createElement('a');
    link.href = url.href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
    link.remove();
    return success({ opened: true });
  } catch {
    return failure('EXTERNAL_URL_INVALID', '链接地址无效。');
  }
}

export function createWebPlatformAdapter(): PlatformAdapter {
  installWebImageResolver();

  return Object.freeze({
    runtime: 'web' as const,
    capabilities: Object.freeze({
      readProject: webCapabilityReport.workspaceReady,
      writeProject: webCapabilityReport.workspaceReady,
      importRecords: webCapabilityReport.workspaceReady,
      exportFiles: webCapabilityReport.portableBackupAvailable,
      sqliteStorage: webCapabilityReport.workspaceReady,
      backups: webCapabilityReport.workspaceReady,
      diagnostics: webCapabilityReport.workspaceReady,
      speciesReference: true,
      externalLinks: true,
      nativeWindow: false,
      readOnly: !webCapabilityReport.workspaceReady,
      externalBackupImport: webCapabilityReport.portableBackupAvailable,
      directoryMirror: webCapabilityReport.directoryMirrorAvailable
    }),
    web: Object.freeze({ capabilityReport: webCapabilityReport }),
    project: Object.freeze({
      chooseDir: chooseProject,
      chooseMergeDir: chooseMergeProject,
      load: loadProject,
      save: saveProject,
      getModifiedTime,
      importCsv: () => importTextFile('.csv,text/csv'),
      exportCsv: (payload: unknown) => downloadPayload(payload, 'plant_records.csv', 'text/csv;charset=utf-8'),
      importGeoJson: () => importTextFile('.json,.geojson,application/json,application/geo+json'),
      exportGeoJson: (payload: unknown) => downloadPayload(payload, 'plant_points.geojson', 'application/geo+json;charset=utf-8'),
      exportMarkdown: (payload: unknown) => downloadPayload(payload, 'statistics_summary.md', 'text/markdown;charset=utf-8'),
      exportSvg: (payload: unknown) => downloadPayload(payload, 'heatmap.svg', 'image/svg+xml;charset=utf-8')
    }),
    settings: Object.freeze({
      importJson: () => importTextFile('.json,application/json'),
      exportJson: (payload: unknown) => downloadPayload(payload, 'statistics_full.json', 'application/json;charset=utf-8')
    }),
    image: Object.freeze({ import: importImage, delete: removeImage }),
    backup: Object.freeze({
      chooseDir: chooseBackupDirectory,
      create: createBackup,
      inspectRestore: inspectBackup,
      restore: restoreBackup,
      importArchive: importExternalBackup,
      restoreImported: restoreImportedBackup,
      listExpired: listExpiredBackups,
      keepExpired: keepExpiredBackups,
      deleteExpired: deleteExpiredBackups
    }),
    log: Object.freeze({
      report: diagnostics.report,
      setLevel: diagnostics.setLevel,
      listRecent: diagnostics.listRecent,
      readLog: diagnostics.readLog,
      deleteLogs: diagnostics.deleteLogs,
      cleanup: diagnostics.cleanup,
      exportDiagnostics: diagnostics.exportDiagnostics
    }),
    maintenance: Object.freeze({ checkImageRefs: checkWebImageRefs }),
    storage: Object.freeze({
      conversionPreflight: storageMaintenance.conversionPreflight,
      listArtifacts: storageMaintenance.listArtifacts,
      deleteArtifacts: storageMaintenance.deleteArtifacts,
      createSqliteFromJson: storageMaintenance.createSqliteFromJson,
      exportSqliteToJson: storageMaintenance.exportSqliteToJson
    }),
    species: Object.freeze({
      referenceQuery: webSpeciesReference,
      suggestTaxonomy: webTaxonomySuggestion,
      imageCompare: webImageCompare
    }),
    window: Object.freeze({
      toggleFullscreen: toggleBrowserFullscreen,
      openExternal: openBrowserExternal
    })
  });
}
