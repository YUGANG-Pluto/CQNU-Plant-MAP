import test from 'node:test';
import assert from 'node:assert/strict';
import { readJson } from '../dist/http-json.js';

test('bounded JSON reader rejects a streamed body without relying on content-length', async () => {
  const request = new Request('https://example.test/api/projects/project-a/snapshot', {
    method: 'PUT',
    body: JSON.stringify({ value: 'x'.repeat(64) })
  });
  assert.equal(request.headers.get('content-length'), null);
  await assert.rejects(readJson(request, 32), /REQUEST_BODY_TOO_LARGE/);
});

test('bounded JSON reader accepts a valid object inside the byte limit', async () => {
  const request = new Request('https://example.test/api/projects', {
    method: 'POST',
    body: JSON.stringify({ name: 'Campus survey' })
  });
  assert.deepEqual(await readJson(request, 128), { name: 'Campus survey' });
});
