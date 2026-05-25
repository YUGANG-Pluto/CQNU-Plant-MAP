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
  'release',
  'out',
  'coverage',
  '.nyc_output'
]);
const checkedExtensions = new Set(['.js', '.css', '.html', '.mjs', '.cjs']);

const splitReviewNotes = {
  'app/index.html': 'Single-window Electron shell; split only with a renderer component extraction.',
  'app/scripts/self-check.js': 'Central contract harness; split after stable domain test groups are defined.',
  'app/src/main/speciesReferenceService.js': 'Reference lookup service with provider normalization; split by provider after interface contracts stabilize.',
  'app/src/renderer/app.js': 'Renderer coordinator with feature binding; split after module event boundaries are stable.',
  'app/src/renderer/features/basemap/index.js': 'Basemap workflow module with UI wiring and provider rules.',
  'app/src/renderer/features/maintenance/index.js': 'Maintenance workflow module with diagnostics and repair actions.',
  'app/src/renderer/features/stats/index.js': 'Statistics center UI module scheduled for gradual section extraction.',
  'app/src/renderer/features/stats/statsResearch.js': 'Pure statistics and export helpers kept together for formula consistency.',
  'app/src/renderer/features/theme/index.js': 'Theme editor workflow module with preview and persistence wiring.',
  'app/src/renderer/i18n/en.js': 'English UI dictionary; split by feature after key ownership is stabilized.',
  'app/src/renderer/i18n/zh.js': 'Chinese UI dictionary; split by feature after key ownership is stabilized.',
  'app/src/renderer/styles/10-core-components.css': 'Shared component CSS bundle; split with design token stabilization.',
  'app/src/renderer/styles/20-theme-layouts.css': 'Theme and layout CSS bundle; split after theme token names stabilize.',
  'app/src/renderer/styles/40-workspace-basemap.css': 'Workspace and basemap CSS bundle; split with renderer view extraction.',
  'app/src/renderer/styles/70-vibeui-design-md.css': 'Design adaptation CSS bundle; split after the adapted pattern set is stable.'
};

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
