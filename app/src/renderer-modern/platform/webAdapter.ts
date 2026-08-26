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
  deleteWebImage,
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
  downloadPayload,
  failure,
  success,
  type UnknownRecord
} from './web/webPlatformSupport';
import { createWebStorageMaintenance } from './web/webStorageMaintenance';
import { createWebBackupCommands } from './web/webBackupCommands';
import { createWebProjectCommands } from './web/webProjectCommands';
import { createWebWorkspaceAccess } from './web/webWorkspaceAccess';

export function createWebPlatformAdapter(): PlatformAdapter {
  const access = createWebWorkspaceAccess();
  const repository = new WebProjectRepository({
    directoryAccessMode: access.canSave ? 'readwrite' : 'read'
  });
  const projectCommands = createWebProjectCommands(repository, access);
  const backupCommands = createWebBackupCommands(repository, access);
  const diagnostics = createWebDiagnostics(repository);
  const storageMaintenance = createWebStorageMaintenance(repository);

  installWebImageResolver();

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
      access.requireSave();
      return success(await importWebImage(projectDir, repository.directoryHandle(projectDir)));
    } catch (error) {
      return failure('WEB_IMAGE_IMPORT_FAILED', error instanceof Error ? error.message : '浏览器图片无法导入。');
    }
  }

  async function removeImage(payload?: unknown): Promise<PlatformResponse<UnknownRecord>> {
    const source = asRecord(payload);
    const projectDir = String(source.projectDir || '');
    try {
      access.requireSave();
      const deleted = await deleteWebImage(
        String(source.relativePath || ''),
        repository.directoryHandle(projectDir)
      );
      return success({ deleted });
    } catch (error) {
      return failure('WEB_IMAGE_DELETE_FAILED', error instanceof Error ? error.message : '浏览器图片无法删除。');
    }
  }

  async function checkWebImageRefs(payload?: unknown): Promise<PlatformResponse<UnknownRecord>> {
    const source = asRecord(payload);
    const refs = Array.isArray(source.refs) ? source.refs as string[] : [];
    try {
      const projectDir = String(source.projectDir || '');
      return success({
        items: await inspectWebImageReferences(refs, repository.directoryHandle(projectDir))
      });
    } catch (error) {
      return failure('WEB_IMAGE_CHECK_FAILED', error instanceof Error ? error.message : '浏览器图片引用无法检查。');
    }
  }

  function guardedStorageMutation(
    operation: (payload?: unknown) => Promise<PlatformResponse<UnknownRecord>>
  ): (payload?: unknown) => Promise<PlatformResponse<UnknownRecord>> {
    return async payload => {
      try {
        access.requireSave();
        return await operation(payload);
      } catch (error) {
        return failure(
          'WEB_STORAGE_PERMISSION_DENIED',
          error instanceof Error ? error.message : '当前账户不能修改浏览器项目存储。'
        );
      }
    };
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

  return Object.freeze({
    runtime: 'web' as const,
    capabilities: Object.freeze({
      readProject: access.capabilityReport.workspaceReady && access.canRead,
      writeProject: access.capabilityReport.workspaceReady && access.canSave,
      importRecords: access.capabilityReport.workspaceReady && access.canEdit,
      exportFiles: access.capabilityReport.portableBackupAvailable && access.canRead,
      sqliteStorage: access.capabilityReport.workspaceReady && access.canRead,
      backups: access.capabilityReport.workspaceReady && access.canSave,
      diagnostics: access.capabilityReport.workspaceReady && access.canRead,
      speciesReference: true,
      externalLinks: true,
      nativeWindow: false,
      readOnly: !access.capabilityReport.workspaceReady || !access.canEdit,
      externalBackupImport: access.capabilityReport.portableBackupAvailable && access.canSave,
      directoryMirror: access.capabilityReport.directoryMirrorAvailable && access.canSave
    }),
    web: Object.freeze({
      capabilityReport: access.capabilityReport,
      ...(access.managementAccess ? { managementAccess: access.managementAccess } : {})
    }),
    project: Object.freeze({
      ...projectCommands,
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
    backup: backupCommands,
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
      deleteArtifacts: guardedStorageMutation(storageMaintenance.deleteArtifacts),
      createSqliteFromJson: guardedStorageMutation(storageMaintenance.createSqliteFromJson),
      exportSqliteToJson: guardedStorageMutation(storageMaintenance.exportSqliteToJson)
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
