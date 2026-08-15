import { BookOpen, ImagePlus, Plus, Save, Trash2 } from 'lucide-preact';
import { LayerModal } from '../../components/LayerModal';
import { FeedbackState, FormSection, ModalBody, ModalCommandBar } from '../../components/ui/ModalPrimitives';

const identificationStatuses = [
  ['draft', 'identificationStatusDraft', '草稿'],
  ['identified', 'identificationStatusIdentified', '已鉴定'],
  ['needReview', 'identificationStatusNeedReview', '需复核'],
  ['verified', 'identificationStatusVerified', '已核验'],
  ['doubtful', 'identificationStatusDoubtful', '存疑']
] as const;

const verificationStatuses = [
  ['unverified', 'taxonomyStatusUnverified', '未核验'],
  ['suggested', 'taxonomyStatusSuggested', '待核验'],
  ['manuallyVerified', 'taxonomyStatusManuallyVerified', '已人工核验'],
  ['doubtful', 'taxonomyStatusDoubtful', '存疑'],
  ['rejected', 'taxonomyStatusRejected', '已拒绝']
] as const;

const taxonomySources = [
  ['unknown', 'taxonomySourceUnknown', '未知'],
  ['manual', 'taxonomySourceManual', '人工填写'],
  ['iNaturalist', 'taxonomySourceINaturalist', 'iNaturalist'],
  ['GBIF', 'taxonomySourceGBIF', 'GBIF'],
  ['iNaturalist+GBIF', 'taxonomySourceBoth', 'iNaturalist + GBIF']
] as const;

