import { LayerModal } from '../../components/LayerModal';

const tabs = [
  ['Overview', 'overview', 'statsTabOverview', '概览'],
  ['Zone', 'zone', 'statsTabZone', '分区统计'],
  ['Species', 'taxonomy', 'statsTabSpecies', '分类组成'],
  ['Life', 'life', 'statsTabLife', '生活型与来源'],
  ['Diversity', 'diversity', 'statsTabDiversity', '多样性指数'],
  ['Similarity', 'similarity', 'statsTabSimilarity', '分区相似性'],
  ['Phenology', 'phenology', 'statsTabPhenology', '物候统计'],
  ['Time', 'time', 'statsTabTime', '时间趋势'],
  ['Quality', 'quality', 'statsTabQuality', '数据质量'],
  ['Export', 'export', 'statsTabExport', '导出'],
  ['Notes', 'notes', 'statsTabNotes', '口径说明'],
  ['Custom', 'custom', 'statsTabCustom', '自由统计']
] as const;

export function StatsModalShell() {
  return (
    <LayerModal
      id="statsModal"
      closeButtonId="btnCloseStatsModal"
      titleKey="statsCenterTitle"
      title="统计中心"
      subtitleKey="statsCenterSubtitle"
      subtitle="按分类查看分区、物种与时间统计"
      panelClass="stats-center-panel"
    >
      <div class="stats-toolbar-row">
        <div class="seg-tabs">
          {tabs.map(([id, tab, key, label], index) => (
            <button
              key={tab}
              id={`btnStatsTab${id}`}
              class={`seg-btn stats-tab ${index === 0 ? 'active' : ''}`}
              data-tab={tab}
              data-i18n={key}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div id="statsModalBody" class="modal-scroll" />
    </LayerModal>
  );
}
