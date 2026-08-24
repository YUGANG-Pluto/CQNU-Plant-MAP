import { unzip } from 'fflate';
import type { WebProjectRecord } from './webDatabaseProtocol';
import type { WebBackupImageAsset } from './webImageStore';
import { WEB_BACKUP_ARCHIVE_FORMAT, WEB_BACKUP_ARCHIVE_VERSION } from './webBackupArchive.ts';
import {
  calculateCrc32,
  preflightWebBackupArchive,
  WEB_BACKUP_ARCHIVE_LIMITS,
  WEB_BACKUP_DATA_FILES,
  type WebBackupArchiveLimits
} from './webBackupZip.ts';

interface WebBackupManifestImageEntry {
  reference: string;
  archivePath: string;
  fileName: string;
  mediaType: string;
  size: number;
}

export interface WebBackupArchiveManifest {
  format: string;
  version: number;
  generatedAt: string;
  projectId: string;
  projectLabel: string;
  backupName: string;
  backupLabel: string;
  dataFiles: string[];
  imageEntries: WebBackupManifestImageEntry[];
  missingImageReferences: string[];
}

export interface ImportedWebBackupArchive {
  fileName: string;
  manifest: WebBackupArchiveManifest;
  snapshot: WebProjectRecord;
  images: WebBackupImageAsset[];
  warnings: string[];
  archiveBytes: number;
  uncompressedBytes: number;
}

function failArchive(message: string): never {
  throw new Error(`备份 ZIP 无法使用：${message}`);
}

function extractArchive(bytes: Uint8Array): Promise<Record<string, Uint8Array>> {
  return new Promise((resolve, reject) => {
    unzip(bytes, (error, files) => {
      if (error) reject(new Error(`备份 ZIP 无法使用：解压失败（${error.message}）。`));
      else resolve(files);
    });
  });
}

function parseJsonFile(files: Record<string, Uint8Array>, name: string): unknown {
  const bytes = files[name];
  if (!bytes) return failArchive(`缺少 ${name}。`);
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, '');
    return JSON.parse(text);
  } catch {
    return failArchive(`${name} 不是有效的 UTF-8 JSON。`);
  }
}

function asObject(value: unknown, name: string): WebProjectRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return failArchive(`${name} 必须是对象。`);
  return value as WebProjectRecord;
}

function asRecordArray(value: unknown, name: string): WebProjectRecord[] {
  if (!Array.isArray(value) || value.some(item => !item || typeof item !== 'object' || Array.isArray(item))) {
    return failArchive(`${name} 必须是对象数组。`);
  }
  return value as WebProjectRecord[];
}

function asShortString(value: unknown, field: string, allowEmpty = true): string {
  const result = typeof value === 'string' ? value.trim() : '';
  if ((!allowEmpty && !result) || result.length > 2048 || /[\u0000-\u001f]/.test(result)) {
    return failArchive(`清单字段 ${field} 无效。`);
  }
  return result;
}

function safeImageReference(value: unknown): string {
  const reference = asShortString(value, 'imageEntries.reference', false);
  const normalized = reference.replaceAll('\\', '/');
  if (/^information\/images\/[^/]{1,160}$/.test(normalized)) return reference;
  if (/^\/_cqnu-local-image\/[A-Za-z0-9%._~-]+\/[A-Za-z0-9-]+\/[A-Za-z0-9%._~-]+$/.test(reference)) {
    return reference;
  }
  return failArchive('图片引用不是受支持的浏览器本地路径。');
}

function detectedImageType(bytes: Uint8Array): string {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    .every((value, index) => bytes[index] === value)) return 'image/png';
  if (bytes.length >= 12
    && new TextDecoder().decode(bytes.subarray(0, 4)) === 'RIFF'
    && new TextDecoder().decode(bytes.subarray(8, 12)) === 'WEBP') return 'image/webp';
  if (bytes.length >= 6 && ['GIF87a', 'GIF89a'].includes(new TextDecoder().decode(bytes.subarray(0, 6)))) {
    return 'image/gif';
  }
  if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d) return 'image/bmp';
  return failArchive('图片条目不是受支持的位图格式。');
}

