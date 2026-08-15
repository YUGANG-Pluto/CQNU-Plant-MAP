const MAINTENANCE_DIAGNOSTICS_SCHEMA = 'cqnu-plant-diagnostics-v1';
const MAINTENANCE_SEVERITY_ORDER = { error: 0, warn: 1, info: 2 };

let maintenanceLastReport = null;

function addMaintenanceIssue(issues, severity, code, title, detail = '', fixable = false) {
  const createIssue = window.rendererDomain?.maintenance?.createIssue;
  issues.push(typeof createIssue === 'function'
    ? createIssue(severity, code, title, detail, fixable)
    : { severity, code, title, detail, fixable: !!fixable });
}

function countBySeverity(issues) {
  const countIssues = window.rendererDomain?.maintenance?.countIssues;
  if (typeof countIssues === 'function') return countIssues(issues);
  return issues.reduce((acc, issue) => {
    acc[issue.severity] = (acc[issue.severity] || 0) + 1;
    if (issue.fixable) acc.fixable += 1;
    return acc;
  }, { error: 0, warn: 0, info: 0, fixable: 0 });
}

function summarizeMaintenanceReport(report) {
  const counts = countBySeverity(report?.issues || []);
  if (!report) return maintenanceText('maintenanceNotRun');
  if (!report.issues.length) return maintenanceText('maintenanceHealthy');
  return `${maintenanceText('maintenanceError')}: ${counts.error} / ${maintenanceText('maintenanceWarn')}: ${counts.warn} / ${maintenanceText('maintenanceInfo')}: ${counts.info}`;
}

function issueSeverityLabel(severity) {
  return {
    error: maintenanceText('maintenanceError'),
    warn: maintenanceText('maintenanceWarn'),
    info: maintenanceText('maintenanceInfo')
  }[severity] || severity;
}

function collectDuplicateValueIssues(items, valueGetter, label, issues) {
  const seen = new Map();
  items.forEach((item, index) => {
    const value = String(valueGetter(item) || '').trim();
    if (!value) return;
    if (!seen.has(value)) {
      seen.set(value, [index + 1]);
      return;
    }
    seen.get(value).push(index + 1);
  });

  seen.forEach((positions, value) => {
    if (positions.length > 1) {
      addMaintenanceIssue(
        issues,
        'warn',
        `duplicate-${label}`,
        `${label} 重复：${value}`,
        `位置：${positions.join(', ')}。此项不自动修复，避免误改用户编号。`
      );
    }
  });
}

