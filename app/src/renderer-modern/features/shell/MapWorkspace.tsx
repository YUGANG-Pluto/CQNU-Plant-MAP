import { Settings2 } from 'lucide-preact';
import {
  CommandButton,
  StatusChip,
  WORKSPACE_ICON_SIZE
} from '../../components/ui/WorkspacePrimitives';

export function MapWorkspace() {
  return (
    <main class="map-shell">
      <div class="map-workbar glass">
        <div class="map-workbar-status">
          <StatusChip label="模式" labelKey="mode" valueId="currentModeText" value="浏览 / 平移" />
          <StatusChip label="当前分区" labelKey="selectedZone" valueId="selectedZoneText" value="—" />
          <StatusChip label="当前点位" labelKey="selectedPoint" valueId="selectedPointText" value="—" />
        </div>
        <div class="map-basemap-toolbar">
          <label class="mini-field-label" for="baseMapSelect" data-i18n="currentBaseMap">当前底图</label>
          <select id="baseMapSelect" class="input compact-select" />
          <CommandButton
            id="btnToggleBasemapEditor"
            icon={<Settings2 size={WORKSPACE_ICON_SIZE} aria-hidden="true" />}
            label="底图设置"
            i18nKey="basemapSettingsPanel"
            className="btn-soft"
          />
          <div id="basemapQuickSummary" class="basemap-quick-summary">WGS84 / z=— / ?</div>
        </div>
        <div id="basemapStatusPanel" class="basemap-state-strip" />
        <div class="map-workbar-actions">
          <button id="btnConfirmPoint" class="btn btn-primary hidden" type="button" data-i18n="confirmCreatePoint">
            确认建立点位
          </button>
          <button id="btnCancelPoint" class="btn btn-soft hidden" type="button" data-i18n="cancelCreatePoint">
            取消建立点位
          </button>
        </div>
      </div>
      <div class="map-canvas-wrap">
        <div id="map" data-i18n-aria-label="mapCanvasLabel" aria-label="校园植物地图" />
        <div class="map-overlay glass status-bar">
          <span data-i18n="mapStatusHint">地图工作区：工具状态、当前分区和当前点位显示在上方工具带。</span>
          <strong
            id="mapSelectionAnnouncer"
            class="map-selection-announcer"
            role="status"
            aria-live="polite"
            aria-atomic="true"
            data-i18n="objectSelectionEmpty"
          >
            尚未选择分区或点位
          </strong>
        </div>
      </div>
    </main>
  );
}
