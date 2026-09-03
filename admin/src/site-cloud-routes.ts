import { handleCloudProjectHttp } from './cloud-project-http.js';
import { CLOUD_PROJECT_MAX_BYTES, CLOUD_PROJECT_MAX_PER_ACCOUNT } from './cloud-project-contracts.js';
import { appendAudit } from './site-handler-support.js';
import { jsonResponse } from './site-http-response.js';
import type { AuthorizedSiteRouteInput } from './site-route-types.js';

export async function handleCloudSiteRoute(input: AuthorizedSiteRouteInput): Promise<Response | null> {
  const { route, runtime, account, request, path, headers, audit } = input;
  if (!route.id.startsWith('cloud-projects.')) return null;
  if (!runtime.cloudProjects) throw new Error('CLOUD_PROJECT_STORAGE_UNAVAILABLE');

  if (route.id === 'cloud-projects.admin-usage') {
    const [accounts, storedUsage] = await Promise.all([
      runtime.accountStore.listAccounts(),
      runtime.cloudProjects.listUsage()
    ]);
    const usageByOwner = new Map(storedUsage.map((item) => [item.ownerId, item]));
    const accountUsage = accounts.map((member) => {
      const usage = usageByOwner.get(member.id);
      return {
        accountId: member.id,
        username: member.username,
        displayName: member.displayName,
        accountKind: member.accountKind,
        accessLevel: member.accessLevel,
        projectCount: usage?.projectCount || 0,
        currentBytes: usage?.currentBytes || 0,
        versionBytes: usage?.versionBytes || 0,
        updatedAt: usage?.updatedAt || null
      };
    });
    return jsonResponse(
      {
        ok: true,
        data: {
          summary: {
            accountCount: accountUsage.length,
            projectCount: accountUsage.reduce((sum, item) => sum + item.projectCount, 0),
            currentBytes: accountUsage.reduce((sum, item) => sum + item.currentBytes, 0),
            versionBytes: accountUsage.reduce((sum, item) => sum + item.versionBytes, 0),
            maxProjectsPerAccount: CLOUD_PROJECT_MAX_PER_ACCOUNT,
            maxSnapshotBytes: CLOUD_PROJECT_MAX_BYTES
          },
          accounts: accountUsage
        }
      },
      200,
      headers
    );
  }

  return handleCloudProjectHttp({
    route,
    path,
    request,
    ownerId: account.id,
    service: runtime.cloudProjects,
    headers,
    respond: jsonResponse,
    audit: (targetProjectId, statusCode) =>
      appendAudit(runtime, {
        principalId: account.id,
        route,
        outcome: 'allowed',
        requestId: audit.requestId,
        statusCode,
        targetProjectId
      })
  });
}
