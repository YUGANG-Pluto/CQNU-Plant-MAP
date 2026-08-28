import type {
  CloudProjectRevisionMetadata,
  CloudProjectRevisionWrite,
  CloudProjectStore,
  StoredCloudProjectDocument,
  StoredCloudProjectMetadata,
  StoredCloudProjectRevisionDocument,
  StoredCloudProjectUsage
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

interface CloudProjectRevisionRow {
  project_id: string;
  revision: number;
  format_version: number;
  byte_size: number;
  content_sha256: string;
  created_at: string;
}

interface CloudProjectUsageRow {
  owner_id: string;
  project_count: number;
  current_bytes: number;
  version_bytes: number;
  updated_at: string | null;
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

function revisionMetadataFromRow(row: CloudProjectRevisionRow): CloudProjectRevisionMetadata {
  return {
    projectId: row.project_id,
    revision: Number(row.revision),
    formatVersion: 1,
    byteSize: Number(row.byte_size),
    contentSha256: row.content_sha256,
    createdAt: row.created_at
  };
}

function usageFromRow(row: CloudProjectUsageRow): StoredCloudProjectUsage {
  return {
    ownerId: row.owner_id,
    projectCount: Number(row.project_count || 0),
    currentBytes: Number(row.current_bytes || 0),
    versionBytes: Number(row.version_bytes || 0),
    updatedAt: row.updated_at || null
  };
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

  async usageOwned(ownerId: string): Promise<StoredCloudProjectUsage> {
    const row = await this.#database.prepare(`SELECT ? AS owner_id,
      (SELECT COUNT(*) FROM cloud_projects WHERE owner_id = ?) AS project_count,
      COALESCE((SELECT SUM(byte_size) FROM cloud_projects WHERE owner_id = ?), 0) AS current_bytes,
      COALESCE((SELECT SUM(byte_size) FROM cloud_project_revisions WHERE owner_id = ?), 0) AS version_bytes,
      (SELECT MAX(updated_at) FROM cloud_projects WHERE owner_id = ?) AS updated_at`)
      .bind(ownerId, ownerId, ownerId, ownerId, ownerId)
      .first<CloudProjectUsageRow>();
    return usageFromRow(row || {
      owner_id: ownerId,
      project_count: 0,
      current_bytes: 0,
      version_bytes: 0,
      updated_at: null
    });
  }

  async listUsage(): Promise<StoredCloudProjectUsage[]> {
    const result = await this.#database.prepare(`SELECT p.owner_id,
      COUNT(*) AS project_count,
      COALESCE(SUM(p.byte_size), 0) AS current_bytes,
      COALESCE((SELECT SUM(r.byte_size) FROM cloud_project_revisions r WHERE r.owner_id = p.owner_id), 0) AS version_bytes,
      MAX(p.updated_at) AS updated_at
      FROM cloud_projects p
      GROUP BY p.owner_id
      ORDER BY MAX(p.updated_at) DESC, p.owner_id`).all<CloudProjectUsageRow>();
    return (result.results || []).map(usageFromRow);
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

  async listRevisionsOwned(ownerId: string, projectId: string): Promise<CloudProjectRevisionMetadata[]> {
    const result = await this.#database.prepare(`SELECT project_id, revision, format_version,
      byte_size, content_sha256, created_at
      FROM cloud_project_revisions
      WHERE owner_id = ? AND project_id = ?
      ORDER BY revision DESC`).bind(ownerId, projectId).all<CloudProjectRevisionRow>();
    return (result.results || []).map(revisionMetadataFromRow);
  }

  async readRevisionOwned(
    ownerId: string,
    projectId: string,
    revision: number
  ): Promise<StoredCloudProjectRevisionDocument | null> {
    const row = await this.#database.prepare(`SELECT project_id, revision, format_version,
      byte_size, content_sha256, created_at
      FROM cloud_project_revisions
      WHERE owner_id = ? AND project_id = ? AND revision = ? LIMIT 1`)
      .bind(ownerId, projectId, revision)
      .first<CloudProjectRevisionRow>();
    if (!row) return null;
    const chunks = await this.#database.prepare(`SELECT content_text
      FROM cloud_project_chunks
      WHERE project_id = ? AND revision = ?
      ORDER BY chunk_index`).bind(projectId, revision).all<CloudProjectChunkRow>();
    return {
      metadata: revisionMetadataFromRow(row),
      serializedSnapshot: (chunks.results || []).map(item => item.content_text).join('')
    };
  }

  async renameOwned(
    ownerId: string,
    projectId: string,
    expectedRevision: number,
    name: string,
    updatedAt: string
  ): Promise<StoredCloudProjectMetadata> {
    const result = await this.#database.prepare(`UPDATE cloud_projects
      SET name = ?, updated_at = ?
      WHERE id = ? AND owner_id = ? AND revision = ?`)
      .bind(name, updatedAt, projectId, ownerId, expectedRevision)
      .run();
    if (changes(result) !== 1) {
      if (await this.getOwned(ownerId, projectId)) throw new Error('CLOUD_PROJECT_CONFLICT');
      throw new Error('CLOUD_PROJECT_NOT_FOUND');
    }
    const metadata = await this.getOwned(ownerId, projectId);
    if (!metadata) throw new Error('CLOUD_PROJECT_NOT_FOUND');
    return metadata;
  }

  async deleteOwned(ownerId: string, projectId: string, expectedRevision: number): Promise<void> {
    const ownedProject = `SELECT id FROM cloud_projects
      WHERE id = ? AND owner_id = ? AND revision = ?`;
    const results = await this.#database.batch([
      this.#database.prepare(`DELETE FROM cloud_project_chunks
        WHERE project_id IN (${ownedProject})`).bind(projectId, ownerId, expectedRevision),
      this.#database.prepare(`DELETE FROM cloud_project_revisions
        WHERE project_id IN (${ownedProject})`).bind(projectId, ownerId, expectedRevision),
      this.#database.prepare(`DELETE FROM cloud_projects
        WHERE id = ? AND owner_id = ? AND revision = ?`).bind(projectId, ownerId, expectedRevision)
    ]);
    if (changes(results.at(-1)) !== 1) {
      if (await this.getOwned(ownerId, projectId)) throw new Error('CLOUD_PROJECT_CONFLICT');
      throw new Error('CLOUD_PROJECT_NOT_FOUND');
    }
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
  readonly #revisionMetadata = new Map<string, CloudProjectRevisionMetadata>();
  readonly #revisionDocuments = new Map<string, string>();

  #key(ownerId: string, projectId: string): string {
    return `${ownerId}\u0000${projectId}`;
  }

  #revisionKey(ownerId: string, projectId: string, revision: number): string {
    return `${this.#key(ownerId, projectId)}\u0000${revision}`;
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

  async usageOwned(ownerId: string): Promise<StoredCloudProjectUsage> {
    const projects = [...this.#projects.values()].filter(item => item.ownerId === ownerId);
    const revisions = [...this.#revisionMetadata.entries()]
      .filter(([key]) => key.startsWith(`${ownerId}\u0000`))
      .map(([, metadata]) => metadata);
    return {
      ownerId,
      projectCount: projects.length,
      currentBytes: projects.reduce((sum, item) => sum + item.byteSize, 0),
      versionBytes: revisions.reduce((sum, item) => sum + item.byteSize, 0),
      updatedAt: projects.map(item => item.updatedAt).sort().at(-1) || null
    };
  }

  async listUsage(): Promise<StoredCloudProjectUsage[]> {
    const owners = new Set([...this.#projects.values()].map(item => item.ownerId));
    return Promise.all([...owners].map(ownerId => this.usageOwned(ownerId)));
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

  async listRevisionsOwned(ownerId: string, projectId: string): Promise<CloudProjectRevisionMetadata[]> {
    const prefix = `${this.#key(ownerId, projectId)}\u0000`;
    return [...this.#revisionMetadata.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([, metadata]) => ({ ...metadata }))
      .sort((left, right) => right.revision - left.revision);
  }

  async readRevisionOwned(
    ownerId: string,
    projectId: string,
    revision: number
  ): Promise<StoredCloudProjectRevisionDocument | null> {
    const key = this.#revisionKey(ownerId, projectId, revision);
    const metadata = this.#revisionMetadata.get(key);
    if (!metadata) return null;
    return {
      metadata: { ...metadata },
      serializedSnapshot: this.#revisionDocuments.get(key) || ''
    };
  }

  async renameOwned(
    ownerId: string,
    projectId: string,
    expectedRevision: number,
    name: string,
    updatedAt: string
  ): Promise<StoredCloudProjectMetadata> {
    const key = this.#key(ownerId, projectId);
    const current = this.#projects.get(key);
    if (!current) throw new Error('CLOUD_PROJECT_NOT_FOUND');
    if (current.revision !== expectedRevision) throw new Error('CLOUD_PROJECT_CONFLICT');
    const updated = { ...current, name, updatedAt };
    this.#projects.set(key, updated);
    return cloneMetadata(updated);
  }

  async deleteOwned(ownerId: string, projectId: string, expectedRevision: number): Promise<void> {
    const key = this.#key(ownerId, projectId);
    const current = this.#projects.get(key);
    if (!current) throw new Error('CLOUD_PROJECT_NOT_FOUND');
    if (current.revision !== expectedRevision) throw new Error('CLOUD_PROJECT_CONFLICT');
    this.#projects.delete(key);
    this.#documents.delete(key);
    const revisionPrefix = `${key}\u0000`;
    for (const revisionKey of [...this.#revisionMetadata.keys()]) {
      if (!revisionKey.startsWith(revisionPrefix)) continue;
      this.#revisionMetadata.delete(revisionKey);
      this.#revisionDocuments.delete(revisionKey);
    }
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
    const revisionKey = this.#revisionKey(input.ownerId, input.projectId, input.revision);
    this.#revisionMetadata.set(revisionKey, {
      projectId: input.projectId,
      revision: input.revision,
      formatVersion: input.formatVersion,
      byteSize: input.byteSize,
      contentSha256: input.contentSha256,
      createdAt: input.createdAt
    });
    this.#revisionDocuments.set(revisionKey, input.chunks.join(''));
    return cloneMetadata(updated);
  }
}
