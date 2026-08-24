import type { ComponentChildren } from 'preact';
import { X } from 'lucide-preact';

interface FieldProps {
  id?: string;
  labelKey: string;
  label: string;
  className?: string;
  children: ComponentChildren;
}

function Field({ id, labelKey, label, className = '', children }: FieldProps) {
  return (
    <div class={`field ${className}`.trim()}>
      <label for={id} data-i18n={labelKey}>{label}</label>
      {children}
    </div>
  );
}

interface InputFieldProps {
  id: string;
  labelKey: string;
  label: string;
  className?: string;
  inputClass?: string;
  type?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  value?: string | number;
  autoComplete?: string;
}

function InputField({
  id,
  labelKey,
  label,
  className,
  inputClass = '',
  type,
  placeholder,
  min,
  max,
  value,
  autoComplete
}: InputFieldProps) {
  return (
    <Field id={id} labelKey={labelKey} label={label} className={className}>
      <input
        id={id}
        class={`input ${inputClass}`.trim()}
        type={type}
        placeholder={placeholder}
        min={min}
        max={max}
        value={value}
        autocomplete={autoComplete}
      />
    </Field>
  );
}

const basemapTabs = [
  ['source', 'basemapTabSource', '主底图'],
  ['overlay', 'basemapTabOverlay', '标记与路网覆盖层'],
  ['status', 'basemapTabStatus', '状态检测'],
  ['protocol', 'basemapTabProtocol', '协议统一'],
  ['coord', 'basemapTabCoord', '坐标基准'],
  ['correction', 'basemapTabCorrection', '手动纠偏'],
  ['report', 'basemapTabReport', '检测报告']
] as const;

const sourceTypes = ['xyz', 'wmts', 'wms'] as const;
const coordinateSystems = ['WGS84', 'GCJ02', 'BD09'] as const;

function TypeSelect({ id }: { id: string }) {
  return (
    <select id={id} class="input">
      {sourceTypes.map(type => <option key={type} value={type}>{type.toUpperCase()}</option>)}
    </select>
  );
}

function CoordinateSelect({ id }: { id: string }) {
  return (
    <select id={id} class="input">
      {coordinateSystems.map(value => <option key={value} value={value}>{value}</option>)}
    </select>
  );
}

function BooleanSelect({ id }: { id: string }) {
  return (
    <select id={id} class="input">
      <option value="true" data-i18n="yes">是</option>
      <option value="false" data-i18n="no">否</option>
    </select>
  );
}

