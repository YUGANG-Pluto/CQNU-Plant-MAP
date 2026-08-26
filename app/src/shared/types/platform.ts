import type {
  SpeciesReferenceImageCompareInput,
  SpeciesReferenceQueryInput,
  SpeciesReferenceResult,
  TaxonomyReferenceInput,
  TaxonomyReferenceResult
} from './species-reference';

export interface PlatformSuccess<T = unknown> {
  ok: true;
  data: T;
}

export interface PlatformFailure {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

export type PlatformResponse<T = unknown> = PlatformSuccess<T> | PlatformFailure;
export type PlatformCommand<TResult = unknown> = (payload?: unknown) => Promise<PlatformResponse<TResult>>;
export type PlatformPayloadCommand<TPayload, TResult = unknown> = (
  payload: TPayload
) => Promise<PlatformResponse<TResult>>;
export type PlatformNoPayloadCommand<TResult = unknown> = () => Promise<PlatformResponse<TResult>>;

export interface PlatformServiceApi {
  project: {
    chooseDir: PlatformNoPayloadCommand;
    choosePortableDir?: PlatformNoPayloadCommand;
    chooseMergeDir: PlatformNoPayloadCommand;
    load: PlatformCommand;
    save: PlatformCommand;
    getModifiedTime: PlatformCommand;
    importCsv: PlatformNoPayloadCommand;
    exportCsv: PlatformCommand;
    importGeoJson: PlatformNoPayloadCommand;
    exportGeoJson: PlatformCommand;
    exportMarkdown: PlatformCommand;
    exportSvg: PlatformCommand;
  };
  settings: {
    importJson: PlatformCommand;
    exportJson: PlatformCommand;
  };
  image: {
    import: PlatformCommand;
    delete: PlatformCommand;
  };
  backup: {
    chooseDir: PlatformNoPayloadCommand;
    create: PlatformCommand;
    inspectRestore: PlatformCommand;
    restore: PlatformCommand;
    importArchive?: PlatformCommand;
    restoreImported?: PlatformCommand;
    listExpired: PlatformCommand;
    keepExpired: PlatformCommand;
    deleteExpired: PlatformCommand;
  };
  log: {
    report: PlatformCommand;
    setLevel: PlatformCommand;
    listRecent: PlatformCommand;
    readLog: PlatformCommand;
    deleteLogs: PlatformCommand;
    cleanup: PlatformCommand;
    exportDiagnostics: PlatformCommand;
  };
  maintenance: {
    checkImageRefs: PlatformCommand;
  };
  storage: {
    conversionPreflight: PlatformCommand;
    listArtifacts: PlatformCommand;
    deleteArtifacts: PlatformCommand;
    createSqliteFromJson: PlatformCommand;
    exportSqliteToJson: PlatformCommand;
  };
  species: {
    referenceQuery: PlatformPayloadCommand<SpeciesReferenceQueryInput, SpeciesReferenceResult>;
    suggestTaxonomy: PlatformPayloadCommand<TaxonomyReferenceInput, TaxonomyReferenceResult>;
    imageCompare: PlatformPayloadCommand<SpeciesReferenceImageCompareInput, SpeciesReferenceResult>;
  };
  window: {
    toggleFullscreen: PlatformNoPayloadCommand;
    openExternal: PlatformCommand;
  };
}

export type PlatformRuntime = 'electron' | 'web';

export interface ManagementWorkspaceAccess {
  accountId: string;
  username: string;
  displayName: string;
  accountKind: 'user' | 'admin';
  accessLevel: 'read' | 'edit' | 'save';
  capabilities: readonly string[];
  absoluteExpiresAt: string;
  avatarDataUrl?: string;
}

export interface PlatformCapabilities {
  readProject: boolean;
  writeProject: boolean;
  importRecords: boolean;
  exportFiles: boolean;
  sqliteStorage: boolean;
  backups: boolean;
  diagnostics: boolean;
  speciesReference: boolean;
  externalLinks: boolean;
  nativeWindow: boolean;
  readOnly: boolean;
  externalBackupImport?: boolean;
  directoryMirror?: boolean;
}

export interface PlatformWebCapabilityReport {
  mode: 'full' | 'portable' | 'blocked';
  workspaceReady: boolean;
  directoryMirrorAvailable: boolean;
  portableBackupAvailable: boolean;
  missingRequired: string[];
  items: Array<{
    id: string;
    available: boolean;
    required: boolean;
  }>;
}

export interface PlatformAdapter extends PlatformServiceApi {
  runtime: PlatformRuntime;
  capabilities: Readonly<PlatformCapabilities>;
  web?: {
    capabilityReport: Readonly<PlatformWebCapabilityReport>;
    managementAccess?: Readonly<ManagementWorkspaceAccess>;
  };
}
