import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import type {
  CloudProjectDocument,
  CloudProjectMetadata,
  CloudProjectRevisionMetadata,
  CloudProjectSnapshot,
  CloudProjectUsage,
  ProjectRendererBridge,
  SiteCloudProjectClient
} from '../../../shared/types/cloud-projects';
import { compareCloudProjectSnapshots } from './cloudProjectDiff';
import {
  EMPTY_CLOUD_PROJECT_USAGE,
  formatCloudProjectBytes,
  inspectCloudProjectUpload,
  isCloudProjectConflict,
  readCloudProjectLibraryState
} from './cloudProjectLibraryModel';
import type {
  CloudProjectConflictOperation,
  CloudProjectConflictState,
  CloudProjectLibraryController,
  CloudProjectStatusTone,
  CloudProjectText
} from './cloudProjectLibraryTypes';
import { useCloudProjectHistory } from './useCloudProjectHistory';
import { useProjectSession } from './useProjectSession';

declare global {
  interface Window {
    projectRendererBridge?: ProjectRendererBridge;
    openConfirmDialog?(input: {
      title?: string;
      message?: string;
      acceptLabel?: string;
      cancelLabel?: string;
    }): Promise<boolean>;
  }
}

function activeCloudId(projectDir: string, explicitId: string): string {
  if (explicitId) return explicitId;
  const prefix = 'web://project/cloud-';
  if (!projectDir.startsWith(prefix)) return '';
  try {
    return decodeURIComponent(projectDir.slice(prefix.length));
  } catch {
    return '';
  }
}

function closeProjectLayers(): void {
  window.cqnuLayerManager?.close(document.getElementById('cloudProjectLibraryModal'));
  window.cqnuLayerManager?.close(document.getElementById('projectImportModal'));
}

