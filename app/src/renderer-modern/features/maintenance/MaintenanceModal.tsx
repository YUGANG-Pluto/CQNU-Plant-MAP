import { LayerModal } from '../../components/LayerModal';

export function MaintenanceModal() {
  const canImportExternalBackup = window.platformAdapter?.capabilities.externalBackupImport === true;
  return (
    <LayerModal
      id="maintenanceModal"
      closeButtonId="btnCloseMaintenanceModal"
      titleKey="maintenanceCenterTitle"
      title="维护中心"
      subtitleKey="maintenanceCenterSubtitle"
      subtitle="集中处理项目体检、日志诊断与设置安全恢复，不自动修改业务数据。"
      panelClass="query-panel maintenance-panel"
    >
      <div class="maintenance-grid">
        <section class="maintenance-card">
          <div class="maintenance-card-head">
            <div>
              <h3 data-i18n="maintenanceHealthTitle">项目健康检查</h3>
              <p id="maintenanceProjectPath" class="subtle path-box">—</p>
            </div>
            <span id="maintenanceHealthSummary" class="pill" data-i18n="maintenanceNotRun">未检查</span>
          </div>
          <div class="toolbar-inline maintenance-actions">
            <button id="btnRunHealthCheck" class="btn btn-primary" data-i18n="maintenanceRunCheck">开始检查</button>
            <button id="btnRunSafeRepair" class="btn btn-soft" data-i18n="maintenanceSafeRepair">保守修复</button>
          </div>
          <div id="maintenanceHealthReport" class="maintenance-report" />
        </section>

        <section class="maintenance-card">
          <div class="maintenance-card-head">
            <div>
              <h3 data-i18n="maintenanceLogTitle">日志与诊断</h3>
              <p id="maintenanceLogSummary" class="subtle">—</p>
            </div>
          </div>
          <div class="toolbar-inline maintenance-actions">
            <button id="btnRefreshLogs" class="btn btn-soft" data-i18n="maintenanceRefreshLogs">刷新日志</button>
            <button id="btnReadSelectedLog" class="btn btn-soft" data-i18n="maintenanceReadSelectedLog">
              读取选中日志
            </button>
            <button id="btnCleanupLogs" class="btn btn-soft" data-i18n="maintenanceDeleteSelectedLogs">
              删除选中日志
            </button>
            <button id="btnExportDiagnostics" class="btn btn-primary" data-i18n="maintenanceExportDiagnostics">
              导出诊断
            </button>
          </div>
          <div id="maintenanceLogFileList" class="maintenance-log-list" />
          <pre id="maintenanceLogPreview" class="maintenance-log-preview" />
          <div id="maintenanceLogList" class="maintenance-log-list" />
        </section>

        <section class="maintenance-card">
          <div class="maintenance-card-head">
            <div>
              <h3 data-i18n="maintenanceStorageTitle">SQLite 数据迁移</h3>
              <p id="maintenanceStorageSummary" class="subtle" data-i18n="maintenanceStorageHint">
                创建本地 SQLite 副本，或从 SQLite 导出回 JSON。执行前会先创建项目备份。
              </p>
            </div>
          </div>
          <div class="toolbar-inline maintenance-actions">
            <button id="btnStoragePreflight" class="btn btn-soft" data-i18n="maintenanceStoragePreflight">转换预检</button>
            <button id="btnCreateSqliteStorage" class="btn btn-primary" data-i18n="maintenanceStorageCreateSqlite">
              创建 SQLite 副本
            </button>
            <button id="btnExportSqliteJson" class="btn btn-soft" data-i18n="maintenanceStorageExportJson">导出回 JSON</button>
            <button id="btnLoadSqliteStorage" class="btn btn-soft" data-i18n="maintenanceStorageLoadSqlite">读取 SQLite</button>
            <button id="btnLoadJsonStorage" class="btn btn-soft" data-i18n="maintenanceStorageLoadJson">读取 JSON</button>
            <button id="btnRefreshStorageArtifacts" class="btn btn-soft" data-i18n="maintenanceStorageRefreshArtifacts">
              刷新存储与备份
            </button>
            <button id="btnDeleteSelectedStorageArtifacts" class="btn btn-soft" data-i18n="maintenanceStorageDeleteSelected">
              删除选中项
            </button>
            <button id="btnInspectSelectedBackup" class="btn btn-soft" data-i18n="maintenanceBackupInspectRestore">
              检测选中备份
            </button>
            <button id="btnRestoreSelectedBackup" class="btn btn-soft" data-i18n="maintenanceBackupRestoreSelected">
              恢复选中备份
            </button>
            <button id="btnImportExternalBackup" class="btn btn-soft web-runtime-only" data-i18n="maintenanceBackupImportExternal" disabled={!canImportExternalBackup}>
              导入外部备份 ZIP
            </button>
            <button id="btnRestoreImportedBackup" class="btn btn-soft web-runtime-only" data-i18n="maintenanceBackupRestoreImported" disabled>
              恢复已检测的外部备份
            </button>
          </div>
          <div id="maintenanceStorageReport" class="maintenance-report" />
          <div id="maintenanceStorageArtifactList" class="maintenance-log-list" />
        </section>

        <section class="maintenance-card">
          <div class="maintenance-card-head">
            <div>
              <h3 data-i18n="maintenanceSettingsTitle">设置安全模式</h3>
              <span id="maintenanceSafeModeStatus" class="pill maintenance-safe-mode-status">安全模式未启用</span>
              <p id="maintenanceSettingsSummary" class="subtle" data-i18n="maintenanceSettingsHint">
                仅处理界面主题、统计偏好和语言，不改分区、点位或图片。
              </p>
            </div>
          </div>
          <div class="toolbar-inline maintenance-actions">
            <button id="btnApplySafeMode" class="btn btn-danger-soft" data-i18n="maintenanceApplySafeMode">
              启用安全模式
            </button>
            <button id="btnExitSafeMode" class="btn btn-primary" data-i18n="maintenanceExitSafeMode">退出安全模式</button>
            <button id="btnExportUiSettings" class="btn btn-soft" data-i18n="maintenanceExportSettings">导出设置</button>
            <button id="btnImportUiSettings" class="btn btn-soft" data-i18n="maintenanceImportSettings">导入设置</button>
          </div>
        </section>
      </div>
    </LayerModal>
  );
}
