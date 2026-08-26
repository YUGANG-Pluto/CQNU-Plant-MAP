const fs = require('fs');
const path = require('path');
const Module = require('module');
const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');

function loadProjectWorkflowModel() {
  const filePath = path.join(process.cwd(), 'src/renderer-modern/features/project/model.ts');
  const source = fs.readFileSync(filePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      strict: true
    },
    fileName: filePath
  }).outputText;
  const loaded = new Module(filePath, module);
  loaded.filename = filePath;
  loaded.paths = Module._nodeModulePaths(path.dirname(filePath));
  loaded._compile(output, filePath);
  return loaded.exports;
}

const { createProjectWorkflowController, ProjectWorkflowError } = loadProjectWorkflowModel();
const ok = data => ({ ok: true, data });

function projectData(projectDir = 'project-one') {
  return {
    projectDir,
    settings: { projectName: 'Project one' },
    zones: [],
    points: []
  };
}

function createServices(overrides = {}) {
  return {
    chooseProject: async () => ok({ canceled: true }),
    loadProject: async payload => ok(projectData(payload.projectDir)),
    saveProject: async () => ok({ projectModifiedTime: 10, storageFormat: 'json' }),
    createBackup: async () => ok({ filePath: 'backup.zip', backupDir: 'backup' }),
    inspectBackup: async payload => ok({ ok: true, projectDir: payload.projectDir, backupName: 'backup.zip' }),
    restoreBackup: async () => ok({ status: 'completed', restoredFileCount: 3 }),
    ...overrides
  };
}

test('folder selection starts synchronously and open transitions through loading', async () => {
  let resolveSelection;
  let pickerInvoked = false;
  const selection = new Promise(resolve => {
    resolveSelection = resolve;
  });
  const workflow = createProjectWorkflowController(createServices({
    chooseProject() {
      pickerInvoked = true;
      return selection;
    }
  }));
  const phases = [];
  workflow.subscribe(status => phases.push(status.phase));

  const pending = workflow.chooseAndLoad({ mode: 'portable-folder' });
  assert.equal(pickerInvoked, true);
  assert.deepEqual(workflow.getStatus(), {
    sequence: 1,
    phase: 'choosing',
    operation: 'open',
    busy: true,
    errorCode: ''
  });
  resolveSelection(ok({ canceled: false, projectDir: ' project-one ', storageFormat: 'sqlite' }));

  const result = await pending;
  assert.equal(result.canceled, false);
  assert.equal(result.project.projectDir, 'project-one');
  assert.deepEqual(phases, ['idle', 'choosing', 'loading', 'ready']);
  assert.equal(workflow.getStatus().busy, false);
});

test('canceling folder selection does not load a project', async () => {
  let loadCount = 0;
  const workflow = createProjectWorkflowController(createServices({
    loadProject: async () => {
      loadCount += 1;
      return ok(projectData());
    }
  }));

  assert.deepEqual(await workflow.chooseAndLoad(), { canceled: true });
  assert.equal(loadCount, 0);
  assert.equal(workflow.getStatus().phase, 'idle');
});

test('explicit SQLite and JSON modes reach the matching picker service unchanged', async () => {
  const modes = [];
  const workflow = createProjectWorkflowController(createServices({
    chooseProject: async mode => {
      modes.push(mode);
      return ok({ canceled: true });
    }
  }));

  await workflow.chooseAndLoad({ mode: 'sqlite-file' });
  await workflow.chooseAndLoad({ mode: 'json-files' });
  assert.deepEqual(modes, ['sqlite-file', 'json-files']);
});

test('platform failures preserve their structured error code', async () => {
  const workflow = createProjectWorkflowController(createServices({
    loadProject: async () => ({
      ok: false,
      error: { code: 'PROJECT_ACCESS_DENIED', message: 'Access denied' }
    })
  }));

  await assert.rejects(
    workflow.load({ projectDir: 'project-one' }),
    error => error instanceof ProjectWorkflowError &&
      error.code === 'PROJECT_ACCESS_DENIED' &&
      error.message === 'Access denied'
  );
  assert.equal(workflow.getStatus().phase, 'error');
  assert.equal(workflow.getStatus().errorCode, 'PROJECT_ACCESS_DENIED');
});

test('a pending operation rejects concurrent project work', async () => {
  let resolveSelection;
  const selection = new Promise(resolve => {
    resolveSelection = resolve;
  });
  const workflow = createProjectWorkflowController(createServices({
    chooseProject: () => selection
  }));
  const pending = workflow.chooseAndLoad();

  await assert.rejects(
    workflow.save({ projectDir: 'project-one', settings: {}, zones: [], points: [] }),
    error => error.code === 'PROJECT_WORKFLOW_BUSY'
  );
  resolveSelection(ok({ canceled: true }));
  await pending;
});

test('save preserves the caller payload and reports a ready project', async () => {
  let received;
  const workflow = createProjectWorkflowController(createServices({
    saveProject: async payload => {
      received = payload;
      return ok({ projectModifiedTime: 25, storageFormat: 'sqlite' });
    }
  }));
  const payload = {
    projectDir: ' project-one ',
    storageFormat: 'sqlite',
    settings: { projectName: 'Project one' },
    zones: [{ id: 'z1' }],
    points: [{ id: 'p1' }]
  };
  const original = structuredClone(payload);

  const result = await workflow.save(payload);
  assert.deepEqual(payload, original);
  assert.equal(received.projectDir, 'project-one');
  assert.equal(result.projectModifiedTime, 25);
  assert.equal(workflow.getStatus().phase, 'ready');
});

test('backup commands use the same guarded workflow boundary', async () => {
  const calls = [];
  const workflow = createProjectWorkflowController(createServices({
    createBackup: async payload => {
      calls.push(['create', payload]);
      return ok({ filePath: 'backup.zip', backupDir: 'backup' });
    },
    inspectBackup: async payload => {
      calls.push(['inspect', payload]);
      return ok({ ok: true, projectDir: payload.projectDir, backupName: payload.backupName });
    },
    restoreBackup: async payload => {
      calls.push(['restore', payload]);
      return ok({ status: 'completed', restoredFileCount: 2 });
    }
  }));

  await workflow.createBackup({ projectDir: 'project-one', label: 'manual' });
  await workflow.inspectBackup({ projectDir: 'project-one', backupName: 'backup.zip' });
  await workflow.restoreBackup({ projectDir: 'project-one', backupName: 'backup.zip', confirmRestore: true });

  assert.deepEqual(calls.map(([name]) => name), ['create', 'inspect', 'restore']);
  assert.equal(workflow.getStatus().phase, 'ready');
});
