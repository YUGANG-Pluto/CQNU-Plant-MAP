const fs = require('fs');
const path = require('path');

const LEVELS = Object.freeze({
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
});

const DEFAULT_RETENTION_DAYS = 14;
const DEFAULT_MAX_FILE_BYTES = 2 * 1024 * 1024;
let config = {
  logDir: path.join(process.cwd(), 'logs'),
  level: 'info',
  retentionDays: DEFAULT_RETENTION_DAYS,
  maxFileBytes: DEFAULT_MAX_FILE_BYTES
};

function pad(value) {
  return String(value).padStart(2, '0');
}

function dateStamp(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function currentLogPath() {
  return path.join(config.logDir, `app-${dateStamp()}.log`);
}

function ensureLogDir() {
  fs.mkdirSync(config.logDir, { recursive: true });
}

function normalizeLevel(level) {
  return Object.prototype.hasOwnProperty.call(LEVELS, level) ? level : 'info';
}

function shouldWrite(level) {
  return LEVELS[normalizeLevel(level)] >= LEVELS[normalizeLevel(config.level)];
}

function safePathLabel(value) {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = path.normalize(value);
  const parent = path.basename(path.dirname(normalized));
  const base = path.basename(normalized);
  return parent && parent !== '.' ? path.join(parent, base) : base;
}

function sanitizeMeta(value, depth = 0) {
  if (depth > 3) {
    return '[truncated]';
  }
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value === 'string') {
    return value.length > 800 ? `${value.slice(0, 800)}...` : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 20).map(item => sanitizeMeta(item, depth + 1));
  }
  if (typeof value === 'object') {
    const out = {};
    Object.entries(value).slice(0, 30).forEach(([key, item]) => {
      if (/content|data|settings|zones|points|payload/i.test(key)) {
        out[key] = '[redacted]';
        return;
      }
      out[key] = /path|dir|file/i.test(key) ? safePathLabel(item) : sanitizeMeta(item, depth + 1);
    });
    return out;
  }
  return String(value);
}

function rotateIfNeeded(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const stat = fs.statSync(filePath);
  if (stat.size < config.maxFileBytes) {
    return;
  }

  const rotated = filePath.replace(/\.log$/, `-${Date.now()}.log`);
  fs.renameSync(filePath, rotated);
}

function cleanupOldLogs() {
  ensureLogDir();
  const cutoff = Date.now() - Math.max(1, config.retentionDays) * 24 * 60 * 60 * 1000;
  let deleted = 0;
  fs.readdirSync(config.logDir, { withFileTypes: true })
    .filter(item => item.isFile() && /^app-\d{4}-\d{2}-\d{2}(?:-\d+)?\.log$/.test(item.name))
    .forEach(item => {
      const fullPath = path.join(config.logDir, item.name);
      const stat = fs.statSync(fullPath);
      if ((stat.mtimeMs || 0) < cutoff) {
        fs.rmSync(fullPath, { force: true });
        deleted += 1;
      }
    });
  return {
    deleted,
    remaining: listLogFiles().length,
    retentionDays: config.retentionDays
  };
}

function normalizeLogFileName(name) {
  const safeName = path.basename(String(name || ''));
  if (!/^app-\d{4}-\d{2}-\d{2}(?:-\d+)?\.log$/.test(safeName)) {
    throw new Error('invalid log file name');
  }
  return safeName;
}

function resolveLogFileByName(name) {
  ensureLogDir();
  const safeName = normalizeLogFileName(name);
  const filePath = path.join(config.logDir, safeName);
  const relative = path.relative(config.logDir, filePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('log file is outside log directory');
  }
  return filePath;
}

function readLogFile(payload = {}) {
  const filePath = resolveLogFileByName(payload.name);
  if (!fs.existsSync(filePath)) {
    throw new Error('log file does not exist');
  }
  const stat = fs.statSync(filePath);
  const maxBytes = Math.min(Number(payload.maxBytes) || 512 * 1024, 2 * 1024 * 1024);
  const text = stat.size > maxBytes ? readLogTail(filePath, maxBytes) : fs.readFileSync(filePath, 'utf8');
  return {
    name: path.basename(filePath),
    size: stat.size,
    truncated: stat.size > maxBytes,
    content: text,
    diagnosis: diagnoseLogContent(text, path.basename(filePath))
  };
}

function deleteLogFiles(payload = {}) {
  const names = Array.isArray(payload.names) ? payload.names : [payload.name].filter(Boolean);
  let deleted = 0;
  names.forEach(name => {
    const filePath = resolveLogFileByName(name);
    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath, { force: true });
      deleted += 1;
    }
  });
  return {
    deleted,
    remaining: listLogFiles().length
  };
}

function listLogFiles() {
  ensureLogDir();
  return fs.readdirSync(config.logDir, { withFileTypes: true })
    .filter(item => item.isFile() && /^app-\d{4}-\d{2}-\d{2}(?:-\d+)?\.log$/.test(item.name))
    .map(item => {
      const filePath = path.join(config.logDir, item.name);
      const stat = fs.statSync(filePath);
      return {
        name: item.name,
        path: filePath,
        size: stat.size,
        modifiedAt: new Date(stat.mtimeMs || Date.now()).toISOString()
      };
    })
    .sort((a, b) => Date.parse(b.modifiedAt) - Date.parse(a.modifiedAt));
}

