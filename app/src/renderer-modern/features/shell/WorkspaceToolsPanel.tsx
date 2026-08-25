import {
  Archive,
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  GitMerge,
  Leaf,
  MapPinned,
  MapPinPlus,
  PanelRight,
  Search,
  SlidersHorizontal,
  Trash2,
  Wrench
} from 'lucide-preact';
import {
  CommandButton,
  ModuleLauncher,
  SectionHeading,
  WORKSPACE_ICON_SIZE,
  type ModuleAction
} from '../../components/ui/WorkspacePrimitives';

type WorkspaceAccessRequirement = 'read' | 'edit' | 'save';

interface WorkspaceModuleAction extends ModuleAction {
  requires: WorkspaceAccessRequirement;
}

const moduleActions: WorkspaceModuleAction[] = [
  {
    id: 'btnOpenStats',
    icon: <BarChart3 size={WORKSPACE_ICON_SIZE} aria-hidden="true" />,
    label: '统计中心',
    i18nKey: 'openStatsCenter',
    className: 'morandi-btn morandi-purple',
    requires: 'read'
  },
  {
    id: 'btnOpenQuery',
    icon: <Search size={WORKSPACE_ICON_SIZE} aria-hidden="true" />,
    label: '查询中心',
    i18nKey: 'openQueryCenter',
    className: 'morandi-btn morandi-green',
    requires: 'read'
  },
  {
    id: 'btnOpenReviewWorkbench',
    icon: <ClipboardCheck size={WORKSPACE_ICON_SIZE} aria-hidden="true" />,
    label: '数据核验',
    i18nKey: 'openReviewWorkbench',
    className: 'morandi-btn morandi-blue',
    requires: 'edit'
  },
  {
    id: 'btnOpenSpeciesReference',
    icon: <Leaf size={WORKSPACE_ICON_SIZE} aria-hidden="true" />,
    label: '物种参考',
    i18nKey: 'openSpeciesReference',
    className: 'morandi-btn morandi-green',
    requires: 'read'
  },
  {
    id: 'btnOpenTrash',
    icon: <Trash2 size={WORKSPACE_ICON_SIZE} aria-hidden="true" />,
    label: '回收站',
    i18nKey: 'openRecycleBin',
    className: 'morandi-btn morandi-rose',
    requires: 'edit'
  },
  {
    id: 'btnOpenPointEditor',
    icon: <CalendarDays size={WORKSPACE_ICON_SIZE} aria-hidden="true" />,
    label: '物候录入中心',
    i18nKey: 'openPhenologyCenter',
    className: 'morandi-btn morandi-blue',
    requires: 'edit'
  },
  {
    id: 'btnOpenTheme',
    icon: <SlidersHorizontal size={WORKSPACE_ICON_SIZE} aria-hidden="true" />,
    label: '界面设置',
    i18nKey: 'openThemeCenter',
    className: 'morandi-btn morandi-sand',
    requires: 'read'
  },
  {
    id: 'btnOpenMerge',
    icon: <GitMerge size={WORKSPACE_ICON_SIZE} aria-hidden="true" />,
    label: '项目合并',
    i18nKey: 'openMergeCenter',
    className: 'morandi-btn morandi-green',
    requires: 'edit'
  },
  {
    id: 'btnBackupProject',
    icon: <Archive size={WORKSPACE_ICON_SIZE} aria-hidden="true" />,
    label: '项目备份',
    i18nKey: 'openBackupCenter',
    className: 'morandi-btn morandi-purple',
    requires: 'save'
  },
  {
    id: 'btnOpenMaintenance',
    icon: <Wrench size={WORKSPACE_ICON_SIZE} aria-hidden="true" />,
    label: '维护中心',
    i18nKey: 'openMaintenanceCenter',
    className: 'morandi-btn morandi-sand',
    requires: 'read'
  },
  {
    id: 'btnOpenWorkspaceDrawer',
    icon: <PanelRight size={WORKSPACE_ICON_SIZE} aria-hidden="true" />,
    label: '工作面板',
    i18nKey: 'openWorkspaceDrawer',
    className: 'morandi-btn morandi-blue',
    requires: 'read'
  }
];

