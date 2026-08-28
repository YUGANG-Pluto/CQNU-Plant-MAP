function runRendererDomainSmoke() {
  const rendererDomain = window.rendererDomain;
  const rendererDomainBridgeReady = rendererDomain?.version === 'renderer-domain-v1' &&
    Object.isFrozen(rendererDomain) &&
    Object.isFrozen(rendererDomain.project) &&
    Object.isFrozen(rendererDomain.phenology) &&
    Object.isFrozen(rendererDomain.taxonomy) &&
    Object.isFrozen(rendererDomain.maintenance) &&
    Object.isFrozen(rendererDomain.speciesReference);

  const pointInput = {
    id: 'domain-point',
    pointId: 'DOMAIN-P1',
    zoneRef: 'domain-zone',
    lat: 29.6,
    lng: 106.3,
    plantNameCn: '领域测试植物',
    customPayload: { preserved: true },
    phenologyEntries: [{ id: 'domain-entry', label: '盛花期', images: ['a.jpg'] }]
  };
  const inputBefore = JSON.stringify(pointInput);
  const snapshot = rendererDomain?.project.adaptRecords(
    [{ id: 'domain-zone', zoneId: 'DZ', name: '领域分区' }],
    [pointInput]
  );
  const rendererDomainAdapterReady = snapshot?.warnings.length === 0 &&
    snapshot.zones[0]?.name === '领域分区' &&
    snapshot.points[0]?.plantNameCn === '领域测试植物' &&
    snapshot.points[0]?.phenologyEntries[0]?.images[0] === 'a.jpg' &&
    snapshot.points[0]?.source.customPayload?.preserved === true;
  const rendererDomainAdapterImmutable = Object.isFrozen(snapshot) &&
    Object.isFrozen(snapshot?.zones) &&
    Object.isFrozen(snapshot?.points) &&
    Object.isFrozen(snapshot?.points[0]) &&
    Object.isFrozen(snapshot?.points[0]?.source) &&
    Object.isFrozen(snapshot?.points[0]?.source.customPayload);
  const rendererDomainAdapterInputUnchanged = JSON.stringify(pointInput) === inputBefore;

  const draftController = rendererDomain?.phenology.createDraftController(['observer', 'surveyDate']);
  const draftClean = draftController?.inspect(
    { observer: 'A', surveyDate: '2026-08-15' },
    { observer: 'A', surveyDate: '2026-08-15' }
  );
  const draftDirty = draftController?.inspect(
    { observer: 'B', surveyDate: '2026-08-15' },
    { observer: 'A', surveyDate: '2026-08-15' }
  );
  draftController?.transition('saving');
  const draftSaving = draftController?.inspect(
    { observer: 'B', surveyDate: '2026-08-15' },
    { observer: 'A', surveyDate: '2026-08-15' }
  );
  draftController?.transition('saved');
  const rendererDomainDraftReady = draftClean?.dirty === false &&
    draftDirty?.dirty === true &&
    draftDirty.status === 'dirty' &&
    draftSaving?.status === 'saving' &&
    draftController?.getStatus() === 'saved';

  const taxonomyInput = Array.from({ length: 6 }, (_, index) => ({
    provider: index % 2 ? 'GBIF' : 'iNaturalist',
    family: index ? 'Oleaceae' : 'Rosaceae',
    genus: index ? 'Osmanthus' : 'Prunus',
    score: index === 1 ? 'invalid' : 0.9,
    occurrenceWeight: 1
  }));
  const taxonomyBefore = JSON.stringify(taxonomyInput);
  const compactCandidates = rendererDomain?.taxonomy.compactCandidates(taxonomyInput, 5);
  const taxonomyPatch = rendererDomain?.taxonomy.buildPatch({
    suggestedFamily: 'Oleaceae',
    suggestedGenus: 'Osmanthus',
    source: 'iNaturalist+GBIF',
    confidence: 0.82,
    confidenceLabel: 'high',
    candidates: taxonomyInput
  }, null, '2026-08-15T00:00:00.000Z');
  const rendererDomainTaxonomyReady = compactCandidates?.length === 5 &&
    compactCandidates[0].score === 0.9 &&
    compactCandidates[1].score === null &&
    taxonomyPatch?.family === 'Oleaceae' &&
    taxonomyPatch?.genus === 'Osmanthus' &&
    taxonomyPatch?.taxonomyVerificationStatus === 'suggested' &&
    taxonomyPatch?.taxonomyCandidatesSummary.length === 5 &&
    JSON.stringify(taxonomyInput) === taxonomyBefore;

  const maintenanceIssues = [
    rendererDomain?.maintenance.createIssue('info', 'z', 'Info'),
    rendererDomain?.maintenance.createIssue('error', 'b', 'Error'),
    rendererDomain?.maintenance.createIssue('warn', 'a', 'Warn', '', true)
  ];
  const maintenanceCounts = rendererDomain?.maintenance.countIssues(maintenanceIssues);
  const sortedIssues = rendererDomain?.maintenance.sortIssues(maintenanceIssues);
  const rendererDomainMaintenanceReady = maintenanceCounts?.error === 1 &&
    maintenanceCounts.warn === 1 &&
    maintenanceCounts.info === 1 &&
    maintenanceCounts.fixable === 1 &&
    sortedIssues?.[0]?.severity === 'error' &&
    sortedIssues?.[1]?.severity === 'warn' &&
    maintenanceIssues[0]?.severity === 'info';

  const speciesReferenceInput = {
    selectedId: 'missing',
    suggestions: [{ id: 'species-a' }, { id: 'species-b' }]
  };
  const speciesReferenceBefore = JSON.stringify(speciesReferenceInput);
  const speciesReferenceController = rendererDomain?.speciesReference.createPanelController();
  const speciesReferenceQuerying = speciesReferenceController?.setBusy('query', true);
  speciesReferenceController?.replace(speciesReferenceInput, 'domain-point');
  const speciesReferenceReady = speciesReferenceController?.setBusy('query', false);
  const speciesReferenceSelected = speciesReferenceController?.select('species-b');
  const speciesReferenceInvalid = speciesReferenceController?.select('missing');
  const speciesReferenceCleared = speciesReferenceController?.clear();
  const rendererDomainSpeciesReferenceReady = speciesReferenceQuerying?.phase === 'querying' &&
    speciesReferenceReady?.phase === 'ready' &&
    speciesReferenceReady.selectedId === 'species-a' &&
    speciesReferenceSelected?.selectedId === 'species-b' &&
    speciesReferenceInvalid?.selectedId === 'species-b' &&
    speciesReferenceCleared?.phase === 'idle' &&
    Object.isFrozen(speciesReferenceController) &&
    Object.isFrozen(speciesReferenceReady) &&
    Object.isFrozen(speciesReferenceReady.suggestionIds) &&
    JSON.stringify(speciesReferenceInput) === speciesReferenceBefore;

  const queryInputBefore = JSON.stringify(pointInput);
  const queryResults = window.researchQuery?.run(
    [{ id: 'domain-zone', zoneId: 'DZ', name: '领域分区' }],
    [pointInput],
    { text: '领域', completeness: 'missingScientificName' }
  );
  const researchQueryBridgeReady =
    window.researchQuery?.version === 'research-query-v1' && Object.isFrozen(window.researchQuery);
  const researchQueryModelReady =
    queryResults?.length === 1 &&
    queryResults[0]?.type === 'point' &&
    queryResults[0]?.id === 'domain-point' &&
    queryResults[0]?.zoneName === '领域分区' &&
    queryResults[0]?.flags.missingScientificName === true &&
    Object.isFrozen(queryResults) &&
    Object.isFrozen(queryResults[0]) &&
    Object.isFrozen(queryResults[0].flags) &&
    JSON.stringify(pointInput) === queryInputBefore;

  return {
    rendererDomainBridgeReady,
    rendererDomainAdapterReady,
    rendererDomainAdapterImmutable,
    rendererDomainAdapterInputUnchanged,
    rendererDomainDraftReady,
    rendererDomainTaxonomyReady,
    rendererDomainMaintenanceReady,
    rendererDomainSpeciesReferenceReady,
    researchQueryBridgeReady,
    researchQueryModelReady
  };
}

module.exports = { runRendererDomainSmoke };
