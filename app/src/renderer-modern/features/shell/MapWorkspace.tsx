import { FolderOpen, HardDrive, LockKeyhole } from 'lucide-preact';
import { ProjectSourceStatus } from '../project/ProjectImportCenter';
import { useProjectSession } from '../project/useProjectSession';

export function MapWorkspace() {
  const isWebRuntime = window.platformAdapter?.runtime === 'web';
  const access = window.platformAdapter?.web?.managementAccess;
  const canOpenProject = window.platformAdapter?.capabilities.readProject === true;
  const projectSession = useProjectSession();
  const accessKey = access?.accessLevel === 'read'
    ? 'webAccessRead'
    : access?.accessLevel === 'edit'
      ? 'webAccessEdit'
      : 'webAccessSave';

  return (
    <main class="map-shell">
      <div class="map-canvas-wrap">
        <div id="map" data-i18n-aria-label="mapCanvasLabel" aria-label="校园植物地图" />

        <div class="map-project-source glass"><ProjectSourceStatus /></div>

        <div class="map-operation-strip glass" aria-live="polite">
          <button id="btnConfirmPoint" class="btn btn-primary hidden" type="button" data-i18n="confirmCreatePoint">
            确认建立点位
          </button>
          <button id="btnCancelPoint" class="btn btn-soft hidden" type="button" data-i18n="cancelCreatePoint">
            取消建立点位
          </button>
        </div>

        {isWebRuntime && !projectSession.loaded ? (
          <section class="web-project-welcome glass" aria-labelledby="webProjectWelcomeTitle">
            <div class="web-project-welcome__icon" aria-hidden="true"><HardDrive size={24} /></div>
            <div class="web-project-welcome__copy">
              <span class="web-project-welcome__kicker" data-i18n="webProjectWelcomeKicker">浏览器本地工作区</span>
              <h2 id="webProjectWelcomeTitle" data-i18n="webProjectWelcomeTitle">从本机打开植物项目</h2>
              <p data-i18n="webProjectWelcomeBody">项目数据保留在本机浏览器数据库或您授权的目录中，不上传到管理服务。</p>
            </div>
            <dl class="web-project-welcome__facts">
              <div>
                <dt><LockKeyhole size={14} aria-hidden="true" /><span data-i18n="webProjectAccessLabel">账户权限</span></dt>
                <dd data-i18n={accessKey}>{access?.accessLevel === 'read' ? '只读' : access?.accessLevel === 'edit' ? '编辑草稿' : '编辑并保存'}</dd>
              </div>
              <div>
                <dt><HardDrive size={14} aria-hidden="true" /><span data-i18n="webProjectStorageLabel">数据位置</span></dt>
                <dd data-i18n="webProjectStorageValue">仅本机</dd>
              </div>
            </dl>
            <div class="web-project-welcome__actions">
              <button id="btnChooseDirWelcome" class="btn btn-primary" type="button" disabled={!canOpenProject}>
                <FolderOpen size={16} aria-hidden="true" />
                <span data-i18n="webChooseProjectSource">选择打开方式</span>
              </button>
              <a class="btn btn-soft" href="/manage?next=/workspace&view=account" data-i18n="webManageAccess">账户设置</a>
            </div>
            <p id="webProjectOpenStatus" class="web-project-welcome__status" role="status" aria-live="polite">
              <span data-i18n="webProjectOpenHint">优先使用目录授权；浏览器不支持时可兼容导入整个文件夹。</span>
            </p>
          </section>
        ) : null}

        <div class="map-overlay glass status-bar">
          <span data-i18n="mapStatusHint">从左侧选择地图工具；对象详情显示在右侧检查器。</span>
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
