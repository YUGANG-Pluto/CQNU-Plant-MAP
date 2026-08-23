let maintenanceLastLogSnapshot = null;
let maintenanceSelectedLogName = '';
let maintenanceSelectedLogNames = new Set();

function renderMaintenanceLogs(snapshot) {
  if (!ui.maintenanceLogList) return;
  clearNode(ui.maintenanceLogList);
  if (ui.maintenanceLogFileList) clearNode(ui.maintenanceLogFileList);
  if (ui.maintenanceLogPreview && !maintenanceSelectedLogName) ui.maintenanceLogPreview.textContent = '';
  const files = snapshot?.files || [];
  const entries = snapshot?.entries || [];
  ui.maintenanceLogSummary.textContent = `${files.length} files / ${entries.length} entries / ${maintenanceSelectedLogNames.size} selected`;
  if (ui.maintenanceLogFileList) {
    if (!files.length) {
      ui.maintenanceLogFileList.appendChild(listTextItem(maintenanceText('maintenanceNoLogs')));
    } else {
      files.forEach(file => {
        const selectedForDelete = maintenanceSelectedLogNames.has(file.name);
        const selectedForRead = file.name === maintenanceSelectedLogName;
        const checkbox = el('input', {
          title: maintenanceText('maintenanceSelectForDelete')
        });
        checkbox.type = 'checkbox';
        checkbox.checked = selectedForDelete;
        checkbox.addEventListener('change', () => {
          if (checkbox.checked) {
            maintenanceSelectedLogNames.add(file.name);
          } else {
            maintenanceSelectedLogNames.delete(file.name);
          }
          renderMaintenanceLogs(maintenanceLastLogSnapshot);
        });
        const readButton = el('button', {
          className: 'btn btn-soft maintenance-log-read-target',
          text: file.name,
          title: maintenanceText('maintenanceReadSelectedLog')
        });
        readButton.type = 'button';
        readButton.addEventListener('click', () => {
          maintenanceSelectedLogName = file.name;
          renderMaintenanceLogs(maintenanceLastLogSnapshot);
        });
        const item = el('div', {
          className: `maintenance-log-entry maintenance-log-file${selectedForDelete ? ' is-selected' : ''}${selectedForRead ? ' is-read-selected' : ''}`
        }, [
          el('div', { className: 'maintenance-log-file-row' }, [
            checkbox,
            readButton
          ]),
          el('div', { className: 'maintenance-log-entry-meta', text: `${file.size || 0} bytes / ${file.modifiedAt || ''}` })
        ]);
        ui.maintenanceLogFileList.appendChild(item);
      });
    }
  }
  if (!entries.length) {
    ui.maintenanceLogList.appendChild(listTextItem(maintenanceText('maintenanceNoLogs')));
    return;
  }
  entries.slice(0, 24).forEach(entry => {
    ui.maintenanceLogList.appendChild(el('div', {
      className: `maintenance-log-entry maintenance-log-entry--${entry.level || 'info'}`
    }, [
      el('div', { className: 'maintenance-log-entry-title', text: `${entry.level || 'info'} / ${entry.scope || 'app'}` }),
      el('div', { className: 'maintenance-log-entry-message', text: entry.message || '' }),
      el('div', { className: 'maintenance-log-entry-meta', text: `${entry.ts || ''} ${entry.fileName || ''}` })
    ]));
  });
}

function formatLogDiagnosis(diagnosis) {
  if (!diagnosis || diagnosis.status === 'pass') {
    return [
      `${maintenanceText('maintenanceLogDiagnosisTitle')}: PASS`,
      maintenanceText('maintenanceLogDiagnosisPass')
    ].join('\n');
  }
  const lines = [
    `${maintenanceText('maintenanceLogDiagnosisTitle')}: ${maintenanceText('maintenanceLogDiagnosisIssues')} ${diagnosis.issueCount || 0}`,
    `${maintenanceText('maintenanceLogDiagnosisLines')}: ${diagnosis.totalLines || 0}`
  ];
  if (diagnosis.hotScopes?.length) {
    lines.push(`${maintenanceText('maintenanceLogDiagnosisScopes')}: ${diagnosis.hotScopes.map(item => `${item.scope}(${item.count})`).join(', ')}`);
  }
  (diagnosis.issues || []).slice(0, 8).forEach(issue => {
    lines.push(`- [${issue.level}] ${issue.scope}: ${issue.message}`);
  });
  (diagnosis.suggestions || []).forEach(suggestion => {
    lines.push(`${maintenanceText('maintenanceLogDiagnosisSuggestion')}: ${suggestion}`);
  });
  return lines.join('\n');
}

async function readSelectedMaintenanceLog() {
  if (!maintenanceSelectedLogName) {
    showAlert(maintenanceText('maintenanceSelectLogFirst'));
    return;
  }
  try {
  const result = await callIpc(window.platformAdapter.log.readLog({
      name: maintenanceSelectedLogName
    }));
    if (ui.maintenanceLogPreview) {
      const diagnosisText = formatLogDiagnosis(result.diagnosis);
      const content = result.truncated
        ? `${maintenanceText('maintenanceLogTruncated')}\n${result.content || ''}`
        : result.content || '';
      ui.maintenanceLogPreview.textContent = `${diagnosisText}\n\n--- LOG ---\n${content}`;
    }
  } catch (error) {
    handleUiError(error, 'maintenance:log-read', {
      title: maintenanceText('maintenanceLogReadFailed')
    });
  }
}

async function refreshMaintenanceLogs() {
  try {
    setMaintenanceBusy(ui.btnRefreshLogs, true);
  maintenanceLastLogSnapshot = await callIpc(window.platformAdapter.log.listRecent({ limit: 80 }));
    renderMaintenanceLogs(maintenanceLastLogSnapshot);
    return maintenanceLastLogSnapshot;
  } catch (error) {
    handleUiError(error, 'maintenance:logs', {
      title: maintenanceText('maintenanceLogFailed')
    });
    return null;
  } finally {
    setMaintenanceBusy(ui.btnRefreshLogs, false);
  }
}

async function cleanupMaintenanceLogs() {
  if (guardMaintenanceReadOnlyAction('delete-selected-log')) return;
  const selectedNames = [...maintenanceSelectedLogNames];
  if (!selectedNames.length) {
    showAlert(maintenanceText('maintenanceSelectLogFirst'));
    return;
  }
  const confirmed = await openConfirmDialog({
    title: maintenanceText('maintenanceDeleteSelectedLogs'),
    message: selectedNames.join('\n'),
    acceptLabel: maintenanceText('deleteNow'),
    cancelLabel: maintenanceText('cancelAction')
  });
  if (!confirmed) return;
  try {
  const result = await callIpc(window.platformAdapter.log.deleteLogs({
      names: selectedNames
    }));
    if (maintenanceSelectedLogNames.has(maintenanceSelectedLogName)) {
      maintenanceSelectedLogName = '';
    }
    maintenanceSelectedLogNames = new Set();
    if (ui.maintenanceLogPreview) ui.maintenanceLogPreview.textContent = '';
    await refreshMaintenanceLogs();
    showAlert(`${maintenanceText('maintenanceCleanupDone')} ${result.deleted || 0}`);
  } catch (error) {
    handleUiError(error, 'maintenance:log-cleanup', {
      title: maintenanceText('maintenanceCleanupFailed')
    });
  }
}
