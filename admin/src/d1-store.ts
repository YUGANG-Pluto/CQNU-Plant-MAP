import type {
  AccountStore,
  AccountActivationResetUpdate,
  CredentialTokenRecord,
  ManagementAccountRecord
} from './account-contracts.js';
import { sanitizeAuditMetadata } from './audit.js';
import type {
  AdminAuditEvent,
  AdminSessionRecord,
  AuditSink,
  SessionStore
} from './contracts.js';
import { MANAGEMENT_SCHEMA_STATEMENTS } from './schema.js';

export interface D1RunResult {
  success?: boolean;
  meta?: { changes?: number };
}

export interface D1AllResult<T> {
  results?: T[];
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1AllResult<T>>;
  run(): Promise<D1RunResult>;
}

export interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<D1RunResult[]>;
}

type JsonRow = { record_json: string };
type AuditRow = {
  id: string;
  occurred_at: string;
  principal_id: string;
  action: AdminAuditEvent['action'];
  outcome: AdminAuditEvent['outcome'];
  request_id: string;
  metadata_json: string;
};

function changes(result: D1RunResult): number {
  return Number(result.meta?.changes || 0);
}

function parseRecord<T>(row: JsonRow | null): T | null {
  if (!row?.record_json) return null;
  try {
    return JSON.parse(row.record_json) as T;
  } catch {
    throw new Error('MANAGEMENT_DATABASE_RECORD_INVALID');
  }
}

function accountValues(account: ManagementAccountRecord): unknown[] {
  return [
    account.id,
    account.normalizedUsername,
    account.accountKind,
    account.status,
    account.revision,
    JSON.stringify(account),
    account.createdAt,
    account.updatedAt
  ];
}

function sessionValues(session: AdminSessionRecord): unknown[] {
  return [
    session.id,
    session.tokenDigest,
    session.tokenKeyId,
    session.principalId,
    session.revokedAt || null,
    JSON.stringify(session),
    session.createdAt,
    session.absoluteExpiresAt
  ];
}

export async function ensureManagementSchema(database: D1DatabaseLike): Promise<void> {
  await database.batch(MANAGEMENT_SCHEMA_STATEMENTS.map(statement => database.prepare(statement)));
}

export class D1ManagementStore implements AccountStore, SessionStore, AuditSink {
  readonly #database: D1DatabaseLike;

  constructor(database: D1DatabaseLike) {
    this.#database = database;
  }