export function BasemapWorkspaceModal() {
  return (
    <div id="basemapWorkspaceModal" class="layer-modal hidden">
      <div class="layer-modal-backdrop" />
      <section
        class="layer-modal-panel glass basemap-workspace-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="basemapWorkspaceTitle"
      >
        <header class="layer-modal-header basemap-modal-header">
          <div class="basemap-modal-title">
            <h2 id="basemapWorkspaceTitle" data-i18n="basemapWorkspaceTitle">底图设置</h2>
            <p class="subtle" data-i18n="basemapWorkspaceSubtitle">
              底图源、状态检测、协议统一和坐标基准统一收纳在工作区二级面板。
            </p>
          </div>
          <div class="basemap-modal-summary" id="basemapModalSummary">WGS84 / z=— / ?</div>
          <button
            id="btnCloseBasemapWorkspaceModal"
            class="btn btn-soft layer-close modern-icon-button"
            type="button"
            aria-label="关闭"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <nav id="basemapModalTabs" class="basemap-modal-tabs" role="tablist" aria-label="Basemap workspace tabs">
          {basemapTabs.map(([tab, key, label], index) => (
            <button
              key={tab}
              class={`seg-btn basemap-tab ${index === 0 ? 'active' : ''}`}
              data-basemap-tab={tab}
              data-i18n={key}
              type="button"
            >
              {label}
            </button>
          ))}
        </nav>

        <div id="basemapEditor" class="basemap-editor basemap-settings-panel">
          <section class="basemap-settings-section basemap-tab-panel active" data-basemap-panel="source">
            <div class="theme-section-head">
              <h3 data-i18n="basemapSourceManage">底图源管理</h3>
              <span class="pill" data-i18n="basemapManualEdit">手动编辑</span>
            </div>
            <div class="basemap-source-grid">
              <Field id="bmEditTarget" labelKey="editTargetBaseMap" label="编辑目标底图">
                <select id="bmEditTarget" class="input" />
              </Field>
              <InputField id="bmNameZh" labelKey="baseMapNameZh" label="名称（中文）" />
              <InputField id="bmNameEn" labelKey="baseMapNameEn" label="Name (English)" />
              <Field id="bmType" labelKey="sourceType" label="类型"><TypeSelect id="bmType" /></Field>
              <Field id="bmCoordSystem" labelKey="basemapCoordSystem" label="坐标基准">
                <CoordinateSelect id="bmCoordSystem" />
              </Field>
              <InputField id="bmMaxNativeZoom" labelKey="maxNativeZoom" label="原生最大层级" type="number" min={1} max={24} value={18} />
              <InputField id="bmMaxZoom" labelKey="maxZoom" label="最大缩放" type="number" min={1} max={24} value={22} />
              <InputField id="bmProvider" labelKey="basemapProvider" label="服务商" placeholder="OpenStreetMap / Amap / Custom" />
              <InputField id="bmSourceLabel" labelKey="basemapSourceLabel" label="来源展示" placeholder="Amap / AutoNavi" />
              <InputField id="bmToken" labelKey="basemapToken" label="服务 Key" type="password" autoComplete="off" placeholder="{key} / {token}" />
              <InputField id="bmTileSize" labelKey="tileSize" label="瓦片尺寸" type="number" min={128} max={512} value={256} />
              <InputField id="bmZoomOffset" labelKey="zoomOffset" label="缩放偏移" type="number" min={-2} max={2} value={0} />
              <Field labelKey="basemapCoordHint" label="内部数据标准">
                <div class="path-box nowrap">WGS84</div>
              </Field>
              <InputField id="bmUrl" labelKey="urlTemplate" label="URL / 模板" className="field-span-2" inputClass="mono-input" />
              <InputField id="bmAttribution" labelKey="attribution" label="署名" className="field-span-2" />
              <InputField id="bmTermsUrl" labelKey="basemapTermsUrl" label="服务条款链接" className="field-span-2" inputClass="mono-input" placeholder="https://..." />
              <InputField id="bmReviewNumber" labelKey="basemapReviewNumber" label="审图号 / 备案号" />
              <InputField id="bmSubdomains" labelKey="subdomains" label="子域名" placeholder="abc" />
              <InputField id="bmLayers" labelKey="layers" label="图层名（WMS）" />
              <InputField id="bmFormat" labelKey="format" label="格式（WMS）" placeholder="image/png" />
              <Field id="bmTransparent" labelKey="transparency" label="透明"><BooleanSelect id="bmTransparent" /></Field>
            </div>
            <div class="toolbar-inline basemap-source-actions">
              <button id="btnNewBaseMap" class="btn btn-soft" data-i18n="newBaseMap">新建底图</button>
              <button id="btnSaveBaseMap" class="btn btn-primary" data-i18n="saveBaseMap">保存底图</button>
              <button id="btnDeleteBaseMap" class="btn btn-danger-soft" data-i18n="deleteBaseMap">删除底图</button>
            </div>
          </section>

          <section class="basemap-settings-section basemap-tab-panel" data-basemap-panel="overlay">
            <div class="theme-section-head">
              <h3 data-i18n="basemapOverlayManage">标记与路网覆盖层</h3>
              <span class="pill" data-i18n="basemapOverlaySeparated">独立叠加层</span>
            </div>
            <div class="basemap-overlay-layout">
              <div class="basemap-overlay-side">
                <Field id="bmOverlayTarget" labelKey="basemapOverlayTarget" label="覆盖层">
                  <select id="bmOverlayTarget" class="input" />
                </Field>
                <div id="basemapOverlayStatusPanel" class="basemap-overlay-status-panel" />
              </div>
              <div class="basemap-overlay-form-grid">
                <InputField id="bmOverlayNameZh" labelKey="basemapOverlayNameZh" label="名称（中文）" />
                <InputField id="bmOverlayNameEn" labelKey="basemapOverlayNameEn" label="Name (English)" />
                <Field id="bmOverlayEnabled" labelKey="enabled" label="启用"><BooleanSelect id="bmOverlayEnabled" /></Field>
                <Field id="bmOverlayType" labelKey="sourceType" label="类型"><TypeSelect id="bmOverlayType" /></Field>
                <InputField id="bmOverlayProvider" labelKey="basemapProvider" label="服务商" placeholder="Amap / Custom" />
                <InputField id="bmOverlaySourceLabel" labelKey="basemapSourceLabel" label="来源展示" placeholder="Amap / AutoNavi" />
                <Field id="bmOverlayCoordSystem" labelKey="basemapCoordSystem" label="坐标基准">
                  <CoordinateSelect id="bmOverlayCoordSystem" />
                </Field>
                <InputField id="bmOverlayMaxNativeZoom" labelKey="maxNativeZoom" label="原生最大层级" type="number" min={0} max={24} value={18} />
                <InputField id="bmOverlayMaxZoom" labelKey="maxZoom" label="最大缩放" type="number" min={0} max={24} value={22} />
                <InputField id="bmOverlayUrl" labelKey="basemapOverlayUrl" label="覆盖层 API / URL 模板" className="field-span-2" inputClass="mono-input" placeholder="https://.../{z}/{x}/{y}.png" />
                <InputField id="bmOverlaySubdomains" labelKey="subdomains" label="子域名" placeholder="1234 / abc" />
                <InputField id="bmOverlayToken" labelKey="basemapOverlayToken" label="Token / Key" type="password" autoComplete="off" placeholder="可选，支持 {token}/{key}" />
                <InputField id="bmOverlayTermsUrl" labelKey="basemapTermsUrl" label="服务条款链接" className="field-span-2" inputClass="mono-input" placeholder="https://..." />
                <InputField id="bmOverlayReviewNumber" labelKey="basemapReviewNumber" label="审图号 / 备案号" />
                <Field id="bmOverlayOpacity" labelKey="basemapOverlayOpacity" label="透明度">
                  <strong id="bmOverlayOpacityValue">100%</strong>
                  <input id="bmOverlayOpacity" type="range" min="0" max="1" step="0.05" value="1" />
                </Field>
                <InputField id="bmOverlayZIndex" labelKey="basemapOverlayZIndex" label="渲染层级 zIndex" type="number" min={1} max={999} value={420} />
                <InputField id="bmOverlayAttach" labelKey="basemapOverlayAttach" label="绑定主底图 ID" className="field-span-2" inputClass="mono-input" placeholder="amap-satellite，多个用英文逗号分隔" />
                <Field id="bmOverlayNotes" labelKey="basemapOverlayNotes" label="备注" className="field-span-2">
                  <textarea id="bmOverlayNotes" class="input textarea compact-textarea" />
                </Field>
              </div>
            </div>
            <div class="toolbar-inline basemap-source-actions">
              <button id="btnNewOverlay" class="btn btn-soft" data-i18n="basemapOverlayNew">新建覆盖层</button>
              <button id="btnTestOverlay" class="btn btn-soft" data-i18n="basemapOverlayTest">静态检测</button>
              <button id="btnSaveOverlay" class="btn btn-primary" data-i18n="basemapOverlaySave">保存覆盖层</button>
              <button id="btnResetBuiltinOverlays" class="btn btn-soft" data-i18n="basemapOverlayRestoreDefault">
                恢复默认覆盖层
              </button>
            </div>
            <p class="help" data-i18n="basemapOverlayHelp">
              覆盖层用于路网、道路名称、地名和 POI 注记，透明叠加在主底图上；也遵守 maxNativeZoom 后本地放大。
            </p>
          </section>

          <section class="basemap-settings-section basemap-tab-panel" data-basemap-panel="status">
            <div class="theme-section-head">
              <h3 data-i18n="basemapWorkStatus">底图工作状态</h3>
              <span id="basemapStatusBadge" class="status-badge status-unknown">?</span>
            </div>
            <div id="basemapDetailPanel" class="basemap-detail-panel" />
          </section>

          <section class="basemap-settings-section basemap-tab-panel" data-basemap-panel="protocol">
            <div class="theme-section-head"><h3 data-i18n="basemapTabProtocol">协议统一</h3></div>
            <label class="switch-card basemap-auto-card">
              <span>
                <strong data-i18n="autoNormalizeBasemap">自动统一底图协议</strong>
                <small data-i18n="autoNormalizeBasemapHint">
                  新增或切换底图时自动补齐协议字段；不会批量修改旧坐标。
                </small>
              </span>
              <button
                id="autoNormalizeBasemapSwitch"
                class="toggle-switch"
                type="button"
                role="switch"
                aria-checked="true"
                data-switch="autoNormalizeBasemap"
              >
                <span class="toggle-switch-knob" />
              </button>
            </label>
            <div class="basemap-protocol-grid">
              <div class="info-tile"><strong>type</strong><span>XYZ / WMTS / WMS</span></div>
              <div class="info-tile"><strong>coordSystem</strong><span>WGS84 / GCJ02 / BD09</span></div>
              <div class="info-tile">
                <strong>maxNativeZoom / maxZoom</strong>
                <span data-i18n="basemapProtocolZoomHint">拆分原生层级与客户端放大层级</span>
              </div>
              <div class="info-tile">
                <strong>transparent / isOverlay</strong>
                <span data-i18n="basemapProtocolOverlayHint">规范叠加层与透明字段</span>
              </div>
              <div class="info-tile">
                <strong>subdomains</strong>
                <span data-i18n="basemapProtocolSubdomainHint">规范子域名字段</span>
              </div>
              <div class="info-tile">
                <strong>URL</strong>
                <span data-i18n="basemapProtocolUrlHint">检测 {'{x}/{y}/{z}'} 或 WMS 图层参数</span>
              </div>
            </div>
            <p class="help" data-i18n="basemapManualApplyHint">
              关闭自动统一协议后，仅检测并显示建议；可通过“统一底图配置”手动应用。
            </p>
          </section>

          <section class="basemap-settings-section basemap-tab-panel" data-basemap-panel="coord">
            <div class="theme-section-head"><h3 data-i18n="basemapTabCoord">坐标基准</h3></div>
            <div class="coord-rule-grid">
              <div class="info-tile">
                <strong data-i18n="basemapStatusCoord">坐标基准</strong>
                <span id="basemapCoordRuleCurrent">—</span>
              </div>
              <div class="info-tile">
                <strong data-i18n="basemapStatusData">内部数据</strong>
                <span>WGS84</span>
              </div>
              <div class="info-tile">
                <strong>GeoJSON / CSV</strong>
                <span data-i18n="basemapCoordExportRule">导出坐标保持 [lng, lat] 与 WGS84 语义。</span>
              </div>
              <div class="info-tile">
                <strong>EXIF</strong>
                <span data-i18n="basemapCoordExifRule">图片坐标按原有 EXIF 读取逻辑写入，不在此自动批量纠偏。</span>
              </div>
            </div>
            <div class="hint-box" data-i18n="basemapCoordSafetyHint">
              底图显示转换与采点保存转换遵循既有 WGS84 内部存储原则；旧数据纠偏必须由用户确认。
            </div>
          </section>

          <section class="basemap-settings-section basemap-tab-panel" data-basemap-panel="correction">
            <div class="theme-section-head"><h3 data-i18n="basemapCorrectionTools">手动纠偏工具</h3></div>
            <div class="toolbar-grid two-rows basemap-standard-actions">
              <button id="btnCorrectSelectionGcj" class="btn btn-soft" data-i18n="correctSelectionGcj">
                选中对象 GCJ02→WGS84
              </button>
              <button id="btnCorrectSelectionBd" class="btn btn-soft" data-i18n="correctSelectionBd">
                选中对象 BD09→WGS84
              </button>
              <button id="btnUndoCoordCorrection" class="btn btn-soft" data-i18n="undoCoordCorrection">
                撤销最近纠偏
              </button>
            </div>
            <p class="help" data-i18n="baseMapHelp">支持 XYZ、WMTS 与 WMS。空间数据内部统一按 WGS84 保存。</p>
          </section>

          <section class="basemap-settings-section basemap-tab-panel" data-basemap-panel="report">
            <div class="theme-section-head"><h3 data-i18n="basemapReportTitle">检测报告</h3></div>
            <div id="basemapReportPanel" class="basemap-report-panel" />
          </section>
        </div>

        <footer class="basemap-modal-footer">
          <button id="btnBasemapDetect" class="btn btn-soft" data-i18n="basemapDetect">底图状态检测</button>
          <button id="btnBasemapStandardize" class="btn btn-soft" data-i18n="basemapStandardize">统一底图配置</button>
          <button id="btnCloseBasemapWorkspaceFooter" class="btn btn-primary" data-i18n="closePanel">关闭</button>
        </footer>
      </section>
    </div>
  );
}
