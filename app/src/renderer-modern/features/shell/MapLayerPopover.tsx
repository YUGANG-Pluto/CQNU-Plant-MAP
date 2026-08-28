import { Eye, Settings2 } from 'lucide-preact';
import { WORKSPACE_ICON_SIZE } from '../../components/ui/WorkspacePrimitives';

interface MapLayerPopoverProps {
  open: boolean;
}

function VisibilityToggle({ id, label, labelKey, countId }: {
  id: string;
  label: string;
  labelKey: string;
  countId: string;
}) {
  return (
    <button id={id} class="layer-visibility-row" type="button" role="switch" aria-checked="true">
      <span class="layer-visibility-icon"><Eye size={15} aria-hidden="true" /></span>
      <span class="layer-visibility-copy"><strong data-i18n={labelKey}>{label}</strong><small data-i18n="layerVisible">可见</small></span>
      <b id={countId}>0</b>
      <i aria-hidden="true" />
    </button>
  );
}

export function MapLayerPopover({ open }: MapLayerPopoverProps) {
  return (
    <section
      id="mapLayerPopover"
      class="map-layer-popover glass"
      aria-labelledby="mapLayerPopoverTitle"
      hidden={!open}
    >
      <header class="workspace-popover-header">
        <div>
          <span data-i18n="mapLayers">图层</span>
          <strong id="mapLayerPopoverTitle" data-i18n="mapLayerPanelTitle">地图内容与底图</strong>
        </div>
        <div id="basemapQuickSummary" class="basemap-quick-summary">WGS84 / z=— / ?</div>
      </header>
      <div class="layer-source-control">
        <label for="baseMapSelect" data-i18n="currentBaseMap">当前底图</label>
        <div>
          <select id="baseMapSelect" class="input compact-select" />
          <button id="btnToggleBasemapEditor" class="btn btn-soft modern-icon-button" type="button" title="底图高级设置" data-i18n-title="basemapSettingsPanel">
            <Settings2 size={WORKSPACE_ICON_SIZE} aria-hidden="true" />
            <span class="sr-only" data-i18n="basemapSettingsPanel">底图设置</span>
          </button>
        </div>
      </div>
      <div class="layer-visibility-list" role="group" aria-label="业务数据图层" data-i18n-aria-label="dataLayers">
        <VisibilityToggle id="btnToggleZoneLayer" label="植物分区" labelKey="zoneLayer" countId="zoneLayerCount" />
        <VisibilityToggle id="btnTogglePointLayer" label="植物点位" labelKey="pointLayer" countId="pointLayerCount" />
      </div>
      <div id="basemapStatusPanel" class="basemap-state-strip" />
      <p class="map-layer-note" data-i18n="layerPanelHint">
        快速显隐只影响地图视图，不修改项目记录。底图授权与坐标设置在高级面板中维护。
      </p>
    </section>
  );
}