  async getAccountById(id: string): Promise<ManagementAccountRecord | null> {
    const row = await this.#database.prepare(
      'SELECT record_json FROM management_accounts WHERE id = ? LIMIT 1'
    ).bind(id).first<JsonRow>();
    return parseRecord<ManagementAccountRecord>(row);
  }

  async getAccountByUsername(normalizedUsername: string): Promise<ManagementAccountRecord | null> {
    const row = await this.#database.prepare(
      'SELECT record_json FROM management_accounts WHERE normalized_username = ? COLLATE NOCASE LIMIT 1'
    ).bind(normalizedUsername).first<JsonRow>();
    return parseRecord<ManagementAccountRecord>(row);
  }

  async listAccounts(): Promise<ManagementAccountRecord[]> {
    const result = await this.#database.prepare(
      'SELECT record_json FROM management_accounts ORDER BY created_at, id'
    ).all<JsonRow>();
    return (result.results || []).map(row => parseRecord<ManagementAccountRecord>(row) as ManagementAccountRecord);
  }

  async createAccount(account: ManagementAccountRecord): Promise<void> {
    await this.createAccounts([account]);
  }

  async createAccounts(accounts: readonly ManagementAccountRecord[]): Promise<void> {
    const statements = accounts.map(account => this.#database.prepare(`INSERT INTO management_accounts (
      id, normalized_username, account_kind, account_status, revision,
      record_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(...accountValues(account)));
    if (statements.length) await this.#database.batch(statements);
  }

  async updateAccount(account: ManagementAccountRecord, expectedRevision: number): Promise<void> {
    const result = await this.#database.prepare(`UPDATE management_accounts
      SET normalized_username = ?, account_kind = ?, account_status = ?, revision = ?,
          record_json = ?, updated_at = ?
      WHERE id = ? AND revision = ?`)
      .bind(
        account.normalizedUsername,
        account.accountKind,
        account.status,
        account.revision,
        JSON.stringify(account),
        account.updatedAt,
        account.id,
        expectedRevision
      )
      .run();
    if (changes(result) !== 1) throw new Error('ACCOUNT_UPDATE_CONFLICT');
  }

  async resetAccountsForActivation(
    updates: readonly AccountActivationResetUpdate[],
    invalidatedAt: string
  ): Promise<void> {
    if (!updates.length || !Number.isFinite(Date.parse(invalidatedAt))) {
      throw new Error('ACCOUNT_RESET_INVALID');
    }
    const incomingIds = new Set<string>();
    for (const { account, expectedRevision } of updates) {
      if (incomingIds.has(account.id)
        || account.revision !== expectedRevision + 1
        || account.updatedAt !== invalidatedAt) {
        throw new Error('ACCOUNT_UPDATE_CONFLICT');
      }
      incomingIds.add(account.id);
    }
    const payload = JSON.stringify(updates.map(({ account, expectedRevision }) => ({
      id: account.id,
      expectedRevision,
      normalizedUsername: account.normalizedUsername,
      accountKind: account.accountKind,
      accountStatus: account.status,
      revision: account.revision,
      recordJson: JSON.stringify(account),
      updatedAt: account.updatedAt
    })));
    const result = await this.#database.prepare(`WITH incoming AS (
        SELECT
          json_extract(value, '$.id') AS id,
          CAST(json_extract(value, '$.expectedRevision') AS INTEGER) AS expected_revision,
          json_extract(value, '$.normalizedUsername') AS normalized_username,
          json_extract(value, '$.accountKind') AS account_kind,
          json_extract(value, '$.accountStatus') AS account_status,
          CAST(json_extract(value, '$.revision') AS INTEGER) AS revision,
          json_extract(value, '$.recordJson') AS record_json,
          json_extract(value, '$.updatedAt') AS updated_at
        FROM json_each(?)
      ), matching AS (
        SELECT COUNT(*) AS count
        FROM incoming
        JOIN management_accounts
          ON management_accounts.id = incoming.id
          AND management_accounts.revision = incoming.expected_revision
      ), expected AS (
        SELECT COUNT(*) AS count FROM incoming
      ), current_total AS (
        SELECT COUNT(*) AS count FROM management_accounts
      )
      UPDATE management_accounts
      SET normalized_username = (SELECT normalized_username FROM incoming WHERE incoming.id = management_accounts.id),
          account_kind = (SELECT account_kind FROM incoming WHERE incoming.id = management_accounts.id),
          account_status = (SELECT account_status FROM incoming WHERE incoming.id = management_accounts.id),
          revision = (SELECT revision FROM incoming WHERE incoming.id = management_accounts.id),
          record_json = (SELECT record_json FROM incoming WHERE incoming.id = management_accounts.id),
          updated_at = (SELECT updated_at FROM incoming WHERE incoming.id = management_accounts.id)
      WHERE id IN (SELECT id FROM incoming)
        AND (SELECT count FROM matching) = (SELECT count FROM expected)
        AND (SELECT count FROM current_total) = (SELECT count FROM expected)`)
      .bind(payload)
      .run();
    if (changes(result) !== updates.length) throw new Error('ACCOUNT_UPDATE_CONFLICT');
  }

  async putCredentialToken(token: CredentialTokenRecord): Promise<void> {
    await this.#database.prepare(`INSERT INTO management_credential_tokens (
      id, account_id, token_digest, token_key_id, purpose, consumed_at,
      record_json, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        token.id,
        token.accountId,
        token.tokenDigest,
        token.tokenKeyId,
        token.purpose,
        token.consumedAt,
        JSON.stringify(token),
        token.expiresAt
      )
      .run();
  }

  async getCredentialToken(tokenDigest: string, tokenKeyId: string): Promise<CredentialTokenRecord | null> {
    const row = await this.#database.prepare(`SELECT record_json
      FROM management_credential_tokens
      WHERE token_digest = ? AND token_key_id = ? LIMIT 1`)
      .bind(tokenDigest, tokenKeyId)
      .first<JsonRow>();
    const token = parseRecord<CredentialTokenRecord>(row);
    if (!token) return null;
    const state = await this.#database.prepare(`SELECT consumed_at
      FROM management_credential_tokens WHERE id = ? LIMIT 1`)
      .bind(token.id)
      .first<{ consumed_at: string | null }>();
    return { ...token, consumedAt: state?.consumed_at || null };
  }

  async consumeCredentialTokenAndUpdateAccount(
    id: string,
    consumedAt: string,
    account: ManagementAccountRecord,
    expectedRevision: number
  ): Promise<boolean> {
    const result = await this.#database.prepare(`UPDATE management_credential_tokens
      SET consumed_at = ?, pending_account_json = ?, expected_account_revision = ?,
          record_json = json_set(record_json, '$.consumedAt', ?)
      WHERE id = ? AND account_id = ? AND consumed_at IS NULL`)
      .bind(
        consumedAt,
        JSON.stringify(account),
        expectedRevision,
        consumedAt,
        id,
        account.id
      )
      .run();
    return changes(result) === 1;
  }

  async getByTokenDigest(tokenDigest: string, tokenKeyId: string): Promise<AdminSessionRecord | null> {
    const row = await this.#database.prepare(`SELECT record_json
      FROM management_sessions
      WHERE token_digest = ? AND token_key_id = ? AND revoked_at IS NULL LIMIT 1`)
      .bind(tokenDigest, tokenKeyId)
      .first<JsonRow>();
    return parseRecord<AdminSessionRecord>(row);
  }

  async put(session: AdminSessionRecord): Promise<void> {
    await this.#database.prepare(`INSERT INTO management_sessions (
      id, token_digest, token_key_id, principal_id, revoked_at,
      record_json, created_at, absolute_expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      token_digest = excluded.token_digest,
      token_key_id = excluded.token_key_id,
      principal_id = excluded.principal_id,
      revoked_at = excluded.revoked_at,
      record_json = excluded.record_json,
      absolute_expires_at = excluded.absolute_expires_at`)
      .bind(...sessionValues(session))
      .run();
  }

  async replace(expectedTokenDigest: string, session: AdminSessionRecord): Promise<boolean> {
    const result = await this.#database.prepare(`UPDATE management_sessions
      SET token_digest = ?, token_key_id = ?, principal_id = ?, revoked_at = ?,
          record_json = ?, absolute_expires_at = ?
      WHERE id = ? AND token_digest = ? AND revoked_at IS NULL`)
      .bind(
        session.tokenDigest,
        session.tokenKeyId,
        session.principalId,
        session.revokedAt || null,
        JSON.stringify(session),
        session.absoluteExpiresAt,
        session.id,
        expectedTokenDigest
      )
      .run();
    return changes(result) === 1;
  }

  async revoke(sessionId: string, revokedAt: string): Promise<boolean> {
    const result = await this.#database.prepare(`UPDATE management_sessions
      SET revoked_at = ?, record_json = json_set(record_json, '$.revokedAt', ?)
      WHERE id = ? AND revoked_at IS NULL`)
      .bind(revokedAt, revokedAt, sessionId)
      .run();
    return changes(result) === 1;
  }

  async revokePrincipal(principalId: string, revokedAt: string): Promise<number> {
    const result = await this.#database.prepare(`UPDATE management_sessions
      SET revoked_at = ?, record_json = json_set(record_json, '$.revokedAt', ?)
      WHERE principal_id = ? AND revoked_at IS NULL`)
      .bind(revokedAt, revokedAt, principalId)
      .run();
    return changes(result);
  }

  async append(event: AdminAuditEvent): Promise<void> {
    await this.#database.prepare(`INSERT INTO management_audit_events (
      id, occurred_at, principal_id, action, outcome, request_id, metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        event.id,
        event.occurredAt,
        event.principalId,
        event.action,
        event.outcome,
        event.requestId,
        JSON.stringify(sanitizeAuditMetadata(event.metadata))
      )
      .run();
  }

  async listAuditEvents(limit = 100): Promise<AdminAuditEvent[]> {
    const safeLimit = Math.max(1, Math.min(500, Math.trunc(limit)));
    const result = await this.#database.prepare(`SELECT id, occurred_at, principal_id,
      action, outcome, request_id, metadata_json
      FROM management_audit_events ORDER BY occurred_at DESC LIMIT ?`)
      .bind(safeLimit)
      .all<AuditRow>();
    return (result.results || []).map(row => ({
      id: row.id,
      occurredAt: row.occurred_at,
      principalId: row.principal_id,
      action: row.action,
      outcome: row.outcome,
      requestId: row.request_id,
      metadata: JSON.parse(row.metadata_json) as AdminAuditEvent['metadata']
    }));
  }
}
