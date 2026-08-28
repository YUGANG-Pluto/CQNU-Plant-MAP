(() => {
  const root = document.querySelector('[data-project-inspector]');
  if (!root) return;

  const directoryInput = root.querySelector('[data-project-directory-input]');
  const fileInput = root.querySelector('[data-project-file-input]');
  const dropzone = root.querySelector('[data-project-dropzone]');
  const status = root.querySelector('[data-project-status]');
  const results = root.querySelector('[data-project-results]');
  const checks = root.querySelector('[data-project-checks]');
  const filesTable = root.querySelector('[data-project-files]');
  const exportButton = root.querySelector('[data-project-export]');
  const clearButton = root.querySelector('[data-project-clear]');
  const metrics = new Map(
    [...root.querySelectorAll('[data-project-metric]')].map(node => [node.dataset.projectMetric, node])
  );
  const MAX_JSON_BYTES = 25 * 1024 * 1024;
  const MAX_FILE_COUNT = 10_000;
  let report = null;

  function setStatus(message, tone = 'neutral') {
    status.textContent = message;
    status.dataset.tone = tone;
  }

  function safePath(file) {
    const raw = String(file.webkitRelativePath || file.name || '').replaceAll('\\', '/');
    const segments = raw.split('/').filter(segment => segment && segment !== '.' && segment !== '..');
    return segments.join('/');
  }

  function displayPath(pathname, rootName) {
    return pathname.startsWith(`${rootName}/`) ? pathname.slice(rootName.length + 1) : pathname;
  }

  function formatBytes(value) {
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  function fileKind(pathname) {
    const lower = pathname.toLocaleLowerCase();
    if (/(^|\/)settings\.json$/u.test(lower)) return 'settings';
    if (/(^|\/)zones\.json$/u.test(lower)) return 'zones';
    if (/(^|\/)points\.json$/u.test(lower)) return 'points';
    if (/\.(db|sqlite|sqlite3)$/u.test(lower)) return 'sqlite';
    if (/\.(png|jpe?g|webp|gif|tiff?)$/u.test(lower)) return 'image';
    if (lower.endsWith('.json')) return 'json';
    return 'other';
  }

  async function inspectJson(file, kind) {
    if (file.size > MAX_JSON_BYTES) {
      return {
        ok: false,
        kind,
        count: null,
        message: 'JSON 文件超过 25 MB，未在预检页展开读取。'
      };
    }
    try {
      const value = JSON.parse(await file.text());
      if (kind === 'settings') {
        const ok = Boolean(value) && typeof value === 'object' && !Array.isArray(value);
        return {
          ok,
          kind,
          count: ok ? Object.keys(value).length : null,
          message: ok ? '设置对象可读取。' : '设置文件应为 JSON 对象。'
        };
      }
      if (kind === 'zones' || kind === 'points') {
        const ok = Array.isArray(value);
        return {
          ok,
          kind,
          count: ok ? value.length : null,
          message: ok ? `读取到 ${value.length} 条记录。` : '记录文件应为 JSON 数组。'
        };
      }
      return {
        ok: true,
        kind,
        count: Array.isArray(value) ? value.length : null,
        message: 'JSON 语法有效。'
      };
    } catch {
      return {
        ok: false,
        kind,
        count: null,
        message: 'JSON 语法无效或文件无法读取。'
      };
    }
  }

  async function inspectSqlite(file) {
    const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const signature = new TextDecoder('utf-8').decode(header);
    const ok = signature === 'SQLite format 3\u0000';
    return {
      ok,
      kind: 'sqlite',
      count: null,
      message: ok ? 'SQLite 3 文件头有效。' : '文件扩展名类似数据库，但文件头不是 SQLite 3。'
    };
  }

  function renderReport(nextReport) {
    report = nextReport;
    results.hidden = false;
    exportButton.disabled = false;
    clearButton.disabled = false;
    metrics.get('files').textContent = String(report.summary.fileCount);
    metrics.get('bytes').textContent = formatBytes(report.summary.totalBytes);
    metrics.get('records').textContent = String(report.summary.recordCount);
    metrics.get('images').textContent = String(report.summary.imageCount);
    checks.replaceChildren(
      ...report.checks.map(check => {
        const item = document.createElement('li');
        item.dataset.level = check.level;
        const label = document.createElement('strong');
        label.textContent = check.title;
        const detail = document.createElement('span');
        detail.textContent = check.detail;
        item.append(label, detail);
        return item;
      })
    );
    filesTable.replaceChildren(
      ...report.files.slice(0, 80).map(file => {
        const row = document.createElement('tr');
        for (const value of [file.path, file.type, formatBytes(file.bytes), file.result]) {
          const cell = document.createElement('td');
          cell.textContent = value;
          cell.title = value;
          row.append(cell);
        }
        return row;
      })
    );
  }

  async function inspectFiles(fileList) {
    const files = [...fileList].filter(file => file instanceof File);
    if (!files.length) return;
    if (files.length > MAX_FILE_COUNT) {
      setStatus(`一次最多检查 ${MAX_FILE_COUNT} 个文件，请缩小选择范围。`, 'error');
      return;
    }
    setStatus('正在浏览器内读取所选文件的最小必要信息…', 'busy');
    const paths = files.map(safePath);
    const firstSegments = paths.map(pathname => pathname.split('/')[0]).filter(Boolean);
    const rootName =
      firstSegments.length && firstSegments.every(value => value === firstSegments[0]) ? firstSegments[0] : '';
    const inspected = [];
    let recordCount = 0;
    let imageCount = 0;

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const path = displayPath(paths[index], rootName);
      const kind = fileKind(path);
      let inspection = { ok: true, kind, count: null, message: '文件已识别。' };
      if (['settings', 'zones', 'points', 'json'].includes(kind)) inspection = await inspectJson(file, kind);
      else if (kind === 'sqlite') inspection = await inspectSqlite(file);
      if (kind === 'image') imageCount += 1;
      if (Number.isFinite(inspection.count) && (kind === 'zones' || kind === 'points')) recordCount += inspection.count;
      inspected.push({
        path: path || file.name,
        type: kind,
        bytes: file.size,
        valid: inspection.ok,
        result: inspection.message
      });
      if (index % 40 === 0) await new Promise(resolve => setTimeout(resolve, 0));
    }

    const kinds = new Set(inspected.map(file => file.type));
    const invalid = inspected.filter(file => !file.valid);
    const hasJsonProject = ['settings', 'zones', 'points'].some(kind => kinds.has(kind));
    const checksList = [
      {
        level: kinds.has('settings') ? 'pass' : 'warn',
        title: '项目设置',
        detail: kinds.has('settings') ? '找到并解析 settings.json。' : '未找到 settings.json。'
      },
      {
        level: kinds.has('zones') && kinds.has('points') ? 'pass' : 'warn',
        title: '记录文件',
        detail:
          kinds.has('zones') && kinds.has('points')
            ? 'zones.json 与 points.json 均可识别。'
            : '分区或点位记录文件不完整。'
      },
      {
        level: kinds.has('sqlite') ? 'pass' : 'info',
        title: 'SQLite 数据源',
        detail: kinds.has('sqlite')
          ? '检测到 SQLite 数据库并检查文件头。'
          : '未检测到 SQLite 数据库，可继续使用 JSON 项目。'
      },
      {
        level: invalid.length ? 'error' : 'pass',
        title: '文件可读性',
        detail: invalid.length
          ? `${invalid.length} 个受检文件存在格式问题。`
          : '所有受检 JSON 与 SQLite 文件均通过基础格式检查。'
      }
    ];
    if (hasJsonProject && kinds.has('sqlite')) {
      checksList.push({
        level: 'info',
        title: '双格式共存',
        detail: '项目同时包含 JSON 与 SQLite；正式工作区默认优先读取 SQLite，并可明确选择 JSON。'
      });
    }
    const nextReport = {
      reportVersion: 1,
      generatedAt: new Date().toISOString(),
      processing: 'browser-local-memory',
      summary: {
        fileCount: inspected.length,
        totalBytes: inspected.reduce((sum, file) => sum + file.bytes, 0),
        recordCount,
        imageCount,
        invalidCount: invalid.length
      },
      checks: checksList,
      files: inspected
    };
    renderReport(nextReport);
    setStatus(
      invalid.length ? '预检完成，请查看需要处理的文件。' : '预检完成，未发现基础格式错误。',
      invalid.length ? 'warning' : 'success'
    );
  }

  function clearReport() {
    report = null;
    directoryInput.value = '';
    fileInput.value = '';
    results.hidden = true;
    exportButton.disabled = true;
    clearButton.disabled = true;
    checks.replaceChildren();
    filesTable.replaceChildren();
    setStatus('尚未选择项目文件。所有检查均在当前浏览器标签页内完成。');
  }

  function exportReport() {
    if (!report) return;
    const blob = new Blob([`${JSON.stringify(report, null, 2)}\n`], {
      type: 'application/json;charset=utf-8'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `project_preflight_${new Date().toISOString().slice(0, 10).replaceAll('-', '')}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  [directoryInput, fileInput].forEach(input => {
    input.addEventListener('change', () => inspectFiles(input.files));
  });
  ['dragenter', 'dragover'].forEach(type =>
    dropzone.addEventListener(type, event => {
      event.preventDefault();
      dropzone.classList.add('is-dragging');
    })
  );
  ['dragleave', 'drop'].forEach(type =>
    dropzone.addEventListener(type, event => {
      event.preventDefault();
      dropzone.classList.remove('is-dragging');
    })
  );
  dropzone.addEventListener('drop', event => inspectFiles(event.dataTransfer?.files || []));
  exportButton.addEventListener('click', exportReport);
  clearButton.addEventListener('click', clearReport);
  clearReport();
})();
