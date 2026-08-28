import { createResearchReviewBridge, type ResearchReviewBridge } from './model';
import { createReviewWorkbenchController, type ReviewWorkbenchController } from './controller';

export interface ResearchReviewRuntimeBridge extends ResearchReviewBridge {
  version: 'research-review-v1';
  createController(): ReviewWorkbenchController;
}

declare global {
  interface Window {
    researchReview?: ResearchReviewRuntimeBridge;
  }
}

export function installResearchReviewBridge(): ResearchReviewRuntimeBridge {
  if (window.researchReview) return window.researchReview;
  const model = createResearchReviewBridge();
  const bridge: ResearchReviewRuntimeBridge = Object.freeze({
    version: 'research-review-v1',
    ...model,
    createController: createReviewWorkbenchController
  });
  Object.defineProperty(window, 'researchReview', {
    configurable: false,
    enumerable: false,
    writable: false,
    value: bridge
  });
  return bridge;
}
