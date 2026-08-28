import type {
  CloudProjectRevisionWrite,
  CloudProjectStore,
  StoredCloudProjectDocument,
  StoredCloudProjectMetadata
} from './cloud-project-contracts.js';
import { CLOUD_PROJECT_SCHEMA_STATEMENTS } from './cloud-project-schema.js';
import type { D1DatabaseLike, D1RunResult } from './d1-store.js';

interface CloudProjectRow {
  id: string;
  owner_id: string;
  name: string;
  revision: number;
  format_version: number;
  byte_size: number;
  content_sha256: string;
  created_at: string;
  updated_at: string;
}

interface CloudProjectChunkRow {
  content_text: string;
}

function changes(result: D1RunResult | undefined): number {
  return Number(result?.meta?.changes || 0);
}

function metadataFromRow(row: CloudProjectRow): StoredCloudProjectMetadata {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    revision: Number(row.revision),
    formatVersion: 1,
    byteSize: Number(row.byte_size),
    contentSha256: row.content_sha256,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function cloneMetadata(metadata: StoredCloudProjectMetadata): StoredCloudProjectMetadata {
  return { ...metadata };
}

export async function ensureCloudProjectSchema(database: D1DatabaseLike): Promise<void> {
  for (const statement of CLOUD_PROJECT_SCHEMA_STATEMENTS) {
    await database.prepare(statement).run();
  }
}

export class D1CloudProjectStore implements CloudProjectStore {
  readonly #database: D1DatabaseLike;

  constructor(database: D1DatabaseLike) {
    this.#database = database;
  }

  async countOwned(ownerId: string): Promise<number> {
    const row = await this.#database.prepare(
      'SELECT COUNT(*) AS count FROM cloud_projects WHERE owner_id = ?'
    ).bind(ownerId).first<{ count: number }>();
    return Number(row?.count || 0);
  }

  async listOwned(ownerId: string): Promise<StoredCloudProjectMetadata[]> {
    const result = await this.#database.prepare(`SELECT id, owner_id, name, revision,
      format_version, byte_size, content_sha256, created_at, updated_at
      FROM cloud_projects WHERE owner_id = ? ORDER BY updated_at DESC, id`)
      .bind(ownerId)
      .all<CloudProjectRow>();
    return (result.results || []).map(metadataFromRow);
  }

  async create(metadata: StoredCloudProjectMetadata): Promise<void> {
    await this.#database.prepare(`INSERT INTO cloud_projects (
      id, owner_id, name, revision, format_version, byte_size,
      content_sha256, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
      metadata.id,
      metadata.ownerId,
      metadata.name,
      metadata.revision,
      metadata.formatVersion,
      metadata.byteSize,
      metadata.contentSha256,
      metadata.createdAt,
      metadata.updatedAt
    ).run();
  }

  async getOwned(ownerId: string, projectId: string): Promise<StoredCloudProjectMetadata | null> {
    const row = await this.#database.prepare(`SELECT id, owner_id, name, revision,
      format_version, byte_size, content_sha256, created_at, updated_at
      FROM cloud_projects WHERE owner_id = ? AND id = ? LIMIT 1`)
      .bind(ownerId, projectId)
      .first<CloudProjectRow>();
    return row ? metadataFromRow(row) : null;
  }

  async readOwned(ownerId: string, projectId: string): Promise<StoredCloudProjectDocument | null> {
    const metadata = await this.getOwned(ownerId, projectId);
    if (!metadata) return null;
    if (!metadata.revision) return { metadata, serializedSnapshot: '' };
    const result = await this.#database.prepare(`SELECT content_text
      FROM cloud_project_chunks
      WHERE project_id = ? AND revision = ?
      ORDER BY chunk_index`).bind(projectId, metadata.revision).all<CloudProjectChunkRow>();
    return {
      metadata,
      serializedSnapshot: (result.results || []).map(row => row.content_text).join('')
    };
  }

  async writeRevision(input: CloudProjectRevisionWrite): Promise<StoredCloudProjectMetadata> {
    const statements = [
      this.#database.prepare(`INSERT INTO cloud_project_revisions (
        project_id, owner_id, revision, created_by, format_version,
        byte_size, content_sha256, chunk_count, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        input.projectId,
        input.ownerId,
        input.revision,
        input.createdBy,
        input.formatVersion,
        input.byteSize,
        input.contentSha256,
        input.chunks.length,
        input.createdAt
      ),
      ...input.chunks.map((chunk, index) => this.#database.prepare(`INSERT INTO cloud_project_chunks (
        project_id, revision, chunk_index, content_text
      ) VALUES (?, ?, ?, ?)`).bind(input.projectId, input.revision, index, chunk)),
      this.#database.prepare(`UPDATE cloud_projects
        SET revision = ?, format_version = ?, byte_size = ?, content_sha256 = ?, updated_at = ?
        WHERE id = ? AND owner_id = ? AND revision = ?`).bind(
        input.revision,
        input.formatVersion,
        input.byteSize,
        input.contentSha256,
        input.createdAt,
        input.projectId,
        input.ownerId,
        input.expectedRevision
      )
    ];
    const results = await this.#database.batch(statements);
    if (changes(results.at(-1)) !== 1) throw new Error('CLOUD_PROJECT_CONFLICT');
    const metadata = await this.getOwned(input.ownerId, input.projectId);
    if (!metadata) throw new Error('CLOUD_PROJECT_NOT_FOUND');
    return metadata;
  }
}

export class InMemoryCloudProjectStore implements CloudProjectStore {
  readonly #projects = new Map<string, StoredCloudProjectMetadata>();
  readonly #documents = new Map<string, string>();

  #key(ownerId: string, projectId: string): string {
    return `${ownerId}\u0000${projectId}`;
  }

  async countOwned(ownerId: string): Promise<number> {
    return [...this.#projects.values()].filter(item => item.ownerId === ownerId).length;
  }

  async listOwned(ownerId: string): Promise<StoredCloudProjectMetadata[]> {
    return [...this.#projects.values()]
      .filter(item => item.ownerId === ownerId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || left.id.localeCompare(right.id))
      .map(cloneMetadata);
  }

  async create(metadata: StoredCloudProjectMetadata): Promise<void> {
    const key = this.#key(metadata.ownerId, metadata.id);
    if (this.#projects.has(key)) throw new Error('CLOUD_PROJECT_CONFLICT');
    this.#projects.set(key, cloneMetadata(metadata));
  }

  async getOwned(ownerId: string, projectId: string): Promise<StoredCloudProjectMetadata | null> {
    const metadata = this.#projects.get(this.#key(ownerId, projectId));
    return metadata ? cloneMetadata(metadata) : null;
  }

  async readOwned(ownerId: string, projectId: string): Promise<StoredCloudProjectDocument | null> {
    const metadata = await this.getOwned(ownerId, projectId);
    if (!metadata) return null;
    return {
      metadata,
      serializedSnapshot: this.#documents.get(this.#key(ownerId, projectId)) || ''
    };
  }

  async writeRevision(input: CloudProjectRevisionWrite): Promise<StoredCloudProjectMetadata> {
    const key = this.#key(input.ownerId, input.projectId);
    const current = this.#projects.get(key);
    if (!current) throw new Error('CLOUD_PROJECT_NOT_FOUND');
    if (current.revision !== input.expectedRevision || input.revision !== current.revision + 1) {
      throw new Error('CLOUD_PROJECT_CONFLICT');
    }
    const updated: StoredCloudProjectMetadata = {
      ...current,
      revision: input.revision,
      formatVersion: input.formatVersion,
      byteSize: input.byteSize,
      contentSha256: input.contentSha256,
      updatedAt: input.createdAt
    };
    this.#projects.set(key, updated);
    this.#documents.set(key, input.chunks.join(''));
    return cloneMetadata(updated);
  }
}
