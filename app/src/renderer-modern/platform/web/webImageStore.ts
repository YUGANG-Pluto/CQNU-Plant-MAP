import exifr from 'exifr';
import {
  deleteWebProjectImage,
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
const LOCAL_IMAGE_PREFIX = '/_cqnu-local-image/';
const objectUrls = new Map<string, string>();

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
  const segments = reference.replaceAll('\\', '/').split('/').filter(Boolean);
  if (!segments.length || segments.some(segment => segment === '.' || segment === '..')) return null;
  try {
    let directory: FileSystemDirectoryHandle = root;
    for (const segment of segments.slice(0, -1)) {
      directory = await directory.getDirectoryHandle(segment);
    }
    return await directory.getFileHandle(segments.at(-1) || '').then(handle => handle.getFile());
  } catch {
    return null;
  }
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

export async function inspectWebImageReferences(references: string[]): Promise<UnknownRecord[]> {
  const cache = await caches.open(IMAGE_CACHE);
  return Promise.all(references.map(async reference => {
    if (objectUrls.has(reference)) return { ref: reference, exists: true, code: '' };
    const request = requestForReference(reference);
    const exists = Boolean(request && await cache.match(request));
    return { ref: reference, exists, code: exists ? '' : 'WEB_IMAGE_NOT_AVAILABLE' };
  }));
}
