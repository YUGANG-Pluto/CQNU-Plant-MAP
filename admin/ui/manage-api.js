const API_ROOT = '/api/manage';

let csrfToken = '';

export class ManagementApiError extends Error {
  constructor(code, message, status) {
    super(message);
    this.name = 'ManagementApiError';
    this.code = code;
    this.status = status;
  }
}

function captureSessionSecurity(data) {
  if (data?.csrfToken) csrfToken = data.csrfToken;
  return data;
}

async function request(path, options = {}) {
  const method = options.method || 'GET';
  const headers = { accept: 'application/json' };
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
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new ManagementApiError('INVALID_RESPONSE', '管理服务返回了无法识别的响应。', response.status);
  }
  if (!response.ok || !payload?.ok) {
    throw new ManagementApiError(
      payload?.error?.code || 'REQUEST_FAILED',
      payload?.error?.message || '请求未完成。',
      response.status
    );
  }
  return captureSessionSecurity(payload.data || {});
}

export const managementApi = Object.freeze({
  refreshSession: () => request('/session'),
  login: (username, password) => request('/login', {
    method: 'POST', public: true, body: { username, password }
  }),
  heartbeat: () => request('/session/heartbeat', { method: 'POST', body: {} }),
  logout: async () => {
    try {
      await request('/session', { method: 'DELETE', body: {} });
    } finally {
      csrfToken = '';
    }
  },
  activate: body => request('/account/activate', { method: 'POST', body }),
  consumeCredentialToken: body => request('/password-reset/consume', {
    method: 'POST', public: true, body
  }),
  changeUsername: body => request('/profile/username', { method: 'PATCH', body }),
  changePassword: body => request('/profile/password', { method: 'PATCH', body }),
  listMembers: () => request('/members'),
  createMember: body => request('/members', { method: 'POST', body }),
  updateMember: (memberId, body) => request(`/members/${encodeURIComponent(memberId)}`, {
    method: 'PATCH', body
  }),
  resetMemberPassword: memberId => request(`/members/${encodeURIComponent(memberId)}/password-reset`, {
    method: 'POST', body: {}
  }),
  listAuditEvents: (limit = 100) => request(`/audit-events?limit=${encodeURIComponent(limit)}`)
});

export function clearCsrfToken() {
  csrfToken = '';
}
