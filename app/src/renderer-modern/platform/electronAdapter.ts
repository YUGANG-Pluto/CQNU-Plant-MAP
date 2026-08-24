import type {
  PlatformAdapter,
  PlatformCapabilities,
  PlatformServiceApi
} from '../../shared/types/platform';

const ELECTRON_CAPABILITIES: Readonly<PlatformCapabilities> = Object.freeze({
  readProject: true,
  writeProject: true,
  importRecords: true,
  exportFiles: true,
  sqliteStorage: true,
  backups: true,
  diagnostics: true,
  speciesReference: true,
  externalLinks: true,
  nativeWindow: true,
  readOnly: false
});

export function createElectronPlatformAdapter(services: PlatformServiceApi): PlatformAdapter {
  return Object.freeze({
    runtime: 'electron' as const,
    capabilities: ELECTRON_CAPABILITIES,
    ...services
  });
}
