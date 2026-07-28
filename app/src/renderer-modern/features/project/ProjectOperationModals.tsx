import { LayerModal } from '../../components/LayerModal';

export function ProjectOperationModals() {
  return (
    <>
      <LayerModal
        id="mergeModal"
        closeButtonId="btnCloseMergeModal"
        titleKey="mergeCenterTitle"
        title="项目目录合并"
        subtitleKey="mergeCenterSubtitle"
        subtitle="按当前规则合并两个项目目录中的点位数据"
        panelClass="query-panel"
      >
        <div class="field">
          <label data-i18n="mergeBaseProject">主项目目录</label>
          <div id="mergeBasePath" class="path-box">—</div>
        </div>
        <div class="toolbar-inline">
          <button id="btnChooseMergeBase" class="btn btn-soft" data-i18n="chooseBaseProject">选择主项目</button>
        </div>
        <div class="field">
          <label data-i18n="mergeOtherProject">待合并项目目录</label>
          <div id="mergeOtherPath" class="path-box">—</div>
        </div>
        <div class="toolbar-inline">
          <button id="btnChooseMergeOther" class="btn btn-soft" data-i18n="chooseOtherProject">
            选择待合并项目
          </button>
          <button id="btnRunMerge" class="btn btn-primary" data-i18n="runMerge">开始合并</button>
        </div>
        <div id="mergeSummary" class="subtle merge-summary-box" />
      </LayerModal>

      <LayerModal
        id="mergeReviewModal"
        closeButtonId="btnCloseMergeReviewModal"
        titleKey="mergeReviewTitle"
        title="疑似重合确认"
        subtitleKey="mergeReviewSubtitle"
        subtitle="请确认以下疑似重合点位是否按重合处理"
        panelClass="query-panel"
      >
        <div id="mergeReviewList" class="list modal-list" />
        <div class="toolbar-inline">
          <button id="btnMergeReviewCancel" class="btn btn-soft" data-i18n="cancelCreatePoint">取消</button>
          <button id="btnMergeReviewApply" class="btn btn-primary" data-i18n="applyMergeReview">
            应用选择并合并
          </button>
        </div>
      </LayerModal>

      <LayerModal
        id="backupModal"
        closeButtonId="btnCloseBackupModal"
        titleKey="backupCenterTitle"
        title="项目备份"
        subtitleKey="backupCenterSubtitle"
        subtitle="手动备份当前项目到指定目录，自动备份用于风险操作保护"
        panelClass="query-panel"
      >
        <div class="field">
          <label data-i18n="currentProject">当前项目目录</label>
          <div id="backupCurrentPath" class="path-box">—</div>
        </div>
        <div class="field">
          <label data-i18n="backupTargetDir">备份目标目录</label>
          <div id="backupTargetPath" class="path-box">—</div>
        </div>
        <div class="toolbar-inline">
          <button id="btnChooseBackupTarget" class="btn btn-soft" data-i18n="chooseBackupTarget">选择备份目录</button>
          <button id="btnRunManualBackup" class="btn btn-primary" data-i18n="runManualBackup">立即备份</button>
        </div>
        <div id="backupSummary" class="subtle merge-summary-box" />
      </LayerModal>
    </>
  );
}
