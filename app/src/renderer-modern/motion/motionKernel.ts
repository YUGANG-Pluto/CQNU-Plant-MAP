import { animate, animateView, hover, inView, press } from 'motion';
import { resolveMotionConfig, seconds, type MotionRuntimeConfig } from './motionConfig';
import {
  feedbackScene,
  layerCloseScene,
  layerOpenScene,
  revealScene,
  workspaceEntranceScene,
  type MotionSceneRun
} from './motionScenes';

type FeedbackKind = 'success' | 'error' | 'attention';
type ProjectOpenState = 'opening' | 'ready' | 'error' | 'canceled';

interface WorkspaceMotionKernel {
  openLayer(layer: HTMLElement): void;
  closeLayer(layer: HTMLElement): Promise<void>;
  reveal(target: Element): void;
  feedback(target: Element, kind?: FeedbackKind): void;
  projectOpen(state: ProjectOpenState, target?: Element | null): void;
  transitionView(container: HTMLElement, update: () => void | Promise<void>): Promise<void>;
  refresh(): void;
}

declare global {
  interface Window {
    cqnuMotionKernel?: Readonly<WorkspaceMotionKernel>;
  }
}

let currentConfig: MotionRuntimeConfig;
const activeControls = new WeakMap<Element, Set<{ stop(): void }>>();

function config(): MotionRuntimeConfig {
  currentConfig ||= resolveMotionConfig();
  return currentConfig;
}

function stop(target: Element): void {
  activeControls.get(target)?.forEach(control => control.stop());
  activeControls.delete(target);
}

function track(target: Element, run: MotionSceneRun): void {
  stop(target);
  const controls = new Set(run.controls);
  activeControls.set(target, controls);
  void run.finished.finally(() => {
    if (activeControls.get(target) === controls) activeControls.delete(target);
  });
}

function reveal(target: Element): void {
  if (target.hasAttribute('data-motion-revealed')) return;
  target.setAttribute('data-motion-revealed', 'true');
  track(target, revealScene(target, config()));
}

function openLayer(layer: HTMLElement): void {
  layer.setAttribute('data-motion-managed', 'true');
  track(layer, layerOpenScene(layer, config()));
}

async function closeLayer(layer: HTMLElement): Promise<void> {
  const run = layerCloseScene(layer, config());
  track(layer, run);
  await run.finished;
}

function feedback(target: Element, kind: FeedbackKind = 'attention'): void {
  track(target, feedbackScene(target, kind, config()));
}

function projectOpen(state: ProjectOpenState, target?: Element | null): void {
  document.documentElement.dataset.projectOpenState = state;
  if (!target) return;
  feedback(target, state === 'error' ? 'error' : state === 'ready' ? 'success' : 'attention');
}

async function transitionView(container: HTMLElement, update: () => void | Promise<void>): Promise<void> {
  const settings = config();
  if (!settings.enabled || !document.startViewTransition) {
    await update();
    return;
  }
  container.style.viewTransitionName = 'cqnu-workspace-view';
  const transition = animateView(update);
  transition.old(
    { opacity: [1, 0], x: [0, -Math.max(10, settings.distance * 0.55)], filter: ['blur(0px)', 'blur(5px)'] },
    { duration: seconds(settings.durations.feedback), ease: settings.ease }
  );
  transition.new(
    { opacity: [0, 1], x: [Math.max(10, settings.distance * 0.55), 0], filter: ['blur(5px)', 'blur(0px)'] },
    { duration: seconds(settings.durations.surface), ease: settings.ease }
  );
  await transition;
  container.style.removeProperty('view-transition-name');
}

function installLayerObserver(): void {
  const observer = new MutationObserver(records => {
    for (const record of records) {
      const layer = record.target;
      if (!(layer instanceof HTMLElement) || !layer.matches('.layer-modal, .image-modal')) continue;
      if (layer.classList.contains('hidden')) {
        layer.removeAttribute('data-motion-managed');
        stop(layer);
      } else if (!layer.classList.contains('is-closing') && !layer.hasAttribute('data-motion-managed')) {
        openLayer(layer);
      }
    }
  });
  document.querySelectorAll<HTMLElement>('.layer-modal, .image-modal').forEach(layer => {
    observer.observe(layer, { attributes: true, attributeFilter: ['class'] });
  });
}

function installViewportReveals(): void {
  inView(
    '.panel, .card, .stats-chart-card, .stats-table-panel, .data-card',
    element => reveal(element),
    { amount: 0.14, margin: '0px 0px -6% 0px' }
  );
}

function installControlGestures(): void {
  const selector = 'button, a.btn, .ui-module-button, .modern-theme-choice, .modern-segmented button, [data-motion-control]';
  hover(selector, element => {
    const settings = config();
    if (!settings.enabled || !document.documentElement.classList.contains('motion-hover')) return;
    stop(element);
    const enter = animate(
      element,
      { y: -settings.hoverLift, scale: settings.feedback === 'strong' ? 1.018 : 1.01 },
      { duration: seconds(settings.durations.feedback), ease: settings.ease }
    );
    activeControls.set(element, new Set([enter]));
    return () => {
      stop(element);
      const exit = animate(
        element,
        { y: 0, scale: 1 },
        { duration: seconds(settings.durations.feedback), ease: settings.ease }
      );
      activeControls.set(element, new Set([exit]));
    };
  });
  press(selector, element => {
    const settings = config();
    if (!settings.enabled) return;
    stop(element);
    const down = animate(
      element,
      { scale: settings.pressScale, y: Math.min(1, settings.hoverLift) },
      { duration: seconds(settings.durations.feedback), ease: settings.ease }
    );
    activeControls.set(element, new Set([down]));
    return () => {
      stop(element);
      const up = animate(element, { scale: 1, y: 0 }, {
        duration: seconds(settings.durations.feedback),
        ease: settings.ease
      });
      activeControls.set(element, new Set([up]));
    };
  });
}

function refresh(): void {
  currentConfig = resolveMotionConfig();
  document.documentElement.dataset.motionEngine = 'motion';
  document.documentElement.dataset.motionProfile = currentConfig.profile;
  document.documentElement.dataset.motionFeedback = currentConfig.feedback;
  document.documentElement.dataset.motionAmbient = String(currentConfig.ambient);
}

export function installMotionKernel(): Readonly<WorkspaceMotionKernel> {
  if (window.cqnuMotionKernel) return window.cqnuMotionKernel;
  refresh();
  const kernel = Object.freeze({
    openLayer,
    closeLayer,
    reveal,
    feedback,
    projectOpen,
    transitionView,
    refresh
  });
  Object.defineProperty(window, 'cqnuMotionKernel', {
    configurable: false,
    enumerable: false,
    writable: false,
    value: kernel
  });
  document.documentElement.classList.add('motion-kernel-ready');
  requestAnimationFrame(() => {
    track(document.documentElement, workspaceEntranceScene(config()));
    installViewportReveals();
    installControlGestures();
    installLayerObserver();
  });
  return kernel;
}
