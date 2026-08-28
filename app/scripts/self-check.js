const fs = require('fs');
const path = require('path');
const vm = require('vm');

const suiteDir = path.join(__dirname, 'self-check');
const suiteFiles = [
  'support.js',
  'data-contracts.js',
  'operations-contracts.js',
  'renderer-shell-contracts.js',
  'renderer-workflow-contracts.js',
  'renderer-stats-contracts.js',
  'renderer-domain-contracts.js',
  'interaction-contracts.js',
  'feature-contracts.js',
  'platform-contracts.js',
  'run.js'
];

async function run() {
  const source = suiteFiles.map(fileName => fs.readFileSync(path.join(suiteDir, fileName), 'utf8')).join('\n\n');
  const createSuite = vm.runInThisContext(
    `(function createSelfCheckSuite(require, process, console, Buffer, setTimeout, clearTimeout) {\n${source}\nreturn main;\n})`,
    { filename: path.join(suiteDir, 'bundle.js') }
  );
  const runSelfCheck = createSuite(require, process, console, Buffer, setTimeout, clearTimeout);
  await runSelfCheck();
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
