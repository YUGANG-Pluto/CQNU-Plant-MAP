import {
  createProjectEditHistory,
  type ProjectEditHistoryBridge
} from './model';

declare global {
  interface Window {
    projectEditHistory?: ProjectEditHistoryBridge;
  }
}

export function installProjectEditHistoryBridge(): ProjectEditHistoryBridge {
  if (window.projectEditHistory) return window.projectEditHistory;
  const bridge = createProjectEditHistory(30);
  Object.defineProperty(window, 'projectEditHistory', {
    configurable: false,
    enumerable: false,
    writable: false,
    value: bridge
  });
  return bridge;
}