export function WorkspaceToolsPanel() {
  const adapter = window.platformAdapter;
  const isWebRuntime = adapter?.runtime === 'web';
  const canEdit = adapter?.capabilities.importRecords !== false;
  const canSave = adapter?.capabilities.writeProject !== false;
  const permissionMessage = !canEdit
    ? '只读权限：可浏览、查询和导出；编辑控件已锁定。'
    : !canSave
      ? '编辑权限：更改仅保留为当前会话草稿，不会写入本地项目。'
      : '';
  const visibleModuleActions = moduleActions.map(action => {
    const disabled = isWebRuntime && (
      (action.requires === 'edit' && !canEdit)
      || (action.requires === 'save' && !canSave)
    );
    return {
      ...action,
      disabled,
      title: disabled ? permissionMessage : undefined
    };
  });

  return (
    <aside class="panel panel-left glass">
      <div class="panel-header panel-section-title">
        <SectionHeading
          title="地图工作台"
          titleKey="mapWorkspaceTools"
          subtitle="选择模式后在中央地图区完成分区和点位操作"
          subtitleKey="mapWorkspaceToolsHint"
        />
      </div>

      <div class="toolbar-grid map-tool-grid ui-command-stack" role="group" aria-label="地图工具 / Map tools">
        <CommandButton
          id="btnModeBrowse"
          icon={<MapPinned size={WORKSPACE_ICON_SIZE} aria-hidden="true" />}
          label="浏览 / 平移"
          i18nKey="modeBrowse"
          className="mode-btn active"
        />
        <CommandButton
          id="btnModeDrawZone"
          icon={<MapPinned size={WORKSPACE_ICON_SIZE} aria-hidden="true" />}
          label="绘制分区"
          i18nKey="modeDrawZone"
          className="mode-btn"
          disabled={isWebRuntime && !canEdit}
          title={permissionMessage || undefined}
        />
        <CommandButton
          id="btnModeAddPoint"
          icon={<MapPinPlus size={WORKSPACE_ICON_SIZE} aria-hidden="true" />}
          label="添加点位"
          i18nKey="modeAddPoint"
          className="mode-btn"
          disabled={isWebRuntime && !canEdit}
          title={permissionMessage || undefined}
        />
        <CommandButton
          id="btnDeleteZone"
          icon={<Trash2 size={WORKSPACE_ICON_SIZE} aria-hidden="true" />}
          label="删除当前分区"
          i18nKey="deleteZone"
          className="btn-danger-soft"
          disabled={isWebRuntime && !canEdit}
          title={permissionMessage || undefined}
        />
        <CommandButton
          id="btnDeletePoint"
          icon={<Trash2 size={WORKSPACE_ICON_SIZE} aria-hidden="true" />}
          label="删除当前点位"
          i18nKey="deletePoint"
          className="btn-danger-soft"
          disabled={isWebRuntime && !canEdit}
          title={permissionMessage || undefined}
        />
      </div>

      {isWebRuntime && permissionMessage ? (
        <p
          class={`workspace-permission-note${canEdit ? ' is-draft' : ' is-read-only'}`}
          data-i18n={canEdit ? 'webDraftWorkspaceHint' : 'webReadOnlyWorkspaceHint'}
          role="status"
        >
          {permissionMessage}
        </p>
      ) : null}

      <section class="workspace-module-section" aria-labelledby="workspaceToolsHeading">
        <SectionHeading
          title="工作区工具"
          titleKey="workspaceTools"
          subtitle="将统计、查询与回收管理集中到二级窗口"
          subtitleKey="workspaceToolsSubtitle"
          badge="核心"
          badgeKey="workspaceCoreTools"
          titleId="workspaceToolsHeading"
        />
        <ModuleLauncher actions={visibleModuleActions} />
      </section>

      <p class="workspace-drawer-hint subtle" data-i18n="workspaceDrawerHint">
        导出、项目路径、分区与点位列表已收纳到独立工作抽屉，避免默认布局堆叠。
      </p>
    </aside>
  );
}
