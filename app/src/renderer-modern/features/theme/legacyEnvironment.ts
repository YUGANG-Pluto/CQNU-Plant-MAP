export interface LegacyState {
  settings: {
    language?: 'zh' | 'en';
    uiTheme?: unknown;
    statsCustom?: Record<string, unknown>;
  } | null;
}

export type LegacyWindow = Window & typeof globalThis & {
  __CQNU_STATE__?: LegacyState;
  guardMaintenanceReadOnlyAction?: (action: string) => boolean;
  openLayerModal?: (element: HTMLElement | null) => void;
  closeLayerModal?: (element: HTMLElement | null) => void;
  persistProject?: () => Promise<void>;
  scheduleMapResize?: () => void;
  cqnuMotionKernel?: {
    refresh?: () => void;
    feedback?: (target: Element, kind?: 'success' | 'error' | 'attention') => void;
  };
  toast?: (message: string) => void;
  t?: (key: string) => string;
  [key: string]: unknown;
};

export const legacyWindow = window as LegacyWindow;

export function getState(): LegacyState | null {
  return legacyWindow.__CQNU_STATE__ ?? null;
}

function getLanguage(): 'zh' | 'en' {
  return getState()?.settings?.language === 'en' ? 'en' : 'zh';
}

export function translate(key: string, fallback: { zh: string; en: string }): string {
  const translated = typeof legacyWindow.t === 'function' ? legacyWindow.t(key) : '';
  if (translated && translated !== key) return translated;
  return fallback[getLanguage()];
}

export function guard(action: string): boolean {
  return typeof legacyWindow.guardMaintenanceReadOnlyAction === 'function'
    ? legacyWindow.guardMaintenanceReadOnlyAction(action)
    : false;
}
