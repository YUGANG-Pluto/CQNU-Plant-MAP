export interface CloudProjectSnapshot {
  formatVersion?: 1;
  settings: Record<string, unknown>;
  zones: Record<string, unknown>[];
  points: Record<string, unknown>[];
}

export interface CloudProjectMetadata {
  id: string;
  name: string;
  revision: number;
  formatVersion: 1;
  byteSize: number;
  contentSha256: string;
  createdAt: string;
  updatedAt: string;
}

export interface CloudProjectDocument {
  metadata: CloudProjectMetadata;
  snapshot: CloudProjectSnapshot | null;
}

export interface CloudProjectSourceMetadata {
  projectId: string;
  revision: number;
  contentSha256: string;
  syncedAt: string;
}

export interface CloudProjectRevisionMetadata {
  projectId: string;
  revision: number;
  formatVersion: 1;
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

export interface SiteCloudProjectClient {
  readonly version: 'site-cloud-projects-v1';
  list(): Promise<CloudProjectMetadata[]>;
  usage(): Promise<CloudProjectUsage>;
  create(name: string): Promise<CloudProjectMetadata>;
  read(projectId: string): Promise<CloudProjectDocument>;
  rename(projectId: string, expectedRevision: number, name: string): Promise<CloudProjectMetadata>;
  remove(projectId: string, expectedRevision: number): Promise<{ deleted: true; projectId: string }>;
  save(
    projectId: string,
    expectedRevision: number,
    snapshot: CloudProjectSnapshot
  ): Promise<CloudProjectMetadata>;
  revisions(projectId: string): Promise<CloudProjectRevisionMetadata[]>;
  restore(projectId: string, revision: number, expectedRevision: number): Promise<CloudProjectMetadata>;
}

export interface ProjectRendererBridge {
  readonly version: 'project-renderer-bridge-v1';
  snapshot(): CloudProjectSnapshot | null;
  backupCurrentProject(label?: string): Promise<{ filePath: string }>;
  updateCloudSource(metadata: CloudProjectMetadata): Promise<void>;
  importCloudProject(document: CloudProjectDocument): Promise<void>;
}