function parseLogLine(line, fileName) {
  try {
    return {
      ...JSON.parse(line),
      fileName
    };
  } catch {
    return {
      ts: '',
      level: 'info',
      scope: 'log:file',
      message: line.slice(0, 800),
      meta: {},
      fileName
    };
  }
}

function diagnoseLogContent(content, fileName = '') {
  const lines = String(content || '').split(/\r?\n/).filter(Boolean);
  const parsed = lines.map(line => parseLogLine(line, fileName));
  const issueEntries = parsed.filter(entry => {
    const level = normalizeLevel(entry.level || 'info');
    const text = `${entry.scope || ''} ${entry.message || ''}`.toLowerCase();
    return level === 'error'
      || level === 'warn'
      || /failed|failure|exception|uncaught|blocked|invalid|corrupt|timeout/.test(text);
  });
  const scopeCounts = {};
  issueEntries.forEach(entry => {
    const scope = entry.scope || 'app';
    scopeCounts[scope] = (scopeCounts[scope] || 0) + 1;
  });
  const hotScopes = Object.entries(scopeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([scope, count]) => ({ scope, count }));
  const issues = issueEntries.slice(-20).reverse().map(entry => ({
    ts: entry.ts || '',
    level: normalizeLevel(entry.level || 'info'),
    scope: entry.scope || 'app',
    message: entry.message || ''
  }));

  return {
    status: issues.length ? 'issues' : 'pass',
    totalLines: lines.length,
    issueCount: issueEntries.length,
    hotScopes,
    issues,
    suggestions: issues.length
      ? [
        'Run project health check and inspect the listed scopes first.',
        'If storage or conversion scopes appear, run conversion preflight before retrying the operation.'
      ]
      : []
  };
}

function readLogTail(filePath, maxBytes = 256 * 1024) {
  const stat = fs.statSync(filePath);
  const length = Math.min(stat.size, maxBytes);
  const buffer = Buffer.alloc(length);
  const fd = fs.openSync(filePath, 'r');
  try {
    fs.readSync(fd, buffer, 0, length, Math.max(0, stat.size - length));
  } finally {
    fs.closeSync(fd);
  }
  return buffer.toString('utf8');
}

function normalizeLogLimit(value) {
  const limit = Number(value);
  return Number.isFinite(limit) ? Math.min(300, Math.max(10, limit)) : 80;
}

function listRecentLogs(payload = {}) {
  const limit = normalizeLogLimit(payload.limit);
  const files = listLogFiles();
  const entries = [];

  for (const file of files) {
    if (entries.length >= limit) break;
    const lines = readLogTail(file.path).split(/\r?\n/).filter(Boolean).reverse();
    for (const line of lines) {
      entries.push(parseLogLine(line, file.name));
      if (entries.length >= limit) break;
    }
  }

  return {
    config: getLoggerConfig(),
    files: files.map(file => ({
      name: file.name,
      size: file.size,
      modifiedAt: file.modifiedAt
    })),
    entries
  };
}

function configureLogger(options = {}) {
  config = {
    ...config,
    ...options,
    level: normalizeLevel(options.level || config.level),
    retentionDays: Number.isFinite(Number(options.retentionDays))
      ? Number(options.retentionDays)
      : config.retentionDays,
    maxFileBytes: Number.isFinite(Number(options.maxFileBytes))
      ? Number(options.maxFileBytes)
      : config.maxFileBytes
  };
  ensureLogDir();
}

function initLogger(app, options = {}) {
  const userDataDir = app?.getPath ? app.getPath('userData') : process.cwd();
  configureLogger({
    logDir: path.join(userDataDir, 'logs'),
    ...options
  });

}

function setLogLevel(level) {
  config.level = normalizeLevel(level);
  return config.level;
}

function writeLog(level, scope, message, meta = {}) {
  const normalizedLevel = normalizeLevel(level);
  if (!shouldWrite(normalizedLevel)) {
    return;
  }

  const entry = {
    ts: new Date().toISOString(),
    level: normalizedLevel,
    scope: String(scope || 'app'),
    message: String(message || ''),
    meta: sanitizeMeta(meta)
  };

  try {
    ensureLogDir();
    const filePath = currentLogPath();
    rotateIfNeeded(filePath);
    fs.appendFileSync(filePath, `${JSON.stringify(entry)}\n`, 'utf8');
  } catch (error) {
    console.error('[logger] write failed', error);
  }
}

function errorToLogMeta(error) {
  if (!error || typeof error !== 'object') {
    return { error: String(error || '') };
  }
  return {
    name: error.name,
    code: error.code,
    stack: typeof error.stack === 'string' ? error.stack.slice(0, 2000) : undefined,
    cause: error.cause ? sanitizeMeta(error.cause) : undefined
  };
}

function logError(scope, error, meta = {}) {
  const message = error?.message || String(error || 'Error');
  writeLog('error', scope, message, {
    ...meta,
    ...errorToLogMeta(error)
  });
}

function reportRendererLog(payload = {}, event) {
  const level = normalizeLevel(payload.level || 'error');
  writeLog(level, payload.scope || 'renderer', payload.message || '', {
    code: payload.code,
    details: payload.details,
    url: payload.url,
    userAgent: event?.sender?.userAgent
  });
  return { logged: true };
}

function getLoggerConfig() {
  return { ...config };
}

module.exports = {
  configureLogger,
  initLogger,
  setLogLevel,
  writeLog,
  logError,
  reportRendererLog,
  listRecentLogs,
  readLogFile,
  diagnoseLogContent,
  deleteLogFiles,
  cleanupOldLogs,
  getLoggerConfig
};
