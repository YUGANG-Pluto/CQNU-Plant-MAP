import {
  createEmptyWebProjectSession,
  createWebProjectSession,
  selectWebProjectFiles,
  type WebProjectSession
} from '../webProject';

interface WritableFileHandle extends FileSystemFileHandle {
  createWritable(): Promise<FileSystemWritableFileStream>;
}

export interface PermissionDirectoryHandle extends FileSystemDirectoryHandle {
  queryPermission?(descriptor: { mode: 'read' | 'readwrite' }): Promise<PermissionState>;
  requestPermission?(descriptor: { mode: 'read' | 'readwrite' }): Promise<PermissionState>;
}

interface DirectoryPickerWindow extends Window {
  showDirectoryPicker?(options?: {
    id?: string;
    mode?: 'read' | 'readwrite';
    startIn?: 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos';
  }): Promise<PermissionDirectoryHandle>;
}

interface StoredDirectoryHandle {
  projectId: string;
  name: string;
  handle: PermissionDirectoryHandle;
  updatedAt: number;
}

export type WebDirectoryPermissionStatus = 'granted' | 'prompt' | 'denied' | 'missing' | 'unsupported';

export interface WebDirectoryHandleRecovery {
  directoryHandle?: PermissionDirectoryHandle;
  name: string;
  status: WebDirectoryPermissionStatus;
}

export interface WebDirectorySelection {
  session: WebProjectSession;
  directoryHandle: PermissionDirectoryHandle;
  created: boolean;
}

const HANDLE_DATABASE = 'cqnu-plant-map-web-handles';
const HANDLE_STORE = 'directories';
const HANDLE_DATABASE_VERSION = 1;

function openHandleDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(HANDLE_DATABASE, HANDLE_DATABASE_VERSION);
    request.addEventListener('upgradeneeded', () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(HANDLE_STORE)) {
        database.createObjectStore(HANDLE_STORE, { keyPath: 'projectId' });
      }
    });
    request.addEventListener('success', () => resolve(request.result), { once: true });
    request.addEventListener('error', () => reject(request.error || new Error('浏览器目录索引无法打开。')), { once: true });
  });
}

async function readStoredHandles(): Promise<StoredDirectoryHandle[]> {
  const database = await openHandleDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = database.transaction(HANDLE_STORE, 'readonly').objectStore(HANDLE_STORE).getAll();
      request.addEventListener('success', () => resolve(request.result as StoredDirectoryHandle[]), { once: true });
      request.addEventListener('error', () => reject(request.error || new Error('浏览器目录索引无法读取。')), { once: true });
    });
  } finally {
    database.close();
  }
}

async function persistHandle(record: StoredDirectoryHandle): Promise<void> {
  const database = await openHandleDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(HANDLE_STORE, 'readwrite');
      transaction.objectStore(HANDLE_STORE).put(record);
      transaction.addEventListener('complete', () => resolve(), { once: true });
      transaction.addEventListener('error', () => reject(transaction.error || new Error('浏览器目录索引无法保存。')), { once: true });
      transaction.addEventListener('abort', () => reject(transaction.error || new Error('浏览器目录索引保存被中止。')), { once: true });
    });
  } finally {
    database.close();
  }
}

async function storedHandleForProject(projectId: string): Promise<StoredDirectoryHandle | null> {
  if (!projectId) return null;
  try {
    const records = await readStoredHandles();
    return records.find(item => item.projectId === projectId) || null;
  } catch {
    return null;
  }
}

async function directoryProjectId(handle: PermissionDirectoryHandle): Promise<string> {
  try {
    const stored = await readStoredHandles();
    for (const item of stored) {
      if (await item.handle.isSameEntry(handle)) {
        await persistHandle({ ...item, handle, name: handle.name, updatedAt: Date.now() });
        return item.projectId;
      }
    }
    const projectId = crypto.randomUUID();
    await persistHandle({ projectId, name: handle.name, handle, updatedAt: Date.now() });
    return projectId;
  } catch {
    return crypto.randomUUID();
  }
}

export async function ensureReadWritePermission(handle: PermissionDirectoryHandle): Promise<boolean> {
  const descriptor = { mode: 'readwrite' as const };
  if (!handle.queryPermission) return true;
  if (await handle.queryPermission(descriptor) === 'granted') return true;
  return handle.requestPermission
    ? await handle.requestPermission(descriptor) === 'granted'
    : false;
}

