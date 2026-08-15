import type {
  SpeciesReferenceImageCompareInput,
  SpeciesReferenceQueryInput,
  SpeciesReferenceResult,
  TaxonomyReferenceInput,
  TaxonomyReferenceResult
} from './species-reference';

export interface IpcSuccess<T = unknown> {
  ok: true;
  data: T;
}

export interface IpcFailure {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

export type IpcResponse<T = unknown> = IpcSuccess<T> | IpcFailure;

export interface StorageConversionPayload {
  projectDir: string;
  backupDir?: string;
}

export interface StorageArtifactDeletePayload {
  projectDir: string;
  backupDir?: string;
  backupPaths?: string[];
  backupNames?: string[];
  deleteSqliteDatabase?: boolean;
  deleteJsonFiles?: boolean;
  allowDeleteOnlyStorage?: boolean;
}

export interface StorageConversionCounts {
  settings: number;
  zones: number;
  points: number;
  phenologyEntries: number;
  imageReferences: number;
  taxonomyCandidates: number;
}

export interface StorageConversionPreflight {
  ok: boolean;
  version: string;
  projectDir: string;
  databaseExists: boolean;
  jsonFilesExist: boolean;
  activeStorageFormat: string;
  databaseFile: string;
  reportFile: string;
  counts: Record<string, number>;
  compatibility: Record<string, number>;
  safety: {
    backupRequired: boolean;
    writesProjectDatabase: boolean;
    keepsJsonFiles: boolean;
    rendererDatabaseAccess: false;
    exposesSql: false;
  };
  errors: string[];
  warnings: string[];
}

export interface StorageConversionReport {
  version: string;
  direction: 'json-to-sqlite' | 'sqlite-to-json' | string;
  generatedAt: string;
  databaseFile: string;
  reportFile: string;
  backupFile: string;
  projectChanged: boolean;
  rendererDatabaseAccess: boolean;
  exposesSql: boolean;
  sourceFormat: string;
  targetFormat: string;
  status: string;
  counts: StorageConversionCounts;
  schema: {
    ok: boolean;
    missingTables: string[];
    missingColumns: object;
  };
  warnings: string[];
}

export interface StorageArtifactInfo {
  name: string;
  exists: boolean;
  size: number;
  modifiedAt: string;
}

export interface StorageArtifactInventory {
  version: string;
  projectDir: string;
  activeStorageFormat: string;
  databaseFile: string;
  jsonFiles: StorageArtifactInfo[];
  jsonFilesExist: boolean;
  sqliteDatabase: StorageArtifactInfo;
  databaseExists: boolean;
  availableStorageFormats: string[];
  backupDir: string;
  backupFiles: unknown[];
  warnings: string[];
}

type IpcCommand<TPayload = unknown, TResult = unknown> = (payload: TPayload) => Promise<IpcResponse<TResult>>;
type IpcNoPayloadCommand<TResult = unknown> = () => Promise<IpcResponse<TResult>>;

export interface PlantAppApi {
  project: Record<string, IpcCommand | IpcNoPayloadCommand>;
  settings: Record<string, IpcCommand>;
  image: Record<string, IpcCommand>;
  backup: Record<string, IpcCommand | IpcNoPayloadCommand>;
  log: Record<string, IpcCommand>;
  maintenance: Record<string, IpcCommand>;
  storage: {
    conversionPreflight: IpcCommand<StorageConversionPayload, StorageConversionPreflight>;
    listArtifacts: IpcCommand<StorageConversionPayload, StorageArtifactInventory>;
    deleteArtifacts: IpcCommand<StorageArtifactDeletePayload, unknown>;
    createSqliteFromJson: IpcCommand<StorageConversionPayload, StorageConversionReport>;
    exportSqliteToJson: IpcCommand<StorageConversionPayload, StorageConversionReport>;
  };
  species: {
    referenceQuery: IpcCommand<SpeciesReferenceQueryInput, SpeciesReferenceResult>;
    suggestTaxonomy: IpcCommand<TaxonomyReferenceInput, TaxonomyReferenceResult>;
    imageCompare: IpcCommand<SpeciesReferenceImageCompareInput, SpeciesReferenceResult>;
  };
  window: Record<string, IpcCommand | IpcNoPayloadCommand>;
}
