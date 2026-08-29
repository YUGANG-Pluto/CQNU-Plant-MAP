import {
  ArchiveRestore,
  Cloud,
  Database,
  FileJson2,
  FolderOpen,
  Folders,
  HardDrive,
  RefreshCw,
  ShieldCheck
} from 'lucide-preact';
import { LayerModal } from '../../components/LayerModal';
import {
  buildProjectImportOptions,
  describeProjectSource,
  type ProjectImportOption,
  type ProjectSourceInput
} from './importCenterModel';
import { useProjectSession } from './useProjectSession';
import { openCloudProjectLibrary } from './CloudProjectLibrary';
import { useSiteCloudProjectClient } from './useSiteCloudProjectClient';

declare global {
  interface Window {
    t?(key: string): string;
  }
}

const fallbackText: Record<string, string> = {
  projectSourceSqlite: 'SQLite 本地副本',
  projectSourceDirectory: '授权项目目录',
  projectSourceImportedFiles: '导入文件副本',
  projectSourceBrowserDatabase: '浏览器本地数据库',
  projectSourceCloud: '云项目工作副本',
  projectSourceJson: 'JSON 项目',
  projectSourceLocal: '本地项目'
};

function translatedText(key: string, fallback = ''): string {
  const translated = window.t?.(key);
  return translated && translated !== key ? translated : fallback || fallbackText[key] || key;
}

const optionIcons = {
  btnImportProjectDirectory: FolderOpen,
  btnImportProjectSqlite: Database,
  btnImportProjectJson: FileJson2,
  btnImportProjectFolder: Folders,
  btnImportProjectBackup: ArchiveRestore
};

function sourceFromSession(session: ReturnType<typeof useProjectSession>): ProjectSourceInput | null {
  if (!session.loaded) return null;
  return {
    sourceKind: session.sourceKind,
    storageFormat: session.storageFormat,
    directoryPermissionStatus: session.directoryPermissionStatus,
    directoryReconnectRequired: session.directoryReconnectRequired,
    externalSqliteImported: session.externalSqliteImported
  };
}

function ProjectImportOptionButton({ option }: { option: ProjectImportOption }) {
  const Icon = optionIcons[option.id as keyof typeof optionIcons] || HardDrive;
  return (
    <button
      id={option.id}
      class={`project-import-option${option.recommended ? ' is-recommended' : ''}`}
      type="button"
      disabled={option.disabled}
      title={option.disabled && option.disabledReasonKey ? translatedText(option.disabledReasonKey) : undefined}
      data-i18n-title={option.disabled ? option.disabledReasonKey : undefined}
      data-project-open-mode={option.mode}
      data-project-import-action={option.action}
      data-disabled-reason-key={option.disabledReasonKey}
    >
      <span class="project-import-option__icon" aria-hidden="true"><Icon size={22} /></span>
      <span class="project-import-option__copy">
        <strong data-i18n={option.labelKey}>{translatedText(option.labelKey)}</strong>
        <small data-i18n={option.descriptionKey}>{translatedText(option.descriptionKey)}</small>
      </span>
      {option.badgeKey ? <span class="pill" data-i18n={option.badgeKey}>推荐</span> : null}
    </button>
  );
}

export function ProjectSourceStatus() {
  const source = sourceFromSession(useProjectSession());

  if (window.platformAdapter?.runtime !== 'web' || !source) return null;
  const description = describeProjectSource(source);
  const openImportCenter = () => {
    const modal = document.getElementById('projectImportModal');
    if (modal) window.cqnuLayerManager?.open(modal, {
      focusTarget: document.getElementById('btnImportProjectDirectory')
    });
  };
  return (
    <div class={`project-source-status is-${description.kind}`} data-source-kind={description.kind}>
      <Database size={15} aria-hidden="true" />
      <span class="project-source-status__copy">
        <strong data-i18n={description.labelKey}>{translatedText(description.labelKey, '本地项目')}</strong>
        <small data-i18n={description.detailKey}>{translatedText(description.detailKey)}</small>
      </span>
      <button
        id="btnReopenProjectImportCenter"
        class="modern-icon-button project-source-status__action glass-interactive"
        type="button"
        onClick={openImportCenter}
        title="切换项目来源"
        data-i18n-title="projectImportSwitch"
        aria-label="切换项目来源"
        data-i18n-aria-label="projectImportSwitch"
      >
        <RefreshCw size={15} aria-hidden="true" />
      </button>
    </div>
  );
}

