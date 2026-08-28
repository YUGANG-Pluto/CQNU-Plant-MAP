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

export interface SiteCloudProjectClient {
  readonly version: 'site-cloud-projects-v1';
  list(): Promise<CloudProjectMetadata[]>;
  create(name: string): Promise<CloudProjectMetadata>;
  read(projectId: string): Promise<CloudProjectDocument>;
  save(
    projectId: string,
    expectedRevision: number,
    snapshot: CloudProjectSnapshot
  ): Promise<CloudProjectMetadata>;
}

export interface ProjectRendererBridge {
  readonly version: 'project-renderer-bridge-v1';
  snapshot(): CloudProjectSnapshot | null;
  importCloudProject(document: CloudProjectDocument): Promise<void>;
}