export async function recoverWebDirectoryHandle(
  projectId: string,
  requestPermission = false
): Promise<WebDirectoryHandleRecovery> {
  const stored = await storedHandleForProject(projectId);
  if (!stored?.handle) return { name: '', status: 'missing' };
  const descriptor = { mode: 'readwrite' as const };
  let status: PermissionState;
  try {
    status = stored.handle.queryPermission
      ? await stored.handle.queryPermission(descriptor)
      : 'granted';
    if (status !== 'granted' && requestPermission && stored.handle.requestPermission) {
      status = await stored.handle.requestPermission(descriptor);
    }
  } catch {
    return { name: stored.name, status: 'denied' };
  }
  if (status === 'granted') {
    await persistHandle({ ...stored, updatedAt: Date.now() });
    return { directoryHandle: stored.handle, name: stored.name, status };
  }
  return { name: stored.name, status };
}

function safeImageExtension(fileName: string): string {
  const match = /\.(jpe?g|png|webp|gif|bmp)$/i.exec(fileName);
  return match ? `.${match[1].toLowerCase().replace('jpeg', 'jpg')}` : '.jpg';
}

export async function writeWebProjectImage(
  handle: PermissionDirectoryHandle,
  file: File
): Promise<string> {
  if (!await ensureReadWritePermission(handle)) {
    throw new Error('未获得所选项目目录的写入权限。');
  }
  const information = await handle.getDirectoryHandle('information', { create: true });
  const images = await information.getDirectoryHandle('images', { create: true });
  const name = `img_${Date.now()}_${crypto.randomUUID().slice(0, 8)}${safeImageExtension(file.name)}`;
  const fileHandle = await images.getFileHandle(name, { create: true }) as WritableFileHandle;
  const writable = await fileHandle.createWritable();
  try {
    await writable.write(file);
  } finally {
    await writable.close();
  }
  return `information/images/${name}`;
}

function imageNameFromReference(reference: string): string {
  const normalized = reference.replaceAll('\\', '/');
  const match = /^information\/images\/([^/]+)$/.exec(normalized);
  if (!match || match[1] === '.' || match[1] === '..') return '';
  return match[1];
}

export async function writeWebProjectImageReference(
  handle: PermissionDirectoryHandle,
  reference: string,
  blob: Blob
): Promise<boolean> {
  const name = imageNameFromReference(reference);
  if (!name) return false;
  if (!await ensureReadWritePermission(handle)) {
    throw new Error('未获得所选项目目录的写入权限。');
  }
  const information = await handle.getDirectoryHandle('information', { create: true });
  const images = await information.getDirectoryHandle('images', { create: true });
  const fileHandle = await images.getFileHandle(name, { create: true }) as WritableFileHandle;
  const writable = await fileHandle.createWritable();
  try {
    await writable.write(blob);
  } finally {
    await writable.close();
  }
  return true;
}

export async function deleteWebProjectImage(
  handle: PermissionDirectoryHandle,
  reference: string
): Promise<boolean> {
  const normalized = reference.replaceAll('\\', '/');
  const match = /^information\/images\/([^/]+)$/.exec(normalized);
  if (!match || match[1] === '.' || match[1] === '..') return false;
  if (!await ensureReadWritePermission(handle)) {
    throw new Error('未获得所选项目目录的写入权限。');
  }
  try {
    const information = await handle.getDirectoryHandle('information');
    const images = await information.getDirectoryHandle('images');
    await images.removeEntry(match[1]);
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotFoundError') return false;
    throw error;
  }
}

async function optionalDirectory(
  parent: FileSystemDirectoryHandle,
  name: string
): Promise<FileSystemDirectoryHandle | null> {
  try {
    return await parent.getDirectoryHandle(name);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotFoundError') return null;
    throw error;
  }
}

async function optionalFile(
  parent: FileSystemDirectoryHandle,
  name: string
): Promise<File | null> {
  try {
    return await parent.getFileHandle(name).then(handle => handle.getFile());
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotFoundError') return null;
    throw error;
  }
}

