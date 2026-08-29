import type {
  ManagementApi,
  ManagementAuditData,
  ManagementBulkAccountResetData,
  ManagementCloudUsageData,
  ManagementCredentialGrant,
  ManagementMembersData,
  ManagementSessionData
} from '../management-ui-contracts.js';

const API_ROOT = '/api/manage';

type ManagementHttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface ManagementRequestOptions {
  method?: ManagementHttpMethod;
  body?: unknown;
  public?: boolean;
  allowEmpty?: boolean;
}

interface ManagementApiEnvelope<T> {
  ok?: boolean;
  data?: T;
  error?: {
    code?: string;
    message?: string;
  };
}

let csrfToken = '';

export class ManagementApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = 'ManagementApiError';
    this.code = code;
    this.status = status;
  }
}

function captureSessionSecurity<T>(data: T): T {
  if (data && typeof data === 'object' && 'csrfToken' in data) {
    const value = (data as { csrfToken?: unknown }).csrfToken;
    if (typeof value === 'string' && value) csrfToken = value;
  }
  return data;
}

async function request<T>(path: string, options: ManagementRequestOptions = {}): Promise<T> {
  const method = options.method || 'GET';
  const headers: Record<string, string> = { accept: 'application/json' };
  if (options.body !== undefined) headers['content-type'] = 'application/json';
  if (!['GET', 'HEAD'].includes(method) && csrfToken && !options.public) {
    headers['x-cqnu-csrf'] = csrfToken;
  }
  const response = await fetch(`${API_ROOT}${path}`, {
    method,
    credentials: 'same-origin',
    cache: 'no-store',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  let payload: ManagementApiEnvelope<T>;
  try {
    payload = await response.json() as ManagementApiEnvelope<T>;
  } catch {
    throw new ManagementApiError('INVALID_RESPONSE', '管理服务返回了无法识别的响应。', response.status);
  }
  if (!response.ok || !payload?.ok || (payload.data === undefined && !options.allowEmpty)) {
    throw new ManagementApiError(
      payload?.error?.code || 'REQUEST_FAILED',
      payload?.error?.message || '请求未完成。',
      response.status
    );
  }
  return captureSessionSecurity(payload.data as T);
}

export const managementApi = Object.freeze({
  refreshSession: () => request<ManagementSessionData>('/session'),
  login: (username, password) => request<ManagementSessionData>('/login', {
    method: 'POST', public: true, body: { username, password }
  }),
  heartbeat: () => request<ManagementSessionData>('/session/heartbeat', { method: 'POST', body: {} }),
  logout: async () => {
    try {
      await request<void>('/session', { method: 'DELETE', body: {}, allowEmpty: true });
    } finally {
      csrfToken = '';
    }
  },
  activate: body => request<ManagementSessionData>('/account/activate', { method: 'POST', body }),
  consumeCredentialToken: body => request<ManagementSessionData>('/password-reset/consume', {
    method: 'POST', public: true, body
  }),
  changeUsername: body => request<ManagementSessionData>('/profile/username', { method: 'PATCH', body }),
  changePassword: body => request<ManagementSessionData>('/profile/password', { method: 'PATCH', body }),
  listMembers: () => request<ManagementMembersData>('/members'),
  createMember: body => request<ManagementCredentialGrant>('/members', { method: 'POST', body }),
  updateMember: (memberId, body) => request(`/members/${encodeURIComponent(memberId)}`, {
    method: 'PATCH', body
  }),
  resetMemberPassword: memberId => request<ManagementCredentialGrant>(
    `/members/${encodeURIComponent(memberId)}/password-reset`,
    { method: 'POST', body: {} }
  ),
  resetAllMemberCredentials: body => request<ManagementBulkAccountResetData>(
    '/members/reset-all-activation',
    { method: 'POST', body }
  ),
  listAuditEvents: (limit = 100) => request<ManagementAuditData>(
    `/audit-events?limit=${encodeURIComponent(limit)}`
  ),
  getCloudUsage: () => request<ManagementCloudUsageData>('/cloud-projects/usage')
} satisfies ManagementApi);

export function clearCsrfToken(): void {
  csrfToken = '';
}
