import { CalendarDays, ChevronRight, MousePointer2 } from 'lucide-preact';
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
    <aside
      id="rightInspectorPanel"
      class="panel panel-right"
      data-right-panel-mode="context"
      data-selection-type="none"
    >
      <header class="right-inspector-header">
        <div class="right-inspector-heading">
          <span data-i18n="rightInspectorKicker">CONTEXT</span>
          <h2 data-i18n="rightInspectorTitle">对象检查器</h2>
          <p id="rightPanelModeNote" class="subtle" data-i18n="rightInspectorSelectPrompt">
            从地图或列表选择一个分区或点位。
          </p>
        </div>
        <div id="rightModuleButtons" class="right-module-buttons" aria-label="相关对象视图">
          <button id="btnRightModuleZone" class="btn btn-soft right-module-btn" type="button" data-right-module-button="zone" data-i18n="zoneInfo">分区信息</button>
          <button id="btnRightModulePoint" class="btn btn-soft right-module-btn" type="button" data-right-module-button="point" data-i18n="pointAndPlant">点位与植物信息</button>
          <button id="btnRightModuleList" class="btn btn-soft right-module-btn" type="button" data-right-module-button="list" data-i18n="zoneSpecies">分区植物</button>
        </div>
      </header>

      <ObjectCommandBar />

      <section class="right-inspector-empty" aria-labelledby="rightInspectorEmptyTitle">
        <span aria-hidden="true"><MousePointer2 size={20} /></span>
        <div>
          <strong id="rightInspectorEmptyTitle" data-i18n="rightInspectorEmptyTitle">选择地图对象以查看详情</strong>
          <p data-i18n="rightInspectorEmptyBody">选中分区后可查看植物清单；选中点位后可进入分类与物候记录。</p>
        </div>
      </section>

      <section id="rightModuleZoneCard" class="right-inspector-module" data-right-module="zone">
        <div class="right-inspector-module-title">
          <div><span data-i18n="objectTypeZone">分区</span><h2 data-i18n="zoneInfo">分区信息</h2></div>
          <span class="pill" id="zoneCount">0</span>
        </div>
        <details class="inspector-edit-disclosure">
          <summary><span data-i18n="editZoneDetails">编辑分区字段</span><ChevronRight size={15} aria-hidden="true" /></summary>
          <div class="inspector-edit-fields">
            <div class="field"><label for="zoneId" data-i18n="zoneId">分区编号</label><input id="zoneId" class="input" disabled={isWebReadOnly} title={readOnlyTitle} /></div>
            <div class="field"><label for="zoneName" data-i18n="zoneName">分区名称</label><input id="zoneName" class="input" disabled={isWebReadOnly} title={readOnlyTitle} /></div>
            <div class="field"><label for="zoneDescription" data-i18n="zoneDescription">分区描述</label><textarea id="zoneDescription" class="input textarea" disabled={isWebReadOnly} title={readOnlyTitle} /></div>
            <button id="btnApplyZone" class="btn btn-primary" type="button" data-i18n="applyZoneInfo" disabled={isWebReadOnly} title={readOnlyTitle}>应用到当前分区</button>
          </div>
        </details>
      </section>

      <section id="rightModulePointCard" class="species-summary-card right-inspector-module" data-right-module="point">
        <div class="right-inspector-module-title">
          <div><span data-i18n="objectTypePoint">点位</span><h2 data-i18n="pointAndPlant">点位与植物信息</h2></div>
          <span class="pill" id="pointCount">0</span>
        </div>
        <div id="pointSummaryBox" class="summary-box">—</div>
        <CommandButton
          id="btnOpenPointEditorInline"
          icon={<CalendarDays size={WORKSPACE_ICON_SIZE} aria-hidden="true" />}
          label="打开分类与物候记录"
          i18nKey="openPhenologyCenter"
          className="btn-primary inspector-primary-action"
          disabled={isWebReadOnly}
          title={readOnlyTitle}
        />
      </section>

      <section id="rightModuleListCard" class="right-inspector-module" data-right-module="list">
        <div class="right-inspector-module-title">
          <div><span data-i18n="zoneSpecies">分区植物</span><h2 data-i18n="zoneSpecies">当前分区的植物</h2></div>
        </div>
        <div id="zonePointList" class="list object-list" role="listbox" data-i18n-aria-label="zoneSpecies" aria-label="当前分区的植物" />
      </section>
    </aside>
  );
}
