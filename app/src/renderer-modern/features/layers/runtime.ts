import type {
  LayerCloseOptions,
  LayerManagerController,
  LayerOpenOptions
} from './types';

const ELEVATED_LAYER_SELECTOR = '.layer-modal, .image-modal, .stats-fullscreen-layer';

declare global {
  interface Window {
    cqnuLayerManager?: LayerManagerController;
  }
}

function motionDurationMs(variableName: string, fallback = 580): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
  const match = raw.match(/^([\d.]+)\s*(ms|s)?$/i);
  const value = match
    ? Number(match[1]) * (String(match[2] || '').toLowerCase() === 's' ? 1000 : 1)
    : Number.NaN;
  return Number.isFinite(value) ? Math.max(260, value) : Math.max(260, fallback);
}

function focusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  const selector = [
    'button:not([disabled])',
    '[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');
  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(node => (
    node.getAttribute('aria-hidden') !== 'true' && node.getClientRects().length > 0
  ));
}

function firstFocusableElement(container: HTMLElement | null): HTMLElement | null {
  return focusableElements(container)[0]
    || container?.querySelector<HTMLElement>('[role="dialog"], [role="alertdialog"]')
    || null;
}

export function createLayerManager(): LayerManagerController {
  const returnFocusTargets = new WeakMap<HTMLElement, HTMLElement>();
  let openSequence = 0;

  function visibleLayers(): HTMLElement[] {
    return Array.from(document.querySelectorAll<HTMLElement>(ELEVATED_LAYER_SELECTOR))
      .filter(layer => !layer.classList.contains('hidden') && !layer.classList.contains('is-closing'));
  }

  function presentedLayers(): HTMLElement[] {
    return Array.from(document.querySelectorAll<HTMLElement>(ELEVATED_LAYER_SELECTOR))
      .filter(layer => !layer.classList.contains('hidden'));
  }

  function getTopLayer(): HTMLElement | null {
    return visibleLayers()
      .map((layer, index) => ({ layer, index, order: Number(layer.dataset.layerOrder || 0) }))
      .sort((left, right) => left.order - right.order || left.index - right.index)
      .at(-1)?.layer || null;
  }

  function syncDocumentState(): void {
    const hasVisibleLayer = Array.from(document.querySelectorAll<HTMLElement>(ELEVATED_LAYER_SELECTOR))
      .some(layer => !layer.classList.contains('hidden'));
    document.body?.classList.toggle('has-open-layer-modal', hasVisibleLayer);
    if (!hasVisibleLayer) openSequence = 0;
  }

  function isVisibleFocusTarget(target: HTMLElement | null | undefined): boolean {
    return Boolean(target?.isConnected && target.getClientRects().length > 0 && !target.closest('[inert]'));
  }

  function resolveFocusReturnTarget(target: HTMLElement | null | undefined): HTMLElement | null {
    if (isVisibleFocusTarget(target)) return target ?? null;
    let ancestor = target?.parentElement || null;
    const controllers = Array.from(document.querySelectorAll<HTMLElement>('[aria-controls]'));
    while (ancestor) {
      if (ancestor.id) {
        const controller = controllers.find(candidate => (
          candidate.getAttribute('aria-controls') === ancestor?.id && isVisibleFocusTarget(candidate)
        ));
        if (controller) return controller;
      }
      ancestor = ancestor.parentElement;
    }
    return null;
  }

  function restoreFocus(target: HTMLElement | null | undefined): void {
    const focusTarget = resolveFocusReturnTarget(target);
    if (!focusTarget) return;
    const topLayer = getTopLayer();
    if (!topLayer || topLayer.contains(focusTarget)) focusTarget.focus({ preventScroll: true });
  }

  function open(layer: HTMLElement | null | undefined, options: LayerOpenOptions = {}): void {
    if (!layer) return;
    const wasHidden = layer.classList.contains('hidden');
    const wasClosing = layer.classList.contains('is-closing');
    if (layer.dataset.closeTimer) {
      window.clearTimeout(Number(layer.dataset.closeTimer));
      delete layer.dataset.closeTimer;
    }
    if (wasHidden || wasClosing) {
      const origin = document.activeElement;
      if (origin instanceof HTMLElement && origin !== document.body && !layer.contains(origin)) {
        returnFocusTargets.set(layer, origin);
      }
      if (!presentedLayers().length) openSequence = 0;
      openSequence += 1;
      layer.dataset.layerOrder = String(openSequence);
      layer.style.setProperty('--layer-order', String(openSequence));
    }
    layer.classList.remove('hidden', 'is-closing');
    layer.inert = false;
    layer.classList.add('is-open');
    layer.setAttribute('aria-hidden', 'false');
    window.cqnuMotionKernel?.openLayer?.(layer);
    syncDocumentState();
    if (options.focus !== false) {
      window.requestAnimationFrame(() => {
        (options.focusTarget || firstFocusableElement(layer))?.focus({ preventScroll: true });
      });
    }
  }

  function close(layer: HTMLElement | null | undefined, options: LayerCloseOptions = {}): void {
    if (!layer || layer.classList.contains('hidden')) return;
    const returnFocus = options.returnFocus || returnFocusTargets.get(layer);
    const motionDisabled = document.documentElement.classList.contains('motion-disabled');
    const duration = options.instant || motionDisabled ? 0 : motionDurationMs('--motion-duration');
    layer.classList.add('is-closing');
    layer.inert = true;
    layer.classList.remove('is-open');
    layer.setAttribute('aria-hidden', 'true');

    let closed = false;
    const finishClose = () => {
      if (closed) return;
      closed = true;
      if (layer.dataset.closeTimer) window.clearTimeout(Number(layer.dataset.closeTimer));
      layer.classList.add('hidden');
      layer.classList.remove('is-closing');
      delete layer.dataset.closeTimer;
      delete layer.dataset.layerOrder;
      layer.style.removeProperty('--layer-order');
      returnFocusTargets.delete(layer);
      syncDocumentState();
      options.onClosed?.(layer);
      if (options.restoreFocus !== false) restoreFocus(returnFocus);
    };

    if (duration <= 1) {
      finishClose();
      return;
    }
    if (typeof window.cqnuMotionKernel?.closeLayer === 'function') {
      const timer = window.setTimeout(finishClose, duration + 120);
      layer.dataset.closeTimer = String(timer);
      Promise.resolve(window.cqnuMotionKernel.closeLayer(layer)).then(finishClose, finishClose);
      return;
    }
    layer.dataset.closeTimer = String(window.setTimeout(finishClose, duration));
  }

  function trapFocus(event: KeyboardEvent): boolean {
    if (event.key !== 'Tab') return false;
    const layer = getTopLayer();
    if (!layer) return false;
    const focusable = focusableElements(layer);
    if (!focusable.length) {
      event.preventDefault();
      firstFocusableElement(layer)?.focus({ preventScroll: true });
      return true;
    }
    const first = focusable[0];
    const last = focusable.at(-1) || first;
    const active = document.activeElement;
    if (!layer.contains(active) || (event.shiftKey && active === first) || (!event.shiftKey && active === last)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus({ preventScroll: true });
    }
    return true;
  }

  return Object.freeze({
    version: 'layer-manager-v1' as const,
    getDurationMs: motionDurationMs,
    getTopLayer,
    open,
    close,
    trapFocus,
    syncDocumentState
  });
}

export function installLayerManagerBridge(): LayerManagerController {
  if (window.cqnuLayerManager) return window.cqnuLayerManager;
  const manager = createLayerManager();
  Object.defineProperty(window, 'cqnuLayerManager', {
    configurable: false,
    enumerable: false,
    writable: false,
    value: manager
  });
  document.documentElement.dataset.layerManager = manager.version;
  return manager;
}
