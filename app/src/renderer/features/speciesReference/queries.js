async function runSpeciesReferenceQuery() {
  const point = getSelectedPoint();
  if (!point) return showAlert(t('noPointSelected'));
  const scientificName = String(ui.speciesReferenceSciInput?.value || ui.plantNameSci?.value || point.plantNameSci || '').trim();
  const commonName = String(ui.speciesReferenceCommonInput?.value || ui.plantNameCn?.value || point.plantNameCn || '').trim();
  if (!scientificName && !commonName) return showAlert(t('speciesReferenceNeedName'));

  clearSpeciesReferenceCache();
  setSpeciesReferenceBusy(true);
  try {
    const result = await callIpc(window.plantApp.species.referenceQuery({
      scientificName,
      commonName,
      locale: speciesReferenceLocale()
    }));
    renderSpeciesReferenceResults(result);
    window.plantApp?.log?.report?.({
      level: 'info',
      scope: 'species-reference:query',
      message: 'Species reference queried',
      details: { count: result.suggestions?.length || 0 }
    }).catch(() => {});
  } catch (error) {
    clearSpeciesReferenceCache();
    handleUiError(error, 'species-reference:query', {
      title: t('speciesReferenceFailed')
    });
  } finally {
    setSpeciesReferenceBusy(false);
  }
}

async function runSpeciesImageCompare() {
  const point = getSelectedPoint();
  if (!point) return showAlert(t('noPointSelected'));

  clearSpeciesReferenceCache();
  setSpeciesImageCompareBusy(true);
  if (ui.speciesReferenceImageCompareStatus) {
    ui.speciesReferenceImageCompareStatus.textContent = t('speciesReferenceImageCompareRunning');
  }
  try {
    const result = await callIpc(window.plantApp.species.imageCompare({
      locale: speciesReferenceLocale(),
      token: String(ui.speciesReferenceImageTokenInput?.value || '').trim()
    }));
    if (result.canceled) {
      if (ui.speciesReferenceImageCompareStatus) {
        ui.speciesReferenceImageCompareStatus.textContent = t('speciesReferenceImageCompareCanceled');
      }
      return;
    }
    renderSpeciesReferenceResults(result);
    if (ui.speciesReferenceImageCompareStatus) {
      ui.speciesReferenceImageCompareStatus.textContent = `${t('speciesReferenceImageCompareDone')} ${result.suggestions?.length || 0}`;
    }
    window.plantApp?.log?.report?.({
      level: 'info',
      scope: 'species-reference:image-compare',
      message: 'Species image comparison completed',
      details: { count: result.suggestions?.length || 0, uploadedBytes: result.uploadedBytes || 0 }
    }).catch(() => {});
  } catch (error) {
    clearSpeciesReferenceCache();
    handleUiError(error, 'species-reference:image-compare', {
      title: t('speciesReferenceImageCompareFailed')
    });
  } finally {
    setSpeciesImageCompareBusy(false);
  }
}