function parseManifest(value: unknown): WebBackupArchiveManifest {
  const source = asObject(value, 'backup-manifest.json');
  if (source.format !== WEB_BACKUP_ARCHIVE_FORMAT || source.version !== WEB_BACKUP_ARCHIVE_VERSION) {
    return failArchive('备份格式或版本不受支持。');
  }
  const dataFiles = Array.isArray(source.dataFiles) ? source.dataFiles.map(String) : [];
  if (dataFiles.length !== WEB_BACKUP_DATA_FILES.length
    || WEB_BACKUP_DATA_FILES.some(name => !dataFiles.includes(name))) {
    return failArchive('数据文件清单不完整。');
  }
  const rawImageEntries = Array.isArray(source.imageEntries) ? source.imageEntries : [];
  const imageEntries = rawImageEntries.map((value, index) => {
    const entry = asObject(value, `imageEntries[${index}]`);
    const archivePath = asShortString(entry.archivePath, 'imageEntries.archivePath', false);
    if (!/^information\/images\/[^/]{1,140}$/.test(archivePath)) return failArchive('图片归档路径无效。');
    const fileName = asShortString(entry.fileName, 'imageEntries.fileName', false);
    if (fileName.includes('/') || fileName.includes('\\') || fileName.length > 140) {
      return failArchive('图片文件名无效。');
    }
    const size = Number(entry.size);
    if (!Number.isSafeInteger(size) || size < 0) return failArchive('图片大小记录无效。');
    return {
      reference: safeImageReference(entry.reference),
      archivePath,
      fileName,
      mediaType: asShortString(entry.mediaType, 'imageEntries.mediaType'),
      size
    };
  });
  const archivePaths = imageEntries.map(item => item.archivePath.toLocaleLowerCase('en-US'));
  const references = imageEntries.map(item => item.reference);
  if (new Set(archivePaths).size !== archivePaths.length || new Set(references).size !== references.length) {
    return failArchive('图片清单包含重复条目。');
  }
  const missingImageReferences = Array.isArray(source.missingImageReferences)
    ? source.missingImageReferences.map((item, index) => asShortString(item, `missingImageReferences[${index}]`, false))
    : [];
  const generatedAt = asShortString(source.generatedAt, 'generatedAt', false);
  if (!Number.isFinite(Date.parse(generatedAt))) return failArchive('生成时间无效。');
  return {
    format: WEB_BACKUP_ARCHIVE_FORMAT,
    version: WEB_BACKUP_ARCHIVE_VERSION,
    generatedAt,
    projectId: asShortString(source.projectId, 'projectId'),
    projectLabel: asShortString(source.projectLabel, 'projectLabel'),
    backupName: asShortString(source.backupName, 'backupName', false),
    backupLabel: asShortString(source.backupLabel, 'backupLabel'),
    dataFiles,
    imageEntries,
    missingImageReferences
  };
}

export async function inspectWebBackupArchive(
  bytes: Uint8Array,
  fileName = 'web-backup.zip',
  limits?: Partial<WebBackupArchiveLimits>
): Promise<ImportedWebBackupArchive> {
  const preflight = preflightWebBackupArchive(bytes, limits);
  const files = await extractArchive(bytes);
  for (const entry of preflight.entries) {
    if (entry.directory) continue;
    const extracted = files[entry.name];
    if (!extracted
      || extracted.length !== entry.uncompressedSize
      || calculateCrc32(extracted) !== entry.crc32) return failArchive(`文件校验失败：${entry.name}`);
  }
  const manifest = parseManifest(parseJsonFile(files, 'backup-manifest.json'));
  const declaredImages = new Set(manifest.imageEntries.map(item => item.archivePath));
  const archiveImages = preflight.entries
    .filter(entry => !entry.directory && entry.name.startsWith('information/images/'))
    .map(entry => entry.name);
  if (archiveImages.some(name => !declaredImages.has(name))
    || manifest.imageEntries.some(item => !files[item.archivePath])) return failArchive('图片文件与清单不一致。');

  const images = manifest.imageEntries.map(entry => {
    const imageBytes = files[entry.archivePath];
    if (imageBytes.length !== entry.size) return failArchive(`图片大小不一致：${entry.archivePath}`);
    const mediaType = detectedImageType(imageBytes);
    const buffer = imageBytes.buffer.slice(
      imageBytes.byteOffset,
      imageBytes.byteOffset + imageBytes.byteLength
    ) as ArrayBuffer;
    return { ...entry, mediaType, blob: new Blob([buffer], { type: mediaType }) };
  });
  const settings = asObject(parseJsonFile(files, WEB_BACKUP_DATA_FILES[0]), WEB_BACKUP_DATA_FILES[0]);
  const zones = asRecordArray(parseJsonFile(files, WEB_BACKUP_DATA_FILES[1]), WEB_BACKUP_DATA_FILES[1]);
  const points = asRecordArray(parseJsonFile(files, WEB_BACKUP_DATA_FILES[2]), WEB_BACKUP_DATA_FILES[2]);
  const warnings = manifest.missingImageReferences.length
    ? [`原备份有 ${manifest.missingImageReferences.length} 个图片引用未能归档。`]
    : [];
  return {
    fileName: asShortString(fileName, 'fileName', false),
    manifest,
    snapshot: {
      projectId: manifest.projectId,
      label: manifest.projectLabel,
      modifiedAt: Date.parse(manifest.generatedAt),
      sourceKind: 'import',
      settings,
      zones,
      points
    },
    images,
    warnings,
    archiveBytes: preflight.archiveBytes,
    uncompressedBytes: preflight.uncompressedBytes
  };
}

export async function selectAndInspectWebBackupArchive(): Promise<ImportedWebBackupArchive | null> {
  const file = await new Promise<File | null>(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip,application/zip';
    input.hidden = true;
    const finish = () => {
      const selected = input.files?.[0] || null;
      input.remove();
      resolve(selected);
    };
    input.addEventListener('change', finish, { once: true });
    input.addEventListener('cancel', finish, { once: true });
    document.body.appendChild(input);
    input.click();
  });
  if (!file) return null;
  if (!/\.zip$/i.test(file.name)) return failArchive('请选择 .zip 备份文件。');
  if (file.size > WEB_BACKUP_ARCHIVE_LIMITS.maxArchiveBytes) return failArchive('文件体积超过允许上限。');
  return inspectWebBackupArchive(new Uint8Array(await file.arrayBuffer()), file.name);
}
