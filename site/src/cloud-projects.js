(() => {
  const REQUEST_TIMEOUT_MS = 25_000;

  function install(getCsrfToken, updateCsrfToken) {
    if (typeof getCsrfToken !== 'function') throw new Error('Cloud project CSRF provider is required.');

    async function request(path, options = {}) {
      const method = options.method || 'GET';
      const headers = new Headers({ accept: 'application/json' });
      if (options.body !== undefined) headers.set('content-type', 'application/json');
      if (method !== 'GET' && method !== 'HEAD') {
        const csrfToken = getCsrfToken();
        if (!csrfToken) throw new Error('登录会话正在刷新，请稍后重试。');
        headers.set('x-cqnu-csrf', csrfToken);
      }
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const response = await fetch(path, {
          method,
          credentials: 'same-origin',
          cache: 'no-store',
          headers,
          signal: controller.signal,
          body: options.body === undefined ? undefined : JSON.stringify(options.body)
        });
        const rotatedCsrfToken = response.headers.get('x-cqnu-csrf');
        if (rotatedCsrfToken && typeof updateCsrfToken === 'function') updateCsrfToken(rotatedCsrfToken);
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.ok) {
          const error = new Error(payload?.error?.message || '云项目请求未完成。');
          error.code = payload?.error?.code || 'CLOUD_PROJECT_REQUEST_FAILED';
          throw error;
        }
        return payload.data;
      } catch (error) {
        if (error?.name === 'AbortError') throw new Error('云项目请求超时，请检查网络后重试。');
        throw error;
      } finally {
        window.clearTimeout(timeout);
      }
    }

    return Object.freeze({
      version: 'site-cloud-projects-v1',
      async list() {
        return (await request('/api/projects')).projects || [];
      },
      async usage() {
        return (await request('/api/projects/usage')).usage;
      },
      async create(name) {
        return (await request('/api/projects', { method: 'POST', body: { name } })).project;
      },
      async read(projectId) {
        return request(`/api/projects/${encodeURIComponent(projectId)}`);
      },
      async rename(projectId, expectedRevision, name) {
        return (await request(`/api/projects/${encodeURIComponent(projectId)}`, {
          method: 'PATCH',
          body: { expectedRevision, name }
        })).project;
      },
      async remove(projectId, expectedRevision) {
        return request(`/api/projects/${encodeURIComponent(projectId)}`, {
          method: 'DELETE',
          body: { expectedRevision }
        });
      },
      async save(projectId, expectedRevision, snapshot) {
        return (await request(`/api/projects/${encodeURIComponent(projectId)}/snapshot`, {
          method: 'PUT',
          body: { expectedRevision, snapshot }
        })).project;
      },
      async revisions(projectId) {
        return (await request(`/api/projects/${encodeURIComponent(projectId)}/revisions`)).revisions || [];
      },
      async restore(projectId, revision, expectedRevision) {
        return (await request(`/api/projects/${encodeURIComponent(projectId)}/revisions/${encodeURIComponent(revision)}/restore`, {
          method: 'POST',
          body: { expectedRevision }
        })).project;
      }
    });
  }

  Object.defineProperty(window, 'installSiteCloudProjectClient', {
    configurable: false,
    enumerable: false,
    writable: false,
    value: install
  });
})();
