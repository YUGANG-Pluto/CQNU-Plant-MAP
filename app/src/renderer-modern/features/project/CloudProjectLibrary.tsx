import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import {
  Cloud,
  CloudDownload,
  CloudUpload,
  Database,
  History,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
  ShieldCheck
} from 'lucide-preact';
import type {
  CloudProjectMetadata,
  CloudProjectRevisionMetadata,
  CloudProjectUsage,
  ProjectRendererBridge,
  SiteCloudProjectClient
} from '../../../shared/types/cloud-projects';
import { LayerModal } from '../../components/LayerModal';

declare global {
  interface Window {
    siteCloudProjects?: SiteCloudProjectClient;
    projectRendererBridge?: ProjectRendererBridge;
    openConfirmDialog?(input: {
      title?: string;
      message?: string;
      acceptLabel?: string;
      cancelLabel?: string;
    }): Promise<boolean>;
  }
}

function text(key: string, fallback: string): string {
  const translated = window.t?.(key);
  return translated && translated !== key ? translated : fallback;
}

function formatBytes(value: number): string {
  if (!value) return '0 B';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KiB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MiB`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat(document.documentElement.lang || 'zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    }).format(date)
    : '—';
}

const EMPTY_USAGE: CloudProjectUsage = Object.freeze({
  projectCount: 0,
  maxProjects: 25,
  currentBytes: 0,
  versionBytes: 0,
  maxSnapshotBytes: 8 * 1024 * 1024,
  updatedAt: null
});

export function openCloudProjectLibrary(): void {
  window.dispatchEvent(new CustomEvent('cqnu:cloud-projects-open'));
  const modal = document.getElementById('cloudProjectLibraryModal');
  if (modal) window.cqnuLayerManager?.open(modal, {
    focusTarget: document.getElementById('cloudProjectName')
      || modal.querySelector<HTMLElement>('[data-cloud-project-open]')
  });
}

export function CloudProjectLibrary() {
  const client = window.siteCloudProjects;
  const canSave = Boolean(window.managementAccess?.capabilities.includes('workspace.save'));
  const [projects, setProjects] = useState<CloudProjectMetadata[]>([]);
  const [usage, setUsage] = useState<CloudProjectUsage>(EMPTY_USAGE);
  const [historyProjectId, setHistoryProjectId] = useState('');
  const [revisions, setRevisions] = useState<CloudProjectRevisionMetadata[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [renameId, setRenameId] = useState('');
  const [renameValue, setRenameValue] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState('');
  const [tone, setTone] = useState<'neutral' | 'busy' | 'success' | 'error'>('neutral');
  const [busyId, setBusyId] = useState('');
  const [loading, setLoading] = useState(false);
  const currentSnapshot = window.projectRendererBridge?.snapshot() || null;

  const refresh = useCallback(async () => {
    if (!client) return;
    setLoading(true);
    setTone('busy');
    setStatus(text('cloudProjectLoading', '正在读取云项目列表…'));
    try {
      const [result, nextUsage] = await Promise.all([client.list(), client.usage()]);
      setProjects(result);
      setUsage(nextUsage || EMPTY_USAGE);
      setTone('neutral');
      setStatus(result.length
        ? text('cloudProjectReady', '云项目已更新。')
        : text('cloudProjectEmpty', '当前账户还没有云项目。'));
    } catch (error) {
      setTone('error');
      setStatus(error instanceof Error ? error.message : text('cloudProjectLoadFailed', '云项目列表读取失败。'));
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    const onOpen = () => { void refresh(); };
    window.addEventListener('cqnu:cloud-projects-open', onOpen);
    return () => window.removeEventListener('cqnu:cloud-projects-open', onOpen);
  }, [refresh]);

  const sortedProjects = useMemo(
    () => [...projects].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    [projects]
  );
  const historyProject = projects.find(project => project.id === historyProjectId) || null;

  if (!client) return null;

  function replaceProject(updated: CloudProjectMetadata) {
    setProjects(current => current.map(item => item.id === updated.id ? updated : item));
  }

  async function refreshUsage() {
    try {
      setUsage(await client!.usage());
    } catch {
      // The primary action remains successful if the supplemental usage read fails.
    }
  }

  async function refreshRevisions(projectId: string) {
    const nextRevisions = await client!.revisions(projectId);
    if (historyProjectId === projectId) setRevisions(nextRevisions);
    return nextRevisions;
  }

  function refreshOpenHistory(projectId: string): Promise<CloudProjectRevisionMetadata[]> | Promise<void> {
    return historyProjectId === projectId ? refreshRevisions(projectId) : Promise.resolve();
  }

  async function createProject(event: Event) {
    event.preventDefault();
    const nextName = name.trim();
    if (!nextName || !canSave) return;
    setBusyId('create');
    setTone('busy');
    setStatus(text('cloudProjectCreating', '正在创建云项目…'));
    try {
      const created = await client!.create(nextName);
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

  async function uploadCurrent(project: CloudProjectMetadata) {
    const snapshot = window.projectRendererBridge?.snapshot();
    if (!snapshot || !canSave) return;
    setBusyId(project.id);
    setTone('busy');
    setStatus(text('cloudProjectUploading', '正在上传当前项目记录…'));
    try {
      const updated = await client!.save(project.id, project.revision, snapshot);
      replaceProject(updated);
      await Promise.all([refreshUsage(), refreshOpenHistory(updated.id)]);
      setTone('success');
      setStatus(text('cloudProjectUploaded', '当前记录已保存为新的云端版本。'));
    } catch (error) {
      setTone('error');
      setStatus(error instanceof Error ? error.message : text('cloudProjectUploadFailed', '云项目上传失败。'));
    } finally {
      setBusyId('');
    }
  }

  function beginRename(project: CloudProjectMetadata) {
    setRenameId(project.id);
    setRenameValue(project.name);
  }

  function cancelRename() {
    setRenameId('');
    setRenameValue('');
  }

  async function renameProject(event: Event, project: CloudProjectMetadata) {
    event.preventDefault();
    const nextName = renameValue.trim();
    if (!nextName || nextName === project.name || !canSave) {
      cancelRename();
      return;
    }
    setBusyId(`${project.id}:rename`);
    setTone('busy');
    setStatus(text('cloudProjectRenaming', '正在重命名云项目…'));
    try {
      const updated = await client!.rename(project.id, project.revision, nextName);
      replaceProject(updated);
      cancelRename();
      setTone('success');
      setStatus(text('cloudProjectRenamed', '云项目名称已更新。'));
    } catch (error) {
      setTone('error');
      setStatus(error instanceof Error ? error.message : text('cloudProjectRenameFailed', '云项目重命名失败。'));
    } finally {
      setBusyId('');
    }
  }

  async function toggleHistory(project: CloudProjectMetadata) {
    if (historyProjectId === project.id) {
      setHistoryProjectId('');
      setRevisions([]);
      return;
    }
    setHistoryProjectId(project.id);
    setRevisions([]);
    setHistoryLoading(true);
    try {
      setRevisions(await client!.revisions(project.id));
    } catch (error) {
      setTone('error');
      setStatus(error instanceof Error ? error.message : text('cloudProjectHistoryFailed', '版本历史读取失败。'));
    } finally {
      setHistoryLoading(false);
    }
  }

  async function restoreRevision(project: CloudProjectMetadata, revision: CloudProjectRevisionMetadata) {
    if (!canSave || revision.revision === project.revision) return;
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
      const updated = await client!.restore(project.id, revision.revision, project.revision);
      replaceProject(updated);
      await Promise.all([refreshUsage(), refreshOpenHistory(updated.id)]);
      setTone('success');
      setStatus(text('cloudProjectRestored', '历史记录已恢复为新的云端版本。'));
    } catch (error) {
      setTone('error');
      setStatus(error instanceof Error ? error.message : text('cloudProjectRestoreFailed', '历史版本恢复失败。'));
    } finally {
      setBusyId('');
    }
  }

  async function deleteProject(project: CloudProjectMetadata) {
    if (!canSave || !window.openConfirmDialog) return;
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
      await client!.remove(project.id, project.revision);
      setProjects(current => current.filter(item => item.id !== project.id));
      if (historyProjectId === project.id) {
        setHistoryProjectId('');
        setRevisions([]);
      }
      await refreshUsage();
      setTone('success');
      setStatus(text('cloudProjectDeleted', '云项目及其版本历史已删除；本地工作副本保持不变。'));
    } catch (error) {
      setTone('error');
      setStatus(error instanceof Error ? error.message : text('cloudProjectDeleteFailed', '云项目删除失败。'));
    } finally {
      setBusyId('');
    }
  }

  async function openProject(project: CloudProjectMetadata) {
    const bridge = window.projectRendererBridge;
    if (!bridge) {
      setTone('error');
      setStatus(text('cloudProjectBridgeUnavailable', '项目工作区尚未准备完成，请稍后重试。'));
      return;
    }
    if (window.projectSessionStore?.getSnapshot().dirty) {
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
      const cloudDocument = await client!.read(project.id);
      await bridge.importCloudProject(cloudDocument);
      setTone('success');
      setStatus(text('cloudProjectOpened', '云项目已载入浏览器本地工作副本。'));
      window.cqnuLayerManager?.close(document.getElementById('cloudProjectLibraryModal'));
      window.cqnuLayerManager?.close(document.getElementById('projectImportModal'));
    } catch (error) {
      setTone('error');
      setStatus(error instanceof Error ? error.message : text('cloudProjectOpenFailed', '云项目无法打开。'));
    } finally {
      setBusyId('');
    }
  }

  return (
    <LayerModal
      id="cloudProjectLibraryModal"
      closeButtonId="btnCloseCloudProjectLibrary"
      titleKey="cloudProjectTitle"
      title="云项目库"
      subtitleKey="cloudProjectSubtitle"
      subtitle="由当前账户管理版本化记录快照；服务凭据与设备路径会先清除，图片字节不会上传。"
      panelClass="cloud-project-panel"
      contentClass="cloud-project-content"
    >
      <div class="cloud-project-assurance" role="note">
        <ShieldCheck size={18} aria-hidden="true" />
        <div>
          <strong data-i18n="cloudProjectPrivacyTitle">显式上传与账户隔离</strong>
          <p data-i18n="cloudProjectPrivacyHint">只上传已清除凭据和设备路径的 settings、zones、points；相对图片引用保留，但图片文件不会上传。</p>
        </div>
      </div>

      <section class="cloud-project-usage" aria-label={text('cloudProjectUsageTitle', '云存储用量')}>
        <div>
          <span data-i18n="cloudProjectUsageProjects">项目配额</span>
          <strong>{usage.projectCount} / {usage.maxProjects}</strong>
        </div>
        <div>
          <span data-i18n="cloudProjectUsageCurrent">当前版本数据</span>
          <strong>{formatBytes(usage.currentBytes)}</strong>
        </div>
        <div>
          <span data-i18n="cloudProjectUsageVersions">全部版本数据</span>
          <strong>{formatBytes(usage.versionBytes)}</strong>
        </div>
        <div>
          <span data-i18n="cloudProjectUsageLimit">单版本上限</span>
          <strong>{formatBytes(usage.maxSnapshotBytes)}</strong>
        </div>
        <span
          class="cloud-project-usage-meter"
          role="progressbar"
          aria-label={text('cloudProjectUsageProjects', '项目配额')}
          aria-valuemin={0}
          aria-valuemax={usage.maxProjects}
          aria-valuenow={usage.projectCount}
        >
          <i style={{ width: `${Math.min(100, (usage.projectCount / Math.max(1, usage.maxProjects)) * 100)}%` }} />
        </span>
      </section>

      <div class="cloud-project-toolbar">
        {canSave ? (
          <form class="cloud-project-create" onSubmit={createProject}>
            <label for="cloudProjectName" data-i18n="cloudProjectNameLabel">新项目名称</label>
            <div>
              <input
                id="cloudProjectName"
                value={name}
                onInput={event => setName(event.currentTarget.value)}
                maxLength={80}
                autoComplete="off"
                placeholder="例如：虎溪校区秋季调查"
                data-i18n-placeholder="cloudProjectNamePlaceholder"
                disabled={Boolean(busyId)}
              />
              <button class="btn btn-primary" type="submit" disabled={!name.trim() || Boolean(busyId)}>
                <Plus size={16} aria-hidden="true" />
                <span data-i18n="cloudProjectCreate">创建数据库</span>
              </button>
            </div>
          </form>
        ) : (
          <p class="cloud-project-readonly" data-i18n="cloudProjectReadOnly">当前账户为只读或草稿权限，可打开云项目，但不能建立或上传版本。</p>
        )}
        <button class="btn btn-soft cloud-project-refresh" type="button" onClick={() => void refresh()} disabled={loading || Boolean(busyId)}>
          <RefreshCw size={16} aria-hidden="true" />
          <span data-i18n="cloudProjectRefresh">刷新</span>
        </button>
      </div>

      <p class="cloud-project-status" data-tone={tone} role="status" aria-live="polite">{status}</p>

      {sortedProjects.length ? (
        <div class="cloud-project-grid" role="list">
          {sortedProjects.map((project, index) => (
            <article
              key={project.id}
              class={`cloud-project-card${historyProjectId === project.id ? ' has-history' : ''}`}
              role="listitem"
              style={{ '--cloud-card-order': String(index) }}
            >
              <header>
                <span class="cloud-project-icon" aria-hidden="true"><Database size={19} /></span>
                <div class="cloud-project-heading">
                  {renameId === project.id ? (
                    <form class="cloud-project-rename" onSubmit={event => void renameProject(event, project)}>
                      <input
                        value={renameValue}
                        onInput={event => setRenameValue(event.currentTarget.value)}
                        maxLength={80}
                        aria-label={text('cloudProjectRenameLabel', '云项目名称')}
                        disabled={Boolean(busyId)}
                        autoFocus
                      />
                      <button class="btn btn-primary btn-compact" type="submit" disabled={!renameValue.trim() || Boolean(busyId)}>
                        <span data-i18n="saveAction">保存</span>
                      </button>
                      <button class="btn btn-soft btn-compact" type="button" onClick={cancelRename} disabled={Boolean(busyId)}>
                        <span data-i18n="cancelAction">取消</span>
                      </button>
                    </form>
                  ) : (
                    <>
                      <h3 title={project.name}>{project.name}</h3>
                      <p>v{project.revision} · {formatBytes(project.byteSize)}</p>
                    </>
                  )}
                </div>
              </header>
              <dl>
                <div><dt data-i18n="cloudProjectUpdated">更新</dt><dd>{formatDate(project.updatedAt)}</dd></div>
                <div><dt data-i18n="cloudProjectIntegrity">完整性</dt><dd>{project.contentSha256 ? project.contentSha256.slice(0, 10) : '—'}</dd></div>
              </dl>
              <div class="cloud-project-actions">
                <button
                  class="btn btn-primary"
                  type="button"
                  data-cloud-project-open
                  disabled={Boolean(busyId)}
                  onClick={() => void openProject(project)}
                >
                  <CloudDownload size={16} aria-hidden="true" />
                  <span data-i18n="cloudProjectOpen">打开副本</span>
                </button>
                {canSave ? (
                  <button
                    class="btn btn-soft"
                    type="button"
                    disabled={!currentSnapshot || Boolean(busyId)}
                    title={!currentSnapshot ? text('cloudProjectUploadRequiresLocal', '请先打开一个本地或云端项目。') : undefined}
                    onClick={() => void uploadCurrent(project)}
                  >
                    <CloudUpload size={16} aria-hidden="true" />
                    <span data-i18n="cloudProjectUpload">上传当前项目</span>
                  </button>
                ) : null}
                <button
                  class="btn btn-soft cloud-project-utility"
                  type="button"
                  data-cloud-project-history
                  aria-expanded={historyProjectId === project.id}
                  disabled={Boolean(busyId) || historyLoading}
                  onClick={() => void toggleHistory(project)}
                >
                  <History size={16} aria-hidden="true" />
                  <span data-i18n="cloudProjectHistory">版本历史</span>
                </button>
                {canSave ? (
                  <>
                    <button
                      class="btn btn-soft cloud-project-utility"
                      type="button"
                      disabled={Boolean(busyId)}
                      onClick={() => beginRename(project)}
                    >
                      <Pencil size={16} aria-hidden="true" />
                      <span data-i18n="cloudProjectRename">重命名</span>
                    </button>
                    <button
                      class="btn btn-soft cloud-project-utility is-danger"
                      type="button"
                      disabled={Boolean(busyId)}
                      onClick={() => void deleteProject(project)}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                      <span data-i18n="cloudProjectDelete">永久删除</span>
                    </button>
                  </>
                ) : null}
              </div>
              {historyProjectId === project.id ? (
                <section class="cloud-project-history" aria-label={text('cloudProjectHistoryTitle', `${project.name} 的版本历史`)}>
                  <header>
                    <div>
                      <strong data-i18n="cloudProjectHistory">版本历史</strong>
                      <span>{historyProject?.name}</span>
                    </div>
                    <small data-i18n="cloudProjectHistoryHint">恢复操作会创建新版本，不覆盖已有记录。</small>
                  </header>
                  {historyLoading ? (
                    <p class="cloud-project-history-state" data-i18n="cloudProjectHistoryLoading">正在读取版本历史…</p>
                  ) : revisions.length ? (
                    <ol>
                      {revisions.map(revision => (
                        <li key={revision.revision}>
                          <div>
                            <strong>v{revision.revision}</strong>
                            <span>{formatDate(revision.createdAt)} · {formatBytes(revision.byteSize)}</span>
                            <small title={revision.contentSha256}>{revision.contentSha256.slice(0, 12)}</small>
                          </div>
                          {revision.revision === project.revision ? (
                            <span class="cloud-project-current" data-i18n="cloudProjectCurrentVersion">当前版本</span>
                          ) : canSave ? (
                            <button
                              class="btn btn-soft btn-compact"
                              type="button"
                              disabled={Boolean(busyId)}
                              onClick={() => void restoreRevision(project, revision)}
                            >
                              <RotateCcw size={15} aria-hidden="true" />
                              <span data-i18n="cloudProjectRestore">恢复为新版本</span>
                            </button>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p class="cloud-project-history-state" data-i18n="cloudProjectHistoryEmpty">尚无已保存版本。</p>
                  )}
                </section>
              ) : null}
            </article>
          ))}
        </div>
      ) : loading ? (
        <div class="cloud-project-skeleton" aria-hidden="true"><span /><span /><span /></div>
      ) : (
        <div class="cloud-project-empty">
          <Cloud size={28} aria-hidden="true" />
          <strong data-i18n="cloudProjectEmptyTitle">尚无云项目</strong>
          <p data-i18n="cloudProjectEmptyHint">具有保存权限的账户可先创建数据库，再上传当前项目记录。</p>
        </div>
      )}
    </LayerModal>
  );
}
