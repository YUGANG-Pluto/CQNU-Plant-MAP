export function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'content-security-policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
      'referrer-policy': 'no-referrer',
      'x-content-type-options': 'nosniff',
      ...headers
    }
  });
}

export function errorStatus(code: string): number {
  if (code === 'LOGIN_FAILED' || code === 'SESSION_REQUIRED') return 401;
  if (code === 'ADMIN_ACCESS_DENIED' || code === 'CAPABILITY_DENIED' || code === 'CSRF_DENIED') return 403;
  if (code === 'ACCOUNT_NOT_FOUND' || code === 'ROUTE_DENIED') return 404;
  if (code === 'CLOUD_PROJECT_NOT_FOUND' || code === 'CLOUD_PROJECT_REVISION_NOT_FOUND') return 404;
  if (
    code.includes('CONFLICT') ||
    code === 'ADMIN_LIMIT_REACHED' ||
    code === 'LAST_ADMIN_REQUIRED' ||
    code === 'CLOUD_PROJECT_LIMIT_REACHED'
  )
    return 409;
  if (code === 'REQUEST_BODY_TOO_LARGE' || code === 'CLOUD_PROJECT_TOO_LARGE') return 413;
  if (code === 'MANAGEMENT_SERVICE_UNAVAILABLE' || code === 'CLOUD_PROJECT_STORAGE_UNAVAILABLE') return 503;
  return 400;
}

export function publicError(code: string): { code: string; message: string } {
  const messages: Record<string, string> = {
    LOGIN_FAILED: '用户名或密码无效，或账户暂时不可用。',
    SESSION_REQUIRED: '登录会话已失效，请重新登录。',
    CSRF_DENIED: '请求验证失败，请刷新页面后重试。',
    CAPABILITY_DENIED: '当前账户没有执行此操作的权限。',
    ADMIN_ACCESS_DENIED: '当前账户没有管理员权限。',
    PASSWORD_TOO_SHORT: '新密码至少需要 6 个字符。',
    PASSWORD_TOO_LONG: '新密码不能超过 128 个字符。',
    PASSWORD_BLOCKED: '该密码过于常见，请更换更安全的密码。',
    CURRENT_PASSWORD_INVALID: '当前密码不正确。',
    CREDENTIAL_TOKEN_INVALID: '激活或重置链接无效、已使用或已过期。',
    ADMIN_LIMIT_REACHED: '启用的管理员最多为 3 名。',
    LAST_ADMIN_REQUIRED: '系统必须至少保留 1 名启用的管理员。',
    USE_SELF_ACCOUNT_SETTINGS: '请在个人账户设置中修改自己的资料或凭据。',
    ACCOUNT_USERNAME_CONFLICT: '该用户名已被使用。',
    ACCOUNT_UPDATE_CONFLICT: '账户信息已更新，请刷新后重试。',
    ACCOUNT_RESET_CONFIRMATION_INVALID: '全员重置确认信息不正确，操作未执行。',
    ACCOUNT_RESET_INVALID: '当前账户状态无法执行全员重置。',
    USERNAME_INVALID: '用户名需为 3 至 32 位字母、数字、点、下划线或短横线。',
    MANAGEMENT_SERVICE_UNAVAILABLE: '管理服务尚未完成安全配置。',
    REQUEST_BODY_TOO_LARGE: '提交的数据超过允许大小。',
    CLOUD_PROJECT_NAME_INVALID: '云项目名称需为 1 至 80 个可见字符。',
    CLOUD_PROJECT_INVALID: '云项目数据结构无效。',
    CLOUD_PROJECT_NOT_FOUND: '未找到该云项目，或当前账户无权访问。',
    CLOUD_PROJECT_CONFLICT: '云项目已被更新，请重新载入后再保存。',
    CLOUD_PROJECT_TOO_LARGE: '云项目记录快照超过 8 MiB，请精简记录后重试。',
    CLOUD_PROJECT_LIMIT_REACHED: '每个账户最多可建立 25 个云项目。',
    CLOUD_PROJECT_INTEGRITY_FAILED: '云项目完整性校验失败，未载入数据。',
    CLOUD_PROJECT_SENSITIVE_DATA: '云项目包含服务凭据或设备绝对路径，请清理后重试。',
    CLOUD_PROJECT_REVISION_INVALID: '云项目版本号无效。',
    CLOUD_PROJECT_REVISION_NOT_FOUND: '未找到该云项目历史版本。',
    CLOUD_PROJECT_STORAGE_UNAVAILABLE: '云项目存储暂不可用。'
  };
  return { code, message: messages[code] || '请求未完成，请检查输入后重试。' };
}

export function normalizedFailureCode(error: unknown): string {
  if (!(error instanceof Error)) return 'REQUEST_FAILED';
  const embedded = error.message.match(
    /\b(CLOUD_PROJECT_CONFLICT|CLOUD_PROJECT_LIMIT_REACHED|ADMIN_LIMIT_REACHED|LAST_ADMIN_REQUIRED|ACCOUNT_UPDATE_CONFLICT)\b/u
  );
  if (embedded?.[1]) return embedded[1];
  const exact = error.message.match(/^([A-Z][A-Z0-9_]{2,63})(?::|$)/u);
  if (exact?.[1]) return exact[1];
  const errorName = error.name.replace(/([a-z])([A-Z])/gu, '$1_$2').toUpperCase();
  return /^[A-Z][A-Z0-9_]{2,63}$/u.test(errorName) ? errorName : 'REQUEST_FAILED';
}

export function failure(error: unknown): Response {
  const code = normalizedFailureCode(error);
  return jsonResponse({ ok: false, error: publicError(code) }, errorStatus(code));
}
