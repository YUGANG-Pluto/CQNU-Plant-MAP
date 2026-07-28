import { LayerModal } from '../../components/LayerModal';

export function QueryModal() {
  return (
    <LayerModal
      id="queryModal"
      closeButtonId="btnCloseQueryModal"
      titleKey="queryCenterTitle"
      title="查询中心"
      subtitleKey="queryCenterSubtitle"
      subtitle="统一搜索与高级联合筛选"
      panelClass="query-panel"
    >
      <div class="query-grid">
        <div class="field field-span-2">
          <label data-i18n="searchKeyword">关键词搜索</label>
          <input id="queryText" class="input" />
        </div>
        <div class="field">
          <label data-i18n="zoneFilter">分区</label>
          <select id="queryZone" class="input" />
        </div>
        <div class="field">
          <label data-i18n="queryCompletenessFilter">完整性</label>
          <select id="queryCompleteness" class="input">
            <option value="" data-i18n="queryCompletenessAll">全部记录</option>
            <option value="missingScientificName" data-i18n="queryMissingScientificName">缺学名</option>
            <option value="missingCommonName" data-i18n="queryMissingCommonName">缺中文名</option>
            <option value="missingPhenology" data-i18n="queryMissingPhenology">缺物候</option>
            <option value="missingImage" data-i18n="queryMissingImage">缺图片</option>
          </select>
        </div>
        <div class="field">
          <label data-i18n="growthForm">生活型</label>
          <input id="queryGrowthForm" class="input" list="growthFormOptions" />
        </div>
        <div class="field">
          <label data-i18n="floweringState">物候状态</label>
          <input id="queryFloweringState" class="input" list="floweringStateOptions" />
        </div>
        <div class="field">
          <label data-i18n="cultivatedStatus">来源属性</label>
          <input id="queryCultivatedStatus" class="input" list="cultivatedStatusOptions" />
        </div>
        <div class="field">
          <label data-i18n="habitat">微生境</label>
          <input id="queryHabitat" class="input" list="habitatOptions" />
        </div>
        <div class="field">
          <label data-i18n="observer">记录者</label>
          <input id="queryObserver" class="input" />
        </div>
        <div class="field">
          <label data-i18n="startDate">起始日期</label>
          <input id="queryDateStart" class="input" type="date" />
        </div>
        <div class="field">
          <label data-i18n="endDate">结束日期</label>
          <input id="queryDateEnd" class="input" type="date" />
        </div>
      </div>
      <div class="toolbar-inline">
        <button id="btnRunQuery" class="btn btn-primary" data-i18n="runQuery">执行查询</button>
        <button id="btnResetQuery" class="btn btn-soft" data-i18n="resetQuery">重置条件</button>
        <span id="queryResultCount" class="pill">0</span>
      </div>
      <div id="queryResults" class="list modal-list" />
    </LayerModal>
  );
}
