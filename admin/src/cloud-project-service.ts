import {
  CLOUD_PROJECT_CHUNK_UNITS,
  CLOUD_PROJECT_FORMAT_VERSION,
  CLOUD_PROJECT_MAX_BYTES,
  CLOUD_PROJECT_MAX_PER_ACCOUNT,
  type CloudProjectClock,
  type CloudProjectMetadata,
  type CloudProjectRecord,
  type CloudProjectRevisionMetadata,
  type CloudProjectSnapshot,
  type CloudProjectStore,
  type CloudProjectUsage,
  type StoredCloudProjectUsage
} from './cloud-project-contracts.js';
import { randomBase64Url } from './keyring.js';
import { assertCloudProjectSnapshotSafe } from './cloud-project-safety.js';

export interface CloudProjectDocument {
  metadata: CloudProjectMetadata;
  snapshot: CloudProjectSnapshot | null;
}

export interface SaveCloudProjectInput {
  ownerId: string;
  actorId: string;
  projectId: string;
  expectedRevision: number;
  snapshot: unknown;
  forceRevision?: boolean;
}

const defaultClock: CloudProjectClock = {
  now: () => new Date(),
  randomId: prefix => `${prefix}_${randomBase64Url(18)}`
};

function publicMetadata(metadata: CloudProjectMetadata & { ownerId?: string }): CloudProjectMetadata {
  return {
    id: metadata.id,
    name: metadata.name,
    revision: metadata.revision,
    formatVersion: metadata.formatVersion,
    byteSize: metadata.byteSize,
    contentSha256: metadata.contentSha256,
    createdAt: metadata.createdAt,
    updatedAt: metadata.updatedAt
  };
}

function record(value: unknown): CloudProjectRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as CloudProjectRecord
    : {};
}

function records(value: unknown): CloudProjectRecord[] {
  if (!Array.isArray(value)) throw new Error('CLOUD_PROJECT_INVALID');
  if (value.some(item => !item || typeof item !== 'object' || Array.isArray(item))) {
    throw new Error('CLOUD_PROJECT_INVALID');
  }
  return value as CloudProjectRecord[];
}

function normalizedName(value: unknown): string {
  const name = String(value || '').trim().replace(/\s+/gu, ' ');
  if (!name || name.length > 80 || /[\u0000-\u001f\u007f]/u.test(name)) {
    throw new Error('CLOUD_PROJECT_NAME_INVALID');
  }
  return name;
}

function normalizeSnapshot(value: unknown): CloudProjectSnapshot {
  const input = record(value);
  if (!Object.keys(input).length) throw new Error('CLOUD_PROJECT_INVALID');
  const snapshot = {
    formatVersion: CLOUD_PROJECT_FORMAT_VERSION,
    settings: record(input.settings),
    zones: records(input.zones),
    points: records(input.points)
  };
  assertCloudProjectSnapshotSafe(snapshot);
  return snapshot;
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
}

async function verifiedSnapshot(
  serializedSnapshot: string,
  metadata: { byteSize: number; contentSha256: string }
): Promise<CloudProjectSnapshot> {
  const bytes = new TextEncoder().encode(serializedSnapshot).byteLength;
  if (bytes !== metadata.byteSize) throw new Error('CLOUD_PROJECT_INTEGRITY_FAILED');
  if (await sha256Hex(serializedSnapshot) !== metadata.contentSha256) {
    throw new Error('CLOUD_PROJECT_INTEGRITY_FAILED');
  }
  try {
    return normalizeSnapshot(JSON.parse(serializedSnapshot) as unknown);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('CLOUD_PROJECT_')) throw error;
    throw new Error('CLOUD_PROJECT_INTEGRITY_FAILED');
  }
}

function publicUsage(usage: StoredCloudProjectUsage): CloudProjectUsage {
  return {
    projectCount: usage.projectCount,
    maxProjects: CLOUD_PROJECT_MAX_PER_ACCOUNT,
    currentBytes: usage.currentBytes,
    versionBytes: usage.versionBytes,
    maxSnapshotBytes: CLOUD_PROJECT_MAX_BYTES,
    updatedAt: usage.updatedAt
  };
}

function chunks(text: string): string[] {
  const result: string[] = [];
  for (let index = 0; index < text.length; index += CLOUD_PROJECT_CHUNK_UNITS) {
    result.push(text.slice(index, index + CLOUD_PROJECT_CHUNK_UNITS));
  }
  return result.length ? result : [''];
}

export class CloudProjectService {
  readonly #store: CloudProjectStore;
  readonly #clock: CloudProjectClock;

  constructor(store: CloudProjectStore, clock: CloudProjectClock = defaultClock) {
    this.#store = store;
    this.#clock = clock;
  }

