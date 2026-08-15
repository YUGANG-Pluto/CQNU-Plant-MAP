import { ChevronDown, ChevronUp, LocateFixed } from 'lucide-preact';
import {
  CommandButton,
  WORKSPACE_ICON_SIZE
} from '../../components/ui/WorkspacePrimitives';

export function ObjectCommandBar() {
  return (
    <section class="object-command-center" aria-labelledby="objectSelectionLabel">
      <div class="object-command-summary">
        <span id="objectSelectionLabel" class="object-command-eyebrow" data-i18n="objectSelectionLabel">
          当前对象
        </span>
        <strong id="objectSelectionSummary" data-i18n="objectSelectionEmpty">
          尚未选择分区或点位
        </strong>
      </div>
      <div
        class="object-command-actions"
        role="group"
        data-i18n-aria-label="objectNavigationLabel"
        aria-label="对象导航"
      >
        <CommandButton
          id="btnPreviousObject"
          icon={<ChevronUp size={WORKSPACE_ICON_SIZE} aria-hidden="true" />}
          label="上一个"
          i18nKey="objectPrevious"
          className="btn-soft"
        />
        <CommandButton
          id="btnFocusSelection"
          icon={<LocateFixed size={WORKSPACE_ICON_SIZE} aria-hidden="true" />}
          label="地图定位"
          i18nKey="objectFocus"
          className="btn-primary"
        />
        <CommandButton
          id="btnNextObject"
          icon={<ChevronDown size={WORKSPACE_ICON_SIZE} aria-hidden="true" />}
          label="下一个"
          i18nKey="objectNext"
          className="btn-soft"
        />
      </div>
      <div
        id="objectWorkflowFeedback"
        class="object-workflow-feedback is-neutral"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-i18n="objectWorkflowHint"
      >
        从地图或列表选择对象，相关视图会保持同步。
      </div>
    </section>
  );
}
