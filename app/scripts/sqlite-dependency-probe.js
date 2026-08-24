const fs = require('fs');
const os = require('os');
const path = require('path');

function removeQuietly(filePath) {
  try {
    fs.rmSync(filePath, { recursive: true, force: true });
  } catch (_error) {
    // Probe cleanup must not hide the original database result.
  }
}

function runProbe() {
  const Database = require('better-sqlite3');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'plant-sqlite-probe-'));
  const dbPath = path.join(root, 'probe.sqlite');
  let db = null;

  try {
    db = new Database(dbPath);
    db.exec('CREATE TABLE probe_items (id INTEGER PRIMARY KEY, label TEXT NOT NULL)');
    const insert = db.prepare('INSERT INTO probe_items (label) VALUES (?)');
    const inserted = insert.run('sqlite-probe');
    const selected = db
      .prepare('SELECT id, label FROM probe_items WHERE id = ?')
      .get(inserted.lastInsertRowid);

    if (!selected || selected.label !== 'sqlite-probe') {
      throw new Error('parameterized query returned unexpected data');
    }

    db.close();
    db = null;
    removeQuietly(root);

    return {
      ok: true,
      runtime: process.versions.electron ? 'electron-main' : 'node',
      package: 'better-sqlite3',
      version: require('better-sqlite3/package.json').version,
      temporaryDatabaseCreated: true,
      parameterizedQuery: true,
      closed: true,
      cleaned: !fs.existsSync(root)
    };
  } finally {
    if (db) {
      try {
        db.close();
      } catch (_error) {
        // Ignore close errors during cleanup.
      }
    }
    removeQuietly(root);
  }
}

try {
  const result = runProbe();
  console.log(JSON.stringify(result, null, 2));
  if (process.versions.electron) {
    require('electron').app.exit(0);
  }
} catch (error) {
  console.error(`sqlite dependency probe failed: ${error.message}`);
  process.exitCode = 1;
  if (process.versions.electron) {
    require('electron').app.exit(1);
  }
}
