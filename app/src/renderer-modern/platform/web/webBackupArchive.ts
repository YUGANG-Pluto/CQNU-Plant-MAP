import { strToU8, zipSync } from 'fflate';
import type { WebBackupRecord, WebProjectRecord } from './webDatabaseProtocol';
import type { WebBackupImageAsset } from './webImageStore';
import { WEB_BACKUP_DATA_FILES } from './webBackupZip.ts';

export const WEB_BACKUP_ARCHIVE_FORMAT = 'cqnu-plant-map-web-backup';
export const WEB_BACKUP_ARCHIVE_VERSION = 1;

interface WebBackupArchiveInput {
  backup: WebBackupRecord;
  snapshot: WebProjectRecord;
  images: WebBackupImageAsset[];
  missingImageReferences: string[];
}

function record(value: unknown): WebProjectRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as WebProjectRecord
    : {};
}

function jsonBytes(value: unknown): Uint8Array {
  return strToU8(`${JSON.stringify(value, null, 2)}\n`);
}

export function webBackupArchiveName(name: string): string {
  const base = String(name || 'cqnu_web_backup').replace(/\.json$/i, '');
  return `${base}.zip`;
}

export async function buildWebBackupArchive(input: WebBackupArchiveInput): Promise<Blob> {
  const project = record(input.snapshot);
  const settings = record(project.settings);
  const zones = Array.isArray(project.zones) ? project.zones : [];
  const points = Array.isArray(project.points) ? project.points : [];
  const imageEntries = input.images.map(image => ({
    reference: image.reference,
    archivePath: image.archivePath,
    fileName: image.fileName,
    mediaType: image.mediaType,
    size: image.size
  }));
  const manifest = {
    format: WEB_BACKUP_ARCHIVE_FORMAT,
    version: WEB_BACKUP_ARCHIVE_VERSION,
    generatedAt: new Date(input.backup.createdAt || Date.now()).toISOString(),
    projectId: String(project.projectId || input.backup.projectId || ''),
    projectLabel: String(project.label || ''),
    backupName: input.backup.name,
    backupLabel: input.backup.label,
    dataFiles: [...WEB_BACKUP_DATA_FILES],
    imageEntries,
    missingImageReferences: [...input.missingImageReferences]
  };
  const files: Record<string, Uint8Array> = {
    'backup-manifest.json': jsonBytes(manifest),
    [WEB_BACKUP_DATA_FILES[0]]: jsonBytes(settings),
    [WEB_BACKUP_DATA_FILES[1]]: jsonBytes(zones),
    [WEB_BACKUP_DATA_FILES[2]]: jsonBytes(points)
  };
  for (const image of input.images) {
    files[image.archivePath] = new Uint8Array(await image.blob.arrayBuffer());
  }
  const zipped = zipSync(files, { level: 6 });
  const bytes = zipped.buffer.slice(zipped.byteOffset, zipped.byteOffset + zipped.byteLength) as ArrayBuffer;
  return new Blob([bytes], { type: 'application/zip' });
}
