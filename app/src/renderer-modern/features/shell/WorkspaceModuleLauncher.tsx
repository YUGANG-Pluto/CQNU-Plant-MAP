import {
  Archive,
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  GitMerge,
  Home,
  Leaf,
  PanelRight,
  Search,
  SlidersHorizontal,
  Trash2,
  Wrench
} from 'lucide-preact';
import {
  ModuleLauncher,
  SegmentedControl,
  WORKSPACE_ICON_SIZE,
  type ModuleAction
} from '../../components/ui/WorkspacePrimitives';
import { WebCapabilityDisclosure } from './WebCapabilityDisclosure';

type WorkspaceAccessRequirement = 'read' | 'edit' | 'save';

interface WorkspaceModuleAction extends ModuleAction {
  requires: WorkspaceAccessRequirement;
}

interface WorkspaceModuleGroup {
  id: string;
  label: string;
  labelKey: string;
  actions: WorkspaceModuleAction[];
}

const moduleGroups: WorkspaceModuleGroup[] = [
  {
    id: 'research',
    label: '研究与复核',
    labelKey: 'workspaceResearchTools',
    actions: [
      { id: 'btnOpenStats', icon: <BarChart3 size={WORKSPACE_ICON_SIZE} aria-hidden="true" />, label: '统计中心', i18nKey: 'openStatsCenter', className: 'morandi-btn morandi-purple', requires: 'read' },
      { id: 'btnOpenQuery', icon: <Search size={WORKSPACE_ICON_SIZE} aria-hidden="true" />, label: '查询中心', i18nKey: 'openQueryCenter', className: 'morandi-btn morandi-green', requires: 'read' },
      { id: 'btnOpenReviewWorkbench', icon: <ClipboardCheck size={WORKSPACE_ICON_SIZE} aria-hidden="true" />, label: '数据核验', i18nKey: 'openReviewWorkbench', className: 'morandi-btn morandi-blue', requires: 'edit' },
      { id: 'btnOpenSpeciesReference', icon: <Leaf size={WORKSPACE_ICON_SIZE} aria-hidden="true" />, label: '物种参考', i18nKey: 'openSpeciesReference', className: 'morandi-btn morandi-green', requires: 'read' },
      { id: 'btnOpenPointEditor', icon: <CalendarDays size={WORKSPACE_ICON_SIZE} aria-hidden="true" />, label: '物候录入中心', i18nKey: 'openPhenologyCenter', className: 'morandi-btn morandi-blue', requires: 'edit' }
    ]
  },
  {
    id: 'project',
    label: '项目与维护',
    labelKey: 'workspaceProjectTools',
    actions: [
      { id: 'btnOpenWorkspaceDrawer', icon: <PanelRight size={WORKSPACE_ICON_SIZE} aria-hidden="true" />, label: '项目与列表', i18nKey: 'openWorkspaceDrawer', className: 'morandi-btn morandi-blue', requires: 'read' },
      { id: 'btnBackupProject', icon: <Archive size={WORKSPACE_ICON_SIZE} aria-hidden="true" />, label: '项目备份', i18nKey: 'openBackupCenter', className: 'morandi-btn morandi-purple', requires: 'save' },
      { id: 'btnOpenMerge', icon: <GitMerge size={WORKSPACE_ICON_SIZE} aria-hidden="true" />, label: '项目合并', i18nKey: 'openMergeCenter', className: 'morandi-btn morandi-green', requires: 'edit' },
      { id: 'btnOpenTrash', icon: <Trash2 size={WORKSPACE_ICON_SIZE} aria-hidden="true" />, label: '回收站', i18nKey: 'openRecycleBin', className: 'morandi-btn morandi-rose', requires: 'edit' },
      { id: 'btnOpenMaintenance', icon: <Wrench size={WORKSPACE_ICON_SIZE} aria-hidden="true" />, label: '维护中心', i18nKey: 'openMaintenanceCenter', className: 'morandi-btn morandi-sand', requires: 'read' },
      { id: 'btnOpenTheme', icon: <SlidersHorizontal size={WORKSPACE_ICON_SIZE} aria-hidden="true" />, label: '界面设置', i18nKey: 'openThemeCenter', className: 'morandi-btn morandi-sand', requires: 'read' }
    ]
  }
];

interface WorkspaceModuleLauncherProps {
  open: boolean;
  onDismiss(): void;
}

export function WorkspaceModuleLauncher({ open, onDismiss }: WorkspaceModuleLauncherProps) {
  const adapter = window.platformAdapter;
  const isWebRuntime = adapter?.runtime === 'web';
  const canEdit = adapter?.capabilities.importRecords !== false;
  const canSave = adapter?.capabilities.writeProject !== false;
  const permissionMessage = !canEdit
    ? '只读权限：编辑类模块已锁定。'
    : !canSave
      ? '编辑权限：更改仅保留为当前会话草稿。'
      : '';

  const withPermissions = (actions: WorkspaceModuleAction[]) => actions.map(action => {
    const disabled = isWebRuntime && (
      (action.requires === 'edit' && !canEdit)
      || (action.requires === 'save' && !canSave)
    );
    return { ...action, disabled, title: disabled ? permissionMessage : undefined };
  });

  return (
    <section
      id="workspaceModuleLauncher"
      class="workspace-module-popover glass"
      aria-label="工作区模块"
      data-i18n-aria-label="workspaceModules"
      hidden={!open}
      onClick={event => {
        const target = event.target as HTMLElement;
        if (target.closest('button[id^="btnOpen"], button#btnBackupProject')) onDismiss();
      }}
    >
      <header class="workspace-popover-header">
        <div>
          <span data-i18n="workspaceModules">工作区模块</span>
          <strong data-i18n="workspaceModulesHint">按任务进入研究、项目与维护工具</strong>
        </div>
        <kbd>Ctrl K</kbd>
      </header>
      <div class="workspace-module-groups">
        {moduleGroups.map(group => (
          <section key={group.id} class="workspace-module-group" aria-labelledby={`workspace-module-${group.id}`}>
            <h2 id={`workspace-module-${group.id}`} data-i18n={group.labelKey}>{group.label}</h2>
            <ModuleLauncher actions={withPermissions(group.actions)} />
          </section>
        ))}
      </div>
      <footer class="workspace-popover-footer">
        <div class="workspace-popover-footer-main">
          <SegmentedControl
            className="lang-toggle"
            ariaLabel="界面语言 / Interface language"
            dataAttribute="lang"
            options={[
              { value: 'zh', label: '中文', active: true },
              { value: 'en', label: 'English' }
            ]}
          />
          {isWebRuntime ? (
            <nav class="workspace-site-links" aria-label="站点导航">
              <a class="web-site-link" href="/" title="站点首页"><Home size={15} aria-hidden="true" /><span data-i18n="webSiteHome">站点首页</span></a>
              <a class="web-site-link" href="/docs" title="使用文档"><BookOpen size={15} aria-hidden="true" /><span data-i18n="webSiteDocs">使用文档</span></a>
            </nav>
          ) : null}
        </div>
        {isWebRuntime ? <WebCapabilityDisclosure /> : null}
      </footer>
    </section>
  );
}
