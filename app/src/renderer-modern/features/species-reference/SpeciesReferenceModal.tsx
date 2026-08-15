import { Check, ExternalLink, Eye, ImageUp, LoaderCircle, RotateCcw, Search } from 'lucide-preact';
import { LayerModal } from '../../components/LayerModal';
import { FormSection, ModalBody, ModalCommandBar } from '../../components/ui/ModalPrimitives';

export function SpeciesReferenceModal() {
  return (
    <LayerModal
      id="speciesReferenceModal"
      closeButtonId="btnCloseSpeciesReferenceModal"
      titleKey="speciesReferenceTitle"
      title="物种参考建议"
      subtitleKey="speciesReferenceSubtitle"
      subtitle="仅查询 GBIF 与 iNaturalist，结果临时缓存，用户确认后才应用。"
      panelClass="species-reference-panel"
      contentClass="modal-workflow-content species-reference-workflow-content"
      footer={(
        <ModalCommandBar label="物种参考操作" labelKey="speciesReferenceActions">
          <button id="btnPreviewSpeciesReferenceImage" class="btn btn-soft" type="button">
            <Eye class="command-button-icon" size={16} aria-hidden="true" />
            <span data-i18n="speciesReferencePreviewImage">放大参考图</span>
          </button>
          <button id="btnDiscardSpeciesReference" class="btn btn-soft" type="button">
            <RotateCcw class="command-button-icon" size={16} aria-hidden="true" />
            <span data-i18n="speciesReferenceDiscard">不使用并清除</span>
          </button>
          <span class="command-spacer" aria-hidden="true" />
          <button id="btnApplySpeciesReference" class="btn btn-primary" type="button">
            <Check class="command-button-icon" size={16} aria-hidden="true" />
            <span data-i18n="speciesReferenceApply">应用所选建议</span>
          </button>
        </ModalCommandBar>
      )}
    >
      <ModalBody>
        <FormSection label="物种参考查询" labelKey="speciesReferenceSearchRegion">
          <div class="species-reference-query">
            <div class="field">
              <label for="speciesReferenceSciInput" data-i18n="plantNameSci">学名</label>
              <input id="speciesReferenceSciInput" class="input" />
            </div>
            <div class="field">
              <label for="speciesReferenceCommonInput" data-i18n="plantNameCn">植物中文名</label>
              <input id="speciesReferenceCommonInput" class="input" />
            </div>
            <button id="btnRunSpeciesReference" class="btn btn-primary" type="button">
              <Search class="command-button-icon idle-icon" size={16} aria-hidden="true" />
              <LoaderCircle class="command-button-icon busy-icon" size={16} aria-hidden="true" />
              <span data-action-label data-i18n="runSpeciesReference">查询参考</span>
            </button>
          </div>
        </FormSection>

        <FormSection label="建议应用字段" labelKey="speciesReferenceApplyFields">
          <div class="species-reference-apply-bar">
            <label class="check-card"><input id="speciesReferenceApplySci" type="checkbox" /> <span data-i18n="speciesReferenceApplySci">应用学名</span></label>
            <label class="check-card"><input id="speciesReferenceApplyCommon" type="checkbox" /> <span data-i18n="speciesReferenceApplyCommon">应用中文名</span></label>
            <label class="check-card"><input id="speciesReferenceApplyTaxonomy" type="checkbox" /> <span data-i18n="speciesReferenceApplyTaxonomy">应用科属</span></label>
            <label class="check-card"><input id="speciesReferenceAppendNote" type="checkbox" /> <span data-i18n="speciesReferenceAppendNote">追加参考摘要到备注</span></label>
          </div>
        </FormSection>

        <FormSection label="iNaturalist 图像比对" labelKey="speciesReferenceImageRegion">
          <div class="species-reference-image-compare">
            <div class="field">
              <label for="speciesReferenceImageTokenInput" data-i18n="speciesReferenceImageToken">
                iNaturalist 图像令牌（临时）
              </label>
              <input
                id="speciesReferenceImageTokenInput"
                class="input"
                type="password"
                autocomplete="off"
                data-i18n-placeholder="speciesReferenceImageTokenPlaceholder"
              />
            </div>
            <div class="species-reference-token-help">
              <button id="btnOpenInatTokenPage" class="btn btn-soft" type="button">
                <ExternalLink class="command-button-icon" size={16} aria-hidden="true" />
                <span data-i18n="speciesReferenceOpenTokenPage">打开 iNaturalist 令牌页</span>
              </button>
              <ol>
                <li data-i18n="speciesReferenceTokenStepLogin">先在默认浏览器登录 iNaturalist。</li>
                <li data-i18n="speciesReferenceTokenStepOpen">点击上方按钮打开令牌页。</li>
                <li data-i18n="speciesReferenceTokenStepCopy">复制页面显示的令牌并粘贴到此输入框。</li>
                <li data-i18n="speciesReferenceTokenStepPrivacy">令牌仅用于本次图像比对请求，不会保存到项目。</li>
              </ol>
            </div>
            <button id="btnRunSpeciesImageCompare" class="btn btn-soft" type="button">
              <ImageUp class="command-button-icon idle-icon" size={16} aria-hidden="true" />
              <LoaderCircle class="command-button-icon busy-icon" size={16} aria-hidden="true" />
              <span data-action-label data-i18n="speciesReferenceRunImageCompare">选择图片比对</span>
            </button>
            <p
              id="speciesReferenceImageCompareStatus"
              class="subtle species-reference-status"
              role="status"
              aria-live="polite"
              data-i18n="speciesReferenceImageCompareHint"
            >
              仅在用户主动选择图片后上传比对，不复制到项目目录。
            </p>
          </div>
        </FormSection>

        <div id="speciesReferenceSummary" class="hint-box" role="status" aria-live="polite" data-i18n="speciesReferenceEmpty">
          请选择点位并填写中文名或学名后查询。
        </div>
        <div
          id="speciesReferenceDetail"
          class="species-reference-detail hint-box is-empty"
          role="region"
          aria-live="polite"
          data-i18n="speciesReferenceDetailEmpty"
        >
          选择参考结果后可查看来源、图片、分类层级和特征备注。
        </div>
        <div id="speciesReferenceResults" class="species-reference-results modal-list" role="list" aria-live="polite" />
      </ModalBody>
    </LayerModal>
  );
}
