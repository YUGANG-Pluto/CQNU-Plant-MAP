import {
  createRendererStateFacade,
  type LegacyRendererState,
  type RendererStateFacade
} from './model';

declare global {
  interface Window {
    __CQNU_STATE__?: LegacyRendererState;
    rendererState?: RendererStateFacade;
  }
}

export function installRendererStateFacade(): RendererStateFacade {
  if (window.rendererState) return window.rendererState;
  const facade = createRendererStateFacade(() => window.__CQNU_STATE__);
  Object.defineProperty(window, 'rendererState', {
    configurable: false,
    enumerable: false,
    writable: false,
    value: facade
  });
  return facade;
}
