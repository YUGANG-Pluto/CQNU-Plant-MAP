import type { CloudProjectDiffSection, CloudProjectSnapshotDiff } from './cloudProjectDiff';
import type { CloudProjectText } from './cloudProjectLibraryTypes';

interface CloudProjectDiffViewProps {
  diff: CloudProjectSnapshotDiff;
  text: CloudProjectText;
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
        <span>
          {text('cloudProjectDiffLocalCloudCount', '本地 {local} · 云端 {cloud}')
            .replace('{local}', String(section.localCount))
            .replace('{cloud}', String(section.cloudCount))}
        </span>
      </header>
      <dl>
        <div>
          <dt>{text('cloudProjectDiffAdded', '云端新增')}</dt>
          <dd>{section.added}</dd>
        </div>
        <div>
          <dt>{text('cloudProjectDiffRemoved', '云端缺少')}</dt>
          <dd>{section.removed}</dd>
        </div>
        <div>
          <dt>{text('cloudProjectDiffModified', '内容不同')}</dt>
          <dd>{section.modified}</dd>
        </div>
        <div>
          <dt>{text('cloudProjectDiffUnchanged', '一致')}</dt>
          <dd>{section.unchanged}</dd>
        </div>
      </dl>
      {section.items.length ? (
        <ul aria-label={text('cloudProjectDiffPreview', '差异预览')}>
          {section.items.map((item) => (
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

export function CloudProjectDiffView({ diff, text }: CloudProjectDiffViewProps) {
  return (
    <div class="cloud-project-diff" data-changed={String(diff.changed)} data-change-count={String(diff.changedCount)}>
      <div class="cloud-project-diff-summary">
        <strong>
          {diff.changed
            ? text('cloudProjectDiffChangedSummary', '发现 {count} 项差异').replace(
                '{count}',
                String(diff.changedCount)
              )
            : text('cloudProjectDiffNoChangeSummary', '记录内容一致')}
        </strong>
        <span>{text('cloudProjectDiffReadOnly', '比较为只读操作，不修改任何项目数据。')}</span>
      </div>
      <div class="cloud-project-diff-grid">
        <DiffSection section={diff.settings} text={text} />
        <DiffSection section={diff.zones} text={text} />
        <DiffSection section={diff.points} text={text} />
      </div>
    </div>
  );
}
