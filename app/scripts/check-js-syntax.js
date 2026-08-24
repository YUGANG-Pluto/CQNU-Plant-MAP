const fs = require('fs');
const path = require('path');
const vm = require('vm');

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
  try {
    const source = fs.readFileSync(file, 'utf8');
    new vm.Script(source, { filename: file, displayErrors: true });
  } catch (error) {
    failed = true;
    console.error(`Syntax check failed: ${path.relative(root, file)}`);
    console.error(error.stack || error.message);
  }
}

if (failed) {
  process.exitCode = 1;
} else {
  console.log(`JavaScript syntax check passed (${files.length} files)`);
}
