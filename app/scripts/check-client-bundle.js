const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const appRoot = path.resolve(__dirname, '..');
const rendererRoot = path.join(appRoot, 'renderer-dist');
const modernRoot = path.join(appRoot, 'src', 'renderer-modern');
const limits = {
  'modern-shell.js': { raw: 410 * 1024, gzip: 128 * 1024 },
  'modern-shell.css': { raw: 96 * 1024, gzip: 20 * 1024 }
};
const failures = [];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath, files);
    if (entry.isFile()) files.push(fullPath);
  }
  return files;
}

if (!fs.existsSync(rendererRoot)) {
  console.error('client bundle check failed: renderer-dist is missing; run npm run build:renderer first');
  process.exit(1);
}

for (const [name, budget] of Object.entries(limits)) {
  const filePath = path.join(rendererRoot, name);
  if (!fs.existsSync(filePath)) {
    failures.push(`${name} is missing`);
    continue;
  }
  const source = fs.readFileSync(filePath);
  const sizes = { raw: source.length, gzip: zlib.gzipSync(source, { level: 9 }).length };
  console.log(`${name}: ${sizes.raw} bytes, ${sizes.gzip} bytes gzip`);
  if (sizes.raw > budget.raw) failures.push(`${name} exceeds raw budget ${budget.raw}`);
  if (sizes.gzip > budget.gzip) failures.push(`${name} exceeds gzip budget ${budget.gzip}`);
}

const workerAssets = walk(path.join(rendererRoot, 'assets')).filter(filePath =>
  /(?:sqlite3-worker1|webDatabaseWorker).*\.js$/i.test(path.basename(filePath))
);
if (workerAssets.length < 2) {
  failures.push('SQLite workers must remain separate lazy assets');
} else {
  workerAssets.forEach(filePath => {
    const bytes = fs.statSync(filePath).size;
    console.log(`lazy worker ${path.basename(filePath)}: ${bytes} bytes`);
    if (bytes > 3 * 1024 * 1024) failures.push(`${path.basename(filePath)} exceeds 3 MiB`);
  });
}

const motionSources = walk(modernRoot)
  .filter(filePath => /\.(?:ts|tsx)$/.test(filePath))
  .map(filePath => fs.readFileSync(filePath, 'utf8'))
  .join('\n');
if (/from\s+['"]motion['"]/.test(motionSources)) {
  failures.push('renderer motion code imports the full Motion DOM package');
}
if (!/from\s+['"]motion\/mini['"]/.test(motionSources)) {
  failures.push('renderer motion code must retain the Motion mini animation kernel');
}

if (failures.length) {
  failures.forEach(message => console.error(`client bundle check failed: ${message}`));
  process.exitCode = 1;
} else {
  console.log('client bundle check passed');
}
