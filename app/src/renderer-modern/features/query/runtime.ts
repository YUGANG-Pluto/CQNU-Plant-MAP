import { adaptProjectRecords } from '../../domain/project/adapters';
import {
  getPointQueryCompleteness,
  runProjectQuery,
  type PointQueryCompleteness,
  type ProjectQueryResult
} from './model';

export interface ResearchQueryBridge {
  version: 'research-query-v1';
  run(zones: unknown, points: unknown, filters?: unknown): readonly Readonly<ProjectQueryResult>[];
  completeness(point: unknown): Readonly<PointQueryCompleteness>;
}

declare global {
  interface Window {
    researchQuery?: ResearchQueryBridge;
  }
}

export function createResearchQueryBridge(): ResearchQueryBridge {
  return Object.freeze({
    version: 'research-query-v1' as const,
    run(zones: unknown, points: unknown, filters: unknown = {}) {
      return runProjectQuery(adaptProjectRecords(zones, points), filters);
    },
    completeness(point: unknown) {
      return getPointQueryCompleteness(adaptProjectRecords([], [point]).points[0]);
    }
  });
}

export function installResearchQueryBridge(): ResearchQueryBridge {
  if (window.researchQuery) return window.researchQuery;
  const bridge = createResearchQueryBridge();
  Object.defineProperty(window, 'researchQuery', {
    configurable: false,
    enumerable: false,
    writable: false,
    value: bridge
  });
  return bridge;
}
