import { FolderOpen, HardDrive, LockKeyhole, Settings2 } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
import {
  CommandButton,
  StatusChip,
  WORKSPACE_ICON_SIZE
} from '../../components/ui/WorkspacePrimitives';

export function MapWorkspace() {
  const isWebRuntime = window.platformAdapter?.runtime === 'web';
  const access = window.platformAdapter?.web?.managementAccess;
  const canOpenProject = window.platformAdapter?.capabilities.readProject === true;
  const [projectLoaded, setProjectLoaded] = useState(
    document.documentElement.dataset.projectLoaded === 'true'
  );

  useEffect(() => {
    const handleProjectLoaded = () => setProjectLoaded(true);
    window.addEventListener('cqnu:project-loaded', handleProjectLoaded);
    return () => window.removeEventListener('cqnu:project-loaded', handleProjectLoaded);
  }, []);

  const accessKey = access?.accessLevel === 'read'
    ? 'webAccessRead'
    : access?.accessLevel === 'edit'
      ? 'webAccessEdit'
      : 'webAccessSave';

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
        {isWebRuntime && !projectLoaded ? (
          <section class="web-project-welcome glass" aria-labelledby="webProjectWelcomeTitle">
            <div class="web-project-welcome__icon" aria-hidden="true">
              <HardDrive size={26} />
            </div>
            <div class="web-project-welcome__copy">
              <span class="web-project-welcome__kicker" data-i18n="webProjectWelcomeKicker">
                浏览器本地工作区
              </span>
              <h2 id="webProjectWelcomeTitle" data-i18n="webProjectWelcomeTitle">
                从本机打开植物项目
              </h2>
              <p data-i18n="webProjectWelcomeBody">
                项目数据保留在本机浏览器数据库或您授权的目录中，不上传到管理服务。
              </p>
            </div>
            <dl class="web-project-welcome__facts">
              <div>
                <dt><LockKeyhole size={15} aria-hidden="true" /><span data-i18n="webProjectAccessLabel">账户权限</span></dt>
                <dd data-i18n={accessKey}>{access?.accessLevel === 'read' ? '只读' : access?.accessLevel === 'edit' ? '编辑草稿' : '编辑并保存'}</dd>
              </div>
              <div>
                <dt><HardDrive size={15} aria-hidden="true" /><span data-i18n="webProjectStorageLabel">数据位置</span></dt>
                <dd data-i18n="webProjectStorageValue">仅本机</dd>
              </div>
            </dl>
            <div class="web-project-welcome__actions">
              <button
                id="btnChooseDirWelcome"
                class="btn btn-primary"
                type="button"
                disabled={!canOpenProject}
                data-project-open-mode="directory"
              >
                <FolderOpen size={17} aria-hidden="true" />
                <span data-i18n="webOpenLocalData">打开本地项目</span>
              </button>
              <button
                id="btnImportProjectFolder"
                class="btn btn-soft"
                type="button"
                disabled={!canOpenProject}
                data-project-open-mode="portable-folder"
              >
                <HardDrive size={17} aria-hidden="true" />
                <span data-i18n="webImportProjectFolder">兼容导入文件夹</span>
              </button>
              <a class="btn btn-soft" href="/manage?next=/manage&view=account" data-i18n="webManageAccess">
                管理账户权限
              </a>
            </div>
            <p id="webProjectOpenStatus" class="web-project-welcome__status" role="status" aria-live="polite">
              <span data-i18n="webProjectOpenHint">优先使用目录授权；浏览器不支持时可兼容导入整个文件夹。</span>
            </p>
          </section>
        ) : null}
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
