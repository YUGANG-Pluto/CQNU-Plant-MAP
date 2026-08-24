export type WebRuntimeMode = 'full' | 'portable' | 'blocked';

export type WebRuntimeCapabilityId =
  | 'webAssembly'
  | 'worker'
  | 'opfs'
  | 'webLocks'
  | 'indexedDb'
  | 'cacheStorage'
  | 'secureRandom'
  | 'directoryPicker'
  | 'fileSelection'
  | 'downloads';

export interface WebRuntimeCapabilityItem {
  id: WebRuntimeCapabilityId;
  available: boolean;
  required: boolean;
}

export interface WebRuntimeCapabilityReport {
  mode: WebRuntimeMode;
  workspaceReady: boolean;
  directoryMirrorAvailable: boolean;
  portableBackupAvailable: boolean;
  missingRequired: WebRuntimeCapabilityId[];
  items: WebRuntimeCapabilityItem[];
}

export interface WebCapabilityEnvironment {
  webAssembly: boolean;
  worker: boolean;
  opfs: boolean;
  webLocks: boolean;
  indexedDb: boolean;
  cacheStorage: boolean;
  secureRandom: boolean;
  directoryPicker: boolean;
  fileSelection: boolean;
  downloads: boolean;
}

function currentEnvironment(): WebCapabilityEnvironment {
  const hasWindow = typeof window !== 'undefined';
  const hasDocument = typeof document !== 'undefined';
  const hasNavigator = typeof navigator !== 'undefined';
  return {
    webAssembly: typeof WebAssembly === 'object',
    worker: typeof Worker === 'function',
    opfs: hasNavigator && typeof navigator.storage?.getDirectory === 'function',
    webLocks: hasNavigator && typeof navigator.locks?.request === 'function',
    indexedDb: typeof indexedDB === 'object',
    cacheStorage: typeof caches === 'object',
    secureRandom: typeof crypto === 'object' && typeof crypto.randomUUID === 'function',
    directoryPicker: hasWindow
      && typeof (window as Window & { showDirectoryPicker?: unknown }).showDirectoryPicker === 'function',
    fileSelection: hasDocument && typeof document.createElement === 'function',
    downloads: hasWindow
      && hasDocument
      && typeof URL?.createObjectURL === 'function'
      && typeof Blob === 'function'
  };
}

export function assessWebRuntimeCapabilities(
  environment: WebCapabilityEnvironment = currentEnvironment()
): WebRuntimeCapabilityReport {
  const definitions: Array<[WebRuntimeCapabilityId, boolean, boolean]> = [
    ['webAssembly', environment.webAssembly, true],
    ['worker', environment.worker, true],
    ['opfs', environment.opfs, true],
    ['webLocks', environment.webLocks, true],
    ['indexedDb', environment.indexedDb, true],
    ['cacheStorage', environment.cacheStorage, true],
    ['secureRandom', environment.secureRandom, true],
    ['directoryPicker', environment.directoryPicker, false],
    ['fileSelection', environment.fileSelection, true],
    ['downloads', environment.downloads, true]
  ];
  const items = definitions.map(([id, available, required]) => ({ id, available, required }));
  const missingRequired = items
    .filter(item => item.required && !item.available)
    .map(item => item.id);
  const workspaceReady = missingRequired.length === 0;
  return {
    mode: workspaceReady
      ? environment.directoryPicker ? 'full' : 'portable'
      : 'blocked',
    workspaceReady,
    directoryMirrorAvailable: workspaceReady && environment.directoryPicker,
    portableBackupAvailable: workspaceReady && environment.fileSelection && environment.downloads,
    missingRequired,
    items
  };
}

export function webRuntimeUnavailableMessage(report: WebRuntimeCapabilityReport): string {
  if (report.workspaceReady) return '';
  return `当前浏览器缺少本地工作区所需能力：${report.missingRequired.join(', ')}。请使用最新版 Chromium 浏览器，或改用桌面版。`;
}
