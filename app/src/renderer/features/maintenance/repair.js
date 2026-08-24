function dedupeEntryImages(entry) {
  const before = normalizeImages(entry.images);
  const after = [...new Set(before)];
  entry.images = after;
  return before.length !== after.length;
}

function applyConservativeProjectRepair() {
  const changes = [];
  state.zones = state.zones.map((zone, index) => {
    const next = normalizeZoneRecord({ ...zone });
    if (!next.id) {
      next.id = makeUid('zone');
      changes.push(`zone:${index + 1}:id`);
    }
    if (!String(next.zoneId || '').trim()) {
      next.zoneId = `Z${String(index + 1).padStart(2, '0')}`;
      changes.push(`zone:${index + 1}:zoneId`);
    }
    return next;
  });

  state.points = state.points.map((point, index) => {
    const raw = { ...point };
    if (!raw.id) {
      raw.id = makeUid('point');
      changes.push(`point:${index + 1}:id`);
    }
    if (!String(raw.pointId || '').trim()) {
      raw.pointId = `P${String(index + 1).padStart(3, '0')}`;
      changes.push(`point:${index + 1}:pointId`);
    }
    const next = normalizePointRecord(raw);
    getPhenologyEntries(next).forEach(entry => {
      if (dedupeEntryImages(entry)) {
        changes.push(`point:${index + 1}:images`);
      }
    });
    syncPointSummary(next);
    return next;
  });

  return changes;
}

async function runMaintenanceSafeRepair() {
  if (guardMaintenanceReadOnlyAction('safe-repair')) return;
  if (!requireProject()) return;
  const report = maintenanceLastReport || await runMaintenanceHealthCheck({ silent: true });
  const fixableCount = (report?.issues || []).filter(issue => issue.fixable).length;
  if (!fixableCount) {
    showAlert(maintenanceText('maintenanceNoFixableIssue'));
    return;
  }

  const confirmed = await openConfirmDialog({
    title: maintenanceText('maintenanceSafeRepair'),
    message: `${maintenanceText('maintenanceSafeRepairConfirm')}\n${maintenanceText('maintenanceSafeRepairScope')}`,
    acceptLabel: maintenanceText('maintenanceSafeRepair'),
    cancelLabel: maintenanceText('cancelAction')
  });
  if (!confirmed) return;

  try {
    const result = await withProgressTask({
      type: 'maintenance',
      title: maintenanceText('maintenanceSafeRepair'),
      stage: maintenanceText('progressBackup')
    }, async task => {
      task.update({ percent: 10, stage: maintenanceText('progressBackup') });
      const backupFile = await createBackupZip(state.projectDir, '', 'maintenance');
      task.update({ percent: 45, stage: maintenanceText('maintenanceRepairing') });
      await yieldToUi();
      const changes = applyConservativeProjectRepair();
      task.update({ percent: 72, stage: maintenanceText('progressWriting') });
      await persistProject();
      renderAllDerived();
      task.update({ percent: 92, stage: maintenanceText('maintenanceRunCheck') });
      return { backupFile, changes };
    });
    await runMaintenanceHealthCheck({ silent: true });
    showAlert(
      `${maintenanceText('maintenanceRepairDone')} ${result.changes.length}\n${maintenanceText('backupSuccess')} ${result.backupFile}`
    );
  } catch (error) {
    handleUiError(error, 'maintenance:safe-repair', {
      title: maintenanceText('maintenanceRepairFailed')
    });
  }
}
