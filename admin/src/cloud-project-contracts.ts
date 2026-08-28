export const CLOUD_PROJECT_FORMAT_VERSION = 1 as const;
export const CLOUD_PROJECT_MAX_BYTES = 8 * 1024 * 1024;
export const CLOUD_PROJECT_MAX_PER_ACCOUNT = 25;
export const CLOUD_PROJECT_CHUNK_UNITS = 256_000;

export type CloudProjectRecord = Record<string, unknown>;

export interface CloudProjectSnapshot {
  formatVersion: typeof CLOUD_PROJECT_FORMAT_VERSION;
  settings: CloudProjectRecord;
  zones: CloudProjectRecord[];
  points: CloudProjectRecord[];
}

export interface CloudProjectMetadata {
  id: string;
  name: string;
  revision: number;
  formatVersion: typeof CLOUD_PROJECT_FORMAT_VERSION;
  byteSize: number;
  contentSha256: string;
  createdAt: string;
  updatedAt: string;
}

export interface CloudProjectRevisionMetadata {
  projectId: string;
  revision: number;
  formatVersion: typeof CLOUD_PROJECT_FORMAT_VERSION;
  byteSize: number;
  contentSha256: string;
  createdAt: string;
}

export interface CloudProjectUsage {
  projectCount: number;
  maxProjects: number;
  currentBytes: number;
  versionBytes: number;
  maxSnapshotBytes: number;
  updatedAt: string | null;
}

export interface StoredCloudProjectUsage {
  ownerId: string;
  projectCount: number;
  currentBytes: number;
  versionBytes: number;
  updatedAt: string | null;
}

export interface StoredCloudProjectMetadata extends CloudProjectMetadata {
  ownerId: string;
}

export interface CloudProjectRevisionWrite {
  projectId: string;
  ownerId: string;
  createdBy: string;
  expectedRevision: number;
  revision: number;
  formatVersion: typeof CLOUD_PROJECT_FORMAT_VERSION;
  byteSize: number;
  contentSha256: string;
  createdAt: string;
  chunks: string[];
}

export interface StoredCloudProjectDocument {
  metadata: StoredCloudProjectMetadata;
  serializedSnapshot: string;
}

export interface StoredCloudProjectRevisionDocument {
  metadata: CloudProjectRevisionMetadata;
  serializedSnapshot: string;
}

export interface CloudProjectStore {
  countOwned(ownerId: string): Promise<number>;
  listOwned(ownerId: string): Promise<StoredCloudProjectMetadata[]>;
  usageOwned(ownerId: string): Promise<StoredCloudProjectUsage>;
  listUsage(): Promise<StoredCloudProjectUsage[]>;
  create(metadata: StoredCloudProjectMetadata): Promise<void>;
  getOwned(ownerId: string, projectId: string): Promise<StoredCloudProjectMetadata | null>;
  readOwned(ownerId: string, projectId: string): Promise<StoredCloudProjectDocument | null>;
  listRevisionsOwned(ownerId: string, projectId: string): Promise<CloudProjectRevisionMetadata[]>;
  readRevisionOwned(ownerId: string, projectId: string, revision: number): Promise<StoredCloudProjectRevisionDocument | null>;
  renameOwned(ownerId: string, projectId: string, expectedRevision: number, name: string, updatedAt: string): Promise<StoredCloudProjectMetadata>;
  deleteOwned(ownerId: string, projectId: string, expectedRevision: number): Promise<void>;
  writeRevision(input: CloudProjectRevisionWrite): Promise<StoredCloudProjectMetadata>;
}

export interface CloudProjectClock {
  now(): Date;
  randomId(prefix: string): string;
}
