function collectRendererSmokeFailures(result, runtimeErrors = []) {
  const failures = [];
  if (result.readyState !== 'complete') failures.push(`document state: ${result.readyState}`);
  if (result.missingIds.length) failures.push(`missing ids: ${result.missingIds.join(', ')}`);
  if (result.duplicateIds.length) failures.push(`duplicate ids: ${result.duplicateIds.join(', ')}`);
  if (result.modernChildCount < 1) failures.push('modern renderer root is empty');
  if (result.workspaceSurfaceCount !== 4) failures.push(`workspace surface count: ${result.workspaceSurfaceCount}`);
  if (result.moduleButtonCount !== 11) failures.push(`workspace module button count: ${result.moduleButtonCount}`);
  const motionDurationFloors = [400, 500, 620, 620];
  if (result.motionDurations.some((value, index) => !Number.isFinite(value) || value < motionDurationFloors[index])) {
    failures.push(`motion durations below perceptible floors: ${result.motionDurations.join(', ')}`);
  }
  if (!result.moduleMotionRuntimeReady) {
    failures.push(`workspace module motion is not active at runtime: ${result.moduleTransitionDurations.join(', ')}`);
  }
  if (!result.statsRegistryReady) failures.push('typed statistics chart registry is incomplete');
  if (!result.statsRegistryImmutable) failures.push('typed statistics chart registry exposes mutable containers');
  if (!result.projectWorkflowReady) failures.push('typed project workflow bridge is incomplete');
  if (!result.projectSessionStoreReady) failures.push('typed project session store is missing, mutable, or not mirrored to the compatibility dataset');
  if (result.modalPrimitiveCount < 3) failures.push(`modal primitive count: ${result.modalPrimitiveCount}`);
  if (!result.queryFocusTrapped) failures.push('query modal does not trap keyboard focus');
  if (!result.queryClosedByEscape) failures.push('query modal did not close with Escape');
  if (!result.queryFocusReturned) failures.push('query modal did not restore focus to its opener');
  if (!result.themeCenterOpened) failures.push('appearance center did not open as the top workflow layer');
  if (!result.themeControlsApplied) failures.push('appearance center did not apply the shared liquid-glass and motion state');
  if (!result.themeMaterialControlsReady) failures.push('appearance center did not expose the compact solid, regular, and clear material controls');
  if (result.themeActiveDurations.some(value => !Number.isFinite(value) || value < 260)) {
    failures.push(`appearance center exposed an active animation below 260ms: ${result.themeActiveDurations.join(', ')}`);
  }
  if (!result.themeCenterClosed) failures.push('appearance center did not close through the shared motion layer');
  if (!result.pointEditorDirtyDetected) failures.push('point editor did not expose its dirty state');
  if (!result.globalProjectDraftDetected) failures.push('project save status did not expose an unapplied draft');
  if (!result.projectCloseDraftGuard) failures.push('window close was not guarded for an unapplied draft');
  if (!result.pointEditorDiscardGuard) failures.push('point editor did not guard unapplied changes');
  if (!result.pointEditorCancelKeptOpen) failures.push('point editor closed after cancelling discard');
  if (!result.pointEditorClosedCleanly) failures.push('point editor did not close after restoring persisted values');
  if (!result.objectSelectionSynchronized) failures.push('object selection did not synchronize across lists');
  if (!result.mapObjectAccessible) failures.push('map object is missing keyboard or selection semantics');
  if (!result.objectSummaryUpdated) failures.push('object command summary did not update');
  if (!result.objectHoverLinked) failures.push('object hover did not link list and map state');
  if (!result.objectKeyboardActivated) failures.push('object list item did not activate from the keyboard');
  if (!result.objectNavigationWorked) failures.push('previous/next object navigation did not preserve selection scope');
  if (!result.objectFocusBusy || !result.objectFocusCompleted) failures.push('object focus feedback did not expose busy and success states');
  if (!result.speciesReferenceModalOpened) failures.push('species reference modal did not open as the top workflow layer');
  if (!result.speciesReferenceInputsPrefilled) failures.push('species reference modal did not reuse the selected point names');
  if (!result.speciesReferenceSessionIdle) failures.push('species reference session did not expose immutable idle state');
  if (!result.speciesReferenceModalClosed) failures.push('species reference modal did not close cleanly');
  if (!result.rendererStateFacadeReady) failures.push('typed renderer state facade did not reflect current selection and counts');
  if (!result.rendererStateFacadeImmutable) failures.push('typed renderer state facade did not freeze its public containers');
  if (!result.rendererStatePathHidden) failures.push('typed renderer state facade exposed the local project path');
  if (!result.rendererStateFacadeIsolated) failures.push('typed renderer state facade leaked mutable project records');
  if (!result.rendererDomainBridgeReady) failures.push('typed renderer domain bridge is missing or mutable');
  if (!result.rendererDomainAdapterReady) failures.push('typed renderer domain adapter did not preserve canonical project values');
  if (!result.rendererDomainAdapterImmutable) failures.push('typed renderer domain adapter did not freeze its compatibility view');
  if (!result.rendererDomainAdapterInputUnchanged) failures.push('typed renderer domain adapter mutated its source record');
  if (!result.rendererDomainDraftReady) failures.push('typed phenology draft controller returned an invalid state transition');
  if (!result.rendererDomainTaxonomyReady) failures.push('typed taxonomy candidate model returned invalid output');
  if (!result.rendererDomainMaintenanceReady) failures.push('typed maintenance issue model returned invalid counts or ordering');
  if (!result.rendererDomainSpeciesReferenceReady) failures.push('typed species reference panel model returned invalid session state');
  if (!result.historyUndoButtonEnabled) failures.push('project history did not enable undo after a supported edit');
  if (!result.historyUndoWorked) failures.push('Ctrl+Z did not restore the previous project edit snapshot');
  if (!result.historyRedoWorked) failures.push('Ctrl+Shift+Z did not restore the redone project edit snapshot');
  if (!result.historySaveStatusWorked) failures.push('project save status did not return to saved');
  if (!result.historyCommandsRegistered) failures.push('undo and redo commands are missing from Command Center');
  if (!result.textEditingPreservedHistory) failures.push('text-field Ctrl+Z incorrectly consumed project history');
  if (!result.externalPointMutationClearedHistory) failures.push('an unsupported point mutation did not invalidate stale project history');
  if (!result.reviewBridgeBuilt) failures.push('research review bridge did not derive the expected local task queue');
  if (!result.reviewWorkbenchOpened) failures.push('research review workbench did not open as the top workflow layer');
  if (!result.reviewOverviewRendered || result.reviewInitialTaskCount !== 2) {
    failures.push(`research review overview or task count is incorrect: ${result.reviewInitialTaskCount}`);
  }
  if (!result.reviewIssueFilterWorked) failures.push('research review issue filter did not update the queue');
  if (!result.reviewSearchWorked) failures.push('research review search did not isolate a point task');
  if (!result.reviewResetWorked) failures.push('research review filters did not reset');
  if (!result.reviewNavigationWorked) failures.push('research review previous/next navigation did not change tasks');
  if (!result.reviewEditorLayered) failures.push('point editor did not open above the research review workbench');
  if (!result.reviewRestoredAfterEditor) failures.push('research review workbench was not restored after closing the point editor');
  if (!result.reviewWorkbenchEnglish) failures.push('research review workbench did not refresh English labels');
  if (!result.reviewWorkbenchClosed) failures.push('research review workbench did not close cleanly');
  if (!result.commandPaletteOpened) failures.push(`command palette did not open and focus search with Ctrl+K: ${JSON.stringify(result.commandPaletteOpenSnapshot)}`);
  if (!result.commandKeyboardNavigationWorked) failures.push('command palette keyboard navigation did not move the active result');
  if (!result.commandObjectJumpWorked) failures.push('command palette did not locate a point command');
  if (!result.commandRecentRemembered) failures.push('command palette did not retain recent commands for the session');
  if (!result.commandHelpWorked) failures.push('command palette shortcut reference is incomplete');
  if (!result.commandPaletteClosedByButton) failures.push('command palette close button did not close the layer');
  if (!result.commandPaletteEnglish) failures.push('command palette did not refresh English labels');
  if (!result.commandPaletteClosedByEscape) failures.push('command palette did not close with Escape');
  if (!result.commandPaletteBlockedByModal) failures.push('command palette opened over an active workflow modal');
  if (!result.mapReady) failures.push('Leaflet map did not initialize');
  if (!result.themeBridgeReady) failures.push('theme compatibility bridge is incomplete');
  failures.push(...runtimeErrors);
  return failures;
}

module.exports = { collectRendererSmokeFailures };
