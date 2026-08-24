import { CheckCircle2, ChevronDown, ShieldAlert, ShieldCheck } from 'lucide-preact';
import type { PlatformWebCapabilityReport } from '../../../shared/types/platform';

const CAPABILITY_LABEL_KEYS: Record<string, { key: string; label: string }> = {
  webAssembly: { key: 'webCapabilityWebAssembly', label: 'WebAssembly 计算' },
  worker: { key: 'webCapabilityWorker', label: '后台数据库线程' },
  opfs: { key: 'webCapabilityOpfs', label: 'OPFS 本地存储' },
  webLocks: { key: 'webCapabilityLocks', label: '多标签写入锁' },
  indexedDb: { key: 'webCapabilityIndexedDb', label: '目录授权记录' },
  cacheStorage: { key: 'webCapabilityCache', label: '本地图片缓存' },
  secureRandom: { key: 'webCapabilityRandom', label: '安全本地标识' },
  directoryPicker: { key: 'webCapabilityDirectory', label: '项目目录镜像' },
  fileSelection: { key: 'webCapabilityFileSelection', label: '本地文件选择' },
  downloads: { key: 'webCapabilityDownloads', label: '备份与导出下载' }
};

function statusFor(item: PlatformWebCapabilityReport['items'][number]) {
  if (item.available) return { key: 'webCapabilityAvailable', label: '可用' };
  if (!item.required) return { key: 'webCapabilityFallback', label: '文件模式回退' };
  return { key: 'webCapabilityMissing', label: '缺失' };
}

export function WebCapabilityDisclosure() {
  const report = window.platformAdapter?.web?.capabilityReport;
  if (!report) return null;
  const mode = report.mode;
  const modeText = mode === 'full'
    ? { key: 'webCapabilityModeFull', label: '完整本地模式' }
    : mode === 'portable'
      ? { key: 'webCapabilityModePortable', label: '兼容文件模式' }
      : { key: 'webCapabilityModeBlocked', label: '当前浏览器不可用' };
  const hint = mode === 'full'
    ? { key: 'webCapabilityHintFull', label: 'SQLite 主库与授权目录镜像均可用。' }
    : mode === 'portable'
      ? { key: 'webCapabilityHintPortable', label: 'SQLite 主库可用；通过文件选择与下载交换项目和备份。' }
      : { key: 'webCapabilityHintBlocked', label: '缺少本地数据库必需能力，请改用最新版 Chromium 或桌面版。' };
  const StatusIcon = mode === 'blocked' ? ShieldAlert : ShieldCheck;

  return (
    <details class={`web-capability-disclosure is-${mode}`} open={mode === 'blocked'}>
      <summary>
        <StatusIcon size={14} aria-hidden="true" />
        <span data-i18n={modeText.key}>{modeText.label}</span>
        <ChevronDown class="web-capability-chevron" size={14} aria-hidden="true" />
      </summary>
      <div class="web-capability-popover" role="status">
        <div class="web-capability-heading">
          <strong data-i18n="webCapabilityTitle">浏览器本地能力</strong>
          <span data-i18n={modeText.key}>{modeText.label}</span>
        </div>
        <p data-i18n={hint.key}>{hint.label}</p>
        <ul>
          {report.items.map(item => {
            const label = CAPABILITY_LABEL_KEYS[item.id] || {
              key: 'webCapabilityUnknown',
              label: item.id
            };
            const status = statusFor(item);
            return (
              <li key={item.id} class={item.available ? 'is-available' : item.required ? 'is-missing' : 'is-fallback'}>
                <CheckCircle2 size={13} aria-hidden="true" />
                <span data-i18n={label.key}>{label.label}</span>
                <strong data-i18n={status.key}>{status.label}</strong>
              </li>
            );
          })}
        </ul>
        <small data-i18n="webCapabilityPrivacy">检测只读取当前浏览器能力，不读取或上传项目数据。</small>
      </div>
    </details>
  );
}
