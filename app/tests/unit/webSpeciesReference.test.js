const test = require('node:test');
const assert = require('node:assert/strict');

const webSpeciesModule = import('../../src/renderer-modern/platform/web/webSpeciesReference.ts');

function suggestion(id, source, family, genus, scientificName = '') {
  return {
    id,
    source,
    sourceLabel: source === 'gbif' ? 'GBIF' : 'iNaturalist',
    scientificName,
    canonicalName: scientificName,
    rank: 'species',
    classification: { family, genus }
  };
}

test('browser taxonomy summary selects the most frequent family and genus', async () => {
  const { summarizeWebTaxonomySuggestions } = await webSpeciesModule;
  const result = summarizeWebTaxonomySuggestions(
    { scientificName: 'Osmanthus fragrans', chineseName: '桂花' },
    'Osmanthus fragrans',
    [
      suggestion('a', 'gbif', 'Oleaceae', 'Osmanthus', 'Osmanthus fragrans'),
      suggestion('b', 'inaturalist', 'Oleaceae', 'Osmanthus', 'Osmanthus fragrans'),
      suggestion('c', 'gbif', 'Rosaceae', 'Prunus', 'Prunus persica')
    ]
  );

  assert.equal(result.suggestedFamily, 'Oleaceae');
  assert.equal(result.suggestedGenus, 'Osmanthus');
  assert.deepEqual(result.providersUsed.sort(), ['GBIF', 'iNaturalist']);
  assert.equal(result.verificationStatus, 'suggested');
});

test('browser taxonomy summary leaves unresolved ties for manual selection', async () => {
  const { summarizeWebTaxonomySuggestions } = await webSpeciesModule;
  const result = summarizeWebTaxonomySuggestions(
    { scientificName: '', chineseName: '候选植物' },
    '候选植物',
    [
      suggestion('a', 'gbif', 'Oleaceae', 'Osmanthus'),
      suggestion('b', 'inaturalist', 'Rosaceae', 'Prunus')
    ]
  );

  assert.equal(result.suggestedFamily, '');
  assert.equal(result.suggestedGenus, '');
  assert.match(result.warnings.join(' '), /多个候选/);
});

test('browser reference source contains no coordinate or project upload contract', async () => {
  const source = require('node:fs').readFileSync(
    require('node:path').join(process.cwd(), 'src/renderer-modern/platform/web/webSpeciesReference.ts'),
    'utf8'
  );
  assert.doesNotMatch(source, /FormData\(\).*append\(['"](?:lat|lng|coordinate|project|path)/s);
  assert.doesNotMatch(source, /localStorage.*token|sessionStorage.*token/s);
});
