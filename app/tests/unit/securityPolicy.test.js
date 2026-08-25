const assert = require('node:assert/strict');
const test = require('node:test');

const {
  isAllowedExternalHost,
  normalizeExternalUrl
} = require('../../src/main/securityPolicy');

test('external links are limited to trusted species-reference hosts', () => {
  assert.equal(isAllowedExternalHost('www.gbif.org'), true);
  assert.equal(isAllowedExternalHost('www.inaturalist.org'), true);
  assert.equal(isAllowedExternalHost('zh.wikipedia.org'), true);
  assert.equal(isAllowedExternalHost('wikipedia.org.example.invalid'), false);
  assert.equal(isAllowedExternalHost('example.invalid'), false);
});

test('external links require HTTPS and reject deceptive hosts', () => {
  assert.equal(
    normalizeExternalUrl('https://www.gbif.org/species/3172398'),
    'https://www.gbif.org/species/3172398'
  );
  assert.throws(() => normalizeExternalUrl('http://www.gbif.org/species/3172398'));
  assert.throws(() => normalizeExternalUrl('https://www.gbif.org.example.invalid/species/3172398'));
  assert.throws(() => normalizeExternalUrl('file:///tmp/reference.html'));
});
