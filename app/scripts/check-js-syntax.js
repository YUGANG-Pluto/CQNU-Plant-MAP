const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const ignoredDirs = new Set([
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

function collectJavaScriptFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        collectJavaScriptFiles(path.join(dir, entry.name), files);
      }
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
}

const files = collectJavaScriptFiles(root);
let failed = false;

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], {
    cwd: root,
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    failed = true;
    console.error(`Syntax check failed: ${path.relative(root, file)}`);
    if (result.stdout) console.error(result.stdout.trim());
    if (result.stderr) console.error(result.stderr.trim());
  }
}

if (failed) {
  process.exitCode = 1;
} else {
  console.log(`JavaScript syntax check passed (${files.length} files)`);
}
