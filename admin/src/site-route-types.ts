import type { PublicManagementAccount } from './account-contracts.js';
import type { AdminRouteContract } from './http-contract.js';
import type { ManagementRequestRuntime } from './management-runtime.js';
import type { AdminSessionAccess } from './session.js';
import type { SiteAuditContext } from './site-handler-support.js';

export interface PublicSiteRouteInput {
  runtime: ManagementRequestRuntime;
  route: AdminRouteContract;
  request: Request;
  sessionToken: string;
  audit: SiteAuditContext;
}

export interface AuthorizedSiteRouteInput extends PublicSiteRouteInput {
  path: string;
  url: URL;
  account: PublicManagementAccount;
  sessionAccess: AdminSessionAccess;
  headers: Record<string, string>;
}
