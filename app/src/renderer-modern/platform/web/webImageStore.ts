import exifr from 'exifr';
import {
  deleteWebProjectImage,
  writeWebProjectImageReference,
  writeWebProjectImage,
  type PermissionDirectoryHandle
} from './webFileSystem';

type UnknownRecord = Record<string, unknown>;

declare global {
  interface Window {
    resolveWebImageUrl?: (reference: string) => string;
  }
}

const IMAGE_CACHE = 'cqnu-plant-map-web-images-v1';
const BACKUP_IMAGE_CACHE = 'cqnu-plant-map-web-backup-images-v1';
const LOCAL_IMAGE_PREFIX = '/_cqnu-local-image/';
const BACKUP_IMAGE_PREFIX = '/_cqnu-backup-image/';
const objectUrls = new Map<string, string>();

export interface WebBackupImageEntry {
  reference: string;
  fileName: string;
  mediaType: string;
  size: number;
  archivePath: string;
}

export interface WebBackupImageAsset extends WebBackupImageEntry {
  blob: Blob;
}

export interface WebBackupImageCapture {
  entries: WebBackupImageEntry[];
  missingReferences: string[];
}

export interface WebBackupImageRestore {
  restored: number;
  skipped: number;
  entries: number;
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

function imageReferences(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(item => String(item || '').trim()).filter(Boolean);
}

export function collectWebImageReferences(points: UnknownRecord[]): string[] {
  const references = new Set<string>();
  points.forEach(point => {
    imageReferences(point.images).forEach(item => references.add(item));
    const entries = [point.phenologyEntries, point.phenology, point.phenologyRecords]
      .find(Array.isArray);
    if (!Array.isArray(entries)) return;
    entries.forEach(entry => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return;
      imageReferences((entry as UnknownRecord).images).forEach(item => references.add(item));
    });
  });
  return [...references];
}

function stableImageUrl(projectId: string, fileName: string): string {
  const suffix = `${crypto.randomUUID()}/${encodeURIComponent(fileName || 'image')}`;
  return `${LOCAL_IMAGE_PREFIX}${encodeURIComponent(projectId)}/${suffix}`;
}

function requestForReference(reference: string): Request | null {
  if (!reference.startsWith(LOCAL_IMAGE_PREFIX)) return null;
  return new Request(new URL(reference, window.location.origin).href);
}

function backupRequest(backupId: string, index: number): Request {
  const path = `${BACKUP_IMAGE_PREFIX}${encodeURIComponent(backupId)}/${index}`;
  return new Request(new URL(path, window.location.origin).href);
}

function backupManifestRequest(backupId: string): Request {
  const path = `${BACKUP_IMAGE_PREFIX}${encodeURIComponent(backupId)}/manifest`;
  return new Request(new URL(path, window.location.origin).href);
}

function decodeHeader(value: string | null): string {
  if (!value) return '';
  try {
    return decodeURIComponent(value);
  } catch {
    return '';
  }
}

function fileNameForReference(reference: string, preferredName = ''): string {
  const raw = preferredName || reference.replaceAll('\\', '/').split('/').pop() || 'image';
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    // Keep the original name when it is not URI encoded.
  }
  const safe = decoded
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
    .replace(/^\.+/, '')
    .slice(0, 100);
  return safe || 'image';
}

function rememberObjectUrl(reference: string, blob: Blob): string {
  const previous = objectUrls.get(reference);
  if (previous) URL.revokeObjectURL(previous);
  const url = URL.createObjectURL(blob);
  objectUrls.set(reference, url);
  return url;
}

async function chooseImageFile(): Promise<File | null> {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp,image/gif,image/bmp,.jpg,.jpeg,.png,.webp,.gif,.bmp';
    input.hidden = true;
    const finish = () => {
      const file = input.files?.[0] || null;
      input.remove();
      resolve(file);
    };
    input.addEventListener('change', finish, { once: true });
    input.addEventListener('cancel', finish, { once: true });
    document.body.appendChild(input);
    input.click();
  });
}

async function readExif(file: File): Promise<{ date: string; lat: number | ''; lng: number | '' }> {
  const result: { date: string; lat: number | ''; lng: number | '' } = { date: '', lat: '', lng: '' };
  try {
    const meta = await exifr.parse(file, true);
    const date = meta?.DateTimeOriginal || meta?.CreateDate || meta?.ModifyDate
      || meta?.DateTimeDigitized || meta?.DateTime;
    if (date instanceof Date && !Number.isNaN(date.getTime())) {
      result.date = date.toISOString().slice(0, 10);
    }
    if (Number.isFinite(meta?.latitude) && Number.isFinite(meta?.longitude)) {
      result.lat = Number(meta.latitude);
      result.lng = Number(meta.longitude);
    }
  } catch {
    // EXIF is optional and never blocks the selected image from being archived.
  }
  return result;
}

