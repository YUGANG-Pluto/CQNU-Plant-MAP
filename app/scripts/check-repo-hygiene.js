const fs = require('fs');
const path = require('path');

const appRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(appRoot, '..');
const errors = [];

function fail(message) {
  errors.push(message);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function existsFromRoot(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

function readFromRoot(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function fromCodes(codes) {
  return String.fromCharCode(...codes);
}

const blockedTerms = [
  fromCodes([65, 73]),
  fromCodes([67, 111, 100, 101, 120]),
  fromCodes([67, 104, 97, 116, 71, 80, 84]),
  fromCodes([97, 103, 101, 110, 116]),
  fromCodes([112, 114, 111, 109, 112, 116]),
  fromCodes([25552, 31034, 35789]),
  fromCodes([25191, 34892, 35268, 26684])
];

const skippedDirs = new Set([
  '.git',
  'node_modules',
  'dist',
  'release',
  'out',
  'coverage',
  '.nyc_output'
]);
const skippedContentNames = new Set(['package-lock.json']);
const textExtensions = new Set([
  '.cjs',
  '.css',
  '.html',
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.txt',
  '.yml',
  '.yaml'
]);
const binaryExtensions = new Set([
  '.ico',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.zip',
  '.7z',
  '.rar',
  '.exe',
  '.msi',
  '.db',
  '.sqlite',
  '.sqlite3'
]);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isTermMatch(term, text) {
  if (term.length <= 3) {
    return new RegExp(`(^|[^A-Za-z])${escapeRegExp(term)}([^A-Za-z]|$)`).test(text);
  }
  return new RegExp(`\\b${escapeRegExp(term)}\\b`, 'i').test(text);
}

function walkFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!skippedDirs.has(entry.name)) {
        walkFiles(path.join(dir, entry.name), files);
      }
      continue;
    }

    if (entry.isFile()) {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
}

function checkRestrictedFiles() {
  for (const filePath of walkFiles(repoRoot)) {
    const relativePath = path.relative(repoRoot, filePath).replace(/\\/g, '/');
    const baseName = path.basename(relativePath);
    const ext = path.extname(baseName).toLowerCase();

    for (const term of blockedTerms) {
      if (term === blockedTerms[0]) {
        const nameMarker = escapeRegExp(blockedTerms[0]);
        if (new RegExp(`(^|[-_.\\s])${nameMarker}($|[-_.\\s])`, 'i').test(relativePath)) {
          fail(`Restricted file name: ${relativePath}`);
        }
        continue;
      }
      if (relativePath.toLowerCase().includes(term.toLowerCase())) {
        fail(`Restricted file name: ${relativePath}`);
      }
    }

    if (binaryExtensions.has(ext) || skippedContentNames.has(baseName) || !textExtensions.has(ext)) {
      continue;
    }

    const headerName = `${fromCodes([117, 115, 101, 114, 45])}${blockedTerms[3]}`;
    const content = fs.readFileSync(filePath, 'utf8')
      .replace(new RegExp(escapeRegExp(headerName), 'ig'), '');
    for (const term of blockedTerms) {
      if (isTermMatch(term, content)) {
        fail(`Restricted text marker in ${relativePath}`);
      }
    }
  }
}

function checkPackageMetadata() {
  const packageJson = readJson(path.join(appRoot, 'package.json'));
  const openLicenses = ['MIT', 'ISC', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'GPL-3.0', 'LGPL-3.0'];

  if (openLicenses.includes(packageJson.license)) {
    fail(`package.json must not declare open license ${packageJson.license}`);
  }
  if (packageJson.license !== 'UNLICENSED') {
    fail('package.json license must be UNLICENSED');
  }
  if (packageJson.private !== true) {
    fail('package.json private must be true');
  }

  ['check:syntax', 'check:size', 'check:repo', 'self-check', 'verify'].forEach(scriptName => {
    if (!packageJson.scripts || !packageJson.scripts[scriptName]) {
      fail(`package.json missing script ${scriptName}`);
    }
  });
}

function checkRequiredFiles() {
  [
    'README.md',
    'CHANGELOG.md',
    'CONTRIBUTING.md',
    'Copyright.md',
    'LICENSE.md',
    'EULA.md',
    'SCHOOL_USE_LICENSE.md',
    'THIRD_PARTY_NOTICES.md',
    'PRIVACY.md',
    'SECURITY.md',
    'VERSION_POLICY.md',
    'CONTRIBUTING_PRIVATE.md',
    '.editorconfig',
    'docs/ARCHITECTURE.md',
    'docs/DATA_SCHEMA.md',
    'docs/FILE_SIZE_POLICY.md',
    'docs/TYPE_SYSTEM_PLAN.md',
    'docs/SQLITE_SCHEMA.md',
    'docs/SQLITE_GUIDE.md',
    'docs/JSON_SQLITE_EXCHANGE.md',
    'docs/DATA_MIGRATION_PLAN.md',
    'docs/DEV_GUIDE.md',
    'docs/TESTING_GUIDE.md',
    'docs/RELEASE_GUIDE.md',
    'docs/USER_MANUAL.md',
    'docs/BACKUP_GUIDE.md',
    'docs/IMPORT_EXPORT_GUIDE.md',
    'docs/DIAGNOSTICS_GUIDE.md',
    'docs/COMMERCIAL_SAMPLE_CHECKLIST.md',
    'docs/MAINTENANCE_GUIDE.md',
    'docs/ADR/0001-local-first-electron.md',
    'docs/ADR/0002-proprietary-school-use-license.md',
    'docs/ADR/0003-ipc-security-boundary.md',
    'docs/ADR/0004-data-storage-strategy.md',
    'docs/PROJECT_OVERVIEW.md',
    'docs/BASELINE_AUDIT.md',
    'docs/TESTING.md',
    'docs/MAINTENANCE.md',
    'docs/RELEASE_CHECKLIST.md',
    'docs/SECURITY_MODEL.md',
    'docs/IPC_CONTRACT.md',
    '.github/workflows/ci.yml',
    '.github/CODEOWNERS',
    '.github/pull_request_template.md',
    '.github/ISSUE_TEMPLATE/bug_report.yml',
    '.github/ISSUE_TEMPLATE/feature_request.yml',
    '.github/ISSUE_TEMPLATE/release_checklist.yml',
    '.github/ISSUE_TEMPLATE/config.yml',
    'app/package-lock.json',
    'app/scripts/check-file-size.js',
    'app/scripts/check-js-syntax.js',
    'app/scripts/check-repo-hygiene.js',
    'app/scripts/self-check.js',
    'app/src/main/securityPolicy.js',
    'app/build/icon.ico'
  ].forEach(relativePath => {
    if (!existsFromRoot(relativePath)) {
      fail(`Missing required file: ${relativePath}`);
    }
  });
}

function checkReadmeAndLegalNotes() {
  const readme = readFromRoot('README.md');
  [
    '版权与使用限制 | Copyright and Usage Restrictions',
    '项目数据 | Project Data',
    '本地',
    'local',
    '校内'
  ].forEach(fragment => {
    if (!readme.includes(fragment)) {
      fail(`README missing required note: ${fragment}`);
    }
  });

  const copyright = readFromRoot('Copyright.md');
  ['2026', 'YU GangZuo'].forEach(fragment => {
    if (!copyright.includes(fragment)) {
      fail(`Copyright.md missing ${fragment}`);
    }
  });
}

function checkThirdPartyNotices() {
  const packageJson = readJson(path.join(appRoot, 'package.json'));
  const notices = readFromRoot('THIRD_PARTY_NOTICES.md');
  const names = [
    ...Object.keys(packageJson.dependencies || {}),
    ...Object.keys(packageJson.devDependencies || {})
  ];

  names.forEach(name => {
    if (!notices.includes(name)) {
      fail(`THIRD_PARTY_NOTICES.md missing ${name}`);
    }
  });
}

function checkIgnoreRules() {
  const gitignore = readFromRoot('.gitignore');
  const lines = gitignore.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  ['package-lock.json', 'docs/', 'LICENSE.md', 'Copyright.md', 'SCHOOL_USE_LICENSE.md'].forEach(rule => {
    if (lines.includes(rule)) {
      fail(`.gitignore must not ignore ${rule}`);
    }
  });
  if (lines.includes('build/')) {
    fail('.gitignore must not ignore every build directory');
  }
  if (!gitignore.includes('!app/build/icon.ico')) {
    fail('.gitignore must keep app/build/icon.ico trackable');
  }
}

checkRestrictedFiles();
checkPackageMetadata();
checkRequiredFiles();
checkReadmeAndLegalNotes();
checkThirdPartyNotices();
checkIgnoreRules();

if (errors.length) {
  errors.forEach(error => console.error(`repo hygiene failed: ${error}`));
  process.exitCode = 1;
} else {
  console.log('repository hygiene check passed');
}
