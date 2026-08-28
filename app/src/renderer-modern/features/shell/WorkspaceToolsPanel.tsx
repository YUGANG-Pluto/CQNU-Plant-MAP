import { useEffect, useRef, useState } from 'preact/hooks';
import {
  AppWindow,
  Layers3,
  MapPinPlus,
  MousePointer2,
  Pentagon
} from 'lucide-preact';
import {
  CommandButton,
  WORKSPACE_ICON_SIZE
} from '../../components/ui/WorkspacePrimitives';
import { MapLayerPopover } from './MapLayerPopover';
import { WorkspaceModuleLauncher } from './WorkspaceModuleLauncher';

type OpenPanel = 'layers' | 'modules' | null;

export function WorkspaceToolsPanel() {
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const railRef = useRef<HTMLElement>(null);
  const adapter = window.platformAdapter;
  const isWebRuntime = adapter?.runtime === 'web';
  const canEdit = adapter?.capabilities.importRecords !== false;
  const permissionMessage = isWebRuntime && !canEdit
    ? '当前账户为只读权限，不能修改地图记录。'
    : undefined;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenPanel(null);
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && !railRef.current?.contains(target)) setOpenPanel(null);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, []);

  return (
    <aside ref={railRef} class="workspace-tool-rail glass" aria-label="地图工具" data-i18n-aria-label="mapWorkspaceTools">
      <div class="workspace-tool-group" role="group" aria-label="地图操作">
        <CommandButton
          id="btnModeBrowse"
          icon={<MousePointer2 size={WORKSPACE_ICON_SIZE} aria-hidden="true" />}
          label="浏览 / 选择"
          i18nKey="modeBrowse"
          className="mode-btn active"
          iconOnly
        />
        <CommandButton
          id="btnModeDrawZone"
          icon={<Pentagon size={WORKSPACE_ICON_SIZE} aria-hidden="true" />}
          label="绘制分区"
          i18nKey="modeDrawZone"
          className="mode-btn"
          disabled={isWebRuntime && !canEdit}
          title={permissionMessage}
          iconOnly
        />
        <CommandButton
          id="btnModeAddPoint"
          icon={<MapPinPlus size={WORKSPACE_ICON_SIZE} aria-hidden="true" />}
          label="添加点位"
          i18nKey="modeAddPoint"
          className="mode-btn"
          disabled={isWebRuntime && !canEdit}
          title={permissionMessage}
          iconOnly
        />
      </div>

      <div class="workspace-tool-separator" aria-hidden="true" />

      <div class="workspace-tool-group" role="group" aria-label="地图与工作区面板">
        <CommandButton
          icon={<Layers3 size={WORKSPACE_ICON_SIZE} aria-hidden="true" />}
          label="图层"
          i18nKey="mapLayers"
          className={openPanel === 'layers' ? 'is-panel-open' : ''}
          iconOnly
          expanded={openPanel === 'layers'}
          controls="mapLayerPopover"
          onClick={() => setOpenPanel(current => current === 'layers' ? null : 'layers')}
        />
        <CommandButton
          icon={<AppWindow size={WORKSPACE_ICON_SIZE} aria-hidden="true" />}
          label="工作区模块"
          i18nKey="workspaceModules"
          className={openPanel === 'modules' ? 'is-panel-open' : ''}
          iconOnly
          expanded={openPanel === 'modules'}
          controls="workspaceModuleLauncher"
          onClick={() => setOpenPanel(current => current === 'modules' ? null : 'modules')}
        />
      </div>

      <MapLayerPopover open={openPanel === 'layers'} />
      <WorkspaceModuleLauncher open={openPanel === 'modules'} onDismiss={() => setOpenPanel(null)} />
    </aside>
  );
}
