async function main() {
  testPathGuard();
  testNormalize();
  testExportContracts();
  testRendererIpcContract();
  testRendererUtilityContracts();
  testProjectStoreWritesJson();
  testProjectStoreRejectsInvalidSavePayloads();
  testAtomicTextWrite();
  testLoggerWritesAndCleansUp();
  testMaintenanceServiceImageRefGuard();
  testHtmlErrorDialogWiring();
  testEngineeringSplitContract();
  testModernVisualSystemContract();
  testModernMotionContract();
  testModalWorkflowContract();
  testObjectWorkflowContract();
  testCommandPaletteContract();
  testProjectEditHistoryContract();
  testResearchReviewWorkbenchContract();
  testRendererDomainModuleArchitectureContract();
  testCssStructureGuards();
  testLegacyThemeCssRemoved();
  testThemeSettingsProgressiveDisclosure();
  testBrandLogoResource();
  testStatisticsChartVisualContract();
  testResearchStatsFormulaContract();
  testReducedInnerHtmlSurface();
testMaintenanceCenterContract();
testSpeciesReferenceContract();
testPlatformAdapterContract();
  await testTaxonomySuggestionRuntimeContract();
  testSqliteExchangeModelContract();

  testElectronSecurityContract();

  await testExportWritesAtomicallyAndValidatesContent();
  await testImageImportDoesNotOverwriteExistingArchive();
  await testBackupCreateCleanupAndCounts();
  await testIpcDoesNotMaskFalsePayload();
  console.log('self-check passed');
}
