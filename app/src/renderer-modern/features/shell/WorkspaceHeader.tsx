import { FolderOpen, Save, Search } from 'lucide-preact';
import {
  CommandButton,
  StatusChip,
  WORKSPACE_ICON_SIZE
} from '../../components/ui/WorkspacePrimitives';
import { ProjectHistoryControls } from '../history/ProjectHistoryControls';
import { useProjectSession } from '../project/useProjectSession';

function projectLabel(path: string, loaded: boolean): string {
  if (!loaded || !path) return '未打开项目';
  const parts = path.replaceAll('\\', '/').split('/').filter(Boolean);
  return parts.at(-1) || path;
}

export function WorkspaceHeader() {
  const isWebRuntime = window.platformAdapter?.runtime === 'web';
  const managementAccess = window.platformAdapter?.web?.managementAccess;
  const projectSession = useProjectSession();
  const accessKey = managementAccess?.accessLevel === 'read'
    ? 'webAccessRead'
    : managementAccess?.accessLevel === 'edit'
      ? 'webAccessEdit'
      : 'webAccessSave';
  const draftOnly = managementAccess?.accessLevel === 'edit';
  const currentProject = projectLabel(projectSession.projectDir, projectSession.loaded);

  return (
    <header class="app-topbar glass">
      <a class="app-brand-block app-brand" href={isWebRuntime ? '/' : undefined} aria-label="CQNU Plant MAP">
        <img
          class="app-brand__icon brand-logo-mark"
          src="./src/renderer/assets/brand/cqnu-logo.svg"
          alt=""
          aria-hidden="true"
        />
        <span class="app-brand__text">
          <strong>CQNU Plant MAP</strong>
          <small title={projectSession.projectDir || currentProject}>{currentProject}</small>
        </span>
      </a>

      <div class="workspace-context-rail" aria-label="当前地图上下文" data-i18n-aria-label="workspaceContext">
        <StatusChip label="工具" labelKey="mode" valueId="currentModeText" value="浏览 / 选择" />
        <StatusChip label="分区" labelKey="selectedZone" valueId="selectedZoneText" value="—" />
        <StatusChip label="点位" labelKey="selectedPoint" valueId="selectedPointText" value="—" />
      </div>

      <div class="app-topbar-actions">
        {isWebRuntime && managementAccess ? (
          <a
            class="web-profile-control glass-interactive"
            href="/manage?next=/manage&view=account"
            aria-label={`打开 ${managementAccess.displayName || managementAccess.username} 的账户设置`}
            title="打开账户设置"
          >
            <span class="web-profile-avatar" aria-hidden="true">
              {managementAccess.avatarDataUrl ? (
                <img src={managementAccess.avatarDataUrl} alt="" />
              ) : (
                <span>{(managementAccess.displayName || managementAccess.username || 'A').slice(0, 1).toUpperCase()}</span>
              )}
            </span>
            <span class="web-profile-copy">
              <strong>{managementAccess.displayName || managementAccess.username}</strong>
              <small data-i18n={accessKey}>{managementAccess.accessLevel}</small>
            </span>
          </a>
        ) : null}

        <CommandButton
          id="btnOpenCommandPalette"
          icon={<Search size={WORKSPACE_ICON_SIZE} aria-hidden="true" />}
          label="命令中心"
          i18nKey="openCommandPalette"
          className="btn-soft command-palette-trigger"
          shortcut="Ctrl K"
        />
        <ProjectHistoryControls />
        <CommandButton
          id="btnChooseDir"
          icon={<FolderOpen size={WORKSPACE_ICON_SIZE} aria-hidden="true" />}
          label={isWebRuntime ? '打开项目' : '选择项目目录'}
          i18nKey={isWebRuntime ? 'webChooseProjectSource' : 'chooseProject'}
          className="btn-soft topbar-project-action"
          disabled={isWebRuntime && window.platformAdapter?.capabilities.readProject !== true}
        />
        <CommandButton
          id="btnSave"
          icon={<Save size={WORKSPACE_ICON_SIZE} aria-hidden="true" />}
          label={draftOnly ? '仅会话草稿' : '保存'}
          i18nKey={draftOnly ? 'webDraftOnly' : 'saveProject'}
          className="btn-primary topbar-save-action"
          disabled={isWebRuntime && window.platformAdapter?.capabilities.writeProject !== true}
        />
      </div>
    </header>
  );
}
