import {
  Check,
  FlaskConical,
  Gauge,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  X
} from 'lucide-preact';

export function ThemeSettingsModal() {
  return (
    <div id="themeModal" class="layer-modal hidden">
      <div class="layer-modal-backdrop" />
      <section
        class="layer-modal-panel glass modern-theme-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modernThemeTitle"
      >
        <header class="modern-theme-header">
          <div class="modern-theme-heading">
            <span class="modern-theme-icon" aria-hidden="true">
              <SlidersHorizontal size={18} strokeWidth={1.8} />
            </span>
            <div>
              <h2 id="modernThemeTitle" data-i18n="themeCenterTitle">界面设置</h2>
              <p class="subtle" data-i18n="themeCenterSubtitle">
                在科研白底与液态玻璃之间切换，并调整必要的显示偏好
              </p>
            </div>
          </div>
          <button
            id="btnCloseThemeModal"
            class="btn btn-soft modern-icon-button"
            type="button"
            aria-label="关闭"
            title="关闭"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div class="modern-theme-content">
          <section class="modern-theme-section" aria-labelledby="themeStyleHeading">
            <div class="modern-theme-section-heading">
              <div>
                <h3 id="themeStyleHeading" data-i18n="themeStyleHeading">视觉风格</h3>
                <p class="subtle" data-i18n="themeStyleHint">选择适合当前工作场景的基础界面</p>
              </div>
            </div>
            <div id="themeStylePresets" class="modern-theme-choice-grid">
              <button
                type="button"
                class="modern-theme-choice active"
                data-style="scientific-white"
                aria-pressed="true"
              >
                <span class="modern-theme-choice-icon scientific" aria-hidden="true">
                  <FlaskConical size={20} strokeWidth={1.8} />
                </span>
                <span class="modern-theme-choice-copy">
                  <strong data-i18n="themeScientificWhite">科研白底</strong>
                  <small data-i18n="themeScientificWhiteHint">清晰、低干扰，适合录入与研究核对</small>
                </span>
                <Check class="modern-theme-choice-check" size={17} aria-hidden="true" />
              </button>
              <button
                type="button"
                class="modern-theme-choice"
                data-style="liquid-glass"
                aria-pressed="false"
              >
                <span class="modern-theme-choice-icon liquid" aria-hidden="true">
                  <Sparkles size={20} strokeWidth={1.8} />
                </span>
                <span class="modern-theme-choice-copy">
                  <strong data-i18n="themeLiquidGlass">液态玻璃</strong>
                  <small data-i18n="themeLiquidGlassHint">明亮通透，强化空间层级与操作反馈</small>
                </span>
                <Check class="modern-theme-choice-check" size={17} aria-hidden="true" />
              </button>
            </div>
          </section>

          <section class="modern-theme-section modern-theme-controls" aria-labelledby="themeDisplayHeading">
            <div class="modern-theme-section-heading">
              <div>
                <h3 id="themeDisplayHeading" data-i18n="themeDisplayHeading">显示偏好</h3>
                <p class="subtle" data-i18n="themeDisplayHint">只保留高频设置，减少重复调节项</p>
              </div>
            </div>

            <div class="modern-theme-control-row">
              <label class="modern-theme-label" for="themeAccentColor">
                <span data-i18n="themeAccentColor">主要强调色</span>
                <small id="themeAccentValue">#2F6F62</small>
              </label>
              <input id="themeAccentColor" class="modern-color-input" type="color" value="#2F6F62" />
            </div>

            <div class="modern-theme-control-row">
              <div class="modern-theme-label">
                <span data-i18n="themeDensity">信息密度</span>
                <small data-i18n="themeDensityHint">紧凑模式适合小屏和批量核对</small>
              </div>
              <div id="themeDensityControls" class="modern-segmented" role="group" aria-label="信息密度">
                <button type="button" class="active" data-density="comfortable" aria-pressed="true">
                  <span data-i18n="themeDensityComfortable">舒适</span>
                </button>
                <button type="button" data-density="compact" aria-pressed="false">
                  <span data-i18n="themeDensityCompact">紧凑</span>
                </button>
              </div>
            </div>

            <div class="modern-theme-control-row">
              <label class="modern-theme-label" for="motionMode">
                <span data-i18n="motionMode">动画模式</span>
                <small data-i18n="themeMotionHint">动画仅用于状态变化和空间反馈</small>
              </label>
              <select id="motionMode" class="input modern-theme-select">
                <option value="off" data-i18n="motionModeOff">关闭</option>
                <option value="minimal" data-i18n="motionModeMinimal">简约</option>
                <option value="standard" data-i18n="motionModeStandard">标准</option>
              </select>
            </div>

            <label class="modern-theme-control-row modern-theme-toggle-row" for="motionReduced">
              <span class="modern-theme-label">
                <span data-i18n="motionReduced">减少动态效果</span>
                <small data-i18n="motionReducedHint">保留必要反馈，关闭位移与缩放效果</small>
              </span>
              <input id="motionReduced" class="modern-switch" type="checkbox" />
            </label>
          </section>

          <section class="modern-theme-section modern-theme-preview-section" aria-labelledby="themePreviewHeading">
            <div class="modern-theme-section-heading">
              <div>
                <h3 id="themePreviewHeading" data-i18n="themePreviewTitle">界面预览</h3>
                <p class="subtle" data-i18n="themePreviewHint">颜色和质感会立即应用，保存后写入当前项目</p>
              </div>
              <Gauge size={18} aria-hidden="true" />
            </div>
            <div id="themePreviewCard" class="modern-theme-preview" data-preview-style="scientific-white">
              <div class="modern-preview-toolbar">
                <i />
                <i />
                <i />
              </div>
              <div class="modern-preview-body">
                <div class="modern-preview-map">
                  <span />
                  <b />
                </div>
                <div class="modern-preview-panel">
                  <strong data-i18n="themePreviewMetric">点位记录</strong>
                  <span>128</span>
                  <div class="modern-preview-bars">
                    <i />
                    <i />
                    <i />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <footer class="modern-theme-footer">
          <button id="btnResetThemeAll" class="btn btn-soft" type="button">
            <RotateCcw size={16} aria-hidden="true" />
            <span data-i18n="themeResetAll">恢复默认主题</span>
          </button>
          <button id="btnSaveTheme" class="btn btn-primary" type="button">
            <Check size={16} aria-hidden="true" />
            <span data-i18n="themeSave">保存界面设置</span>
          </button>
        </footer>
      </section>
    </div>
  );
}
