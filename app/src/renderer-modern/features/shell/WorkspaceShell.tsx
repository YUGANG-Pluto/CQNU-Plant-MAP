import {
  Archive,
  BarChart3,
  CalendarDays,
  FolderOpen,
  GitMerge,
  Leaf,
  MapPinned,
  MapPinPlus,
  PanelRight,
  Save,
  Search,
  Settings2,
  SlidersHorizontal,
  Trash2,
  Wrench
} from 'lucide-preact';

const iconSize = 16;

export function WorkspaceShell() {
  return (
    <div class="app-shell">
      <header class="app-topbar glass">
        <div class="app-brand-block app-brand">
          <img
            class="app-brand__icon brand-logo-mark"
            src="./src/renderer/assets/brand/cqnu-logo.svg"
            alt=""
            aria-hidden="true"
          />
          <div class="app-brand__text">
            <span class="app-kicker">CQNU · V1.0.0</span>
            <h1 data-i18n="appTitle">校园植物分区管理系统</h1>
            <p class="subtle" data-i18n="appSubtitle">分区绘制、点位管理、植物信息与图片归档</p>
          </div>
        </div>
        <div class="app-topbar-actions">
          <div class="lang-toggle">
            <button class="seg-btn active" data-lang="zh">中文</button>
            <button class="seg-btn" data-lang="en">English</button>
          </div>
          <button id="btnChooseDir" class="btn btn-primary">
            <FolderOpen size={iconSize} aria-hidden="true" />
            <span data-i18n="chooseProject">选择项目目录</span>
          </button>
          <button id="btnSave" class="btn btn-primary">
            <Save size={iconSize} aria-hidden="true" />
            <span data-i18n="saveProject">保存项目</span>
          </button>
        </div>
      </header>

      <aside class="panel panel-left glass">
        <div class="panel-header panel-section-title">
          <div>
            <h2 data-i18n="mapWorkspaceTools">地图工作台</h2>
            <p class="subtle" data-i18n="mapWorkspaceToolsHint">选择模式后在中央地图区完成分区和点位操作</p>
          </div>
        </div>

        <div class="toolbar-grid map-tool-grid">
          <button id="btnModeBrowse" class="btn mode-btn active">
            <MapPinned size={iconSize} aria-hidden="true" />
            <span data-i18n="modeBrowse">浏览 / 平移</span>
          </button>
          <button id="btnModeDrawZone" class="btn mode-btn">
            <MapPinned size={iconSize} aria-hidden="true" />
            <span data-i18n="modeDrawZone">绘制分区</span>
          </button>
          <button id="btnModeAddPoint" class="btn mode-btn">
            <MapPinPlus size={iconSize} aria-hidden="true" />
            <span data-i18n="modeAddPoint">添加点位</span>
          </button>
          <button id="btnDeleteZone" class="btn btn-danger-soft">
            <Trash2 size={iconSize} aria-hidden="true" />
            <span data-i18n="deleteZone">删除当前分区</span>
          </button>
          <button id="btnDeletePoint" class="btn btn-danger-soft">
            <Trash2 size={iconSize} aria-hidden="true" />
            <span data-i18n="deletePoint">删除当前点位</span>
          </button>
        </div>

        <section class="card quick-actions-card">
          <div class="card-title-row">
            <div>
              <h2 data-i18n="workspaceTools">工作区工具</h2>
              <p class="subtle" data-i18n="workspaceToolsSubtitle">将统计、查询与回收管理集中到二级窗口</p>
            </div>
            <span class="pill" data-i18n="workspaceCoreTools">核心</span>
          </div>
          <div class="toolbar-grid quick-grid">
            <button id="btnOpenStats" class="btn morandi-btn morandi-purple">
              <BarChart3 size={iconSize} aria-hidden="true" />
              <span data-i18n="openStatsCenter">统计中心</span>
            </button>
            <button id="btnOpenQuery" class="btn morandi-btn morandi-green">
              <Search size={iconSize} aria-hidden="true" />
              <span data-i18n="openQueryCenter">查询中心</span>
            </button>
            <button id="btnOpenSpeciesReference" class="btn morandi-btn morandi-green">
              <Leaf size={iconSize} aria-hidden="true" />
              <span data-i18n="openSpeciesReference">物种参考</span>
            </button>
            <button id="btnOpenTrash" class="btn morandi-btn morandi-rose">
              <Trash2 size={iconSize} aria-hidden="true" />
              <span data-i18n="openRecycleBin">回收站</span>
            </button>
            <button id="btnOpenPointEditor" class="btn morandi-btn morandi-blue">
              <CalendarDays size={iconSize} aria-hidden="true" />
              <span data-i18n="openPhenologyCenter">物候录入中心</span>
            </button>
            <button id="btnOpenTheme" class="btn morandi-btn morandi-sand">
              <SlidersHorizontal size={iconSize} aria-hidden="true" />
              <span data-i18n="openThemeCenter">界面设置</span>
            </button>
            <button id="btnOpenMerge" class="btn morandi-btn morandi-green">
              <GitMerge size={iconSize} aria-hidden="true" />
              <span data-i18n="openMergeCenter">项目合并</span>
            </button>
            <button id="btnBackupProject" class="btn morandi-btn morandi-purple">
              <Archive size={iconSize} aria-hidden="true" />
              <span data-i18n="openBackupCenter">项目备份</span>
            </button>
            <button id="btnOpenMaintenance" class="btn morandi-btn morandi-sand">
              <Wrench size={iconSize} aria-hidden="true" />
              <span data-i18n="openMaintenanceCenter">维护中心</span>
            </button>
            <button id="btnOpenWorkspaceDrawer" class="btn morandi-btn morandi-blue">
              <PanelRight size={iconSize} aria-hidden="true" />
              <span data-i18n="openWorkspaceDrawer">工作面板</span>
            </button>
          </div>
        </section>

        <p class="workspace-drawer-hint subtle" data-i18n="workspaceDrawerHint">
          导出、项目路径、分区与点位列表已收纳到独立工作抽屉，避免默认布局堆叠。
        </p>
      </aside>

      <main class="map-shell">
        <div class="map-workbar glass">
          <div class="map-workbar-status">
            <span><strong data-i18n="mode">模式</strong>：<b id="currentModeText">浏览 / 平移</b></span>
            <span><strong data-i18n="selectedZone">当前分区</strong>：<b id="selectedZoneText">—</b></span>
            <span><strong data-i18n="selectedPoint">当前点位</strong>：<b id="selectedPointText">—</b></span>
          </div>
          <div class="map-basemap-toolbar">
            <label class="mini-field-label" for="baseMapSelect" data-i18n="currentBaseMap">当前底图</label>
            <select id="baseMapSelect" class="input compact-select" />
            <button id="btnToggleBasemapEditor" class="btn btn-soft">
              <Settings2 size={iconSize} aria-hidden="true" />
              <span data-i18n="basemapSettingsPanel">底图设置</span>
            </button>
            <div id="basemapQuickSummary" class="basemap-quick-summary">WGS84 / z=— / ?</div>
          </div>
          <div id="basemapStatusPanel" class="basemap-state-strip" />
          <div class="map-workbar-actions">
            <button id="btnConfirmPoint" class="btn btn-primary hidden" data-i18n="confirmCreatePoint">确认建立点位</button>
            <button id="btnCancelPoint" class="btn btn-soft hidden" data-i18n="cancelCreatePoint">取消建立点位</button>
          </div>
        </div>
        <div class="map-canvas-wrap">
          <div id="map" />
          <div class="map-overlay glass status-bar">
            <span data-i18n="mapStatusHint">地图工作区：工具状态、当前分区和当前点位显示在上方工具带。</span>
          </div>
        </div>
      </main>

      <aside id="rightInspectorPanel" class="panel panel-right glass" data-right-panel-mode="auto">
        <div class="right-inspector-header">
          <div class="right-inspector-heading">
            <h2 data-i18n="rightInspectorTitle">对象检查器</h2>
            <p id="rightPanelModeNote" class="subtle" data-i18n="rightInspectorStackSafe">
              当前内容可安全堆叠显示。
            </p>
          </div>
          <div id="rightModuleButtons" class="right-module-buttons" aria-label="右侧模块入口">
            <button id="btnRightModuleZone" class="btn btn-soft right-module-btn" data-right-module-button="zone" data-i18n="zoneInfo">
              分区信息
            </button>
            <button id="btnRightModulePoint" class="btn btn-soft right-module-btn" data-right-module-button="point" data-i18n="pointAndPlant">
              点位与植物信息
            </button>
            <button id="btnRightModuleList" class="btn btn-soft right-module-btn" data-right-module-button="list" data-i18n="zoneSpecies">
              当前分区的植物
            </button>
          </div>
        </div>

        <section id="rightModuleZoneCard" class="card right-inspector-module" data-right-module="zone">
          <div class="card-title-row">
            <h2 data-i18n="zoneInfo">分区信息</h2>
            <span class="pill" id="zoneCount">0</span>
          </div>
          <div class="field"><label for="zoneId" data-i18n="zoneId">分区编号</label><input id="zoneId" class="input" /></div>
          <div class="field"><label for="zoneName" data-i18n="zoneName">分区名称</label><input id="zoneName" class="input" /></div>
          <div class="field"><label for="zoneDescription" data-i18n="zoneDescription">分区描述</label><textarea id="zoneDescription" class="input textarea" /></div>
          <button id="btnApplyZone" class="btn btn-primary" data-i18n="applyZoneInfo">应用到当前分区</button>
        </section>

        <section
          id="rightModulePointCard"
          class="card species-summary-card right-inspector-module"
          data-right-module="point"
        >
          <div class="card-title-row">
            <h2 data-i18n="pointAndPlant">点位与植物信息</h2>
            <span class="pill" id="pointCount">0</span>
          </div>
          <p class="subtle" data-i18n="phenologyEditorHint">
            已将物种与物候录入整合到二级窗口中。请先选中点位，再打开录入中心。
          </p>
          <div id="pointSummaryBox" class="summary-box">—</div>
          <button id="btnOpenPointEditorInline" class="btn morandi-btn morandi-blue">
            <CalendarDays size={iconSize} aria-hidden="true" />
            <span data-i18n="openPhenologyCenter">物候录入中心</span>
          </button>
        </section>

        <section id="rightModuleListCard" class="card right-inspector-module" data-right-module="list">
          <div class="card-title-row">
            <h2 data-i18n="zoneSpecies">当前分区的植物</h2>
          </div>
          <div id="zonePointList" class="list" />
        </section>
      </aside>
    </div>
  );
}
