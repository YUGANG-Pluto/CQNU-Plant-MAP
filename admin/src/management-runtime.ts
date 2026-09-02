import type { AccountStore } from './account-contracts.js';
import { ManagementAccountService } from './account-service.js';
import { CloudProjectService } from './cloud-project-service.js';
import { D1CloudProjectStore, ensureCloudProjectSchema } from './cloud-project-store.js';
import type { AdminAuditEvent, AuditSink, SessionStore } from './contracts.js';
import {
  D1ManagementStore,
  ensureManagementSchema,
  type D1DatabaseLike
} from './d1-store.js';
import { AuthKeyRing, parseAuthKeyRingConfig } from './keyring.js';
import { PBKDF2_EDGE_ITERATIONS, Pbkdf2PasswordHasher } from './password.js';
import { AdminSessionManager, defaultAdminSessionRuntime } from './session.js';

export interface ManagementAuditReader {
  listAuditEvents(limit?: number): Promise<AdminAuditEvent[]>;
}

export interface ManagementRequestRuntime {
  accounts: ManagementAccountService;
  accountStore: AccountStore;
  sessions: AdminSessionManager;
  audit: AuditSink & ManagementAuditReader;
  cloudProjects?: CloudProjectService;
}

export interface ManagementWorkerEnvironment {
  DB?: D1DatabaseLike;
  CQNU_MANAGEMENT_AUTH_KEYRING?: string;
  CQNU_BOOTSTRAP_ADMIN_USERNAME?: string;
  CQNU_BOOTSTRAP_ADMIN_PASSWORD?: string;
  CQNU_BOOTSTRAP_USER_USERNAME?: string;
  CQNU_BOOTSTRAP_USER_PASSWORD?: string;
}

const productionRuntimes = new WeakMap<object, Promise<ManagementRequestRuntime>>();

export async function productionManagementRuntime(
  env: ManagementWorkerEnvironment
): Promise<ManagementRequestRuntime> {
  if (!env.DB || !env.CQNU_MANAGEMENT_AUTH_KEYRING) {
    throw new Error('MANAGEMENT_SERVICE_UNAVAILABLE');
  }
  const existing = productionRuntimes.get(env.DB as object);
  if (existing) return existing;

  const initializing = (async () => {
    const keyRing = new AuthKeyRing(parseAuthKeyRingConfig(env.CQNU_MANAGEMENT_AUTH_KEYRING || ''));
    await ensureManagementSchema(env.DB as D1DatabaseLike);
    await ensureCloudProjectSchema(env.DB as D1DatabaseLike);
    const store = new D1ManagementStore(env.DB as D1DatabaseLike);
    const sessions = new AdminSessionManager(store as SessionStore, {
      runtime: defaultAdminSessionRuntime(keyRing)
    });
    const accounts = new ManagementAccountService({
      store,
      sessions,
      passwordHasher: new Pbkdf2PasswordHasher(keyRing, PBKDF2_EDGE_ITERATIONS),
      keyRing
    });
    if (!(await store.listAccounts()).length) {
      if (!env.CQNU_BOOTSTRAP_ADMIN_PASSWORD || !env.CQNU_BOOTSTRAP_USER_PASSWORD) {
        throw new Error('MANAGEMENT_SERVICE_UNAVAILABLE');
      }
      await accounts.ensureBootstrapAccounts({
        administrator: {
          username: env.CQNU_BOOTSTRAP_ADMIN_USERNAME || 'admin',
          password: env.CQNU_BOOTSTRAP_ADMIN_PASSWORD,
          displayName: 'Administrator',
          accountKind: 'admin',
          accessLevel: 'save'
        },
        user: {
          username: env.CQNU_BOOTSTRAP_USER_USERNAME || 'user',
          password: env.CQNU_BOOTSTRAP_USER_PASSWORD,
          displayName: 'Research user',
          accountKind: 'user',
          accessLevel: 'read'
        }
      });
    }
    return {
      accounts,
      accountStore: store,
      sessions,
      audit: store,
      cloudProjects: new CloudProjectService(new D1CloudProjectStore(env.DB as D1DatabaseLike))
    };
  })();

  productionRuntimes.set(env.DB as object, initializing);
  try {
    return await initializing;
  } catch (error) {
    productionRuntimes.delete(env.DB as object);
    throw error;
  }
}
