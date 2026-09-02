import {
  Cloud,
  CloudDownload,
  CloudUpload,
  Database,
  History,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2
} from 'lucide-preact';
import { LayerModal } from '../../components/LayerModal';
import { CloudProjectConflict } from './CloudProjectConflict';
import { CloudProjectHistory } from './CloudProjectHistory';
import { formatCloudProjectBytes, formatCloudProjectDate } from './cloudProjectLibraryModel';
import { useCloudProjectLibraryController } from './useCloudProjectLibraryController';
import { useSiteCloudProjectClient } from './useSiteCloudProjectClient';

function text(key: string, fallback: string): string {
  const translated = window.t?.(key);
  return translated && translated !== key ? translated : fallback;
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
  const client = useSiteCloudProjectClient();
  const canSave = Boolean(window.managementAccess?.capabilities.includes('workspace.save'));
  const controller = useCloudProjectLibraryController(client, canSave, text);
  if (!client) return null;

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
          <strong>{controller.usage.projectCount} / {controller.usage.maxProjects}</strong>
        </div>
        <div>
          <span data-i18n="cloudProjectUsageCurrent">当前版本数据</span>
          <strong>{formatCloudProjectBytes(controller.usage.currentBytes)}</strong>
        </div>
        <div>
          <span data-i18n="cloudProjectUsageVersions">全部版本数据</span>
          <strong>{formatCloudProjectBytes(controller.usage.versionBytes)}</strong>
        </div>
        <div>
          <span data-i18n="cloudProjectUsageLimit">单版本上限</span>
          <strong>{formatCloudProjectBytes(controller.usage.maxSnapshotBytes)}</strong>
        </div>
        <span
          class="cloud-project-usage-meter"
          role="progressbar"
          aria-label={text('cloudProjectUsageProjects', '项目配额')}
          aria-valuemin={0}
          aria-valuemax={controller.usage.maxProjects}
          aria-valuenow={controller.usage.projectCount}
        >
          <i style={{ width: `${Math.min(100, (controller.usage.projectCount / Math.max(1, controller.usage.maxProjects)) * 100)}%` }} />
        </span>
      </section>

      <div class="cloud-project-toolbar">
        {canSave ? (
          <form class="cloud-project-create" onSubmit={controller.createProject}>
            <label for="cloudProjectName" data-i18n="cloudProjectNameLabel">新项目名称</label>
            <div>
              <input
                id="cloudProjectName"
                value={controller.name}
                onInput={event => controller.setName(event.currentTarget.value)}
                maxLength={80}
                autoComplete="off"
                placeholder="例如：虎溪校区秋季调查"
                data-i18n-placeholder="cloudProjectNamePlaceholder"
                disabled={Boolean(controller.busyId)}
              />
              <button class="btn btn-primary" type="submit" disabled={!controller.name.trim() || Boolean(controller.busyId)}>
                <Plus size={16} aria-hidden="true" />
                <span data-i18n="cloudProjectCreate">创建数据库</span>
              </button>
            </div>
          </form>
        ) : (
          <p class="cloud-project-readonly" data-i18n="cloudProjectReadOnly">当前账户为只读或草稿权限，可打开云项目，但不能建立或上传版本。</p>
        )}
        <button
          class="btn btn-soft cloud-project-refresh"
          type="button"
          onClick={() => void controller.refresh()}
          disabled={controller.loading || Boolean(controller.busyId)}
        >
          <RefreshCw size={16} aria-hidden="true" />
          <span data-i18n="cloudProjectRefresh">刷新</span>
        </button>
      </div>

      <p class="cloud-project-status" data-tone={controller.tone} role="status" aria-live="polite">{controller.status}</p>

      {controller.projects.length ? (
        <div class="cloud-project-grid" role="list">
          {controller.projects.map((project, index) => {
            const isActive = controller.activeCloudProjectId === project.id;
            const hasConflict = controller.conflict?.project.id === project.id;
            const expanded = controller.historyProjectId === project.id || hasConflict;
            return (
              <article
                key={project.id}
                class={`cloud-project-card${expanded ? ' has-history' : ''}${isActive ? ' is-active-copy' : ''}${hasConflict ? ' has-conflict' : ''}`}
                role="listitem"
                style={{ '--cloud-card-order': String(index) }}
              >
                <header>
                  <span class="cloud-project-icon" aria-hidden="true"><Database size={19} /></span>
                  <div class="cloud-project-heading">
                    {controller.renameId === project.id ? (
                      <form class="cloud-project-rename" onSubmit={event => void controller.renameProject(event, project)}>
                        <input
                          value={controller.renameValue}
                          onInput={event => controller.setRenameValue(event.currentTarget.value)}
                          maxLength={80}
                          aria-label={text('cloudProjectRenameLabel', '云项目名称')}
                          disabled={Boolean(controller.busyId)}
                          autoFocus
                        />
                        <button class="btn btn-primary btn-compact" type="submit" disabled={!controller.renameValue.trim() || Boolean(controller.busyId)}>
                          <span data-i18n="saveAction">保存</span>
                        </button>
                        <button class="btn btn-soft btn-compact" type="button" onClick={controller.cancelRename} disabled={Boolean(controller.busyId)}>
                          <span data-i18n="cancelAction">取消</span>
                        </button>
                      </form>
                    ) : (
                      <>
                        <div class="cloud-project-title-line">
                          <h3 title={project.name}>{project.name}</h3>
                          {isActive ? <span class="pill">{text('cloudProjectActiveCopy', '本地已打开')}</span> : null}
                        </div>
                        <p>v{project.revision} · {formatCloudProjectBytes(project.byteSize)}</p>
                      </>
                    )}
                  </div>
                </header>
                <dl>
                  <div><dt data-i18n="cloudProjectUpdated">更新</dt><dd>{formatCloudProjectDate(project.updatedAt, document.documentElement.lang || 'zh-CN')}</dd></div>
                  <div><dt data-i18n="cloudProjectIntegrity">完整性</dt><dd>{project.contentSha256 ? project.contentSha256.slice(0, 10) : '—'}</dd></div>
                </dl>
                <div class="cloud-project-actions">
                  <button
                    class="btn btn-primary"
                    type="button"
                    data-cloud-project-open
                    disabled={Boolean(controller.busyId)}
                    onClick={() => void controller.openProject(project)}
                  >
                    <CloudDownload size={16} aria-hidden="true" />
                    <span data-i18n="cloudProjectOpen">打开副本</span>
                  </button>
                  {canSave ? (
                    <button
                      class="btn btn-soft"
                      type="button"
                      data-cloud-project-upload
                      disabled={!controller.currentSnapshot || Boolean(controller.busyId)}
                      title={!controller.currentSnapshot ? text('cloudProjectUploadRequiresLocal', '请先打开一个本地或云端项目。') : undefined}
                      onClick={() => void controller.uploadCurrent(project)}
                    >
                      <CloudUpload size={16} aria-hidden="true" />
                      <span data-i18n="cloudProjectUpload">上传当前项目</span>
                    </button>
                  ) : null}
                  <button
                    class="btn btn-soft cloud-project-utility"
                    type="button"
                    data-cloud-project-history
                    aria-expanded={controller.historyProjectId === project.id}
                    disabled={Boolean(controller.busyId) || controller.historyLoading}
                    onClick={() => void controller.toggleHistory(project)}
                  >
                    <History size={16} aria-hidden="true" />
                    <span data-i18n="cloudProjectHistory">版本历史</span>
                  </button>
                  {canSave ? (
                    <>
                      <button
                        class="btn btn-soft cloud-project-utility"
                        type="button"
                        disabled={Boolean(controller.busyId)}
                        onClick={() => controller.beginRename(project)}
                      >
                        <Pencil size={16} aria-hidden="true" />
                        <span data-i18n="cloudProjectRename">重命名</span>
                      </button>
                      <button
                        class="btn btn-soft cloud-project-utility is-danger"
                        type="button"
                        disabled={Boolean(controller.busyId)}
                        onClick={() => void controller.deleteProject(project)}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                        <span data-i18n="cloudProjectDelete">永久删除</span>
                      </button>
                    </>
                  ) : null}
                </div>
                {hasConflict && controller.conflict ? (
                  <CloudProjectConflict
                    conflict={controller.conflict}
                    busy={Boolean(controller.busyId)}
                    canBackup={controller.canBackupConflict}
                    text={text}
                    onCompare={() => void controller.compareConflict()}
                    onKeepLocal={controller.keepLocalConflict}
                    onOpenLatest={() => void controller.openLatestConflict(false)}
                    onBackupAndOpen={() => void controller.openLatestConflict(true)}
                  />
                ) : null}
                {controller.historyProjectId === project.id ? (
                  <CloudProjectHistory
                    ariaLabel={text('cloudProjectHistoryTitle', `${project.name} 的版本历史`)}
                    projectName={project.name}
                    currentRevision={project.revision}
                    revisions={controller.revisions}
                    loading={controller.historyLoading}
                    canSave={canSave}
                    busy={Boolean(controller.busyId)}
                    onRestore={revision => void controller.restoreRevision(project, revision)}
                  />
                ) : null}
              </article>
            );
          })}
        </div>
      ) : controller.loading ? (
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
