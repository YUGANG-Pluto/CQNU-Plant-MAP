import {
  assessWebRuntimeCapabilities,
  webRuntimeUnavailableMessage
} from './webCapabilities';
import { createDynamicWebWorkspaceAccess } from './webWorkspacePermissions';
import type { WebWorkspaceAccess } from './webWorkspacePermissions';

export {
  createWebPlatformCapabilities,
  createWebPlatformContext
} from './webWorkspacePermissions';
export type { WebWorkspaceAccess } from './webWorkspacePermissions';

export function createWebWorkspaceAccess(): WebWorkspaceAccess {
  const capabilityReport = Object.freeze(assessWebRuntimeCapabilities());
  return createDynamicWebWorkspaceAccess({
    capabilityReport,
    getManagementAccess: () => document.documentElement.dataset.workspaceSession === 'active'
      ? window.managementAccess
      : undefined,
    isAccessRequired: () => document.body?.dataset.siteWorkspace === 'true',
    runtimeUnavailableMessage: webRuntimeUnavailableMessage(capabilityReport)
  });
}
