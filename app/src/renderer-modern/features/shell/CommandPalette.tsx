import { Keyboard, Search } from 'lucide-preact';
import { LayerModal } from '../../components/LayerModal';

export function CommandPalette() {
  return (
    <LayerModal
      id="commandPaletteModal"
      closeButtonId="btnCloseCommandPalette"
      titleKey="commandPaletteTitle"
      title="命令中心"
      subtitleKey="commandPaletteSubtitle"
      subtitle="搜索功能、分区和点位，快速进入当前工作。"
      panelClass="command-palette-panel"
      contentClass="command-palette-content"
      footer={(
        <div class="command-palette-footer-bar">
          <button id="btnCommandPaletteHelp" class="btn btn-soft command-palette-help" type="button">
            <Keyboard size={16} aria-hidden="true" />
            <span data-i18n="commandPaletteHelp">快捷键</span>
          </button>
          <span class="command-palette-navigation-hint" data-i18n="commandPaletteNavigationHint">
            ↑↓ 选择 · Enter 执行 · Esc 关闭
          </span>
        </div>
      )}
    >
      <div class="command-palette-shell">
        <label class="command-palette-search" for="commandPaletteInput">
          <Search size={20} aria-hidden="true" />
          <span class="sr-only" data-i18n="commandPaletteSearchLabel">搜索命令、分区或点位</span>
          <input
            id="commandPaletteInput"
            type="search"
            autoComplete="off"
            spellcheck={false}
            aria-autocomplete="list"
            aria-controls="commandPaletteResults"
            data-i18n-placeholder="commandPaletteSearchPlaceholder"
            placeholder="搜索命令、分区或点位…"
          />
          <kbd>Ctrl K</kbd>
        </label>
        <div class="command-palette-meta">
          <strong id="commandPaletteModeLabel" data-i18n="commandPaletteCommandsMode">快捷入口</strong>
          <span id="commandPaletteResultCount" class="pill" aria-live="polite">0</span>
        </div>
        <div
          id="commandPaletteResults"
          class="command-palette-results"
          role="listbox"
          aria-label="命令结果"
          data-i18n-aria-label="commandPaletteResultsLabel"
        />
        <div id="commandPaletteAnnouncer" class="sr-only" aria-live="polite" />
      </div>
    </LayerModal>
  );
}
