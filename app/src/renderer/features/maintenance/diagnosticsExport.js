function buildDiagnosticsPayload(report, logs) {
  return {
    schema: MAINTENANCE_DIAGNOSTICS_SCHEMA,
    exportedAt: new Date().toISOString(),
    app: {
      title: document.title,
      versionLabel: document.querySelector('.app-kicker')?.textContent || ''
    },
    project: {
      selected: !!state.projectDir,
      label: maintenanceProjectLabel(),
      zoneCount: state.zones.length,
      pointCount: state.points.length
    },
    health: report ? {
      generatedAt: report.generatedAt,
      counts: report.counts,
      summary: countBySeverity(report.issues),
      issues: report.issues.slice(0, 300)
    } : null,
    logs: logs ? {
      config: {
        level: logs.config?.level,
        retentionDays: logs.config?.retentionDays,
        maxFileBytes: logs.config?.maxFileBytes
      },
      files: logs.files || [],
      entries: (logs.entries || []).slice(0, 120)
    } : null
  };
}

async function exportDiagnostics() {
  if (guardMaintenanceReadOnlyAction('export-diagnostics')) return;
  try {
    const report = maintenanceLastReport || await runMaintenanceHealthCheck({ silent: true });
    const logs = maintenanceLastLogSnapshot || await refreshMaintenanceLogs();
  const result = await callIpc(window.platformAdapter.log.exportDiagnostics({
      title: maintenanceText('maintenanceExportDiagnostics'),
      defaultPath: 'plant_diagnostics.json',
      content: JSON.stringify(buildDiagnosticsPayload(report, logs), null, 2)
    }));
    if (!result.canceled) showAlert(maintenanceText('maintenanceDiagnosticsExported'));
  } catch (error) {
    handleUiError(error, 'maintenance:diagnostics-export', {
      title: maintenanceText('maintenanceDiagnosticsExportFailed')
    });
  }
}
