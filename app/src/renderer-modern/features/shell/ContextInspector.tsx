import { CalendarDays } from 'lucide-preact';
import {
  CommandButton,
  WORKSPACE_ICON_SIZE
} from '../../components/ui/WorkspacePrimitives';
import { ObjectCommandBar } from './ObjectCommandBar';

export function ContextInspector() {
  const isWebReadOnly = window.platformAdapter?.runtime === 'web'
    && window.platformAdapter.capabilities.importRecords !== true;
  const readOnlyTitle = isWebReadOnly
    ? '当前账户为只读权限，不能修改项目。'
    : undefined;

  return (
    <aside id="rightInspectorPanel" class="panel panel-right glass" data-right-panel-mode="auto">
      <div class="right-inspector-header">
        <div class="right-inspector-heading">
          <h2 data-i18n="rightInspectorTitle">对象检查器</h2>
          <p id="rightPanelModeNote" class="subtle" data-i18n="rightInspectorStackSafe">
            当前内容可安全堆叠显示。
          </p>
        </div>
        <div id="rightModuleButtons" class="right-module-buttons" aria-label="右侧模块入口">
          <button
            id="btnRightModuleZone"
            class="btn btn-soft right-module-btn"
            type="button"
            data-right-module-button="zone"
            data-i18n="zoneInfo"
          >
            分区信息
          </button>
          <button
            id="btnRightModulePoint"
            class="btn btn-soft right-module-btn"
            type="button"
            data-right-module-button="point"
            data-i18n="pointAndPlant"
          >
            点位与植物信息
          </button>
          <button
            id="btnRightModuleList"
            class="btn btn-soft right-module-btn"
            type="button"
            data-right-module-button="list"
            data-i18n="zoneSpecies"
          >
            当前分区的植物
          </button>
        </div>
      </div>

      <ObjectCommandBar />

      <section id="rightModuleZoneCard" class="card right-inspector-module" data-right-module="zone">
        <div class="card-title-row">
          <h2 data-i18n="zoneInfo">分区信息</h2>
          <span class="pill" id="zoneCount">0</span>
        </div>
        <div class="field"><label for="zoneId" data-i18n="zoneId">分区编号</label><input id="zoneId" class="input" disabled={isWebReadOnly} title={readOnlyTitle} /></div>
        <div class="field"><label for="zoneName" data-i18n="zoneName">分区名称</label><input id="zoneName" class="input" disabled={isWebReadOnly} title={readOnlyTitle} /></div>
        <div class="field"><label for="zoneDescription" data-i18n="zoneDescription">分区描述</label><textarea id="zoneDescription" class="input textarea" disabled={isWebReadOnly} title={readOnlyTitle} /></div>
        <button id="btnApplyZone" class="btn btn-primary" type="button" data-i18n="applyZoneInfo" disabled={isWebReadOnly} title={readOnlyTitle}>应用到当前分区</button>
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
        <CommandButton
          id="btnOpenPointEditorInline"
          icon={<CalendarDays size={WORKSPACE_ICON_SIZE} aria-hidden="true" />}
          label="物候录入中心"
          i18nKey="openPhenologyCenter"
          className="morandi-btn morandi-blue"
          disabled={isWebReadOnly}
          title={readOnlyTitle}
        />
      </section>

      <section id="rightModuleListCard" class="card right-inspector-module" data-right-module="list">
        <div class="card-title-row">
          <h2 data-i18n="zoneSpecies">当前分区的植物</h2>
        </div>
        <div
          id="zonePointList"
          class="list object-list"
          role="listbox"
          data-i18n-aria-label="zoneSpecies"
          aria-label="当前分区的植物"
        />
      </section>
    </aside>
  );
}
