import { rm } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const adminRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = resolve(adminRoot, 'dist');
const distRelative = relative(adminRoot, distRoot);

if (distRelative !== 'dist') {
  throw new Error('Refusing to clean a path outside the admin workspace.');
}

await rm(distRoot, { recursive: true, force: true });
