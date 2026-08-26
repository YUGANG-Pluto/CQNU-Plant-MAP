import type {
  ManagementWorkspaceAccess,
  PlatformWebCapabilityReport
} from '../../../shared/types/platform';
import {
  assessWebRuntimeCapabilities,
  webRuntimeUnavailableMessage
} from './webCapabilities';

export interface WebWorkspaceAccess {
  readonly capabilityReport: Readonly<PlatformWebCapabilityReport>;
  readonly managementAccess?: Readonly<ManagementWorkspaceAccess>;
  readonly canRead: boolean;
  readonly canEdit: boolean;
  readonly canSave: boolean;
  requireRead(): void;
  requireEdit(): void;
  requireSave(): void;
}

export function createWebWorkspaceAccess(): WebWorkspaceAccess {
  const capabilityReport = Object.freeze(assessWebRuntimeCapabilities());
  const managementAccess = window.managementAccess;
  const accessRequired = document.body?.dataset.siteWorkspace === 'true';
  const capabilities = new Set(managementAccess?.capabilities || []);
  const canRead = !accessRequired || capabilities.has('workspace.read');
  const canEdit = !accessRequired || capabilities.has('workspace.edit');
  const canSave = !accessRequired || capabilities.has('workspace.save');

  function requireRuntime(): void {
    if (!capabilityReport.workspaceReady) {
      throw new Error(webRuntimeUnavailableMessage(capabilityReport));
    }
  }

  function requireRead(): void {
    requireRuntime();
    if (!canRead) throw new Error('当前账户没有读取工作区的权限。');
  }

  function requireEdit(): void {
    requireRead();
    if (!canEdit) throw new Error('当前账户为只读权限，不能修改项目。');
  }

  function requireSave(): void {
    requireEdit();
    if (!canSave) throw new Error('当前账户只能编辑草稿，不能保存到本地项目。');
  }

  return Object.freeze({
    capabilityReport,
    ...(managementAccess ? { managementAccess } : {}),
    canRead,
    canEdit,
    canSave,
    requireRead,
    requireEdit,
    requireSave
  });
}
