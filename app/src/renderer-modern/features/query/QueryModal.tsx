import { RotateCcw, Search } from 'lucide-preact';
import { LayerModal } from '../../components/LayerModal';
import { FormSection, ModalBody, ModalCommandBar } from '../../components/ui/ModalPrimitives';

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
      contentClass="modal-workflow-content query-workflow-content"
    >
      <ModalBody>
        <FormSection
          className="query-filter-section"
          label="查询筛选条件"
          labelKey="queryFilterRegion"
        >
          <div class="query-grid">
            <div class="field field-span-2">
              <label for="queryText" data-i18n="searchKeyword">关键词搜索</label>
              <input id="queryText" class="input" />
            </div>
            <div class="field">
              <label for="queryZone" data-i18n="zoneFilter">分区</label>
              <select id="queryZone" class="input" />
            </div>
            <div class="field">
              <label for="queryCompleteness" data-i18n="queryCompletenessFilter">完整性</label>
              <select id="queryCompleteness" class="input">
                <option value="" data-i18n="queryCompletenessAll">全部记录</option>
                <option value="missingScientificName" data-i18n="queryMissingScientificName">缺学名</option>
                <option value="missingCommonName" data-i18n="queryMissingCommonName">缺中文名</option>
                <option value="missingPhenology" data-i18n="queryMissingPhenology">缺物候</option>
                <option value="missingImage" data-i18n="queryMissingImage">缺图片</option>
              </select>
            </div>
            <div class="field">
              <label for="queryGrowthForm" data-i18n="growthForm">生活型</label>
              <input id="queryGrowthForm" class="input" list="growthFormOptions" />
            </div>
            <div class="field">
              <label for="queryFloweringState" data-i18n="floweringState">物候状态</label>
              <input id="queryFloweringState" class="input" list="floweringStateOptions" />
            </div>
            <div class="field">
              <label for="queryCultivatedStatus" data-i18n="cultivatedStatus">来源属性</label>
              <input id="queryCultivatedStatus" class="input" list="cultivatedStatusOptions" />
            </div>
            <div class="field">
              <label for="queryHabitat" data-i18n="habitat">微生境</label>
              <input id="queryHabitat" class="input" list="habitatOptions" />
            </div>
            <div class="field">
              <label for="queryObserver" data-i18n="observer">记录者</label>
              <input id="queryObserver" class="input" />
            </div>
            <div class="field">
              <label for="queryDateStart" data-i18n="startDate">起始日期</label>
              <input id="queryDateStart" class="input" type="date" />
            </div>
            <div class="field">
              <label for="queryDateEnd" data-i18n="endDate">结束日期</label>
              <input id="queryDateEnd" class="input" type="date" />
            </div>
          </div>
        </FormSection>
        <ModalCommandBar label="查询操作" labelKey="queryActions">
          <button id="btnRunQuery" class="btn btn-primary" type="button">
            <Search class="command-button-icon" size={16} aria-hidden="true" />
            <span data-i18n="runQuery">执行查询</span>
          </button>
          <button id="btnResetQuery" class="btn btn-soft" type="button">
            <RotateCcw class="command-button-icon" size={16} aria-hidden="true" />
            <span data-i18n="resetQuery">重置条件</span>
          </button>
          <span id="queryResultCount" class="pill query-result-count" aria-live="polite">0</span>
        </ModalCommandBar>
        <section
          class="modal-result-region"
          aria-label="查询结果"
          data-i18n-aria-label="queryResultsRegion"
        >
          <div id="queryResults" class="list modal-list" role="list" aria-live="polite" />
        </section>
      </ModalBody>
    </LayerModal>
  );
}
