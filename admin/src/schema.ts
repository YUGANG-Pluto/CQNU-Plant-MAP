export const MANAGEMENT_SCHEMA_STATEMENTS = Object.freeze([
  `CREATE TABLE IF NOT EXISTS management_accounts (
    id TEXT PRIMARY KEY,
    normalized_username TEXT NOT NULL COLLATE NOCASE UNIQUE,
    account_kind TEXT NOT NULL CHECK (account_kind IN ('user', 'admin')),
    account_status TEXT NOT NULL CHECK (account_status IN ('pending-activation', 'active', 'disabled')),
    revision INTEGER NOT NULL CHECK (revision >= 1),
    record_json TEXT NOT NULL CHECK (json_valid(record_json)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS management_sessions (
    id TEXT PRIMARY KEY,
    token_digest TEXT NOT NULL,
    token_key_id TEXT NOT NULL,
    principal_id TEXT NOT NULL,
    revoked_at TEXT,
    record_json TEXT NOT NULL CHECK (json_valid(record_json)),
    created_at TEXT NOT NULL,
    absolute_expires_at TEXT NOT NULL,
    UNIQUE (token_key_id, token_digest)
  )`,
  `CREATE INDEX IF NOT EXISTS management_sessions_principal_idx
    ON management_sessions (principal_id, revoked_at)`,
  `CREATE TABLE IF NOT EXISTS management_credential_tokens (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    token_digest TEXT NOT NULL,
    token_key_id TEXT NOT NULL,
    purpose TEXT NOT NULL CHECK (purpose IN ('activation', 'password-reset')),
    consumed_at TEXT,
    record_json TEXT NOT NULL CHECK (json_valid(record_json)),
    pending_account_json TEXT,
    expected_account_revision INTEGER,
    expires_at TEXT NOT NULL,
    UNIQUE (token_key_id, token_digest)
  )`,
  `CREATE INDEX IF NOT EXISTS management_tokens_account_idx
    ON management_credential_tokens (account_id, consumed_at)`,
  `CREATE TABLE IF NOT EXISTS management_audit_events (
    id TEXT PRIMARY KEY,
    occurred_at TEXT NOT NULL,
    principal_id TEXT NOT NULL,
    action TEXT NOT NULL,
    outcome TEXT NOT NULL CHECK (outcome IN ('allowed', 'denied', 'failed')),
    request_id TEXT NOT NULL,
    metadata_json TEXT NOT NULL CHECK (json_valid(metadata_json))
  )`,
  `CREATE INDEX IF NOT EXISTS management_audit_time_idx
    ON management_audit_events (occurred_at DESC)`,
  `CREATE TRIGGER IF NOT EXISTS management_admin_limit_insert
    BEFORE INSERT ON management_accounts
    WHEN NEW.account_kind = 'admin'
      AND NEW.account_status <> 'disabled'
      AND (SELECT COUNT(*) FROM management_accounts
        WHERE account_kind = 'admin' AND account_status <> 'disabled') >= 3
    BEGIN
      SELECT RAISE(ABORT, 'ADMIN_LIMIT_REACHED');
    END`,
  `CREATE TRIGGER IF NOT EXISTS management_admin_limit_update
    BEFORE UPDATE OF account_kind, account_status ON management_accounts
    WHEN NEW.account_kind = 'admin'
      AND NEW.account_status <> 'disabled'
      AND (OLD.account_kind <> 'admin' OR OLD.account_status = 'disabled')
      AND (SELECT COUNT(*) FROM management_accounts
        WHERE account_kind = 'admin' AND account_status <> 'disabled') >= 3
    BEGIN
      SELECT RAISE(ABORT, 'ADMIN_LIMIT_REACHED');
    END`,
  `CREATE TRIGGER IF NOT EXISTS management_last_admin_update
    BEFORE UPDATE OF account_kind, account_status ON management_accounts
    WHEN OLD.account_kind = 'admin'
      AND OLD.account_status <> 'disabled'
      AND (NEW.account_kind <> 'admin' OR NEW.account_status = 'disabled')
      AND (SELECT COUNT(*) FROM management_accounts
        WHERE account_kind = 'admin' AND account_status <> 'disabled') <= 1
    BEGIN
      SELECT RAISE(ABORT, 'LAST_ADMIN_REQUIRED');
    END`,
  `DROP TRIGGER IF EXISTS management_apply_credential_token`,
  `CREATE TRIGGER management_apply_credential_token
    AFTER UPDATE OF consumed_at ON management_credential_tokens
    WHEN OLD.consumed_at IS NULL
      AND NEW.consumed_at IS NOT NULL
      AND NEW.pending_account_json IS NOT NULL
    BEGIN
      UPDATE management_accounts
      SET normalized_username = json_extract(NEW.pending_account_json, '$.normalizedUsername'),
          account_kind = json_extract(NEW.pending_account_json, '$.accountKind'),
          account_status = json_extract(NEW.pending_account_json, '$.status'),
          revision = json_extract(NEW.pending_account_json, '$.revision'),
          record_json = NEW.pending_account_json,
          updated_at = json_extract(NEW.pending_account_json, '$.updatedAt')
      WHERE id = NEW.account_id
        AND revision = NEW.expected_account_revision
        AND NEW.pending_account_json IS NOT NULL;
      SELECT CASE WHEN changes() <> 1 THEN RAISE(ABORT, 'ACCOUNT_UPDATE_CONFLICT') END;
      UPDATE management_credential_tokens
      SET pending_account_json = NULL, expected_account_revision = NULL
      WHERE id = NEW.id;
    END`,
  `CREATE TRIGGER IF NOT EXISTS management_consume_tokens_on_identity_reset
    AFTER UPDATE OF account_status, record_json ON management_accounts
    WHEN NEW.account_status = 'pending-activation'
      AND json_extract(NEW.record_json, '$.mustChangePassword') = 1
      AND json_extract(NEW.record_json, '$.passwordChangeRecommended') = 1
      AND CAST(json_extract(NEW.record_json, '$.credentialVersion') AS INTEGER)
        > CAST(json_extract(OLD.record_json, '$.credentialVersion') AS INTEGER)
    BEGIN
      UPDATE management_credential_tokens
      SET consumed_at = NEW.updated_at,
          pending_account_json = NULL,
          expected_account_revision = NULL,
          record_json = json_set(record_json, '$.consumedAt', NEW.updated_at)
      WHERE account_id = NEW.id AND consumed_at IS NULL;
    END`
]);

export const managementSchemaSql = MANAGEMENT_SCHEMA_STATEMENTS.join(';\n');
