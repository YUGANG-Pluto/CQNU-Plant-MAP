import { Redo2, Undo2 } from 'lucide-preact';
import { WORKSPACE_ICON_SIZE } from '../../components/ui/WorkspacePrimitives';

export function ProjectHistoryControls() {
  return (
    <div
      id="projectHistoryControls"
      class="project-history-controls"
      role="group"
      aria-label="编辑历史与保存状态"
      data-i18n-aria-label="projectHistoryControls"
    >
      <div class="project-history-actions">
        <button
          id="btnUndoProjectEdit"
          class="btn btn-soft project-history-button"
          type="button"
          disabled
          title="撤销上一次编辑"
          data-i18n-title="undoProjectEdit"
        >
          <Undo2 size={WORKSPACE_ICON_SIZE} aria-hidden="true" />
          <span data-i18n="undoProjectEdit">撤销</span>
        </button>
        <button
          id="btnRedoProjectEdit"
          class="btn btn-soft project-history-button"
          type="button"
          disabled
          title="重做上一次编辑"
          data-i18n-title="redoProjectEdit"
        >
          <Redo2 size={WORKSPACE_ICON_SIZE} aria-hidden="true" />
          <span data-i18n="redoProjectEdit">重做</span>
        </button>
      </div>
      <div
        id="projectSaveStatus"
        class="project-save-status is-no-project"
        data-status="no-project"
        role="status"
        aria-live="polite"
      >
        <span class="project-save-status__dot" aria-hidden="true" />
        <span id="projectSaveStatusText" data-i18n="saveStateNoProject">未打开项目</span>
        <time id="projectSaveTimestamp" class="project-save-status__time" />
      </div>
    </div>
  );
}
