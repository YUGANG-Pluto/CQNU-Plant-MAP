import { createResearchReviewBridge, type ResearchReviewBridge } from './model';

declare global {
  interface Window {
    researchReview?: ResearchReviewBridge;
  }
}

export function installResearchReviewBridge(): ResearchReviewBridge {
  if (window.researchReview) return window.researchReview;
  const bridge = createResearchReviewBridge();
  Object.defineProperty(window, 'researchReview', {
    configurable: false,
    enumerable: false,
    writable: false,
    value: bridge
  });
  return bridge;
}
