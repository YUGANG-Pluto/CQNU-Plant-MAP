import { CLOUD_PROJECT_MAX_PER_ACCOUNT } from './cloud-project-contracts.js';

export const CLOUD_PROJECT_SCHEMA_STATEMENTS = Object.freeze([
  `CREATE TABLE IF NOT EXISTS cloud_projects (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    name TEXT NOT NULL,
    revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0),
    format_version INTEGER NOT NULL DEFAULT 1,
    byte_size INTEGER NOT NULL DEFAULT 0 CHECK (byte_size >= 0),
    content_sha256 TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS cloud_projects_owner_updated_idx
    ON cloud_projects (owner_id, updated_at DESC, id)`,
  `CREATE TABLE IF NOT EXISTS cloud_project_revisions (
    project_id TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    revision INTEGER NOT NULL CHECK (revision >= 1),
    created_by TEXT NOT NULL,
    format_version INTEGER NOT NULL,
    byte_size INTEGER NOT NULL CHECK (byte_size >= 0),
    content_sha256 TEXT NOT NULL,
    chunk_count INTEGER NOT NULL CHECK (chunk_count > 0),
    created_at TEXT NOT NULL,
    PRIMARY KEY (project_id, revision)
  )`,
  `CREATE INDEX IF NOT EXISTS cloud_project_revisions_owner_idx
    ON cloud_project_revisions (owner_id, project_id, revision DESC)`,
  `CREATE TABLE IF NOT EXISTS cloud_project_chunks (
    project_id TEXT NOT NULL,
    revision INTEGER NOT NULL,
    chunk_index INTEGER NOT NULL CHECK (chunk_index >= 0),
    content_text TEXT NOT NULL,
    PRIMARY KEY (project_id, revision, chunk_index)
  )`,
  `CREATE TRIGGER IF NOT EXISTS cloud_project_account_limit
    BEFORE INSERT ON cloud_projects
    WHEN (SELECT COUNT(*) FROM cloud_projects WHERE owner_id = NEW.owner_id) >= ${CLOUD_PROJECT_MAX_PER_ACCOUNT}
    BEGIN
      SELECT RAISE(ABORT, 'CLOUD_PROJECT_LIMIT_REACHED');
    END`,
  `CREATE TRIGGER IF NOT EXISTS cloud_project_revision_sequence
    BEFORE INSERT ON cloud_project_revisions
    WHEN (SELECT owner_id FROM cloud_projects WHERE id = NEW.project_id) IS NULL
      OR (SELECT owner_id FROM cloud_projects WHERE id = NEW.project_id) <> NEW.owner_id
      OR NEW.revision <> ((SELECT revision FROM cloud_projects WHERE id = NEW.project_id) + 1)
    BEGIN
      SELECT RAISE(ABORT, 'CLOUD_PROJECT_CONFLICT');
    END`
]);

export const cloudProjectSchemaSql = CLOUD_PROJECT_SCHEMA_STATEMENTS.join(';\n');
