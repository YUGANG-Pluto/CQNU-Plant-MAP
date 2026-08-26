import type {
  PlatformAdapter,
  PlatformServiceApi,
  ManagementWorkspaceAccess
} from '../../shared/types/platform';
import { createElectronPlatformAdapter } from './electronAdapter';
import { createWebPlatformAdapter } from './webAdapter';

declare global {
  interface Window {
    plantApp?: PlatformServiceApi;
    platformAdapter?: PlatformAdapter;
    managementAccess?: Readonly<ManagementWorkspaceAccess>;
    cqnuLocalProfile?: {
      read(accountId: string): string;
    };
  }
}

export function createPlatformAdapter(services?: PlatformServiceApi): PlatformAdapter {
  return services
    ? createElectronPlatformAdapter(services)
    : createWebPlatformAdapter();
}

export function installPlatformAdapter(): PlatformAdapter {
  if (window.platformAdapter) return window.platformAdapter;
  const adapter = createPlatformAdapter(window.plantApp);
  Object.defineProperty(window, 'platformAdapter', {
    configurable: false,
    enumerable: false,
    writable: false,
    value: adapter
  });
  document.documentElement.dataset.platformRuntime = adapter.runtime;
  document.documentElement.classList.toggle('platform-read-only', adapter.capabilities.readOnly);
  if (adapter.runtime === 'web' && 'serviceWorker' in navigator && /^https?:$/.test(window.location.protocol)) {
    void navigator.serviceWorker.register('/workspace-service-worker.js', { scope: '/' }).catch(() => undefined);
  }
  return adapter;
}
