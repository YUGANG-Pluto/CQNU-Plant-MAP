import { X } from 'lucide-preact';

export function UtilityDrawers() {
  return (
    <>
      <div
        id="rightInspectorDrawer"
        class="layer-modal right-inspector-drawer right-drawer-layer hidden"
        aria-hidden="true"
      >
        <div class="layer-modal-backdrop" />
        <section
          class="right-inspector-drawer-panel right-context-drawer glass"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rightDrawerTitle"
        >
          <header class="right-inspector-drawer-header">
            <div>
              <h2 id="rightDrawerTitle" data-i18n="rightInspectorDrawerTitle">右侧详情</h2>
              <p id="rightDrawerSummary" class="subtle">—</p>
            </div>
            <button id="btnCloseRightDrawer" class="btn btn-soft layer-close modern-icon-button" type="button">
              <X size={18} aria-hidden="true" />
            </button>
          </header>
          <div id="rightDrawerBody" class="right-inspector-drawer-body" />
        </section>
      </div>

      <div
        id="workspaceUtilityDrawer"
        class="layer-modal workspace-utility-drawer hidden"
        aria-hidden="true"
      >
        <div class="layer-modal-backdrop" />
        <section
          class="workspace-utility-panel glass"
          role="dialog"
          aria-modal="true"
          aria-labelledby="workspaceUtilityTitle"
        >
          <header class="workspace-utility-header">
            <div>
              <h2 id="workspaceUtilityTitle" data-i18n="workspaceDrawerTitle">工作面板</h2>
              <p class="subtle" data-i18n="workspaceDrawerSubtitle">
                导出、项目路径、列表与可选统计摘要集中在独立抽屉中，不参与默认布局堆叠。
              </p>
            </div>
            <button id="btnCloseWorkspaceDrawer" class="btn btn-soft layer-close modern-icon-button" type="button">
              <X size={18} aria-hidden="true" />
            </button>
          </header>
          <div class="workspace-utility-body">
            <section class="card">
              <div class="card-title-row">
                <h2 data-i18n="exportTitle">导出</h2>
                <span class="pill">CSV/GEOJSON</span>
              </div>
              <div class="toolbar-grid export-grid">
                <button id="btnExportCsv" class="btn btn-soft" data-i18n="exportCsv">导出记录表 CSV</button>
                <button id="btnExportGeoJSON" class="btn btn-soft" data-i18n="exportGeoJSON">导出点位 GeoJSON</button>
                <button id="btnImportCsv" class="btn btn-soft" data-i18n="importCsv">导入记录表 CSV</button>
                <button id="btnImportGeoJSON" class="btn btn-soft" data-i18n="importGeoJSON">导入点位 GeoJSON</button>
              </div>
            </section>

            <section class="card">
              <div class="card-title-row">
                <h2 data-i18n="projectInfo">项目与界面</h2>
                <span class="pill">V1.0.0</span>
              </div>
              <div class="field">
                <label data-i18n="currentProject">当前项目目录</label>
                <div id="projectPath" class="path-box" data-i18n="notSelected">未选择</div>
              </div>
              <div class="subtle info-note" data-i18n="projectInfoHint">
                统计、查询与回收站已迁移到独立窗口，便于集中管理。
              </div>
            </section>

            <section class="card">
              <div class="card-title-row">
                <h2 data-i18n="listPanelTitle">分区与点位列表</h2>
                <span class="pill" id="listSummaryCount">0</span>
              </div>
              <div class="two-col list-tabs" role="tablist" data-i18n-aria-label="objectListTabsLabel" aria-label="分区与点位列表">
                <button
                  id="btnTabZones"
                  class="btn mode-btn active"
                  role="tab"
                  aria-selected="true"
                  aria-controls="zoneListPanel"
                  data-i18n="zoneList"
                >
                  分区列表
                </button>
                <button
                  id="btnTabPoints"
                  class="btn mode-btn"
                  role="tab"
                  aria-selected="false"
                  aria-controls="pointListPanel"
                  data-i18n="pointList"
                >
                  点位列表
                </button>
              </div>
              <p class="object-list-keyboard-hint subtle" data-i18n="objectListKeyboardHint">
                使用上下方向键浏览，Enter 定位所选对象。
              </p>
              <div id="zoneListPanel" class="list object-list" role="listbox" aria-labelledby="btnTabZones" />
              <div id="pointListPanel" class="list object-list hidden" role="listbox" aria-labelledby="btnTabPoints" />
            </section>

            <section class="card workspace-stats-card workspace-drawer-only">
              <div class="card-title-row">
                <div>
                  <h2 data-i18n="workspaceStatsTitle">统计摘要</h2>
                  <p class="subtle" data-i18n="workspaceStatsSubtitle">工作区轻量概览，不替代完整统计中心。</p>
                </div>
                <button id="btnOpenStatsFromSummary" class="btn btn-soft" data-i18n="openFullStats">完整统计</button>
              </div>
              <div id="workspaceStatsSummary" class="workspace-stats-summary" />
            </section>
          </div>
        </section>
      </div>
    </>
  );
}