export function ProjectImportCenter() {
  const adapter = window.platformAdapter;
  const source = sourceFromSession(useProjectSession());
  const cloudProjectClient = useSiteCloudProjectClient();

  if (adapter?.runtime !== 'web') return null;
  const options = buildProjectImportOptions({
    runtime: adapter.runtime,
    canReadProject: adapter.capabilities.readProject,
    canImportSqlite: typeof adapter.project.chooseSqliteFile === 'function',
    canImportJson: typeof adapter.project.chooseJsonFiles === 'function',
    canRestoreBackup: adapter.capabilities.externalBackupImport === true,
    projectLoaded: Boolean(source)
  });
  const sourceDescription = source ? describeProjectSource(source) : null;

  return (
    <LayerModal
      id="projectImportModal"
      closeButtonId="btnCloseProjectImportModal"
      titleKey="projectImportTitle"
      title="打开植物项目"
      subtitleKey="projectImportSubtitle"
      subtitle="选择本地读取方式或云项目库；原始文件不会上传到管理服务。"
      panelClass="project-import-panel"
      contentClass="project-import-content"
    >
      <div class="project-import-assurance" role="note">
        <ShieldCheck size={18} aria-hidden="true" />
        <div>
          <strong data-i18n="projectImportLocalFirst">本地优先与最小权限</strong>
          <p data-i18n="projectImportLocalFirstHint">仅在您主动选择后读取文件；SQLite 原文件保持只读，编辑保存在浏览器本地工作副本。</p>
        </div>
      </div>

      {sourceDescription ? (
        <section class={`project-import-current is-${sourceDescription.kind}`}>
          <span data-i18n="projectImportCurrentSource">当前来源</span>
          <strong data-i18n={sourceDescription.labelKey}>{translatedText(sourceDescription.labelKey, '本地项目')}</strong>
          <small data-i18n={sourceDescription.detailKey}>{translatedText(sourceDescription.detailKey)}</small>
          {sourceDescription.warningKey ? (
            <small class="project-import-current__warning" data-i18n={sourceDescription.warningKey}>
              原始 SQLite 文件不会被直接改写。
            </small>
          ) : null}
        </section>
      ) : null}

      <div class="project-import-options" role="list" aria-label="项目读取方式" data-i18n-aria-label="projectImportOptionsLabel">
        {options.map(option => <ProjectImportOptionButton key={option.id} option={option} />)}
        {cloudProjectClient ? (
          <button
            id="btnOpenCloudProjectLibrary"
            class="project-import-option project-import-option--cloud"
            type="button"
            onClick={openCloudProjectLibrary}
          >
            <span class="project-import-option__icon" aria-hidden="true"><Cloud size={22} /></span>
            <span class="project-import-option__copy">
              <strong data-i18n="cloudProjectOpenLibrary">云项目库</strong>
              <small data-i18n="cloudProjectOpenLibraryHint">读取本人云端项目，或将当前记录显式保存为版本化快照。</small>
            </span>
            <span class="pill" data-i18n="cloudProjectSiteOnly">站点</span>
          </button>
        ) : null}
      </div>
      <p id="projectImportStatus" class="project-import-status" role="status" aria-live="polite" data-i18n="projectImportReady">
        请选择项目来源。切换项目之前会检查尚未应用的编辑。
      </p>
    </LayerModal>
  );
}