async function readProjectFiles(handle: FileSystemDirectoryHandle): Promise<File[]> {
  const information = await optionalDirectory(handle, 'information');
  const parent = information || handle;
  const files = await Promise.all([
    optionalFile(parent, 'settings.json'),
    optionalFile(parent, 'zones.json'),
    optionalFile(parent, 'points.json')
  ]);
  return files.filter((file): file is File => Boolean(file));
}

export async function readWebProjectDirectory(
  handle: PermissionDirectoryHandle,
  projectId: string
): Promise<WebProjectSession | null> {
  const files = await readProjectFiles(handle);
  if (!files.length) return null;
  return createWebProjectSession(files, {
    projectId,
    label: handle.name || undefined,
    sourceKind: 'directory'
  });
}

async function hasDesktopSqlite(handle: FileSystemDirectoryHandle): Promise<boolean> {
  const information = await optionalDirectory(handle, 'information');
  if (!information) return false;
  return Boolean(await optionalFile(information, 'data.db'));
}

export function supportsWebDirectoryProjects(): boolean {
  return typeof (window as DirectoryPickerWindow).showDirectoryPicker === 'function';
}

export async function selectWebDirectoryProject(): Promise<WebDirectorySelection | null> {
  const picker = (window as DirectoryPickerWindow).showDirectoryPicker;
  if (!picker) return null;
  try {
    const directoryHandle = await picker({
      id: 'cqnu-plant-map-project',
      mode: 'readwrite',
      startIn: 'documents'
    });
    if (!await ensureReadWritePermission(directoryHandle)) {
      throw new Error('未获得所选项目目录的读写权限。');
    }
    const projectId = await directoryProjectId(directoryHandle);
    const files = await readProjectFiles(directoryHandle);
    if (!files.length && await hasDesktopSqlite(directoryHandle)) {
      throw new Error('所选目录仅包含桌面 SQLite 数据库。请先在桌面端导出 JSON，或使用浏览器 SQLite 导入功能。');
    }
    const created = files.length === 0;
    const session = created
      ? createEmptyWebProjectSession({
        projectId,
        label: directoryHandle.name || '浏览器本地项目',
        sourceKind: 'directory'
      })
      : await createWebProjectSession(files, {
        projectId,
        label: directoryHandle.name || undefined,
        sourceKind: 'directory'
      });
    return { session, directoryHandle, created };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return null;
    throw error;
  }
}

async function writeJsonFile(
  directory: FileSystemDirectoryHandle,
  name: string,
  value: unknown
): Promise<void> {
  const handle = await directory.getFileHandle(name, { create: true }) as WritableFileHandle;
  const writable = await handle.createWritable();
  try {
    await writable.write(`${JSON.stringify(value, null, 2)}\n`);
  } finally {
    await writable.close();
  }
}

export async function writeWebProjectDirectory(
  handle: PermissionDirectoryHandle,
  project: Pick<WebProjectSession, 'settings' | 'zones' | 'points'>
): Promise<void> {
  if (!await ensureReadWritePermission(handle)) {
    throw new Error('项目已保存到浏览器数据库，但所选目录的写入权限不可用。');
  }
  const information = await handle.getDirectoryHandle('information', { create: true });
  await writeJsonFile(information, 'settings.json', project.settings);
  await writeJsonFile(information, 'zones.json', project.zones);
  await writeJsonFile(information, 'points.json', project.points);
}

export async function deleteWebProjectJsonFiles(handle: PermissionDirectoryHandle): Promise<number> {
  if (!await ensureReadWritePermission(handle)) {
    throw new Error('未获得所选项目目录的写入权限。');
  }
  const information = await optionalDirectory(handle, 'information');
  if (!information) return 0;
  let deleted = 0;
  for (const name of ['settings.json', 'zones.json', 'points.json']) {
    try {
      await information.removeEntry(name);
      deleted += 1;
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'NotFoundError')) throw error;
    }
  }
  return deleted;
}

export async function importWebProjectFiles(): Promise<WebProjectSession | null> {
  const files = await selectWebProjectFiles();
  if (!files.length) return null;
  return createWebProjectSession(files, { sourceKind: 'import' });
}

export async function selectWebTextFile(accept: string): Promise<File | null> {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
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
