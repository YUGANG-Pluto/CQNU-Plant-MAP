import type {
  CredentialTokenPurpose,
  PublicManagementAccount
} from './account-contracts.js';
import type {
  ConsumeCredentialTokenInput,
  CreateMemberInput,
  UpdateMemberInput
} from './account-service.js';
import type {
  AdminAuditEvent,
  AdminCapability,
  AdminSession
} from './contracts.js';

export interface ManagementSessionData {
  session: AdminSession;
  account: PublicManagementAccount;
  capabilities: AdminCapability[];
  csrfHeaderName: string;
  csrfToken?: string;
}

export interface ManagementMembersData {
  members: PublicManagementAccount[];
}

export interface ManagementAuditData {
  events: AdminAuditEvent[];
}

export interface ManagementCloudUsageAccount {
  accountId: string;
  username: string;
  displayName: string;
  accountKind: 'user' | 'admin';
  accessLevel: 'read' | 'edit' | 'save';
  projectCount: number;
  currentBytes: number;
  versionBytes: number;
  updatedAt: string | null;
}

export interface ManagementCloudUsageData {
  summary: {
    accountCount: number;
    projectCount: number;
    currentBytes: number;
    versionBytes: number;
    maxProjectsPerAccount: number;
    maxSnapshotBytes: number;
  };
  accounts: ManagementCloudUsageAccount[];
}

export interface ManagementAccountData {
  account: PublicManagementAccount;
}

export interface ManagementCredentialGrant {
  token: string;
  purpose: CredentialTokenPurpose;
  expiresAt: string;
  account: PublicManagementAccount;
}

export interface ManagementLoginInput {
  username: string;
  password: string;
}

export interface ManagementActivationInput {
  currentPassword: string;
  username: string;
  displayName?: string;
  password: string;
}

export interface ManagementUsernameChangeInput {
  username: string;
  currentPassword: string;
}

export interface ManagementPasswordChangeInput {
  currentPassword: string;
  password: string;
}

export interface ManagementApi {
  refreshSession(): Promise<ManagementSessionData>;
  login(username: string, password: string): Promise<ManagementSessionData>;
  heartbeat(): Promise<ManagementSessionData>;
  logout(): Promise<void>;
  activate(input: ManagementActivationInput): Promise<ManagementSessionData>;
  consumeCredentialToken(input: ConsumeCredentialTokenInput): Promise<ManagementSessionData>;
  changeUsername(input: ManagementUsernameChangeInput): Promise<ManagementSessionData>;
  changePassword(input: ManagementPasswordChangeInput): Promise<ManagementSessionData>;
  listMembers(): Promise<ManagementMembersData>;
  createMember(input: CreateMemberInput): Promise<ManagementCredentialGrant>;
  updateMember(memberId: string, input: UpdateMemberInput): Promise<ManagementAccountData>;
  resetMemberPassword(memberId: string): Promise<ManagementCredentialGrant>;
  listAuditEvents(limit?: number): Promise<ManagementAuditData>;
  getCloudUsage(): Promise<ManagementCloudUsageData>;
}
