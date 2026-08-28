import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import {
  Cloud,
  CloudDownload,
  CloudUpload,
  Database,
  Plus,
  RefreshCw,
  ShieldCheck
} from 'lucide-preact';
import type {
  CloudProjectMetadata,
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
      const result = await client.list();
      setProjects(result);
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

  if (!client) return null;

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
      setProjects(current => current.map(item => item.id === updated.id ? updated : item));
      setTone('success');
      setStatus(text('cloudProjectUploaded', '当前记录已保存为新的云端版本。'));
    } catch (error) {
      setTone('error');
      setStatus(error instanceof Error ? error.message : text('cloudProjectUploadFailed', '云项目上传失败。'));
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
            <article key={project.id} class="cloud-project-card" role="listitem" style={{ '--cloud-card-order': String(index) }}>
              <header>
                <span class="cloud-project-icon" aria-hidden="true"><Database size={19} /></span>
                <div>
                  <h3 title={project.name}>{project.name}</h3>
                  <p>v{project.revision} · {formatBytes(project.byteSize)}</p>
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
              </div>
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
