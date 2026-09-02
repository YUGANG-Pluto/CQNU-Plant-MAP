import type {
  CloudProjectMetadata,
  CloudProjectRevisionMetadata,
  CloudProjectSnapshot,
  CloudProjectUsage,
  SiteCloudProjectClient
} from '../../../shared/types/cloud-projects';

export const EMPTY_CLOUD_PROJECT_USAGE: CloudProjectUsage = Object.freeze({
  projectCount: 0,
  maxProjects: 25,
  currentBytes: 0,
  versionBytes: 0,
  maxSnapshotBytes: 8 * 1024 * 1024,
  updatedAt: null
});

export interface CloudProjectLibraryState {
  projects: CloudProjectMetadata[];
  usage: CloudProjectUsage;
  revisions: CloudProjectRevisionMetadata[] | null;
}

export interface CloudProjectUploadInspection {
  snapshot: CloudProjectSnapshot;
  byteSize: number;
  contentSha256: string;
  exceedsLimit: boolean;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function records(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)
    || value.some(item => !item || typeof item !== 'object' || Array.isArray(item))) {
    throw new Error('当前项目记录结构无效，未发起上传。');
  }
  return value as Record<string, unknown>[];
}

function normalizedSnapshot(snapshot: CloudProjectSnapshot): CloudProjectSnapshot {
  return {
    formatVersion: 1,
    settings: record(snapshot.settings),
    zones: records(snapshot.zones),
    points: records(snapshot.points)
  };
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)]
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function formatCloudProjectBytes(value: number): string {
  if (!value) return '0 B';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KiB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MiB`;
}

export function formatCloudProjectDate(value: string, locale = 'zh-CN'): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat(locale, {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    }).format(date)
    : '—';
}

export function cloudProjectErrorCode(error: unknown): string {
  if (!error || typeof error !== 'object' || !('code' in error)) return '';
  return typeof error.code === 'string' ? error.code : '';
}

export function isCloudProjectConflict(error: unknown): boolean {
  return cloudProjectErrorCode(error) === 'CLOUD_PROJECT_CONFLICT';
}

export async function inspectCloudProjectUpload(
  source: CloudProjectSnapshot,
  maxSnapshotBytes: number
): Promise<CloudProjectUploadInspection> {
  const snapshot = normalizedSnapshot(source);
  const serialized = JSON.stringify(snapshot);
  const byteSize = new TextEncoder().encode(serialized).byteLength;
  const contentSha256 = await sha256Hex(serialized);
  return Object.freeze({
    snapshot,
    byteSize,
    contentSha256,
    exceedsLimit: maxSnapshotBytes > 0 && byteSize > maxSnapshotBytes
  });
}

export async function readCloudProjectLibraryState(
  client: SiteCloudProjectClient,
  historyProjectId = ''
): Promise<CloudProjectLibraryState> {
  const [projects, usage, revisions] = await Promise.all([
    client.list(),
    client.usage(),
    historyProjectId ? client.revisions(historyProjectId) : Promise.resolve(null)
  ]);
  return { projects, usage: usage || EMPTY_CLOUD_PROJECT_USAGE, revisions };
}