function isValidCoordinate(point) {
  const lat = Number(point.lat);
  const lng = Number(point.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

function collectImageRefsWithContext() {
  const rows = [];
  state.points.forEach((point, pointIndex) => {
    getPhenologyEntries(point).forEach((entry, entryIndex) => {
      normalizeImages(entry.images).forEach(ref => {
        rows.push({
          ref,
          pointLabel: pointDisplayName(point) || `#${pointIndex + 1}`,
          entryLabel: entry.label || `#${entryIndex + 1}`
        });
      });
    });
  });
  return rows;
}

async function collectImageFileIssues() {
  if (!state.projectDir || !window.plantApp?.maintenance?.checkImageRefs) return [];
  const imageRefs = collectImageRefsWithContext();
  if (!imageRefs.length) return [];

  const refs = [...new Set(imageRefs.map(item => item.ref))];
  const result = await callIpc(window.plantApp.maintenance.checkImageRefs({
    projectDir: state.projectDir,
    refs
  }));
  const missing = new Map(
    (result.items || []).filter(item => !item.exists).map(item => [item.ref, item])
  );

  return imageRefs
    .filter(item => missing.has(item.ref))
    .map(item => ({
      severity: 'warn',
      code: 'missing-image',
      title: `图片引用不可用：${item.ref}`,
      detail: `${item.pointLabel} / ${item.entryLabel}。${missing.get(item.ref).code || ''}`,
      fixable: false
    }));
}

function collectProjectDataIssues(extraIssues = []) {
  const issues = [...extraIssues];
  const zones = Array.isArray(state.zones) ? state.zones : [];
  const points = Array.isArray(state.points) ? state.points : [];
  const zoneInternalIds = new Set(zones.map(zone => zone.id).filter(Boolean));

  if (!state.projectDir) {
    addMaintenanceIssue(
      issues,
      'warn',
      'no-project',
      maintenanceText('maintenanceNoProject'),
      '',
      false
    );
  }

  zones.forEach((zone, index) => {
    const label = zoneDisplayName(zone) || `#${index + 1}`;
    if (!zone.id) {
      addMaintenanceIssue(
        issues,
        'warn',
        'missing-zone-id',
        `分区缺少内部 ID：${label}`,
        '可生成内部 ID，不改变显示名称。',
        true
      );
    }
    if (!String(zone.zoneId || '').trim()) {
      addMaintenanceIssue(
        issues,
        'warn',
        'missing-zone-code',
        `分区缺少编号：${label}`,
        '可按顺序补齐 Z 编号。',
        true
      );
    }
    if (!zone.geometry?.type) {
      addMaintenanceIssue(
        issues,
        'info',
        'missing-zone-geometry',
        `分区没有几何边界：${label}`,
        '允许存在文字分区，但地图边界不会显示。'
      );
    }
  });

  collectDuplicateValueIssues(zones, zone => zone.id, '分区内部 ID', issues);
  collectDuplicateValueIssues(zones, zone => zone.zoneId, '分区编号', issues);

  points.forEach((point, index) => {
    const label = pointDisplayName(point) || `#${index + 1}`;
    if (!point.id) {
      addMaintenanceIssue(
        issues,
        'warn',
        'missing-point-id',
        `点位缺少内部 ID：${label}`,
        '可生成内部 ID，不改变植物信息。',
        true
      );
    }
    if (!String(point.pointId || '').trim()) {
      addMaintenanceIssue(
        issues,
        'warn',
        'missing-point-code',
        `点位缺少编号：${label}`,
        '可按顺序补齐 P 编号。',
        true
      );
    }
    if (!point.zoneRef || !zoneInternalIds.has(point.zoneRef)) {
      addMaintenanceIssue(
        issues,
        'error',
        'orphan-point',
        `点位未绑定有效分区：${label}`,
        '此项需要用户判断归属分区，不自动处理。'
      );
    }
    if (!isValidCoordinate(point)) {
      addMaintenanceIssue(
        issues,
        'error',
        'invalid-coordinate',
        `点位坐标异常：${label}`,
        `lat=${point.lat}, lng=${point.lng}`
      );
    }
    if (!String(point.plantNameCn || '').trim() && !String(point.plantNameSci || '').trim()) {
      addMaintenanceIssue(
        issues,
        'warn',
        'missing-plant-name',
        `点位缺少植物名称：${label}`,
        '建议补充中文名或学名。'
      );
    }

    const entries = getPhenologyEntries(point);
    if (!entries.length) {
      addMaintenanceIssue(
        issues,
        'warn',
        'missing-phenology',
        `点位缺少物候记录：${label}`,
        '可恢复一条空白物候记录。',
        true
      );
    }
    entries.forEach(entry => {
      const images = normalizeImages(entry.images);
      if (images.length !== new Set(images).size) {
        addMaintenanceIssue(
          issues,
          'warn',
          'duplicate-entry-images',
          `物候图片重复：${label}`,
          entry.label || '',
          true
        );
      }
    });
  });

  collectDuplicateValueIssues(points, point => point.id, '点位内部 ID', issues);
  collectDuplicateValueIssues(points, point => point.pointId, '点位编号', issues);

  const sortIssues = window.rendererDomain?.maintenance?.sortIssues;
  const sortedIssues = typeof sortIssues === 'function'
    ? sortIssues(issues)
    : issues.sort((left, right) => {
      const severityDelta = MAINTENANCE_SEVERITY_ORDER[left.severity]
        - MAINTENANCE_SEVERITY_ORDER[right.severity];
      return severityDelta || String(left.code).localeCompare(String(right.code));
    });

  return {
    generatedAt: new Date().toISOString(),
    projectDir: state.projectDir || '',
    counts: {
      zones: zones.length,
      points: points.length,
      images: collectImageRefsWithContext().length
    },
    issues: sortedIssues
  };
}

function renderMaintenanceReport(report) {
  if (!ui.maintenanceHealthReport) return;
  clearNode(ui.maintenanceHealthReport);
  ui.maintenanceHealthSummary.textContent = summarizeMaintenanceReport(report);
  ui.maintenanceHealthSummary.classList.toggle(
    'maintenance-badge-ok',
    !!report && !report.issues.length
  );
  ui.btnRunSafeRepair.disabled = !report || !report.issues.some(issue => issue.fixable);

  if (!report) {
    ui.maintenanceHealthReport.appendChild(
      listTextItem(maintenanceText('maintenanceReportEmpty'))
    );
    return;
  }
  if (!report.issues.length) {
    ui.maintenanceHealthReport.appendChild(
      listTextItem(
        maintenanceText('maintenanceHealthy'),
        `${report.counts.zones} zones / ${report.counts.points} points`
      )
    );
    return;
  }

  report.issues.forEach(issue => {
    const item = el('div', {
      className: `maintenance-issue maintenance-issue--${issue.severity}`
    }, [
      el('div', { className: 'maintenance-issue-title', text: issue.title }),
      el('div', {
        className: 'maintenance-issue-meta',
        text: `${issueSeverityLabel(issue.severity)} / ${issue.code}${issue.fixable ? ` / ${maintenanceText('maintenanceFixable')}` : ''}`
      })
    ]);
    if (issue.detail) {
      item.appendChild(el('div', { className: 'maintenance-issue-detail', text: issue.detail }));
    }
    ui.maintenanceHealthReport.appendChild(item);
  });
}

async function runMaintenanceHealthCheck(options = {}) {
  try {
    setMaintenanceBusy(ui.btnRunHealthCheck, true);
    ui.maintenanceProjectPath.textContent = maintenanceProjectLabel();
    const imageIssues = state.projectDir ? await collectImageFileIssues() : [];
    maintenanceLastReport = collectProjectDataIssues(imageIssues);
    renderMaintenanceReport(maintenanceLastReport);
    if (!options.silent && !isMaintenanceSafeModeEnabled()) {
      ui.maintenanceSettingsSummary.textContent = maintenanceText('maintenanceCheckFinished');
    }
    syncMaintenanceSafeModeUi();
    return maintenanceLastReport;
  } catch (error) {
    handleUiError(error, 'maintenance:health-check', {
      title: maintenanceText('maintenanceCheckFailed')
    });
    return null;
  } finally {
    setMaintenanceBusy(ui.btnRunHealthCheck, false);
  }
}