  async list(ownerId: string): Promise<CloudProjectMetadata[]> {
    return (await this.#store.listOwned(ownerId)).map(publicMetadata);
  }

  async usage(ownerId: string): Promise<CloudProjectUsage> {
    return publicUsage(await this.#store.usageOwned(ownerId));
  }

  async listUsage(): Promise<Array<CloudProjectUsage & { ownerId: string }>> {
    return (await this.#store.listUsage()).map(item => ({
      ownerId: item.ownerId,
      ...publicUsage(item)
    }));
  }

  async create(ownerId: string, name: unknown): Promise<CloudProjectMetadata> {
    if (await this.#store.countOwned(ownerId) >= CLOUD_PROJECT_MAX_PER_ACCOUNT) {
      throw new Error('CLOUD_PROJECT_LIMIT_REACHED');
    }
    const now = this.#clock.now().toISOString();
    const metadata = {
      id: this.#clock.randomId('cloud_project'),
      ownerId,
      name: normalizedName(name),
      revision: 0,
      formatVersion: CLOUD_PROJECT_FORMAT_VERSION,
      byteSize: 0,
      contentSha256: '',
      createdAt: now,
      updatedAt: now
    } as const;
    await this.#store.create(metadata);
    return publicMetadata(metadata);
  }

  async read(ownerId: string, projectId: string): Promise<CloudProjectDocument> {
    const document = await this.#store.readOwned(ownerId, projectId);
    if (!document) throw new Error('CLOUD_PROJECT_NOT_FOUND');
    if (!document.metadata.revision) {
      return { metadata: publicMetadata(document.metadata), snapshot: null };
    }
    return {
      metadata: publicMetadata(document.metadata),
      snapshot: await verifiedSnapshot(document.serializedSnapshot, document.metadata)
    };
  }

  async revisions(ownerId: string, projectId: string): Promise<CloudProjectRevisionMetadata[]> {
    if (!await this.#store.getOwned(ownerId, projectId)) throw new Error('CLOUD_PROJECT_NOT_FOUND');
    return this.#store.listRevisionsOwned(ownerId, projectId);
  }

  async rename(
    ownerId: string,
    projectId: string,
    expectedRevision: number,
    name: unknown
  ): Promise<CloudProjectMetadata> {
    if (!Number.isInteger(expectedRevision) || expectedRevision < 0) {
      throw new Error('CLOUD_PROJECT_INVALID');
    }
    return publicMetadata(await this.#store.renameOwned(
      ownerId,
      projectId,
      expectedRevision,
      normalizedName(name),
      this.#clock.now().toISOString()
    ));
  }

  async delete(ownerId: string, projectId: string, expectedRevision: number): Promise<void> {
    if (!Number.isInteger(expectedRevision) || expectedRevision < 0) {
      throw new Error('CLOUD_PROJECT_INVALID');
    }
    await this.#store.deleteOwned(ownerId, projectId, expectedRevision);
  }

  async restore(
    ownerId: string,
    actorId: string,
    projectId: string,
    revision: number,
    expectedRevision: number
  ): Promise<CloudProjectMetadata> {
    if (!Number.isInteger(revision) || revision < 1) throw new Error('CLOUD_PROJECT_REVISION_INVALID');
    const stored = await this.#store.readRevisionOwned(ownerId, projectId, revision);
    if (!stored) throw new Error('CLOUD_PROJECT_REVISION_NOT_FOUND');
    const snapshot = await verifiedSnapshot(stored.serializedSnapshot, stored.metadata);
    return this.save({ ownerId, actorId, projectId, expectedRevision, snapshot, forceRevision: true });
  }

  async save(input: SaveCloudProjectInput): Promise<CloudProjectMetadata> {
    if (!Number.isInteger(input.expectedRevision) || input.expectedRevision < 0) {
      throw new Error('CLOUD_PROJECT_INVALID');
    }
    const current = await this.#store.getOwned(input.ownerId, input.projectId);
    if (!current) throw new Error('CLOUD_PROJECT_NOT_FOUND');
    if (current.revision !== input.expectedRevision) throw new Error('CLOUD_PROJECT_CONFLICT');
    const snapshot = normalizeSnapshot(input.snapshot);
    const serialized = JSON.stringify(snapshot);
    const byteSize = new TextEncoder().encode(serialized).byteLength;
    if (byteSize > CLOUD_PROJECT_MAX_BYTES) throw new Error('CLOUD_PROJECT_TOO_LARGE');
    const contentSha256 = await sha256Hex(serialized);
    if (!input.forceRevision
      && current.revision > 0
      && current.byteSize === byteSize
      && current.contentSha256 === contentSha256) {
      return publicMetadata(current);
    }
    const createdAt = this.#clock.now().toISOString();
    return publicMetadata(await this.#store.writeRevision({
      projectId: input.projectId,
      ownerId: input.ownerId,
      createdBy: input.actorId,
      expectedRevision: input.expectedRevision,
      revision: input.expectedRevision + 1,
      formatVersion: CLOUD_PROJECT_FORMAT_VERSION,
      byteSize,
      contentSha256,
      createdAt,
      chunks: chunks(serialized)
    }));
  }
}
