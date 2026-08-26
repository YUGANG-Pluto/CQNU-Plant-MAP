import { animate, hover, inView, stagger } from 'motion';

const easeOut = [0.22, 1, 0.36, 1] as const;
const easeStandard = [0.4, 0, 0.2, 1] as const;

interface WorkspaceMotionKernel {
  openLayer(layer: HTMLElement): void;
  reveal(target: Element): void;
}

declare global {
  interface Window {
    cqnuMotionKernel?: Readonly<WorkspaceMotionKernel>;
  }
}

function reducedMotion(): boolean {
  return document.documentElement.classList.contains('motion-disabled')
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function reveal(target: Element): void {
  if (reducedMotion() || target.hasAttribute('data-motion-revealed')) return;
  target.setAttribute('data-motion-revealed', 'true');
  animate(
    target,
    { opacity: [0, 1], y: [18, 0], scale: [0.988, 1] },
    { duration: 0.64, ease: easeOut }
  );
}

function openLayer(layer: HTMLElement): void {
  if (reducedMotion()) return;
  layer.setAttribute('data-motion-managed', 'true');
  const backdrop = layer.querySelector<HTMLElement>('.layer-modal-backdrop, .image-modal-backdrop');
  const panel = layer.querySelector<HTMLElement>(
    '.layer-modal-panel, .confirm-panel, .image-modal-content, .right-inspector-drawer-panel, .workspace-utility-panel, .stats-fullscreen-panel'
  );
  if (backdrop) {
    animate(backdrop, { opacity: [0, 0.34] }, { duration: 0.42, ease: easeStandard });
  }
  if (panel) {
    animate(
      panel,
      {
        opacity: [0, 1],
        y: [24, 0],
        scale: [0.97, 1],
        filter: ['blur(7px)', 'blur(0px)']
      },
      { duration: 0.68, ease: easeOut }
    );
  }
}

function installLayerObserver(): void {
  const observer = new MutationObserver(records => {
    for (const record of records) {
      const layer = record.target;
      if (!(layer instanceof HTMLElement) || !layer.matches('.layer-modal, .image-modal')) continue;
      if (layer.classList.contains('hidden') || layer.classList.contains('is-closing')) {
        layer.removeAttribute('data-motion-managed');
      } else if (!layer.hasAttribute('data-motion-managed')) {
        openLayer(layer);
      }
    }
  });
  for (const layer of document.querySelectorAll('.layer-modal, .image-modal')) {
    observer.observe(layer, { attributes: true, attributeFilter: ['class'] });
  }
}

function installWorkspaceSequence(): void {
  const headerParts = document.querySelectorAll('.app-brand-block, .app-topbar-actions');
  if (headerParts.length) {
    animate(
      headerParts,
      { opacity: [0, 1], y: [-16, 0], scale: [0.99, 1] },
      { duration: 0.7, delay: stagger(0.09), ease: easeOut }
    );
  }
  const launchers = document.querySelectorAll('.ui-module-launcher .ui-module-button');
  if (launchers.length) {
    animate(
      launchers,
      { opacity: [0, 1], x: [-18, 0], scale: [0.985, 1] },
      { duration: 0.66, delay: stagger(0.065), ease: easeOut }
    );
  }
  const workspaceSurfaces = document.querySelectorAll('.map-workbar, .context-inspector, .web-project-welcome');
  if (workspaceSurfaces.length) {
    animate(
      workspaceSurfaces,
      { opacity: [0, 1], y: [20, 0] },
      { duration: 0.72, delay: stagger(0.08, { startDelay: 0.12 }), ease: easeOut }
    );
  }
}

function installViewportReveals(): void {
  inView(
    '.panel, .card, .stats-chart-card, .stats-table-panel, .data-card',
    element => reveal(element),
    { amount: 0.14, margin: '0px 0px -6% 0px' }
  );
}

function installGlassGestures(): void {
  hover('.glass-interactive', element => {
    const enter = animate(
      element,
      { scale: 1.018, y: -2 },
      { duration: 0.38, ease: easeOut }
    );
    return () => {
      enter.stop();
      animate(element, { scale: 1, y: 0 }, { duration: 0.42, ease: easeOut });
    };
  });
}

export function installMotionKernel(): Readonly<WorkspaceMotionKernel> {
  if (window.cqnuMotionKernel) return window.cqnuMotionKernel;
  const kernel = Object.freeze({ openLayer, reveal });
  Object.defineProperty(window, 'cqnuMotionKernel', {
    configurable: false,
    enumerable: false,
    writable: false,
    value: kernel
  });
  document.documentElement.dataset.motionEngine = 'motion';
  document.documentElement.classList.add('motion-kernel-ready');
  if (!reducedMotion()) {
    requestAnimationFrame(() => {
      installWorkspaceSequence();
      installViewportReveals();
      installGlassGestures();
      installLayerObserver();
    });
  }
  return kernel;
}
