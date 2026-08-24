import { ChevronLeft, ChevronRight, LocateFixed, Pencil, RotateCcw } from 'lucide-preact';
import { LayerModal } from '../../components/LayerModal';
import { ModalBody, ModalCommandBar } from '../../components/ui/ModalPrimitives';

export function ReviewWorkbenchModal() {
  return (
    <LayerModal
      id="reviewWorkbenchModal"
      closeButtonId="btnCloseReviewWorkbench"
      titleKey="reviewWorkbenchTitle"
      title="研究数据核验任务台"
      subtitleKey="reviewWorkbenchSubtitle"
      subtitle="按问题类型和分区连续核对点位记录"
      panelClass="review-workbench-panel"
      contentClass="modal-workflow-content review-workbench-content"
    >
      <ModalBody>
        <section class="review-overview" aria-label="核验进度" data-i18n-aria-label="reviewProgressRegion">
          <div class="review-summary-grid">
            <article><span data-i18n="reviewTotalPoints">点位总数</span><strong id="reviewTotalPoints">0</strong></article>
            <article><span data-i18n="reviewReadyPoints">已就绪点位</span><strong id="reviewReadyPoints">0</strong></article>
            <article><span data-i18n="reviewPendingPoints">待核验点位</span><strong id="reviewPendingPoints">0</strong></article>
            <article><span data-i18n="reviewOpenIssues">问题项</span><strong id="reviewOpenIssueCount">0</strong></article>
          </div>
          <div class="review-progress-row">
            <div
              id="reviewProgressTrack"
              class="review-progress-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={0}
            >
              <span id="reviewProgressBar" />
            </div>
            <strong id="reviewProgressPercent">0%</strong>
          </div>
        </section>

        <ModalCommandBar className="review-filter-bar" label="核验任务筛选" labelKey="reviewFilterRegion">
          <label class="review-filter-field">
            <span data-i18n="reviewIssueFilter">问题类型</span>
            <select id="reviewIssueFilter" class="input" />
          </label>
          <label class="review-filter-field">
            <span data-i18n="zoneFilter">分区</span>
            <select id="reviewZoneFilter" class="input" />
          </label>
          <label class="review-filter-field">
            <span data-i18n="reviewSeverityFilter">优先级</span>
            <select id="reviewSeverityFilter" class="input">
              <option value="" data-i18n="reviewAllSeverities">全部优先级</option>
              <option value="high" data-i18n="reviewSeverityHigh">高优先级</option>
              <option value="medium" data-i18n="reviewSeverityMedium">中优先级</option>
              <option value="low" data-i18n="reviewSeverityLow">低优先级</option>
            </select>
          </label>
          <label class="review-filter-field review-search-field">
            <span data-i18n="searchKeyword">关键词搜索</span>
            <input id="reviewSearch" class="input" data-i18n-placeholder="reviewSearchPlaceholder" />
          </label>
          <button id="btnResetReviewFilters" class="btn btn-soft" type="button">
            <RotateCcw size={16} aria-hidden="true" />
            <span data-i18n="reviewResetFilters">重置</span>
          </button>
        </ModalCommandBar>

        <div class="review-workspace">
          <section class="review-queue" aria-labelledby="reviewQueueTitle">
            <div class="review-pane-heading">
              <div>
                <h3 id="reviewQueueTitle" data-i18n="reviewQueueTitle">待核验队列</h3>
                <p data-i18n="reviewQueueHint">按优先级和问题数量排序</p>
              </div>
              <span id="reviewVisibleCount" class="pill" aria-live="polite">0</span>
            </div>
            <div id="reviewTaskList" class="review-task-list" role="listbox" aria-label="待核验任务" data-i18n-aria-label="reviewQueueTitle" />
          </section>

          <section class="review-detail" aria-labelledby="reviewDetailTitle">
            <div class="review-pane-heading">
              <div>
                <h3 id="reviewDetailTitle" data-i18n="reviewDetailTitle">任务详情</h3>
                <p id="reviewSelectionPosition" data-i18n="reviewSelectTaskHint">选择一条任务查看问题</p>
              </div>
              <div class="review-navigation" role="group" aria-label="任务导航" data-i18n-aria-label="reviewNavigation">
                <button id="btnPreviousReviewTask" class="btn btn-soft" type="button" title="上一条" data-i18n-title="reviewPreviousTask">
                  <ChevronLeft size={16} aria-hidden="true" />
                </button>
                <button id="btnNextReviewTask" class="btn btn-soft" type="button" title="下一条" data-i18n-title="reviewNextTask">
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
            <div id="reviewTaskDetail" class="review-task-detail" aria-live="polite" />
            <div class="review-detail-actions">
              <button id="btnLocateReviewTask" class="btn btn-soft" type="button">
                <LocateFixed size={16} aria-hidden="true" />
                <span data-i18n="reviewLocateTask">在地图定位</span>
              </button>
              <button id="btnEditReviewTask" class="btn btn-primary" type="button">
                <Pencil size={16} aria-hidden="true" />
                <span data-i18n="reviewEditTask">打开点位编辑器</span>
              </button>
            </div>
          </section>
        </div>
      </ModalBody>
    </LayerModal>
  );
}