async function readDirectoryImage(
  root: PermissionDirectoryHandle | undefined,
  reference: string
): Promise<File | null> {
  if (!root) return null;
  const match = /^information\/images\/([^/]+)$/.exec(reference.replaceAll('\\', '/'));
  if (!match || match[1] === '.' || match[1] === '..') return null;
  try {
    const information = await root.getDirectoryHandle('information');
    const images = await information.getDirectoryHandle('images');
    return await images.getFileHandle(match[1]).then(handle => handle.getFile());
  } catch {
    return null;
  }
}

async function readImageSource(
  reference: string,
  directoryHandle?: PermissionDirectoryHandle
): Promise<{ blob: Blob; fileName: string; mediaType: string } | null> {
  const request = requestForReference(reference);
  if (request) {
    const response = await (await caches.open(IMAGE_CACHE)).match(request);
    if (!response) return null;
    const blob = await response.blob();
    return {
      blob,
      fileName: fileNameForReference(reference, decodeHeader(response.headers.get('x-cqnu-file-name'))),
      mediaType: blob.type || response.headers.get('content-type') || 'application/octet-stream'
    };
  }
  const file = await readDirectoryImage(directoryHandle, reference);
  return file
    ? {
      blob: file,
      fileName: fileNameForReference(reference, file.name),
      mediaType: file.type || 'application/octet-stream'
    }
    : null;
}

export function installWebImageResolver(): void {
  if (window.resolveWebImageUrl) return;
  window.resolveWebImageUrl = reference => objectUrls.get(String(reference || '')) || String(reference || '');
}

export async function importWebImage(
  projectDir: string,
  directoryHandle?: PermissionDirectoryHandle
): Promise<UnknownRecord> {
  const projectId = projectIdFromDir(projectDir);
  if (!projectId) throw new Error('请先打开浏览器本地项目，再导入图片。');
  const file = await chooseImageFile();
  if (!file) return { canceled: true };
  const reference = directoryHandle
    ? await writeWebProjectImage(directoryHandle, file)
    : stableImageUrl(projectId, file.name);
  const request = requestForReference(reference);
  if (request) {
    const cache = await caches.open(IMAGE_CACHE);
    await cache.put(request, new Response(file, {
      headers: {
        'content-type': file.type || 'application/octet-stream',
        'x-cqnu-file-name': encodeURIComponent(file.name)
      }
    }));
  }
  rememberObjectUrl(reference, file);
  return {
    canceled: false,
    relativePath: reference,
    absolutePath: '',
    exif: await readExif(file)
  };
}

export async function hydrateWebImages(
  references: string[],
  directoryHandle?: PermissionDirectoryHandle
): Promise<void> {
  const cache = await caches.open(IMAGE_CACHE);
  await Promise.all([...new Set(references)].map(async reference => {
    if (!reference || objectUrls.has(reference)) return;
    const request = requestForReference(reference);
    if (request) {
      const cached = await cache.match(request);
      if (cached) rememberObjectUrl(reference, await cached.blob());
      return;
    }
    const file = await readDirectoryImage(directoryHandle, reference);
    if (file) rememberObjectUrl(reference, file);
  }));
}

export async function deleteWebImageBackup(backupId: string): Promise<number> {
  if (!backupId) return 0;
  const cache = await caches.open(BACKUP_IMAGE_CACHE);
  const prefix = new URL(
    `${BACKUP_IMAGE_PREFIX}${encodeURIComponent(backupId)}/`,
    window.location.origin
  ).href;
  const requests = (await cache.keys()).filter(request => request.url.startsWith(prefix));
  const results = await Promise.all(requests.map(request => cache.delete(request)));
  return results.filter(Boolean).length;
}

export async function captureWebImageBackup(
  backupId: string,
  references: string[],
  directoryHandle?: PermissionDirectoryHandle
): Promise<WebBackupImageCapture> {
  await deleteWebImageBackup(backupId);
  const cache = await caches.open(BACKUP_IMAGE_CACHE);
  const entries: WebBackupImageEntry[] = [];
  const missingReferences: string[] = [];
  const uniqueReferences = [...new Set(references.map(String).map(item => item.trim()).filter(Boolean))];

  try {
    for (const [index, reference] of uniqueReferences.entries()) {
      const source = await readImageSource(reference, directoryHandle);
      if (!source) {
        missingReferences.push(reference);
        continue;
      }
      const archivePath = `information/images/${String(index + 1).padStart(4, '0')}_${source.fileName}`;
      const entry: WebBackupImageEntry = {
        reference,
        fileName: source.fileName,
        mediaType: source.mediaType,
        size: source.blob.size,
        archivePath
      };
      await cache.put(backupRequest(backupId, index), new Response(source.blob, {
        headers: {
          'content-type': source.mediaType,
          'x-cqnu-reference': encodeURIComponent(reference),
          'x-cqnu-file-name': encodeURIComponent(source.fileName),
          'x-cqnu-archive-path': encodeURIComponent(archivePath)
        }
      }));
      entries.push(entry);
    }
    await cache.put(backupManifestRequest(backupId), new Response(JSON.stringify({
      entries,
      missingReferences
    }), {
      headers: { 'content-type': 'application/json;charset=utf-8' }
    }));
  } catch (error) {
    await deleteWebImageBackup(backupId);
    throw error;
  }

  return { entries, missingReferences };
}

