const sqliteSchemaService = require('../src/main/sqliteSchemaService');

function finish(exitCode) {
  if (process.versions.electron) {
    require('electron').app.exit(exitCode);
    return;
  }
  process.exitCode = exitCode;
}

try {
  const result = sqliteSchemaService.checkSchemaInTemporaryDatabase();
  console.log(JSON.stringify(result, null, 2));
  finish(result.ok ? 0 : 1);
} catch (error) {
  console.error(`sqlite schema check failed: ${error.message}`);
  finish(1);
}