export function PointEditorModal() {
  return (
    <LayerModal
      id="pointEditorModal"
      closeButtonId="btnClosePointEditorModal"
      titleKey="phenologyEditorTitle"
      title="物候录入中心"
      subtitleKey="phenologyEditorSubtitle"
      subtitle="一个点位对应一个物种，记录该物种的多个物候阶段"
      panelClass="point-editor-panel"
      contentClass="modal-workflow-content point-editor-workflow-content"
      footer={(
        <ModalCommandBar className="point-editor-save-bar" label="点位保存操作" labelKey="pointEditorActions">
          <FeedbackState
            id="pointEditorSaveState"
            label="当前表单与已保存记录一致"
            labelKey="pointEditorStateSaved"
            tone="neutral"
          />
          <button id="btnApplyPoint" class="btn btn-primary" type="button">
            <Save class="command-button-icon" size={16} aria-hidden="true" />
            <span data-i18n="applyPointInfo">应用到当前点位</span>
          </button>
        </ModalCommandBar>
      )}
    >
      <ModalBody>
        <FormSection title="点位与物种" titleKey="pointIdentitySection">
          <div class="point-editor-top">
            <div class="field"><label for="pointId" data-i18n="pointId">点位编号</label><input id="pointId" class="input" /></div>
            <div class="field"><label for="plantNameCn" data-i18n="plantNameCn">植物中文名</label><input id="plantNameCn" class="input" /></div>
            <div class="field"><label for="plantNameSci" data-i18n="plantNameSci">学名</label><input id="plantNameSci" class="input" /></div>
          </div>
        </FormSection>

        <FormSection className="taxonomy-panel" title="分类信息" titleKey="taxonomySectionTitle">
          <div class="two-col">
            <div class="field"><label for="familyInput" data-i18n="speciesReferenceFamily">科</label><input id="familyInput" class="input" /></div>
            <div class="field"><label for="genusInput" data-i18n="speciesReferenceGenus">属</label><input id="genusInput" class="input" /></div>
          </div>
          <div class="two-col">
            <div class="field">
              <label for="identificationStatus" data-i18n="identificationStatus">鉴定状态</label>
              <select id="identificationStatus" class="input">
                {identificationStatuses.map(([value, key, label]) => (
                  <option key={value} value={value} data-i18n={key}>{label}</option>
                ))}
              </select>
            </div>
            <div class="field">
              <label for="taxonomyVerificationStatus" data-i18n="taxonomyVerificationStatus">科属核验状态</label>
              <select id="taxonomyVerificationStatus" class="input">
                {verificationStatuses.map(([value, key, label]) => (
                  <option key={value} value={value} data-i18n={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>
          <div class="two-col">
            <div class="field">
              <label for="taxonomySource" data-i18n="taxonomySource">科属来源</label>
              <select id="taxonomySource" class="input">
                {taxonomySources.map(([value, key, label]) => (
                  <option key={value} value={value} data-i18n={key}>{label}</option>
                ))}
              </select>
            </div>
            <div class="field">
              <label for="taxonomyUpdatedAt" data-i18n="taxonomyUpdatedAt">最近更新时间</label>
              <input id="taxonomyUpdatedAt" class="input" readonly />
            </div>
          </div>
          <p id="phenologyTaxonomyInfo" class="subtle taxonomy-inheritance-note" data-i18n="phenologyTaxonomyInherits">
            物候记录默认继承关联点位分类信息。
          </p>
          <div class="toolbar-inline taxonomy-actions" role="toolbar" aria-label="分类信息操作" data-i18n-aria-label="taxonomyActions">
            <button id="btnSuggestTaxonomy" class="btn btn-soft" data-i18n="taxonomySuggest">自动补全科属</button>
            <button id="btnRefreshTaxonomy" class="btn btn-soft" data-i18n="taxonomyRefresh">重新查询科属</button>
            <button id="btnToggleTaxonomyCandidates" class="btn btn-soft" data-i18n="taxonomyViewCandidates">查看候选</button>
            <button id="btnApplyTaxonomySuggestion" class="btn btn-primary" data-i18n="taxonomyApplySuggestion">应用建议</button>
            <button id="btnKeepManualTaxonomy" class="btn btn-soft" data-i18n="taxonomyKeepManual">保留手动填写</button>
            <button id="btnVerifyTaxonomy" class="btn btn-soft" data-i18n="taxonomyMarkVerified">标记为已核验</button>
            <button id="btnDoubtfulTaxonomy" class="btn btn-soft" data-i18n="taxonomyMarkDoubtful">标记为存疑</button>
            <button id="btnClearTaxonomySuggestion" class="btn btn-danger-soft" data-i18n="taxonomyClearSuggestion">清空建议</button>
          </div>
          <p id="taxonomySuggestionSummary" class="subtle" role="status" aria-live="polite" data-i18n="taxonomySuggestionEmpty">未查询科属建议。</p>
          <div id="taxonomyCandidateList" class="taxonomy-candidate-list hidden" />
        </FormSection>

        <FormSection title="物候记录" titleKey="phenologyRecordsSection">
          <ModalCommandBar label="物候记录操作" labelKey="phenologyActions">
            <div id="phenologyTabs" class="seg-tabs phenology-tabs" />
            <span class="command-spacer" aria-hidden="true" />
            <button id="btnAddPhenology" class="btn btn-soft" type="button">
              <Plus class="command-button-icon" size={16} aria-hidden="true" />
              <span data-i18n="addPhenology">添加物候</span>
            </button>
            <button id="btnOpenSpeciesReferenceInline" class="btn btn-soft" type="button">
              <BookOpen class="command-button-icon" size={16} aria-hidden="true" />
              <span data-i18n="openSpeciesReference">物种参考</span>
            </button>
            <button id="btnDeletePhenology" class="btn btn-danger-soft" type="button">
              <Trash2 class="command-button-icon" size={16} aria-hidden="true" />
              <span data-i18n="deletePhenology">删去物候</span>
            </button>
          </ModalCommandBar>
          <div class="two-col">
            <div class="field"><label for="observer" data-i18n="observer">记录者</label><input id="observer" class="input" /></div>
            <div class="field"><label for="surveyDate" data-i18n="surveyDate">调查日期</label><input id="surveyDate" class="input" type="date" /></div>
          </div>
          <div class="two-col">
            <div class="field"><label for="growthForm" data-i18n="growthForm">生活型</label><input id="growthForm" class="input" list="growthFormOptions" /></div>
            <div class="field"><label for="floweringState" data-i18n="floweringState">物候状态</label><input id="floweringState" class="input" list="floweringStateOptions" /></div>
          </div>
          <div class="two-col">
            <div class="field"><label for="cultivatedStatus" data-i18n="cultivatedStatus">来源属性</label><input id="cultivatedStatus" class="input" list="cultivatedStatusOptions" /></div>
            <div class="field"><label for="abundance" data-i18n="abundance">多度/数量</label><input id="abundance" class="input" list="abundanceOptions" /></div>
          </div>
          <div class="field"><label for="habitat" data-i18n="habitat">微生境</label><input id="habitat" class="input" list="habitatOptions" /></div>
          <div class="field"><label for="plantNote" data-i18n="plantNote">备注</label><textarea id="plantNote" class="input textarea" /></div>
          <div id="pendingPointHint" class="hint-box hidden" data-i18n="pendingPointHint">
            已生成临时点位，请点击“确认建立点位”或“取消建立点位”。确认后再填写详细信息。
          </div>
        </FormSection>

        <FormSection title="图片" titleKey="images">
          <div class="img-toolbar">
            <button id="btnChooseImage" class="btn btn-soft" type="button">
              <ImagePlus class="command-button-icon" size={16} aria-hidden="true" />
              <span data-i18n="chooseLocalImage">选择本地图片</span>
            </button>
          </div>
          <div id="imageList" class="image-list" />
        </FormSection>

      </ModalBody>
    </LayerModal>
  );
}
