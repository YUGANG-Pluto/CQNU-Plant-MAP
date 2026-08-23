const fs = require('fs');
const path = require('path');

const appRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(appRoot, '..');
const errors = [];

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'));
}

function checkLockVersion(name, packageJson, packageLock) {
  const rootPackage = packageLock.packages?.[''];
  if (packageLock.version !== packageJson.version) {
    errors.push(`${name} package-lock root version does not match package.json`);
  }
  if (rootPackage?.version !== packageJson.version) {
    errors.push(`${name} package-lock workspace version does not match package.json`);
  }
}

const appPackage = readJson('app/package.json');
const appLock = readJson('app/package-lock.json');
const sitePackage = readJson('site/package.json');
const siteLock = readJson('site/package-lock.json');
const releaseVersionPattern = /^\d+\.\d+\.\d+(?:-beta\.\d+)?$/;

if (!releaseVersionPattern.test(appPackage.version)) {
  errors.push('Application version must use X.Y.Z or X.Y.Z-beta.N');
}
if (appPackage.version !== sitePackage.version) {
  errors.push('Application and site versions must match');
}

checkLockVersion('Application', appPackage, appLock);
checkLockVersion('Site', sitePackage, siteLock);

if (process.env.GITHUB_REF_TYPE === 'tag') {
  const expectedTag = `v${appPackage.version}`;
  if (process.env.GITHUB_REF_NAME !== expectedTag) {
    errors.push(`Git tag ${process.env.GITHUB_REF_NAME || '(missing)'} must match ${expectedTag}`);
  }
}

if (errors.length) {
  errors.forEach(error => console.error(`release version check failed: ${error}`));
  process.exitCode = 1;
} else {
  console.log(`release version check passed (${appPackage.version})`);
}
