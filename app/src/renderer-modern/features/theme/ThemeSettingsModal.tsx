import {
  Activity,
  Blend,
  Check,
  CircleOff,
  FlaskConical,
  Gauge,
  Layers3,
  MousePointer2,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Waves,
  X
} from 'lucide-preact';

export function ThemeSettingsModal() {
  return (
    <div id="themeModal" class="layer-modal hidden">
      <div class="layer-modal-backdrop" />
      <section
        class="layer-modal-panel modern-theme-panel"
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
              <span class="modern-theme-kicker" data-i18n="themeCenterKicker">APPEARANCE & MOTION</span>
              <h2 id="modernThemeTitle" data-i18n="themeCenterTitle">界面与动效</h2>
              <p class="subtle" data-i18n="themeCenterSubtitle">
                统一管理科研白底、液态材质、全局转场与交互反馈
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
          <div class="modern-theme-settings-stack">
            <section class="modern-theme-section" aria-labelledby="themeStyleHeading">
              <div class="modern-theme-section-heading">
                <span class="modern-theme-section-icon"><Blend size={17} aria-hidden="true" /></span>
                <div>
                  <h3 id="themeStyleHeading" data-i18n="themeStyleHeading">视觉基底</h3>
                  <p class="subtle" data-i18n="themeStyleHint">内容保持清晰，玻璃仅服务于控制与导航层</p>
                </div>
              </div>
              <div id="themeStylePresets" class="modern-theme-choice-grid">
                <button type="button" class="modern-theme-choice active" data-style="scientific-white" aria-pressed="true">
                  <span class="modern-theme-choice-icon scientific" aria-hidden="true">
                    <FlaskConical size={20} strokeWidth={1.8} />
                  </span>
                  <span class="modern-theme-choice-copy">
                    <strong data-i18n="themeScientificWhite">科研白底</strong>
                    <small data-i18n="themeScientificWhiteHint">稳定白底、高对比信息与低干扰数据面板</small>
                  </span>
                  <Check class="modern-theme-choice-check" size={17} aria-hidden="true" />
                </button>
                <button type="button" class="modern-theme-choice" data-style="liquid-glass" aria-pressed="false">
                  <span class="modern-theme-choice-icon liquid" aria-hidden="true">
                    <Sparkles size={20} strokeWidth={1.8} />
                  </span>
                  <span class="modern-theme-choice-copy">
                    <strong data-i18n="themeLiquidGlass">液态玻璃</strong>
                    <small data-i18n="themeLiquidGlassHint">透明控制层、边缘高光与清晰的空间分层</small>
                  </span>
                  <Check class="modern-theme-choice-check" size={17} aria-hidden="true" />
                </button>
              </div>

              <div class="modern-theme-control-row">
                <label class="modern-theme-label" for="themeAccentColor">
                  <span data-i18n="themeAccentColor">主要强调色</span>
                  <small id="themeAccentValue">#2F6F62</small>
                </label>
                <input id="themeAccentColor" class="modern-color-input" type="color" value="#2F6F62" />
              </div>
            </section>

            <section class="modern-theme-section" aria-labelledby="themeMaterialHeading">
              <div class="modern-theme-section-heading">
                <span class="modern-theme-section-icon"><Layers3 size={17} aria-hidden="true" /></span>
                <div>
                  <h3 id="themeMaterialHeading" data-i18n="themeMaterialHeading">材质与密度</h3>
                  <p class="subtle" data-i18n="themeMaterialHint">选择控制层的透明度与工作区信息密度</p>
                </div>
              </div>
              <div class="modern-theme-control-row">
                <div class="modern-theme-label">
                  <span data-i18n="themeGlassMode">控制层材质</span>
                  <small data-i18n="themeGlassHint">不会改变地图、统计或文件读写逻辑</small>
                </div>
                <div id="themeGlassControls" class="modern-segmented" role="group" aria-label="控制层材质">
                  <button type="button" data-glass-mode="off" aria-pressed="false" data-i18n="themeMaterialSolid">实色</button>
                  <button type="button" class="active" data-glass-mode="light" aria-pressed="true" data-i18n="themeMaterialRegular">标准玻璃</button>
                  <button type="button" data-glass-mode="liquid" aria-pressed="false" data-i18n="themeMaterialClear">通透液态</button>
                </div>
              </div>
              <div class="modern-theme-control-row">
                <div class="modern-theme-label">
                  <span data-i18n="themeDensity">信息密度</span>
                  <small data-i18n="themeDensityHint">紧凑模式适合小屏和批量核对</small>
                </div>
                <div id="themeDensityControls" class="modern-segmented" role="group" aria-label="信息密度">
                  <button type="button" class="active" data-density="comfortable" aria-pressed="true" data-i18n="themeDensityComfortable">舒适</button>
                  <button type="button" data-density="compact" aria-pressed="false" data-i18n="themeDensityCompact">紧凑</button>
                </div>
              </div>
            </section>

            <section class="modern-theme-section modern-theme-motion-section" aria-labelledby="themeMotionHeading">
              <div class="modern-theme-section-heading">
                <span class="modern-theme-section-icon"><Waves size={17} aria-hidden="true" /></span>
                <div>
                  <h3 id="themeMotionHeading" data-i18n="themeMotionHeading">全局动画</h3>
                  <p class="subtle" data-i18n="themeMotionHint">场景转场可中断，活动动画时长不低于 260ms</p>
                </div>
              </div>
              <div id="motionModeControls" class="modern-motion-profile-grid" role="group" aria-label="动画节奏">
                <button type="button" data-motion-mode="minimal" aria-pressed="false">
                  <Gauge size={16} aria-hidden="true" /><strong data-i18n="motionModeMinimalName">舒缓</strong><small>320–560ms</small>
                </button>
                <button type="button" data-motion-mode="standard" aria-pressed="false">
                  <Activity size={16} aria-hidden="true" /><strong data-i18n="motionModeStandardName">平衡</strong><small>440–720ms</small>
                </button>
                <button type="button" class="active" data-motion-mode="expressive" aria-pressed="true">
                  <Sparkles size={16} aria-hidden="true" /><strong data-i18n="motionModeExpressiveName">丰富</strong><small>620–1040ms</small>
                </button>
                <button type="button" data-motion-mode="off" aria-pressed="false">
                  <CircleOff size={16} aria-hidden="true" /><strong data-i18n="motionModeOffName">关闭</strong><small>0ms</small>
                </button>
              </div>
              <div class="modern-theme-control-row">
                <div class="modern-theme-label">
                  <span data-i18n="motionFeedbackHeading">交互反馈</span>
                  <small data-i18n="motionFeedbackHint">控制悬停、按压、完成与错误反馈的力度</small>
                </div>
                <div id="motionFeedbackControls" class="modern-segmented" role="group" aria-label="交互反馈">
                  <button type="button" data-motion-feedback="soft" aria-pressed="false" data-i18n="motionFeedbackSoft">轻柔</button>
                  <button type="button" data-motion-feedback="balanced" aria-pressed="false" data-i18n="motionFeedbackBalanced">清晰</button>
                  <button type="button" class="active" data-motion-feedback="strong" aria-pressed="true" data-i18n="motionFeedbackStrong">鲜明</button>
                </div>
              </div>
              <label class="modern-theme-control-row modern-theme-toggle-row" for="motionAmbient">
                <span class="modern-theme-label">
                  <span data-i18n="motionAmbient">环境动画</span>
                  <small data-i18n="motionAmbientHint">启用预览呼吸、状态脉冲和层级光泽</small>
                </span>
                <input id="motionAmbient" class="modern-switch" type="checkbox" defaultChecked />
              </label>
              <label class="modern-theme-control-row modern-theme-toggle-row" for="motionReduced">
                <span class="modern-theme-label">
                  <span data-i18n="motionReduced">减少动态效果</span>
                  <small data-i18n="motionReducedHint">遵循可访问性偏好并关闭位移与缩放</small>
                </span>
                <input id="motionReduced" class="modern-switch" type="checkbox" />
              </label>
            </section>
          </div>

          <aside class="modern-theme-preview-section" aria-labelledby="themePreviewHeading">
            <div class="modern-theme-section-heading">
              <span class="modern-theme-section-icon"><MousePointer2 size={17} aria-hidden="true" /></span>
              <div>
                <h3 id="themePreviewHeading" data-i18n="themePreviewTitle">实时预览</h3>
                <p class="subtle" data-i18n="themePreviewHint">材质与动态立即应用，保存后写入当前项目</p>
              </div>
            </div>
            <div
              id="themePreviewCard"
              class="modern-theme-preview"
              data-preview-style="scientific-white"
              data-preview-glass="light"
              data-preview-motion="expressive"
            >
              <div class="modern-preview-ambient" aria-hidden="true"><i /><i /></div>
              <div class="modern-preview-toolbar">
                <span class="modern-preview-brand"><i />CQNU Plant MAP</span>
                <span class="modern-preview-pill" data-i18n="themePreviewWorkspace">研究工作区</span>
              </div>
              <div class="modern-preview-body">
                <div class="modern-preview-map">
                  <span class="preview-zone" />
                  <i class="preview-point one" />
                  <i class="preview-point two" />
                  <i class="preview-point three" />
                  <span class="preview-map-label" data-i18n="themePreviewMap">校园植物地图</span>
                </div>
                <div class="modern-preview-panel">
                  <small data-i18n="themePreviewMetric">点位记录</small>
                  <strong>128</strong>
                  <div class="modern-preview-bars"><i /><i /><i /><i /></div>
                  <span class="modern-preview-status"><i /> <span data-i18n="themePreviewSynced">本地数据就绪</span></span>
                </div>
              </div>
              <div class="modern-preview-dock" aria-hidden="true"><i /><i /><i /><i /></div>
            </div>
            <div class="modern-theme-preview-notes">
              <span><i class="material-dot" /><span data-i18n="themePreviewMaterialNote">玻璃用于导航与控制层</span></span>
              <span><i class="content-dot" /><span data-i18n="themePreviewContentNote">研究内容保持清晰白底</span></span>
            </div>
          </aside>
        </div>

        <footer class="modern-theme-footer">
          <button id="btnResetThemeAll" class="btn btn-soft" type="button">
            <RotateCcw size={16} aria-hidden="true" />
            <span data-i18n="themeResetAll">恢复默认</span>
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
