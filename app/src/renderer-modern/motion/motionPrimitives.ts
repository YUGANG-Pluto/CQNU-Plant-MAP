import { animate } from 'motion/mini';

type GestureEnd = void | (() => void);
type GestureStart = (element: Element) => GestureEnd;

interface ViewportOptions {
  amount?: number;
  margin?: string;
}

export { animate };

export function staggerDelay(interval: number, startDelay = 0): (index: number) => number {
  return index => startDelay + index * interval;
}

function matchingControl(target: EventTarget | null, selector: string): Element | null {
  return target instanceof Element ? target.closest(selector) : null;
}

function isDisabled(element: Element): boolean {
  return (element instanceof HTMLButtonElement && element.disabled) || element.getAttribute('aria-disabled') === 'true';
}

export function installHoverGesture(selector: string, onStart: GestureStart): () => void {
  const active = new Map<Element, Exclude<GestureEnd, void>>();

  const enter = (event: PointerEvent): void => {
    if (event.pointerType === 'touch') return;
    const element = matchingControl(event.target, selector);
    if (!element || isDisabled(element)) return;
    if (event.relatedTarget instanceof Node && element.contains(event.relatedTarget)) return;
    active.get(element)?.();
    const end = onStart(element);
    if (end) active.set(element, end);
  };

  const leave = (event: PointerEvent): void => {
    const element = matchingControl(event.target, selector);
    if (!element) return;
    if (event.relatedTarget instanceof Node && element.contains(event.relatedTarget)) return;
    active.get(element)?.();
    active.delete(element);
  };

  document.addEventListener('pointerover', enter);
  document.addEventListener('pointerout', leave);
  return () => {
    document.removeEventListener('pointerover', enter);
    document.removeEventListener('pointerout', leave);
    active.forEach(end => end());
    active.clear();
  };
}

export function installPressGesture(selector: string, onStart: GestureStart): () => void {
  const activePointers = new Map<number, Exclude<GestureEnd, void>>();
  const activeKeys = new Map<Element, Exclude<GestureEnd, void>>();

  const pointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    const element = matchingControl(event.target, selector);
    if (!element || isDisabled(element)) return;
    const end = onStart(element);
    if (end) activePointers.set(event.pointerId, end);
  };

  const pointerEnd = (event: PointerEvent): void => {
    activePointers.get(event.pointerId)?.();
    activePointers.delete(event.pointerId);
  };

  const keyDown = (event: KeyboardEvent): void => {
    if (event.repeat || (event.key !== 'Enter' && event.key !== ' ')) return;
    const element = matchingControl(event.target, selector);
    if (!element || isDisabled(element) || activeKeys.has(element)) return;
    const end = onStart(element);
    if (end) activeKeys.set(element, end);
  };

  const keyUp = (event: KeyboardEvent): void => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const element = matchingControl(event.target, selector);
    if (!element) return;
    activeKeys.get(element)?.();
    activeKeys.delete(element);
  };

  const cancelAll = (): void => {
    activePointers.forEach(end => end());
    activeKeys.forEach(end => end());
    activePointers.clear();
    activeKeys.clear();
  };

  document.addEventListener('pointerdown', pointerDown);
  window.addEventListener('pointerup', pointerEnd);
  window.addEventListener('pointercancel', pointerEnd);
  document.addEventListener('keydown', keyDown);
  document.addEventListener('keyup', keyUp);
  window.addEventListener('blur', cancelAll);
  return () => {
    document.removeEventListener('pointerdown', pointerDown);
    window.removeEventListener('pointerup', pointerEnd);
    window.removeEventListener('pointercancel', pointerEnd);
    document.removeEventListener('keydown', keyDown);
    document.removeEventListener('keyup', keyUp);
    window.removeEventListener('blur', cancelAll);
    cancelAll();
  };
}

export function observeInView(
  selector: string,
  onEnter: (element: Element) => void,
  options: ViewportOptions = {}
): () => void {
  const elements = Array.from(document.querySelectorAll(selector));
  if (!('IntersectionObserver' in window)) {
    elements.forEach(onEnter);
    return () => undefined;
  }

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        onEnter(entry.target);
      });
    },
    {
      rootMargin: options.margin,
      threshold: options.amount ?? 0
    }
  );
  elements.forEach(element => observer.observe(element));
  return () => observer.disconnect();
}

export async function runViewTransition(container: HTMLElement, update: () => void | Promise<void>): Promise<void> {
  if (!document.startViewTransition) {
    await update();
    return;
  }

  container.style.viewTransitionName = 'cqnu-workspace-view';
  try {
    const transition = document.startViewTransition(update);
    await transition.finished;
  } finally {
    container.style.removeProperty('view-transition-name');
  }
}
