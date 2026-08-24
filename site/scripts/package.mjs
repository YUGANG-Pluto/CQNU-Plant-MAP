import { spawn } from 'node:child_process';
import { access, mkdir, readFile, rm, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const distRoot = resolve(siteRoot, 'dist');
const artifactsRoot = resolve(siteRoot, '.sites-artifacts');
const packageJson = JSON.parse(await readFile(resolve(siteRoot, 'package.json'), 'utf8'));
const archivePath = resolve(artifactsRoot, `cqnu-plant-map-site-${packageJson.version}.tar.gz`);

await Promise.all([
  access(resolve(distRoot, 'server/index.js')),
  access(resolve(distRoot, 'client')),
  access(resolve(distRoot, '.openai/hosting.json'))
]);
await mkdir(artifactsRoot, { recursive: true });
await rm(archivePath, { force: true });

await new Promise((resolveRun, rejectRun) => {
  const child = spawn('tar', ['-czf', archivePath, '-C', distRoot, '.'], {
    cwd: siteRoot,
    stdio: 'inherit',
    windowsHide: true
  });
  child.once('error', rejectRun);
  child.once('exit', code => {
    if (code === 0) resolveRun();
    else rejectRun(new Error(`Site archive creation failed with exit code ${code ?? 'unknown'}.`));
  });
});

const archive = await stat(archivePath);
console.log(`Sites archive: ${archivePath} (${archive.size} bytes)`);
