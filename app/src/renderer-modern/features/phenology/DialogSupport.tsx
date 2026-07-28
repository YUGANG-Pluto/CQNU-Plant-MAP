export function DialogSupport() {
  return (
    <>
      <div id="smallPromptModal" class="layer-modal hidden">
        <div class="layer-modal-backdrop" />
        <section class="confirm-panel glass" role="dialog" aria-modal="true" aria-labelledby="smallPromptTitle">
          <h3 id="smallPromptTitle">添加物候</h3>
          <input id="smallPromptInput" class="input" />
          <div class="toolbar-inline">
            <button id="btnSmallPromptCancel" class="btn btn-soft">取消</button>
            <button id="btnSmallPromptAccept" class="btn btn-primary">确认</button>
          </div>
        </section>
      </div>
      <datalist id="habitatOptions" />
      <datalist id="abundanceOptions" />
      <datalist id="growthFormOptions" />
      <datalist id="floweringStateOptions" />
      <datalist id="cultivatedStatusOptions" />
    </>
  );
}
