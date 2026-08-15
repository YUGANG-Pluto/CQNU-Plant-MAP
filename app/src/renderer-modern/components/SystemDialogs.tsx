import { X } from 'lucide-preact';

export function SystemDialogs() {
  return (
    <>
      <div id="progressDock" class="progress-dock" aria-live="polite" />
      <div id="toastRegion" class="ui-toast-region" role="status" aria-live="polite" aria-atomic="true" />

      <div id="confirmModal" class="layer-modal hidden" aria-hidden="true">
        <div class="layer-modal-backdrop" aria-hidden="true" />
        <section class="confirm-panel glass" role="alertdialog" aria-modal="true" aria-labelledby="confirmTitle" tabIndex={-1}>
          <h3 id="confirmTitle">确认操作</h3>
          <p id="confirmMessage" class="subtle" />
          <div class="toolbar-inline">
            <button id="btnConfirmCancel" class="btn btn-soft" data-i18n="cancelCreatePoint">取消</button>
            <button id="btnConfirmAccept" class="btn btn-danger-soft" data-i18n="confirmAction">确认</button>
          </div>
        </section>
      </div>

      <div id="alertModal" class="layer-modal hidden" aria-hidden="true">
        <div class="layer-modal-backdrop" aria-hidden="true" />
        <section class="confirm-panel glass alert-panel" role="alertdialog" aria-modal="true" aria-labelledby="alertTitle" tabIndex={-1}>
          <h3 id="alertTitle">提示</h3>
          <p id="alertMessage" class="subtle" />
          <p id="alertDetail" class="subtle alert-detail" />
          <div class="toolbar-inline">
            <button id="btnAlertClose" class="btn btn-primary" data-i18n="closePanel">关闭</button>
          </div>
        </section>
      </div>

      <div id="imagePreviewModal" class="image-modal hidden" aria-hidden="true">
        <div class="image-modal-backdrop" aria-hidden="true" />
        <section class="image-modal-content glass" role="dialog" aria-modal="true" tabIndex={-1}>
          <button
            id="btnCloseImageModal"
            class="btn btn-soft image-modal-close modern-icon-button"
            type="button"
            aria-label="关闭"
            title="关闭"
            data-i18n-aria-label="closePanel"
            data-i18n-title="closePanel"
          >
            <X size={18} aria-hidden="true" />
          </button>
          <div class="image-modal-stage">
            <img id="imagePreviewFull" src="" alt="preview" />
          </div>
          <footer class="image-modal-footer">
            <div class="image-modal-tools">
              <button id="btnImagePrev" class="btn btn-soft" data-i18n="imagePrev">上一张</button>
              <button id="btnImageReset" class="btn btn-soft" data-i18n="imageReset">重置缩放</button>
              <button id="btnImageNext" class="btn btn-soft" data-i18n="imageNext">下一张</button>
            </div>
            <div id="imagePreviewCaption" class="subtle" />
            <div id="imagePreviewZoom" class="subtle">1.0×</div>
          </footer>
        </section>
      </div>
    </>
  );
}
