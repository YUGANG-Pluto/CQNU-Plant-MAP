import { access, cp, rm } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const appRoot = resolve(repositoryRoot, 'app');
const adminRoot = resolve(repositoryRoot, 'admin');
const siteRoot = resolve(repositoryRoot, 'site');
const sourceDist = resolve(siteRoot, 'dist');
const targetDist = resolve(repositoryRoot, 'dist');
const npmCli = process.env.npm_execpath;

function runNpm(args) {
  return new Promise((resolveRun, rejectRun) => {
    const command = npmCli ? process.execPath : 'npm';
    const commandArgs = npmCli ? [npmCli, ...args] : args;
    const child = spawn(command, commandArgs, {
      cwd: repositoryRoot,
      stdio: 'inherit',
      windowsHide: true
    });
    child.once('error', rejectRun);
    child.once('exit', code => {
      if (code === 0) resolveRun();
      else rejectRun(new Error(`npm ${args.join(' ')} failed with exit code ${code ?? 'unknown'}.`));
    });
  });
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function ensureDependencies(workspace, marker) {
  if (await exists(marker)) return;
  await runNpm([
    '--prefix', workspace,
    'ci',
    '--ignore-scripts',
    '--no-audit',
    '--fund=false'
  ]);
}

const targetRelative = relative(repositoryRoot, targetDist);
if (!targetRelative || targetRelative.startsWith('..') || targetRelative.includes(':')) {
  throw new Error('Refusing to replace a build directory outside the repository root.');
}

await ensureDependencies(appRoot, resolve(appRoot, 'node_modules/vite/package.json'));
await ensureDependencies(adminRoot, resolve(adminRoot, 'node_modules/typescript/package.json'));
await runNpm(['--prefix', appRoot, 'run', 'build:renderer']);
await runNpm(['--prefix', siteRoot, 'run', 'check']);
await rm(targetDist, { recursive: true, force: true });
await cp(sourceDist, targetDist, { recursive: true });

console.log(`Sites root build prepared at ${targetDist}`);
