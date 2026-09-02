import type {
  CloudProjectDocument,
  CloudProjectMetadata,
  CloudProjectSourceMetadata
} from '../../../shared/types/cloud-projects';
import type { StoredWebProject } from './webDatabaseProtocol';

function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

export function cloudProjectSourceMetadata(
  metadata: CloudProjectMetadata
): CloudProjectSourceMetadata {
  const projectId = String(metadata.id || '').trim();
  if (!projectId || !/^[A-Za-z0-9_-]{1,80}$/u.test(projectId)) {
    throw new Error('云项目标识无效。');
  }
  return {
    projectId,
    revision: Math.max(0, Number(metadata.revision) || 0),
    contentSha256: String(metadata.contentSha256 || ''),
    syncedAt: new Date().toISOString()
  };
}

export function storedWebProjectFromCloud(document: CloudProjectDocument): StoredWebProject {
  const cloudSource = cloudProjectSourceMetadata(document.metadata);
  const snapshot = document.snapshot || { settings: {}, zones: [], points: [] };
  return {
    projectId: `cloud-${cloudSource.projectId}`,
    label: String(document.metadata.name || '').trim() || '云项目工作副本',
    modifiedAt: Date.parse(document.metadata.updatedAt) || Date.now(),
    sourceKind: 'cloud',
    cloudSource,
    settings: clone(snapshot.settings || {}),
    zones: clone(Array.isArray(snapshot.zones) ? snapshot.zones : []),
    points: clone(Array.isArray(snapshot.points) ? snapshot.points : [])
  };
}