export function useCloudProjectLibraryController(
  client: SiteCloudProjectClient | undefined,
  canSave: boolean,
  text: CloudProjectText
): CloudProjectLibraryController {
  const session = useProjectSession();
  const [projects, setProjects] = useState<CloudProjectMetadata[]>([]);
  const [usage, setUsage] = useState<CloudProjectUsage>(EMPTY_CLOUD_PROJECT_USAGE);
  const [renameId, setRenameId] = useState('');
  const [renameValue, setRenameValue] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState('');
  const [tone, setTone] = useState<CloudProjectStatusTone>('neutral');
  const [busyId, setBusyId] = useState('');
  const [loading, setLoading] = useState(false);
  const [conflict, setConflict] = useState<CloudProjectConflictState | null>(null);
  const currentSnapshot = window.projectRendererBridge?.snapshot() || null;
  const activeCloudProjectId = activeCloudId(session.projectDir, session.cloudProjectId);
  const {
    historyProjectId,
    revisions,
    historyLoading,
    historyComparison,
    setRevisions,
    refreshOpenHistory,
    toggleHistory,
    compareRevision,
    clearHistory,
    clearHistoryComparison
  } = useCloudProjectHistory({
    client,
    text,
    getLocalSnapshot: () => window.projectRendererBridge?.snapshot() || null,
    setBusyId,
    setStatus,
    setTone
  });

  const refresh = useCallback(async () => {
    if (!client) return;
    setLoading(true);
    setTone('busy');
    setStatus(text('cloudProjectLoading', '正在读取云项目列表…'));
    try {
      const next = await readCloudProjectLibraryState(client, historyProjectId);
      setProjects(next.projects);
      setUsage(next.usage);
      if (next.revisions) setRevisions(next.revisions);
      setTone('neutral');
      setStatus(next.projects.length
        ? text('cloudProjectReady', '云项目已更新。')
        : text('cloudProjectEmpty', '当前账户还没有云项目。'));
    } catch (error) {
      setTone('error');
      setStatus(error instanceof Error ? error.message : text('cloudProjectLoadFailed', '云项目列表读取失败。'));
    } finally {
      setLoading(false);
    }
  }, [client, historyProjectId, text]);

  useEffect(() => {
    const onOpen = () => { void refresh(); };
    window.addEventListener('cqnu:cloud-projects-open', onOpen);
    return () => window.removeEventListener('cqnu:cloud-projects-open', onOpen);
  }, [refresh]);

  const sortedProjects = useMemo(
    () => [...projects].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    [projects]
  );

  function replaceProject(updated: CloudProjectMetadata): void {
    setProjects(current => current.map(item => item.id === updated.id ? updated : item));
  }

  async function refreshUsage(): Promise<void> {
    if (!client) return;
    try {
      setUsage(await client.usage());
    } catch {
      // A supplemental quota read must not roll back a successful project operation.
    }
  }

  async function recoverFromConflict(
    error: unknown,
    project: CloudProjectMetadata,
    operation: CloudProjectConflictOperation,
    localSnapshot: CloudProjectSnapshot | null
  ): Promise<boolean> {
    if (!client || !isCloudProjectConflict(error)) return false;
    let latestProject = project;
    try {
      const next = await readCloudProjectLibraryState(client, historyProjectId === project.id ? project.id : '');
      setProjects(next.projects);
      setUsage(next.usage);
      if (next.revisions) setRevisions(next.revisions);
      latestProject = next.projects.find(item => item.id === project.id) || project;
      setStatus(text(
        'cloudProjectConflictRefreshed',
        '云项目已有更新，本次操作未执行。已刷新远端版本，请比较后选择如何处理。'
      ));
    } catch {
      setStatus(text(
        'cloudProjectConflictRefreshFailed',
        '云项目已有更新，本次操作未执行；远端状态刷新失败，请手动刷新后再试。'
      ));
    }
    setConflict({
      project: latestProject,
      operation,
      localSnapshot,
      remoteDocument: null,
      diff: null,
      loading: false
    });
    setTone('error');
    return true;
  }

  async function createProject(event: Event): Promise<void> {
    event.preventDefault();
    const nextName = name.trim();
    if (!client || !nextName || !canSave) return;
    setBusyId('create');
    setTone('busy');
    setStatus(text('cloudProjectCreating', '正在创建云项目…'));
    try {
      const created = await client.create(nextName);
      setProjects(current => [created, ...current]);
      setName('');
      await refreshUsage();
      setTone('success');
      setStatus(text('cloudProjectCreated', '云项目已创建，可上传当前记录或打开空工作副本。'));
    } catch (error) {
      setTone('error');
      setStatus(error instanceof Error ? error.message : text('cloudProjectCreateFailed', '云项目创建失败。'));
    } finally {
      setBusyId('');
    }
  }

  async function uploadCurrent(project: CloudProjectMetadata): Promise<void> {
    const snapshot = window.projectRendererBridge?.snapshot() || null;
    if (!client || !snapshot || !canSave) return;
    setBusyId(project.id);
    setTone('busy');
    setStatus(text('cloudProjectUploading', '正在上传当前项目记录…'));
    try {
      const inspected = await inspectCloudProjectUpload(snapshot, usage.maxSnapshotBytes);
      if (inspected.exceedsLimit) {
        setTone('error');
        setStatus(text(
          'cloudProjectUploadTooLarge',
          `当前项目快照为 ${formatCloudProjectBytes(inspected.byteSize)}，超过单版本上限 ${formatCloudProjectBytes(usage.maxSnapshotBytes)}，未发起上传。`
        )
          .replace('{size}', formatCloudProjectBytes(inspected.byteSize))
          .replace('{limit}', formatCloudProjectBytes(usage.maxSnapshotBytes)));
        return;
      }
      const updated = await client.save(project.id, project.revision, inspected.snapshot);
      const unchanged = updated.revision === project.revision
        && updated.contentSha256 === inspected.contentSha256;
      replaceProject(updated);
      if (activeCloudProjectId === project.id && !session.dirty) {
        try {
          await window.projectRendererBridge?.updateCloudSource(updated);
        } catch {
          // The remote save is authoritative even if the local source marker cannot be refreshed.
        }
      }
      await Promise.all([refreshUsage(), refreshOpenHistory(updated.id)]);
      setTone(unchanged ? 'neutral' : 'success');
      setStatus(unchanged
        ? text(
          'cloudProjectUploadUnchanged',
          `当前记录与云端 v${project.revision} 内容一致，未创建重复版本。`
        ).replace('{revision}', String(project.revision))
        : text('cloudProjectUploaded', '当前记录已保存为新的云端版本。'));
    } catch (error) {
      if (!await recoverFromConflict(error, project, 'upload', snapshot)) {
        setTone('error');
        setStatus(error instanceof Error ? error.message : text('cloudProjectUploadFailed', '云项目上传失败。'));
      }
    } finally {
      setBusyId('');
    }
  }

  function beginRename(project: CloudProjectMetadata): void {
    setRenameId(project.id);
    setRenameValue(project.name);
  }

  function cancelRename(): void {
    setRenameId('');
    setRenameValue('');
  }

  async function renameProject(event: Event, project: CloudProjectMetadata): Promise<void> {
    event.preventDefault();
    const nextName = renameValue.trim();
    if (!client || !nextName || nextName === project.name || !canSave) {
      cancelRename();
      return;
    }
    setBusyId(`${project.id}:rename`);
    setTone('busy');
    setStatus(text('cloudProjectRenaming', '正在重命名云项目…'));
    try {
      const updated = await client.rename(project.id, project.revision, nextName);
      replaceProject(updated);
      cancelRename();
      setTone('success');
      setStatus(text('cloudProjectRenamed', '云项目名称已更新。'));
    } catch (error) {
      if (!await recoverFromConflict(error, project, 'rename', currentSnapshot)) {
        setTone('error');
        setStatus(error instanceof Error ? error.message : text('cloudProjectRenameFailed', '云项目重命名失败。'));
      }
    } finally {
      setBusyId('');
    }
  }

  async function restoreRevision(
    project: CloudProjectMetadata,
    revision: CloudProjectRevisionMetadata
  ): Promise<void> {
    if (!client || !canSave || revision.revision === project.revision) return;
    const proceed = await window.openConfirmDialog?.({
      title: text('cloudProjectRestoreTitle', '恢复历史版本'),
      message: text(
        'cloudProjectRestoreConfirm',
        `将版本 v${revision.revision} 恢复为新的云端版本，现有版本历史不会被覆盖。是否继续？`
      ).replace('{revision}', String(revision.revision)),
      acceptLabel: text('cloudProjectRestore', '恢复为新版本'),
      cancelLabel: text('cancelAction', '取消')
    });
    if (!proceed) return;
    setBusyId(`${project.id}:restore:${revision.revision}`);
    setTone('busy');
    setStatus(text('cloudProjectRestoring', '正在校验并恢复历史版本…'));
    try {
      const updated = await client.restore(project.id, revision.revision, project.revision);
      replaceProject(updated);
      await Promise.all([refreshUsage(), refreshOpenHistory(updated.id)]);
      setTone('success');
      setStatus(text('cloudProjectRestored', '历史记录已恢复为新的云端版本。'));
    } catch (error) {
      if (!await recoverFromConflict(error, project, 'restore', currentSnapshot)) {
        setTone('error');
        setStatus(error instanceof Error ? error.message : text('cloudProjectRestoreFailed', '历史版本恢复失败。'));
      }
    } finally {
      setBusyId('');
    }
  }

  async function deleteProject(project: CloudProjectMetadata): Promise<void> {
    if (!client || !canSave || !window.openConfirmDialog) return;
    const firstConfirmation = await window.openConfirmDialog({
      title: text('cloudProjectDeleteTitle', '删除云项目'),
      message: text(
        'cloudProjectDeleteConfirm',
        '删除后，该云项目及其全部历史版本将永久移除。当前浏览器中已打开的本地工作副本不会被删除。'
      ),
      acceptLabel: text('cloudProjectDeleteContinue', '继续删除'),
      cancelLabel: text('cancelAction', '取消')
    });
    if (!firstConfirmation) return;
    const finalConfirmation = await window.openConfirmDialog({
      title: text('cloudProjectDeleteFinalTitle', '再次确认删除'),
      message: text('cloudProjectDeleteFinalConfirm', `确定永久删除“${project.name}”及全部版本吗？`)
        .replace('{name}', project.name),
      acceptLabel: text('cloudProjectDelete', '永久删除'),
      cancelLabel: text('cancelAction', '取消')
    });
    if (!finalConfirmation) return;
    setBusyId(`${project.id}:delete`);
    setTone('busy');
    setStatus(text('cloudProjectDeleting', '正在删除云项目及其版本历史…'));
    try {
      await client.remove(project.id, project.revision);
      setProjects(current => current.filter(item => item.id !== project.id));
      clearHistory(project.id);
      await refreshUsage();
      setTone('success');
      setStatus(text('cloudProjectDeleted', '云项目及其版本历史已删除；本地工作副本保持不变。'));
    } catch (error) {
      if (!await recoverFromConflict(error, project, 'delete', currentSnapshot)) {
        setTone('error');
        setStatus(error instanceof Error ? error.message : text('cloudProjectDeleteFailed', '云项目删除失败。'));
      }
    } finally {
      setBusyId('');
    }
  }

  async function importProject(document: CloudProjectDocument): Promise<void> {
    const bridge = window.projectRendererBridge;
    if (!bridge) throw new Error(text('cloudProjectBridgeUnavailable', '项目工作区尚未准备完成，请稍后重试。'));
    await bridge.importCloudProject(document);
    replaceProject(document.metadata);
    setConflict(null);
    clearHistoryComparison();
    setTone('success');
    setStatus(text('cloudProjectOpened', '云项目已载入浏览器本地工作副本。'));
    closeProjectLayers();
  }

  async function openProject(project: CloudProjectMetadata): Promise<void> {
    if (!client) return;
    if (!window.projectRendererBridge) {
      setTone('error');
      setStatus(text('cloudProjectBridgeUnavailable', '项目工作区尚未准备完成，请稍后重试。'));
      return;
    }
    if (session.dirty) {
      const proceed = await window.openConfirmDialog?.({
        title: text('cloudProjectSwitchTitle', '切换到云项目'),
        message: text('cloudProjectSwitchDirty', '当前项目有未保存修改。继续将放弃这些修改，是否切换？'),
        acceptLabel: text('cloudProjectSwitchConfirm', '继续切换'),
        cancelLabel: text('cancelAction', '取消')
      });
      if (!proceed) return;
    }
    setBusyId(project.id);
    setTone('busy');
    setStatus(text('cloudProjectOpening', '正在校验并建立本地工作副本…'));
    try {
      await importProject(await client.read(project.id));
    } catch (error) {
      setTone('error');
      setStatus(error instanceof Error ? error.message : text('cloudProjectOpenFailed', '云项目无法打开。'));
    } finally {
      setBusyId('');
    }
  }

  async function compareConflict(): Promise<void> {
    if (!client || !conflict) return;
    setConflict(current => current ? { ...current, loading: true } : null);
    setBusyId(`${conflict.project.id}:compare`);
    setTone('busy');
    setStatus(text('cloudProjectConflictComparing', '正在读取并比较云端最新版本…'));
    try {
      const remoteDocument = await client.read(conflict.project.id);
      const diff = compareCloudProjectSnapshots(conflict.localSnapshot, remoteDocument.snapshot);
      setConflict(current => current?.project.id === conflict.project.id
        ? { ...current, project: remoteDocument.metadata, remoteDocument, diff, loading: false }
        : current);
      replaceProject(remoteDocument.metadata);
      setTone('neutral');
      setStatus(diff.changed
        ? text('cloudProjectConflictCompared', '差异比较完成；未修改本地或云端数据。')
        : text('cloudProjectConflictNoContentChange', '记录内容一致，冲突仅来自版本状态变化。'));
    } catch (error) {
      setConflict(current => current ? { ...current, loading: false } : null);
      setTone('error');
      setStatus(error instanceof Error ? error.message : text('cloudProjectConflictCompareFailed', '无法读取云端最新版本进行比较。'));
    } finally {
      setBusyId('');
    }
  }

  function keepLocalConflict(): void {
    setConflict(null);
    setTone('neutral');
    setStatus(text('cloudProjectConflictKeepLocalDone', '已保留当前本地副本，未修改云端数据。'));
  }

  async function openLatestConflict(createBackup: boolean): Promise<void> {
    if (!client || !conflict || !window.projectRendererBridge) return;
    if (!conflict.diff || !conflict.remoteDocument) {
      setTone('error');
      setStatus(text('cloudProjectConflictCompareRequired', '请先比较云端最新版本，再选择是否切换。'));
      return;
    }
    if (!createBackup) {
      const proceed = await window.openConfirmDialog?.({
        title: text('cloudProjectConflictOpenLatestTitle', '打开云端最新版本'),
        message: text(
          'cloudProjectConflictOpenLatestConfirm',
          '这会用云端最新版本替换当前浏览器工作副本；未另行备份的本地差异将无法从当前副本恢复。是否继续？'
        ),
        acceptLabel: text('cloudProjectConflictOpenLatest', '打开最新版本'),
        cancelLabel: text('cancelAction', '取消')
      });
      if (!proceed) return;
    }
    setBusyId(`${conflict.project.id}:${createBackup ? 'backup-open' : 'open-latest'}`);
    setTone('busy');
    setStatus(text(
      createBackup ? 'cloudProjectConflictBackingUp' : 'cloudProjectOpening',
      createBackup ? '正在保存本地副本、下载备份并读取云端最新版本…' : '正在读取云端最新版本…'
    ));
    try {
      const remoteDocument = await client.read(conflict.project.id);
      if (remoteDocument.metadata.revision !== conflict.remoteDocument.metadata.revision
        || remoteDocument.metadata.contentSha256 !== conflict.remoteDocument.metadata.contentSha256) {
        setConflict(current => current ? {
          ...current,
          project: remoteDocument.metadata,
          remoteDocument,
          diff: compareCloudProjectSnapshots(current.localSnapshot, remoteDocument.snapshot),
          loading: false
        } : null);
        replaceProject(remoteDocument.metadata);
        setTone('error');
        setStatus(text(
          'cloudProjectConflictChangedAgain',
          '云端版本在比较后再次更新。已刷新差异，请复核后重新选择；本地副本未被覆盖。'
        ));
        return;
      }
      let backupFile = '';
      if (createBackup) {
        const backup = await window.projectRendererBridge.backupCurrentProject('cloud_conflict');
        backupFile = backup.filePath;
      }
      await importProject(remoteDocument);
      if (backupFile) {
        setStatus(text(
          'cloudProjectConflictBackupOpened',
          '本地副本备份已下载，云端最新版本已打开。'
        ).replace('{file}', backupFile));
      }
    } catch (error) {
      setTone('error');
      setStatus(error instanceof Error ? error.message : text('cloudProjectConflictOpenFailed', '无法完成冲突处理，当前副本未被自动覆盖。'));
    } finally {
      setBusyId('');
    }
  }

  return {
    projects: sortedProjects,
    usage,
    historyProjectId,
    revisions,
    historyLoading,
    historyComparison,
    renameId,
    renameValue,
    name,
    status,
    tone,
    busyId,
    loading,
    currentSnapshot,
    activeCloudProjectId,
    conflict,
    canBackupConflict: canSave && session.loaded && typeof window.projectRendererBridge?.backupCurrentProject === 'function',
    setName,
    setRenameValue,
    refresh,
    createProject,
    uploadCurrent,
    beginRename,
    cancelRename,
    renameProject,
    toggleHistory,
    compareRevision,
    restoreRevision,
    deleteProject,
    openProject,
    compareConflict,
    keepLocalConflict,
    openLatestConflict
  };
}
