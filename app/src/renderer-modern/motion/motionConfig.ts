export const MIN_ACTIVE_MOTION_MS = 260;

export type MotionProfile = 'off' | 'minimal' | 'standard' | 'expressive';
export type MotionFeedback = 'soft' | 'balanced' | 'strong';

export interface MotionRuntimeConfig {
  enabled: boolean;
  reduced: boolean;
  ambient: boolean;
  profile: MotionProfile;
  feedback: MotionFeedback;
  durations: {
    feedback: number;
    surface: number;
    layer: number;
  };
  stagger: number;
  enterScale: number;
  pressScale: number;
  hoverLift: number;
  distance: number;
  ease: readonly [number, number, number, number];
}

const EASE_STANDARD = [0.2, 0.8, 0.2, 1] as const;
const EASE_EMPHASIZED = [0.16, 1, 0.3, 1] as const;

function cssNumber(style: CSSStyleDeclaration, name: string, fallback: number): number {
  const source = style.getPropertyValue(name).trim();
  const match = source.match(/^(-?[\d.]+)\s*(ms|s|px)?$/i);
  if (!match) return fallback;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return fallback;
  return match[2]?.toLocaleLowerCase() === 's' ? value * 1000 : value;
}

function activeDuration(value: number, fallback: number): number {
  return Math.max(MIN_ACTIVE_MOTION_MS, Number.isFinite(value) ? value : fallback);
}

function motionProfile(root: HTMLElement): MotionProfile {
  const value = root.dataset.motionProfile || '';
  if (value === 'off' || value === 'minimal' || value === 'standard' || value === 'expressive') return value;
  if (root.classList.contains('motion-mode-off')) return 'off';
  if (root.classList.contains('motion-mode-minimal')) return 'minimal';
  if (root.classList.contains('motion-mode-standard')) return 'standard';
  return 'expressive';
}

export function resolveMotionConfig(root = document.documentElement): MotionRuntimeConfig {
  const style = getComputedStyle(root);
  const profile = motionProfile(root);
  const systemReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const reduced = systemReduced || root.classList.contains('motion-disabled');
  const enabled = profile !== 'off' && !reduced;
  const feedback = root.dataset.motionFeedback === 'soft' || root.dataset.motionFeedback === 'strong'
    ? root.dataset.motionFeedback
    : 'balanced';
  const fallback = profile === 'expressive'
    ? { feedback: 620, surface: 860, layer: 1040, distance: 30 }
    : profile === 'standard'
      ? { feedback: 440, surface: 580, layer: 720, distance: 22 }
      : { feedback: 320, surface: 400, layer: 500, distance: 12 };

  return {
    enabled,
    reduced,
    ambient: enabled && root.dataset.motionAmbient !== 'false',
    profile,
    feedback,
    durations: {
      feedback: enabled ? activeDuration(cssNumber(style, '--motion-duration-fast', fallback.feedback), fallback.feedback) : 0,
      surface: enabled ? activeDuration(cssNumber(style, '--motion-duration', fallback.surface), fallback.surface) : 0,
      layer: enabled ? activeDuration(cssNumber(style, '--motion-duration-modal', fallback.layer), fallback.layer) : 0
    },
    stagger: enabled ? Math.max(0, cssNumber(style, '--motion-stagger', 72)) : 0,
    enterScale: enabled ? cssNumber(style, '--motion-scale-enter', 0.97) : 1,
    pressScale: enabled ? cssNumber(style, '--motion-scale-press', 0.975) : 1,
    hoverLift: enabled ? cssNumber(style, '--motion-hover-lift', 2) : 0,
    distance: enabled ? fallback.distance : 0,
    ease: profile === 'minimal' ? EASE_STANDARD : EASE_EMPHASIZED
  };
}

export function seconds(milliseconds: number): number {
  return Math.max(0, milliseconds) / 1000;
}
