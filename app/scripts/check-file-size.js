const fs = require('fs');
const path = require('path');

const appRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(appRoot, '..');

const warningLimit = 600;
const splitReviewLimit = 800;
const hardLimit = 1000;

const skippedDirs = new Set([
  '.git',
  'node_modules',
  'dist',
  'main-dist',
  'renderer-dist',
  'release',
  'out',
  'coverage',
  '.nyc_output'
]);
const checkedExtensions = new Set(['.js', '.css', '.html', '.mjs', '.cjs', '.ts', '.tsx']);

const splitReviewNotes = {};

function normalizeRelative(filePath) {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!skippedDirs.has(entry.name)) {
        walk(fullPath, files);
      }
      continue;
    }
    if (entry.isFile() && checkedExtensions.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }
  return files;
}

function countLines(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  if (!text.length) return 0;
  return text.split(/\r?\n/).length;
}

const warnings = [];
const errors = [];
const oversized = [];

for (const filePath of walk(repoRoot)) {
  const relativePath = normalizeRelative(filePath);
  const lines = countLines(filePath);
  if (lines > warningLimit) {
    warnings.push(`${relativePath}: ${lines} lines`);
  }
  if (lines > splitReviewLimit) {
    oversized.push({ relativePath, lines });
    if (!splitReviewNotes[relativePath]) {
      errors.push(`${relativePath} has ${lines} lines and needs a split-review reason`);
    }
  }
  if (lines > hardLimit && !splitReviewNotes[relativePath]) {
    errors.push(`${relativePath} has ${lines} lines and needs a split plan or allowlist reason`);
  }
}

for (const [relativePath, reason] of Object.entries(splitReviewNotes)) {
  if (!fs.existsSync(path.join(repoRoot, relativePath))) {
    errors.push(`large-file allowlist target is missing: ${relativePath}`);
  }
  if (!reason || reason.length < 24) {
    errors.push(`large-file allowlist reason is too short: ${relativePath}`);
  }
}

if (warnings.length) {
  console.log('file size warnings:');
  warnings.forEach(warning => console.log(`- ${warning}`));
}

if (oversized.length) {
  console.log('files above split-review threshold:');
  oversized.forEach(item => {
    const reason = splitReviewNotes[item.relativePath];
    console.log(`- ${item.relativePath}: ${item.lines} lines (${reason})`);
  });
}

if (errors.length) {
  errors.forEach(error => console.error(`file size check failed: ${error}`));
  process.exitCode = 1;
} else {
  console.log('file size check passed');
}
