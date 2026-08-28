(() => {
  const root = document.documentElement;
  const gate = document.querySelector('[data-workspace-access-gate]');
  const gateTitle = gate?.querySelector('[data-gate-title]');
  const gateMessage = gate?.querySelector('[data-gate-message]');
  const gateAction = gate?.querySelector('[data-gate-action]');
  const gateProgress = gate?.querySelector('[data-gate-progress]');
  const gateProgressBar = gate?.querySelector('[data-gate-progress-bar]');
  const gateStage = gate?.querySelector('[data-gate-stage]');
  let csrfToken = '';
  let heartbeatId = 0;
  let applicationLoaded = false;

  root.dataset.workspaceSession = 'checking';

  function updateProgress(value, stage, title = '', message = '') {
    const progress = Math.max(0, Math.min(100, Number(value) || 0));
    if (gateProgress) gateProgress.setAttribute('aria-valuenow', String(progress));
    if (gateProgressBar) gateProgressBar.style.width = `${progress}%`;
    if (gateStage) gateStage.textContent = stage;
    if (title) gateTitle.textContent = title;
    if (message) gateMessage.textContent = message;
  }

  function showGate(title, message, action = null) {
    gate.hidden = false;
    gate.classList.remove('is-leaving');
    gateTitle.textContent = title;
    gateMessage.textContent = message;
    gateAction.hidden = !action;
    if (action) {
      gateAction.textContent = action.label;
      gateAction.href = action.href;
    }
  }

  function hideGate() {
    gate.classList.add('is-leaving');
    window.setTimeout(() => { gate.hidden = true; }, 540);
  }

  async function fetchSession() {
    const response = await fetch('/api/manage/session', {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { accept: 'application/json' }
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) throw new Error('SESSION_REQUIRED');
    csrfToken = payload.data.csrfToken || csrfToken;
    return payload.data;
  }

  async function sendHeartbeat() {
    if (!navigator.onLine || !csrfToken || root.dataset.workspaceSession !== 'active') return;
    const response = await fetch('/api/manage/session/heartbeat', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'x-cqnu-csrf': csrfToken
      },
      body: '{}'
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) throw new Error('SESSION_REQUIRED');
    csrfToken = payload.data.csrfToken || csrfToken;
  }

  function installAccess(data) {
    const avatarDataUrl = window.cqnuLocalProfile?.read(data.account.id) || '';
    const access = Object.freeze({
      accountId: data.account.id,
      username: data.account.username,
      displayName: data.account.displayName,
      accountKind: data.account.accountKind,
      accessLevel: data.account.accessLevel,
      capabilities: Object.freeze([...(data.capabilities || [])]),
      absoluteExpiresAt: data.session.absoluteExpiresAt,
      ...(avatarDataUrl ? { avatarDataUrl } : {})
    });
    Object.defineProperty(window, 'managementAccess', {
      configurable: true,
      enumerable: false,
      writable: false,
      value: access
    });
    root.dataset.managementAccessLevel = access.accessLevel;
    root.dataset.workspaceSession = 'active';
    if (!window.siteCloudProjects && typeof window.installSiteCloudProjectClient === 'function') {
      Object.defineProperty(window, 'siteCloudProjects', {
        configurable: false,
        enumerable: false,
        writable: false,
        value: window.installSiteCloudProjectClient(
          () => csrfToken,
          value => { csrfToken = String(value || csrfToken); }
        )
      });
    }
  }

  function loadScript(source) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = source;
      script.async = false;
      script.addEventListener('load', resolve, { once: true });
      script.addEventListener('error', () => reject(new Error(`LOAD_FAILED:${source}`)), { once: true });
      document.body.append(script);
    });
  }

  async function loadApplication() {
    if (applicationLoaded) return;
    updateProgress(34, '界面内核', '正在准备研究工作区', '正在并行载入界面与地图基础能力。');
    await Promise.all([
      loadScript('/renderer-dist/modern-shell.js'),
      loadScript('/node_modules/leaflet/dist/leaflet.js')
    ]);
    updateProgress(62, '地图工具');
    await loadScript('/node_modules/leaflet-draw/dist/leaflet.draw.js');
    updateProgress(78, '数据运行时', '', '正在连接本地项目、统计与维护模块。');
    await loadScript('/assets/legacy-runtime.js');
    if (root.dataset.runtimeStatus !== 'ready') throw new Error('RUNTIME_NOT_READY');
    applicationLoaded = true;
    updateProgress(100, '准备完成', '工作区已就绪', '正在恢复上次使用位置。');
  }

  function startHeartbeat() {
    if (heartbeatId) window.clearInterval(heartbeatId);
    heartbeatId = window.setInterval(() => {
      void sendHeartbeat().catch(expireSession);
    }, 45_000);
  }

  function expireSession() {
    if (heartbeatId) window.clearInterval(heartbeatId);
    heartbeatId = 0;
    root.dataset.workspaceSession = 'expired';
    showGate(
      '访问会话已失效',
      '浏览器本地项目没有被删除。重新登录后可继续使用当前设备中的数据。',
      { label: '重新登录', href: '/manage?next=/workspace' }
    );
  }

  async function resumeOnlineSession() {
    try {
      installAccess(await fetchSession());
      hideGate();
      startHeartbeat();
    } catch {
      expireSession();
    }
  }

  window.addEventListener('offline', () => {
    if (heartbeatId) window.clearInterval(heartbeatId);
    heartbeatId = 0;
    root.dataset.workspaceSession = 'paused';
    showGate(
      '管理会话已暂停',
      '设备当前离线。工作区保留在本机，但在重新核对访问权限前不会继续操作。',
      { label: '返回科研导航', href: '/' }
    );
  });
  window.addEventListener('online', () => { void resumeOnlineSession(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      void sendHeartbeat().catch(expireSession);
    }
  });

  void (async () => {
    try {
      const data = await fetchSession();
      if (data.account.mustChangePassword) {
        location.replace('/manage?next=/workspace');
        return;
      }
      installAccess(data);
      updateProgress(22, '权限已确认', '访问验证完成', '账户权限有效，正在启动本地应用。');
      await loadApplication();
      hideGate();
      startHeartbeat();
    } catch (error) {
      if (String(error?.message || '') === 'SESSION_REQUIRED') {
        location.replace('/manage?next=/workspace');
        return;
      }
      root.dataset.workspaceSession = 'error';
      showGate(
        '工作区加载失败',
        '访问权限已核对，但应用资源未能完整加载。请刷新页面或返回文档检查浏览器兼容性。',
        { label: '查看使用文档', href: '/docs' }
      );
    }
  })();
})();
