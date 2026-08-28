import { resolveMotionConfig, seconds, type MotionRuntimeConfig } from './motionConfig';
import {
  animate,
  installHoverGesture,
  installPressGesture,
  observeInView,
  runViewTransition
} from './motionPrimitives';
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

interface MotionPlaybackControl {
  stop(): void;
  cancel?(): void;
}

let currentConfig: MotionRuntimeConfig;
const activeControls = new WeakMap<Element, Set<MotionPlaybackControl>>();

function config(): MotionRuntimeConfig {
  currentConfig ||= resolveMotionConfig();
  return currentConfig;
}

function cancel(control: MotionPlaybackControl): void {
  try {
    control.cancel?.();
  } catch (error) {
    if (!(error instanceof DOMException) || error.name !== 'InvalidStateError') throw error;
  }
}

function stop(target: Element): void {
  activeControls.get(target)?.forEach(control => {
    try {
      control.stop();
    } catch (error) {
      if (!(error instanceof DOMException) || error.name !== 'InvalidStateError') throw error;
      cancel(control);
    }
  });
  activeControls.delete(target);
}

function track(target: Element, run: MotionSceneRun): void {
  stop(target);
  const controls = new Set(run.controls);
  activeControls.set(target, controls);
  void run.finished.finally(() => {
    if (activeControls.get(target) !== controls) return;
    controls.forEach(cancel);
    activeControls.delete(target);
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
  await runViewTransition(container, update);
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
  observeInView('.panel, .card, .stats-chart-card, .stats-table-panel, .data-card', element => reveal(element), {
    amount: 0.14,
    margin: '0px 0px -6% 0px'
  });
}

function installControlGestures(): void {
  const selector =
    'button, a.btn, .ui-module-button, .modern-theme-choice, .modern-segmented button, [data-motion-control]';
  installHoverGesture(selector, element => {
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
  installPressGesture(selector, element => {
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
      const up = animate(
        element,
        { scale: 1, y: 0 },
        {
          duration: seconds(settings.durations.feedback),
          ease: settings.ease
        }
      );
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
