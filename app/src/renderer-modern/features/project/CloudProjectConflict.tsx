import { CloudDownload, Download, RefreshCw, ShieldCheck } from 'lucide-preact';
import { CloudProjectDiffView } from './CloudProjectDiffView';
import type { CloudProjectConflictState, CloudProjectText } from './cloudProjectLibraryTypes';

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
        <CloudProjectDiffView diff={conflict.diff} text={text} />
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
