import { useState } from 'preact/hooks';
import type {
  CloudProjectMetadata,
  CloudProjectRevisionMetadata,
  CloudProjectSnapshot,
  SiteCloudProjectClient
} from '../../../shared/types/cloud-projects';
import { compareCloudProjectSnapshots } from './cloudProjectDiff';
import type {
  CloudProjectRevisionComparisonState,
  CloudProjectStatusTone,
  CloudProjectText
} from './cloudProjectLibraryTypes';

interface CloudProjectHistoryOptions {
  client: SiteCloudProjectClient | undefined;
  text: CloudProjectText;
  getLocalSnapshot(): CloudProjectSnapshot | null;
  setBusyId(value: string): void;
  setStatus(value: string): void;
  setTone(value: CloudProjectStatusTone): void;
}

export function useCloudProjectHistory(options: CloudProjectHistoryOptions) {
  const { client, text } = options;
  const [historyProjectId, setHistoryProjectId] = useState('');
  const [revisions, setRevisions] = useState<CloudProjectRevisionMetadata[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyComparison, setHistoryComparison] = useState<CloudProjectRevisionComparisonState | null>(null);

  async function refreshRevisions(projectId: string): Promise<CloudProjectRevisionMetadata[]> {
    if (!client) return [];
    const nextRevisions = await client.revisions(projectId);
    if (historyProjectId === projectId) setRevisions(nextRevisions);
    return nextRevisions;
  }

  function refreshOpenHistory(projectId: string): Promise<CloudProjectRevisionMetadata[]> | Promise<void> {
    return historyProjectId === projectId ? refreshRevisions(projectId) : Promise.resolve();
  }

  async function toggleHistory(project: CloudProjectMetadata): Promise<void> {
    if (!client) return;
    if (historyProjectId === project.id) {
      setHistoryProjectId('');
      setRevisions([]);
      setHistoryComparison(null);
      return;
    }
    setHistoryProjectId(project.id);
    setRevisions([]);
    setHistoryComparison(null);
    setHistoryLoading(true);
    try {
      setRevisions(await client.revisions(project.id));
    } catch (error) {
      options.setTone('error');
      options.setStatus(
        error instanceof Error ? error.message : text('cloudProjectHistoryFailed', '版本历史读取失败。')
      );
    } finally {
      setHistoryLoading(false);
    }
  }

  async function compareRevision(project: CloudProjectMetadata, revision: CloudProjectRevisionMetadata): Promise<void> {
    if (!client) return;
    const localSnapshot = options.getLocalSnapshot();
    if (!localSnapshot) {
      options.setTone('error');
      options.setStatus(
        text('cloudProjectRevisionCompareRequiresLocal', '请先打开一个本地或云端项目，再比较历史版本。')
      );
      return;
    }
    const busyId = `${project.id}:compare-revision:${revision.revision}`;
    setHistoryComparison({
      projectId: project.id,
      revision: revision.revision,
      diff: null,
      loading: true
    });
    options.setBusyId(busyId);
    options.setTone('busy');
    options.setStatus(
      text('cloudProjectRevisionComparing', `正在读取并比较云端版本 v${revision.revision}…`).replace(
        '{revision}',
        String(revision.revision)
      )
    );
    try {
      const document = await client.readRevision(project.id, revision.revision);
      if (document.metadata.revision !== revision.revision) throw new Error('CLOUD_PROJECT_REVISION_INVALID');
      const diff = compareCloudProjectSnapshots(localSnapshot, document.snapshot);
      setHistoryComparison({
        projectId: project.id,
        revision: revision.revision,
        diff,
        loading: false
      });
      options.setTone('neutral');
      options.setStatus(
        diff.changed
          ? text('cloudProjectRevisionCompared', '历史版本比较完成；未修改本地或云端数据。')
          : text('cloudProjectRevisionMatchesLocal', '该历史版本与当前本地记录一致。')
      );
    } catch (error) {
      setHistoryComparison((current) =>
        current?.projectId === project.id && current.revision === revision.revision
          ? { ...current, loading: false }
          : current
      );
      options.setTone('error');
      options.setStatus(
        error instanceof Error ? error.message : text('cloudProjectRevisionCompareFailed', '历史版本无法读取或比较。')
      );
    } finally {
      options.setBusyId('');
    }
  }

  function clearHistory(projectId?: string): void {
    if (projectId && historyProjectId !== projectId) return;
    setHistoryProjectId('');
    setRevisions([]);
    setHistoryComparison(null);
  }

  return {
    historyProjectId,
    revisions,
    historyLoading,
    historyComparison,
    setRevisions,
    refreshOpenHistory,
    toggleHistory,
    compareRevision,
    clearHistory,
    clearHistoryComparison: () => setHistoryComparison(null)
  };
}
