import { createObjectSelectionStore, type LegacySelectionState, type ObjectSelectionStore } from './model';

declare global {
  interface Window {
    objectSelectionStore?: ObjectSelectionStore;
  }
}

export function installObjectSelectionStore(): ObjectSelectionStore {
  if (window.objectSelectionStore) return window.objectSelectionStore;
  const selectionWindow = window as Window & { __CQNU_STATE__?: LegacySelectionState };
  const store = createObjectSelectionStore(
    () => selectionWindow.__CQNU_STATE__,
    patch => {
      if (selectionWindow.__CQNU_STATE__) Object.assign(selectionWindow.__CQNU_STATE__, patch);
    }
  );
  Object.defineProperty(window, 'objectSelectionStore', {
    configurable: false,
    enumerable: false,
    writable: false,
    value: store
  });
  document.documentElement.dataset.objectSelectionStore = store.version;
  return store;
}
