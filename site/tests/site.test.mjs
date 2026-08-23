import test from 'node:test';
import assert from 'node:assert/strict';
import { renderPages } from '../src/render.mjs';

test('site routes render complete branded documents', () => {
  const pages = renderPages();
  assert.deepEqual(Object.keys(pages), ['/', '/workspace', '/docs', '/web', '/release', '/privacy']);
  Object.values(pages).forEach(page => {
    assert.match(page, /^<!doctype html>/);
    assert.match(page, /CQNU Plant MAP/);
    assert.match(page, /assets\/styles\.css/);
    assert.doesNotMatch(page, /undefined|null|NaN/);
  });
});

test('read-only workspace declares local-memory processing and no write workflow', () => {
  const workspace = renderPages()['/workspace'];
  assert.match(workspace, /data-web-workspace/);
  assert.match(workspace, /\/assets\/workspace\.js/);
  assert.match(workspace, /文件不会上传到站点/);
  assert.doesNotMatch(workspace, /保存项目|SQLite 转换/);
});

test('published pages never embed local paths or desktop bridge names', () => {
  const serialized = JSON.stringify(renderPages());
  assert.doesNotMatch(serialized, /[A-Za-z]:\\\\/);
  assert.doesNotMatch(serialized, /window\.plantApp/);
  assert.doesNotMatch(serialized, /better-sqlite3/);
});
