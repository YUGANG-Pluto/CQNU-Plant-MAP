import type {
  ManagementWorkspaceAccess,
  PlatformCapabilities,
  PlatformWebCapabilityReport
} from '../../../shared/types/platform';

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

export interface WebPlatformContext {
  readonly capabilityReport: Readonly<PlatformWebCapabilityReport>;
  readonly managementAccess?: Readonly<ManagementWorkspaceAccess>;
}

export interface DynamicWebWorkspaceAccessOptions {
  capabilityReport: Readonly<PlatformWebCapabilityReport>;
  getManagementAccess(): Readonly<ManagementWorkspaceAccess> | undefined;
  isAccessRequired(): boolean;
  runtimeUnavailableMessage: string;
}

export function createDynamicWebWorkspaceAccess(
  options: DynamicWebWorkspaceAccessOptions
): WebWorkspaceAccess {
  function hasCapability(capability: string): boolean {
    return !options.isAccessRequired()
      || Boolean(options.getManagementAccess()?.capabilities.includes(capability));
  }

  function requireRuntime(): void {
    if (!options.capabilityReport.workspaceReady) {
      throw new Error(options.runtimeUnavailableMessage);
    }
  }

  function requireRead(): void {
    requireRuntime();
    if (!hasCapability('workspace.read')) throw new Error('当前账户没有读取工作区的权限。');
  }

  function requireEdit(): void {
    requireRead();
    if (!hasCapability('workspace.edit')) throw new Error('当前账户为只读权限，不能修改项目。');
  }

  function requireSave(): void {
    requireEdit();
    if (!hasCapability('workspace.save')) throw new Error('当前账户只能编辑草稿，不能保存到本地项目。');
  }

  return Object.freeze({
    capabilityReport: options.capabilityReport,
    get managementAccess() {
      return options.getManagementAccess();
    },
    get canRead() {
      return hasCapability('workspace.read');
    },
    get canEdit() {
      return hasCapability('workspace.edit');
    },
    get canSave() {
      return hasCapability('workspace.save');
    },
    requireRead,
    requireEdit,
    requireSave
  });
}

export function createWebPlatformCapabilities(
  access: WebWorkspaceAccess
): Readonly<PlatformCapabilities> {
  return Object.freeze({
    get readProject() {
      return access.capabilityReport.workspaceReady && access.canRead;
    },
    get writeProject() {
      return access.capabilityReport.workspaceReady && access.canSave;
    },
    get importRecords() {
      return access.capabilityReport.workspaceReady && access.canEdit;
    },
    get exportFiles() {
      return access.capabilityReport.portableBackupAvailable && access.canRead;
    },
    get sqliteStorage() {
      return access.capabilityReport.workspaceReady && access.canRead;
    },
    get backups() {
      return access.capabilityReport.workspaceReady && access.canSave;
    },
    get diagnostics() {
      return access.capabilityReport.workspaceReady && access.canRead;
    },
    speciesReference: true,
    externalLinks: true,
    nativeWindow: false,
    get readOnly() {
      return !access.capabilityReport.workspaceReady || !access.canEdit;
    },
    get externalBackupImport() {
      return access.capabilityReport.portableBackupAvailable && access.canSave;
    },
    get directoryMirror() {
      return access.capabilityReport.directoryMirrorAvailable && access.canSave;
    }
  });
}

export function createWebPlatformContext(
  access: WebWorkspaceAccess
): Readonly<WebPlatformContext> {
  return Object.freeze({
    capabilityReport: access.capabilityReport,
    get managementAccess() {
      return access.managementAccess;
    }
  });
}
