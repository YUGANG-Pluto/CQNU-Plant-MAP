import { LayerModal } from '../../components/LayerModal';

export function RecycleBinModal() {
  return (
    <LayerModal
      id="trashModal"
      closeButtonId="btnCloseTrashModal"
      titleKey="recycleBinTitle"
      title="回收站"
      subtitleKey="recycleBinSubtitle"
      subtitle="恢复误删对象或彻底删除"
      panelClass="query-panel"
    >
      <div class="toolbar-inline">
        <button id="btnRestoreTrash" class="btn btn-primary" data-i18n="restoreSelected">恢复选中</button>
        <button id="btnDeleteTrashForever" class="btn btn-danger-soft" data-i18n="deleteForeverSelected">
          彻底删除
        </button>
        <span id="trashCount" class="pill">0</span>
      </div>
      <div id="trashList" class="list modal-list" />
    </LayerModal>
  );
}
