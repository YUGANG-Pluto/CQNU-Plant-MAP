const test = require('node:test');
const assert = require('node:assert/strict');

const workspaceAccessModule = import('../../src/renderer-modern/platform/web/webWorkspacePermissions.ts');

const readyCapabilityReport = Object.freeze({
  mode: 'full',
  workspaceReady: true,
  directoryMirrorAvailable: true,
  portableBackupAvailable: true,
  missingRequired: [],
  items: []
});

test('web workspace permissions and platform capabilities follow session installation and revocation', async () => {
  let managementAccess;

  const {
    createDynamicWebWorkspaceAccess,
    createWebPlatformCapabilities,
    createWebPlatformContext
  } = await workspaceAccessModule;
  const access = createDynamicWebWorkspaceAccess({
    capabilityReport: readyCapabilityReport,
    getManagementAccess: () => managementAccess,
    isAccessRequired: () => true,
    runtimeUnavailableMessage: 'Web runtime unavailable.'
  });
  const capabilities = createWebPlatformCapabilities(access);
  const context = createWebPlatformContext(access);

  assert.equal(access.canRead, false);
  assert.equal(capabilities.readProject, false);
  assert.equal(capabilities.writeProject, false);
  assert.equal(capabilities.readOnly, true);
  assert.equal(context.managementAccess, undefined);
  assert.throws(() => access.requireRead(), /没有读取工作区的权限/);

  managementAccess = Object.freeze({
    accountId: 'acct-late-session',
    username: 'late-session',
    displayName: 'Late session',
    accountKind: 'admin',
    accessLevel: 'save',
    capabilities: Object.freeze(['workspace.read', 'workspace.edit', 'workspace.save']),
    absoluteExpiresAt: new Date(Date.now() + 60_000).toISOString()
  });

  assert.equal(access.canRead, true);
  assert.equal(access.canEdit, true);
  assert.equal(access.canSave, true);
  assert.equal(capabilities.readProject, true);
  assert.equal(capabilities.writeProject, true);
  assert.equal(capabilities.readOnly, false);
  assert.equal(context.managementAccess?.accountId, 'acct-late-session');
  assert.doesNotThrow(() => access.requireSave());

  managementAccess = undefined;
  assert.equal(access.canRead, false);
  assert.equal(capabilities.writeProject, false);
  assert.equal(capabilities.readOnly, true);
  assert.throws(() => access.requireRead(), /没有读取工作区的权限/);
});
