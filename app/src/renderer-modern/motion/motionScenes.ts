import { animate, stagger } from 'motion';
import { seconds, type MotionRuntimeConfig } from './motionConfig';

interface MotionControl {
  stop(): void;
  then(resolve: () => void, reject?: () => void): Promise<void>;
}

export interface MotionSceneRun {
  controls: MotionControl[];
  finished: Promise<void>;
}

function sceneRun(controls: MotionControl[]): MotionSceneRun {
  return {
    controls,
    finished: Promise.all(controls.map(item => Promise.resolve(item).catch(() => undefined))).then(() => undefined)
  };
}

function control(value: unknown): MotionControl {
  return value as MotionControl;
}

export function workspaceEntranceScene(config: MotionRuntimeConfig): MotionSceneRun {
  if (!config.enabled) return sceneRun([]);
  const controls: MotionControl[] = [];
  const header = document.querySelectorAll('.app-brand-block, .app-topbar-actions');
  const launchers = document.querySelectorAll('.ui-module-launcher .ui-module-button');
  const surfaces = document.querySelectorAll('.map-workbar, .context-inspector, .web-project-welcome');

  if (header.length) controls.push(control(animate(
    header,
    { opacity: [0, 0.7, 1], y: [-config.distance, -4, 0], filter: ['blur(9px)', 'blur(2px)', 'blur(0px)'] },
    { duration: seconds(config.durations.surface), delay: stagger(config.stagger / 1000), ease: config.ease }
  )));
  if (launchers.length) controls.push(control(animate(
    launchers,
    { opacity: [0, 0.78, 1], x: [-config.distance, -5, 0], scale: [config.enterScale, 0.992, 1] },
    {
      duration: seconds(config.durations.surface),
      delay: stagger(config.stagger / 1000, { startDelay: 0.12 }),
      ease: config.ease
    }
  )));
  if (surfaces.length) controls.push(control(animate(
    surfaces,
    { opacity: [0, 0.68, 1], y: [config.distance, 5, 0], scale: [config.enterScale, 0.992, 1] },
    {
      duration: seconds(config.durations.layer),
      delay: stagger(config.stagger / 1000, { startDelay: 0.18 }),
      ease: config.ease
    }
  )));
  return sceneRun(controls);
}

function layerPanel(layer: HTMLElement): HTMLElement | null {
  return layer.querySelector<HTMLElement>(
    '.layer-modal-panel, .confirm-panel, .image-modal-content, .right-inspector-drawer-panel, .workspace-utility-panel, .stats-fullscreen-panel'
  );
}

export function layerOpenScene(layer: HTMLElement, config: MotionRuntimeConfig): MotionSceneRun {
  if (!config.enabled) return sceneRun([]);
  const controls: MotionControl[] = [];
  const backdrop = layer.querySelector<HTMLElement>('.layer-modal-backdrop, .image-modal-backdrop');
  const panel = layerPanel(layer);
  const isDrawer = Boolean(panel?.matches('.right-inspector-drawer-panel, .workspace-utility-panel'));
  if (backdrop) controls.push(control(animate(
    backdrop,
    { opacity: [0, 0.42] },
    { duration: seconds(config.durations.feedback), ease: config.ease }
  )));
  if (panel) {
    controls.push(control(animate(
      panel,
      isDrawer
        ? { opacity: [0, 1], x: [config.distance * 1.6, 0], filter: ['blur(8px)', 'blur(0px)'] }
        : {
          opacity: [0, 0.82, 1],
          y: [config.distance, 4, 0],
          scale: [config.enterScale, 0.992, 1],
          filter: ['blur(10px)', 'blur(2px)', 'blur(0px)']
        },
      { duration: seconds(config.durations.layer), ease: config.ease }
    )));
    const details = panel.querySelectorAll<HTMLElement>(
      ':scope > header > *, :scope > footer > *, .modern-theme-section-heading, .modal-command-bar > *'
    );
    if (details.length && config.profile !== 'minimal') controls.push(control(animate(
      details,
      { opacity: [0, 1], y: [10, 0] },
      {
        duration: seconds(config.durations.feedback),
        delay: stagger(Math.max(0.035, config.stagger / 1600), { startDelay: 0.18 }),
        ease: config.ease
      }
    )));
  }
  return sceneRun(controls);
}

export function layerCloseScene(layer: HTMLElement, config: MotionRuntimeConfig): MotionSceneRun {
  if (!config.enabled) return sceneRun([]);
  const controls: MotionControl[] = [];
  const backdrop = layer.querySelector<HTMLElement>('.layer-modal-backdrop, .image-modal-backdrop');
  const panel = layerPanel(layer);
  const duration = Math.max(260, config.durations.feedback);
  if (backdrop) controls.push(control(animate(
    backdrop,
    { opacity: [0.42, 0] },
    { duration: seconds(duration), ease: config.ease }
  )));
  if (panel) controls.push(control(animate(
    panel,
    panel.matches('.right-inspector-drawer-panel, .workspace-utility-panel')
      ? { opacity: [1, 0], x: [0, config.distance] }
      : { opacity: [1, 0], y: [0, Math.max(12, config.distance * 0.6)], scale: [1, 0.982] },
    { duration: seconds(duration), ease: config.ease }
  )));
  return sceneRun(controls);
}

export function revealScene(target: Element, config: MotionRuntimeConfig): MotionSceneRun {
  if (!config.enabled) return sceneRun([]);
  return sceneRun([control(animate(
    target,
    { opacity: [0, 0.72, 1], y: [Math.max(14, config.distance * 0.65), 3, 0], scale: [0.988, 0.996, 1] },
    { duration: seconds(config.durations.surface), ease: config.ease }
  ))]);
}

export function feedbackScene(
  target: Element,
  kind: 'success' | 'error' | 'attention',
  config: MotionRuntimeConfig
): MotionSceneRun {
  if (!config.enabled) return sceneRun([]);
  const strength = config.feedback === 'strong' ? 1 : config.feedback === 'balanced' ? 0.65 : 0.35;
  const shift = kind === 'error' ? 5 * strength : 0;
  return sceneRun([control(animate(
    target,
    kind === 'error'
      ? { x: [0, -shift, shift, -shift * 0.55, 0], scale: [1, 0.99, 1] }
      : { y: [0, -3 * strength, 0], scale: [1, 1 + 0.018 * strength, 1] },
    { duration: seconds(config.durations.feedback), ease: config.ease }
  ))]);
}
