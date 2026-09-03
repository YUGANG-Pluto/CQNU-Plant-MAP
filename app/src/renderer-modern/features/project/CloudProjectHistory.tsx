import { RotateCcw, Search } from 'lucide-preact';
import type { CloudProjectRevisionMetadata } from '../../../shared/types/cloud-projects';
import { CloudProjectDiffView } from './CloudProjectDiffView';
import { formatCloudProjectBytes, formatCloudProjectDate } from './cloudProjectLibraryModel';
import type { CloudProjectRevisionComparisonState, CloudProjectText } from './cloudProjectLibraryTypes';

interface CloudProjectHistoryProps {
  ariaLabel: string;
  projectName: string;
  currentRevision: number;
  revisions: CloudProjectRevisionMetadata[];
  loading: boolean;
  canSave: boolean;
  canCompare: boolean;
  busy: boolean;
  comparison: CloudProjectRevisionComparisonState | null;
  text: CloudProjectText;
  onCompare(revision: CloudProjectRevisionMetadata): void;
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
        <p class="cloud-project-history-state" data-i18n="cloudProjectHistoryLoading">
          正在读取版本历史…
        </p>
      ) : props.revisions.length ? (
        <ol>
          {props.revisions.map((revision) => {
            const comparison =
              props.comparison?.projectId === revision.projectId && props.comparison.revision === revision.revision
                ? props.comparison
                : null;
            return (
              <li key={revision.revision} data-comparing={String(Boolean(comparison))}>
                <div class="cloud-project-history-row">
                  <div class="cloud-project-history-meta">
                    <strong>v{revision.revision}</strong>
                    <span>
                      {formatCloudProjectDate(revision.createdAt, locale)} ·{' '}
                      {formatCloudProjectBytes(revision.byteSize)}
                    </span>
                    <small title={revision.contentSha256}>{revision.contentSha256.slice(0, 12)}</small>
                  </div>
                  <div class="cloud-project-history-actions">
                    {revision.revision === props.currentRevision ? (
                      <span class="cloud-project-current" data-i18n="cloudProjectCurrentVersion">
                        当前版本
                      </span>
                    ) : null}
                    <button
                      class="btn btn-soft btn-compact"
                      type="button"
                      data-cloud-revision-compare
                      disabled={props.busy || !props.canCompare}
                      title={
                        !props.canCompare
                          ? props.text(
                              'cloudProjectRevisionCompareRequiresLocal',
                              '请先打开一个本地或云端项目，再比较历史版本。'
                            )
                          : undefined
                      }
                      onClick={() => props.onCompare(revision)}
                    >
                      <Search size={15} aria-hidden="true" />
                      <span>{props.text('cloudProjectRevisionCompare', '与本地比较')}</span>
                    </button>
                    {revision.revision !== props.currentRevision && props.canSave ? (
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
                  </div>
                </div>
                {comparison?.loading ? (
                  <p class="cloud-project-history-state" role="status">
                    {props
                      .text('cloudProjectRevisionComparing', `正在读取并比较云端版本 v${revision.revision}…`)
                      .replace('{revision}', String(revision.revision))}
                  </p>
                ) : comparison?.diff ? (
                  <CloudProjectDiffView diff={comparison.diff} text={props.text} />
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : (
        <p class="cloud-project-history-state" data-i18n="cloudProjectHistoryEmpty">
          尚无已保存版本。
        </p>
      )}
    </section>
  );
}
