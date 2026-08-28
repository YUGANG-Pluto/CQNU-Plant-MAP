const test = require('node:test');
const assert = require('node:assert/strict');

const controllerModule = import('../../src/renderer-modern/features/review/controller.ts');

function issue(id, severity = 'medium') {
  return {
    id,
    severity,
    labelKey: `label-${id}`,
    detailKey: `detail-${id}`
  };
}

function task(id, overrides = {}) {
  return {
    id,
    pointInternalId: `point-${id}`,
    pointId: `P-${id}`,
    displayName: `Plant ${id}`,
    scientificName: `Species ${id}`,
    zoneInternalId: 'zone-1',
    severity: 'medium',
    issues: [issue('missingScientificName')],
    searchText: `p-${id} plant ${id} species ${id}`.toLocaleLowerCase(),
    ...overrides
  };
}

function queue() {
  return {
    totalPoints: 3,
    readyPoints: 0,
    pendingPoints: 3,
    openIssueCount: 3,
    progressPercent: 0,
    tasks: [
      task('a', {
        severity: 'high',
        issues: [issue('missingCoordinate', 'high')]
      }),
      task('b', {
        zoneInternalId: 'zone-2',
        issues: [issue('missingImage', 'low')],
        severity: 'low'
      }),
      task('c', {
        zoneInternalId: '',
        issues: [issue('missingScientificName', 'medium')]
      })
    ],
    issueCounts: {
      missingCoordinate: 1,
      missingImage: 1,
      missingScientificName: 1
    }
  };
}

test('review controller freezes its session view without mutating the queue', async () => {
  const { createReviewWorkbenchController } = await controllerModule;
  const source = queue();
  const before = structuredClone(source);
  const controller = createReviewWorkbenchController();
  const snapshot = controller.replace(source);

  assert.deepEqual(source, before);
  assert.equal(controller.version, 'review-workbench-controller-v1');
  assert.equal(Object.isFrozen(controller), true);
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot.queue), true);
  assert.equal(Object.isFrozen(snapshot.visibleTasks), true);
  assert.equal(Object.isFrozen(snapshot.visibleTasks[0]), true);
  assert.equal(snapshot.selectedTaskId, 'a');
});

test('review controller applies issue, zone, severity, and localized search filters', async () => {
  const { createReviewWorkbenchController } = await controllerModule;
  const controller = createReviewWorkbenchController();
  controller.replace(queue(), {
    a: '中心花园 坐标问题',
    b: '东区 缺失图片',
    c: '未关联分区 缺失学名'
  });

  assert.deepEqual(
    controller.setFilters({ issue: 'missingImage' }).visibleTasks.map(item => item.id),
    ['b']
  );
  controller.resetFilters();
  assert.deepEqual(
    controller.setFilters({ zone: '__unassigned__' }).visibleTasks.map(item => item.id),
    ['c']
  );
  controller.resetFilters();
  assert.deepEqual(
    controller.setFilters({ severity: 'high' }).visibleTasks.map(item => item.id),
    ['a']
  );
  controller.resetFilters();
  assert.deepEqual(
    controller.setFilters({ search: '东区' }).visibleTasks.map(item => item.id),
    ['b']
  );
});

test('review controller keeps selection valid and wraps queue navigation', async () => {
  const { createReviewWorkbenchController } = await controllerModule;
  const controller = createReviewWorkbenchController();
  controller.replace(queue());

  assert.equal(controller.select('b')?.id, 'b');
  assert.equal(controller.navigate(1)?.id, 'c');
  assert.equal(controller.navigate(1)?.id, 'a');
  assert.equal(controller.navigate(-1)?.id, 'c');
  assert.equal(controller.select('missing'), null);
  assert.equal(controller.currentTask?.id, 'c');
});

test('review controller resets hidden selection to the first visible task', async () => {
  const { createReviewWorkbenchController } = await controllerModule;
  const controller = createReviewWorkbenchController();
  controller.replace(queue());
  controller.select('b');
  const filtered = controller.setFilters({ issue: 'missingScientificName', severity: 'unsupported' });

  assert.equal(filtered.filters.severity, '');
  assert.equal(filtered.selectedTaskId, 'c');
  assert.equal(filtered.currentTask?.id, 'c');
  assert.equal(controller.resetFilters().visibleTasks.length, 3);
});
