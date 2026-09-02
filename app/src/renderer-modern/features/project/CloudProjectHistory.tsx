import { RotateCcw } from 'lucide-preact';
import type { CloudProjectRevisionMetadata } from '../../../shared/types/cloud-projects';
import { formatCloudProjectBytes, formatCloudProjectDate } from './cloudProjectLibraryModel';

interface CloudProjectHistoryProps {
  ariaLabel: string;
  projectName: string;
  currentRevision: number;
  revisions: CloudProjectRevisionMetadata[];
  loading: boolean;
  canSave: boolean;
  busy: boolean;
  onRestore(revision: CloudProjectRevisionMetadata): void;
}

export function CloudProjectHistory(props: CloudProjectHistoryProps) {
  const locale = document.documentElement.lang || 'zh-CN';
  return (
    <section class="cloud-project-history" aria-label={props.ariaLabel}>
      <header>
        <div>
          <strong data-i18n="cloudProjectHistory">版本历史</strong>
          <span>{props.projectName}</span>
        </div>
        <small data-i18n="cloudProjectHistoryHint">恢复操作会创建新版本，不覆盖已有记录。</small>
      </header>
      {props.loading ? (
        <p class="cloud-project-history-state" data-i18n="cloudProjectHistoryLoading">正在读取版本历史…</p>
      ) : props.revisions.length ? (
        <ol>
          {props.revisions.map(revision => (
            <li key={revision.revision}>
              <div>
                <strong>v{revision.revision}</strong>
                <span>{formatCloudProjectDate(revision.createdAt, locale)} · {formatCloudProjectBytes(revision.byteSize)}</span>
                <small title={revision.contentSha256}>{revision.contentSha256.slice(0, 12)}</small>
              </div>
              {revision.revision === props.currentRevision ? (
                <span class="cloud-project-current" data-i18n="cloudProjectCurrentVersion">当前版本</span>
              ) : props.canSave ? (
                <button
                  class="btn btn-soft btn-compact"
                  type="button"
                  disabled={props.busy}
                  onClick={() => props.onRestore(revision)}
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
  );
}
