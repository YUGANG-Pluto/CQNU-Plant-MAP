const test = require('node:test');
const assert = require('node:assert/strict');

const webProjectModule = import('../../src/renderer-modern/platform/webProject.ts');

function localFile(name, content, lastModified = 1000) {
  return {
    name,
    lastModified,
    text: async () => typeof content === 'string' ? content : JSON.stringify(content)
  };
}

function folderFile(path, content = {}) {
  const file = localFile(path.split('/').at(-1), content);
  file.webkitRelativePath = path;
  return file;
}

test('web project reader combines settings, zones, and points without local paths', async () => {
  const { createWebProjectSession } = await webProjectModule;
  const session = await createWebProjectSession([
    localFile('settings.json', { language: 'en', unknownSetting: true }),
    localFile('zones.json', [{ id: 'zone-a', zoneId: 'A', name: '一区', unknownZone: 1 }]),
    localFile('points.json', [{ id: 'point-a', pointId: 'P001', zoneRef: 'zone-a', plantNameSci: 'Ginkgo biloba' }], 2000)
  ]);

  assert.equal(session.settings.language, 'en');
  assert.equal(session.settings.unknownSetting, true);
  assert.equal(session.zones[0].unknownZone, 1);
  assert.equal(session.points[0].plantNameSci, 'Ginkgo biloba');
  assert.equal(session.modifiedAt, 2000);
  assert.match(session.projectDir, /^web:\/\/project\//);
  assert.doesNotMatch(session.projectDir, /[A-Za-z]:\\/);
});

test('web project reader maps localized CSV headers to stable project records', async () => {
  const { createWebProjectSession } = await webProjectModule;
  const csv = [
    '分区编号,分区名称,点位编号,中文名,学名,科,属,经度,纬度',
    'A,一区,P001,银杏,Ginkgo biloba,Ginkgoaceae,Ginkgo,106.30,29.60',
    'A,一区,P002,桂花,Osmanthus fragrans,Oleaceae,Osmanthus,106.31,29.61'
  ].join('\n');
  const session = await createWebProjectSession([localFile('records.csv', csv)]);

  assert.equal(session.zones.length, 1);
  assert.equal(session.zones[0].name, '一区');
  assert.equal(session.points.length, 2);
  assert.equal(session.points[0].zoneRef, session.zones[0].id);
  assert.equal(session.points[1].family, 'Oleaceae');
  assert.equal(session.points[1].lng, 106.31);
});

test('web project reader rejects unsupported selections with a readable error', async () => {
  const { createWebProjectSession } = await webProjectModule;
  await assert.rejects(
    createWebProjectSession([localFile('notes.txt', 'not a project')]),
    /请选择 settings\.json/
  );
});

test('folder import selects only the project data trio from an application directory', async () => {
  const { projectFilesFromFolder } = await webProjectModule;
  const files = projectFilesFromFolder([
    folderFile('campus/information/settings.json'),
    folderFile('campus/information/zones.json'),
    folderFile('campus/information/points.json'),
    folderFile('campus/information/logs/diagnostic.json'),
    folderFile('campus/images/plant.jpg')
  ]);

  assert.deepEqual(files.map(file => file.name).sort(), ['points.json', 'settings.json', 'zones.json']);
});

test('folder import accepts a single portable project export at the folder root', async () => {
  const { projectFilesFromFolder } = await webProjectModule;
  const files = projectFilesFromFolder([
    folderFile('campus/project.json'),
    folderFile('campus/nested/unrelated.json')
  ]);

  assert.deepEqual(files.map(file => file.name), ['project.json']);
});

test('folder import prioritizes the canonical SQLite database when JSON coexists', async () => {
  const { projectFilesFromFolder } = await webProjectModule;
  const files = projectFilesFromFolder([
    folderFile('campus/information/settings.json'),
    folderFile('campus/information/zones.json'),
    folderFile('campus/information/points.json'),
    folderFile('campus/information/archive.sqlite'),
    folderFile('campus/information/data.db')
  ]);

  assert.deepEqual(files.map(file => file.name), ['data.db']);
});