export async function inspectWebImageBackup(backupId: string): Promise<WebBackupImageCapture> {
  if (!backupId) return { entries: [], missingReferences: [] };
  const response = await (await caches.open(BACKUP_IMAGE_CACHE)).match(backupManifestRequest(backupId));
  if (!response) {
    const assets = await readWebImageBackup(backupId);
    return {
      entries: assets.map(({ blob: _blob, ...entry }) => entry),
      missingReferences: []
    };
  }
  try {
    const value = await response.json() as Partial<WebBackupImageCapture>;
    return {
      entries: Array.isArray(value.entries) ? value.entries : [],
      missingReferences: Array.isArray(value.missingReferences)
        ? value.missingReferences.map(String)
        : []
    };
  } catch {
    return { entries: [], missingReferences: [] };
  }
}

export async function readWebImageBackup(backupId: string): Promise<WebBackupImageAsset[]> {
  if (!backupId) return [];
  const cache = await caches.open(BACKUP_IMAGE_CACHE);
  const prefix = new URL(
    `${BACKUP_IMAGE_PREFIX}${encodeURIComponent(backupId)}/`,
    window.location.origin
  ).href;
  const requests = (await cache.keys())
    .filter(request => request.url.startsWith(prefix))
    .sort((left, right) => left.url.localeCompare(right.url, undefined, { numeric: true }));
  const assets: WebBackupImageAsset[] = [];
  for (const request of requests) {
    const response = await cache.match(request);
    if (!response) continue;
    const blob = await response.blob();
    const reference = decodeHeader(response.headers.get('x-cqnu-reference'));
    if (!reference) continue;
    const fileName = fileNameForReference(reference, decodeHeader(response.headers.get('x-cqnu-file-name')));
    assets.push({
      reference,
      fileName,
      mediaType: blob.type || response.headers.get('content-type') || 'application/octet-stream',
      size: blob.size,
      archivePath: decodeHeader(response.headers.get('x-cqnu-archive-path'))
        || `information/images/${String(assets.length + 1).padStart(4, '0')}_${fileName}`,
      blob
    });
  }
  return assets;
}

export async function restoreWebImageBackup(
  backupId: string,
  directoryHandle?: PermissionDirectoryHandle
): Promise<WebBackupImageRestore> {
  const assets = await readWebImageBackup(backupId);
  return restoreWebImageAssets(assets, directoryHandle);
}

export async function restoreWebImageAssets(
  assets: WebBackupImageAsset[],
  directoryHandle?: PermissionDirectoryHandle
): Promise<WebBackupImageRestore> {
  let restored = 0;
  let skipped = 0;
  const imageCache = await caches.open(IMAGE_CACHE);
  for (const asset of assets) {
    try {
      const request = requestForReference(asset.reference);
      if (request) {
        await imageCache.put(request, new Response(asset.blob, {
          headers: {
            'content-type': asset.mediaType,
            'x-cqnu-file-name': encodeURIComponent(asset.fileName)
          }
        }));
        rememberObjectUrl(asset.reference, asset.blob);
        restored += 1;
        continue;
      }
      if (directoryHandle && await writeWebProjectImageReference(directoryHandle, asset.reference, asset.blob)) {
        rememberObjectUrl(asset.reference, asset.blob);
        restored += 1;
        continue;
      }
    } catch {
      // Continue restoring remaining images when directory permission or quota changes.
    }
    skipped += 1;
  }
  return { restored, skipped, entries: assets.length };
}

export async function deleteWebImage(
  reference: string,
  directoryHandle?: PermissionDirectoryHandle
): Promise<boolean> {
  const request = requestForReference(reference);
  const previous = objectUrls.get(reference);
  if (previous) URL.revokeObjectURL(previous);
  objectUrls.delete(reference);
  if (!request) return directoryHandle ? deleteWebProjectImage(directoryHandle, reference) : false;
  return (await caches.open(IMAGE_CACHE)).delete(request);
}

export async function inspectWebImageReferences(
  references: string[],
  directoryHandle?: PermissionDirectoryHandle
): Promise<UnknownRecord[]> {
  const cache = await caches.open(IMAGE_CACHE);
  return Promise.all(references.map(async reference => {
    if (objectUrls.has(reference)) return { ref: reference, exists: true, code: '' };
    const request = requestForReference(reference);
    const exists = request
      ? Boolean(await cache.match(request))
      : Boolean(await readDirectoryImage(directoryHandle, reference));
    return { ref: reference, exists, code: exists ? '' : 'WEB_IMAGE_NOT_AVAILABLE' };
  }));
}
