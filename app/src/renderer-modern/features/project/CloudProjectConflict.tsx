import { CloudDownload, Download, RefreshCw, ShieldCheck } from 'lucide-preact';
import type { CloudProjectDiffSection } from './cloudProjectDiff';
import type { CloudProjectConflictState, CloudProjectText } from './useCloudProjectLibraryController';

interface CloudProjectConflictProps {
  conflict: CloudProjectConflictState;
  busy: boolean;
  canBackup: boolean;
  text: CloudProjectText;
  onCompare(): void;
  onKeepLocal(): void;
  onOpenLatest(): void;
  onBackupAndOpen(): void;
}

function changeLabel(change: 'added' | 'removed' | 'modified', text: CloudProjectText): string {
  if (change === 'added') return text('cloudProjectDiffAdded', '云端新增');
  if (change === 'removed') return text('cloudProjectDiffRemoved', '云端缺少');
  return text('cloudProjectDiffModified', '内容不同');
}

function DiffSection({ section, text }: { section: CloudProjectDiffSection; text: CloudProjectText }) {
  const labels = {
    settings: text('cloudProjectDiffSettings', '项目设置'),
    zones: text('cloudProjectDiffZones', '分区记录'),
    points: text('cloudProjectDiffPoints', '点位记录')
  };
  return (
    <article class="cloud-project-diff-section">
      <header>
        <strong>{labels[section.kind]}</strong>
        <span>{text('cloudProjectDiffLocalCloudCount', '本地 {local} · 云端 {cloud}')
          .replace('{local}', String(section.localCount))
          .replace('{cloud}', String(section.cloudCount))}</span>
      </header>
      <dl>
        <div><dt>{text('cloudProjectDiffAdded', '云端新增')}</dt><dd>{section.added}</dd></div>
        <div><dt>{text('cloudProjectDiffRemoved', '云端缺少')}</dt><dd>{section.removed}</dd></div>
        <div><dt>{text('cloudProjectDiffModified', '内容不同')}</dt><dd>{section.modified}</dd></div>
        <div><dt>{text('cloudProjectDiffUnchanged', '一致')}</dt><dd>{section.unchanged}</dd></div>
      </dl>
      {section.items.length ? (
        <ul aria-label={text('cloudProjectDiffPreview', '差异预览')}>
          {section.items.map(item => (
            <li key={`${section.kind}:${item.id}:${item.change}`} title={`${item.label} (${item.id})`}>
              <span>{item.label}</span>
              <small>{changeLabel(item.change, text)}</small>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

export function CloudProjectConflict(props: CloudProjectConflictProps) {
  const { conflict, busy, canBackup, text } = props;
  const compared = Boolean(conflict.diff && conflict.remoteDocument);
  return (
    <section class="cloud-project-conflict" data-cloud-project-conflict role="alert" aria-live="polite">
      <header>
        <span class="cloud-project-conflict-icon" aria-hidden="true"><ShieldCheck size={19} /></span>
        <div>
          <strong data-i18n="cloudProjectConflictTitle">{text('cloudProjectConflictTitle', '检测到云端版本冲突')}</strong>
          <p>{text(
            'cloudProjectConflictHint',
            '本次操作未写入。先比较本地副本与云端最新版本，再明确选择保留或切换。'
          )}</p>
        </div>
      </header>

      {conflict.diff ? (
        <div
          class="cloud-project-diff"
          data-changed={String(conflict.diff.changed)}
          data-change-count={String(conflict.diff.changedCount)}
        >
          <div class="cloud-project-diff-summary">
            <strong>{conflict.diff.changed
              ? text('cloudProjectDiffChangedSummary', '发现 {count} 项差异').replace('{count}', String(conflict.diff.changedCount))
              : text('cloudProjectDiffNoChangeSummary', '记录内容一致')}</strong>
            <span>{text('cloudProjectDiffReadOnly', '比较为只读操作，不修改任何项目数据。')}</span>
          </div>
          <div class="cloud-project-diff-grid">
            <DiffSection section={conflict.diff.settings} text={text} />
            <DiffSection section={conflict.diff.zones} text={text} />
            <DiffSection section={conflict.diff.points} text={text} />
          </div>
        </div>
      ) : (
        <p class="cloud-project-conflict-waiting">
          {text('cloudProjectConflictCompareHint', '尚未读取云端内容。比较仅返回设置、分区和点位的差异计数与标识摘要。')}
        </p>
      )}

      <div class="cloud-project-conflict-actions">
        <button class="btn btn-soft" type="button" data-cloud-conflict-compare disabled={busy} onClick={props.onCompare}>
          <RefreshCw size={16} aria-hidden="true" />
          <span>{text('cloudProjectConflictCompare', '比较最新版本')}</span>
        </button>
        <button class="btn btn-soft" type="button" data-cloud-conflict-keep disabled={busy} onClick={props.onKeepLocal}>
          <ShieldCheck size={16} aria-hidden="true" />
          <span>{text('cloudProjectConflictKeepLocal', '保留本地副本')}</span>
        </button>
        <button
          class="btn btn-soft"
          type="button"
          data-cloud-conflict-open-latest
          disabled={busy || !compared}
          title={!compared ? text('cloudProjectConflictCompareRequired', '请先比较云端最新版本，再选择是否切换。') : undefined}
          onClick={props.onOpenLatest}
        >
          <CloudDownload size={16} aria-hidden="true" />
          <span>{text('cloudProjectConflictOpenLatest', '打开最新版本')}</span>
        </button>
        <button
          class="btn btn-primary"
          type="button"
          data-cloud-conflict-backup-open
          disabled={busy || !canBackup || !compared}
          title={!canBackup
            ? text('cloudProjectConflictBackupUnavailable', '当前副本不可持久保存，无法生成下载备份。')
            : !compared
              ? text('cloudProjectConflictCompareRequired', '请先比较云端最新版本，再选择是否切换。')
              : undefined}
          onClick={props.onBackupAndOpen}
        >
          <Download size={16} aria-hidden="true" />
          <span>{text('cloudProjectConflictBackupOpen', '备份并打开最新版本')}</span>
        </button>
      </div>
    </section>
  );
}
