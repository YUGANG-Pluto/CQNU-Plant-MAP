import {
  adaptPhenologyRecord,
  adaptPointRecord,
  adaptProjectRecords,
  adaptZoneRecord
} from './project/adapters';
import {
  createPhenologyDraftController,
  hasDraftChanges,
  type PhenologyDraftController
} from './phenology/model';
import {
  buildTaxonomySuggestionPatch,
  compactTaxonomyCandidates,
  type TaxonomySuggestionPatch
} from './taxonomy/model';
import {
  countMaintenanceIssues,
  createMaintenanceIssue,
  sortMaintenanceIssues,
  type MaintenanceIssue,
  type MaintenanceIssueCounts
} from './maintenance/model';
import {
  createSpeciesReferencePanelController,
  type SpeciesReferencePanelController
} from './species-reference/model';
import type {
  PhenologyDomainRecord,
  PointDomainRecord,
  ProjectDomainSnapshot,
  TaxonomyCandidateSummary,
  ZoneDomainRecord
} from './project/types';

export interface RendererDomainBridge {
  version: 'renderer-domain-v1';
  project: Readonly<{
    adaptZone(value: unknown): Readonly<ZoneDomainRecord>;
    adaptPoint(value: unknown): Readonly<PointDomainRecord>;
    adaptPhenology(value: unknown): Readonly<PhenologyDomainRecord>;
    adaptRecords(zones: unknown, points: unknown): Readonly<ProjectDomainSnapshot>;
  }>;
  phenology: Readonly<{
    hasDraftChanges(current: unknown, stored: unknown, fields: readonly string[]): boolean;
    createDraftController(fields: readonly string[]): PhenologyDraftController;
  }>;
  taxonomy: Readonly<{
    compactCandidates(candidates: unknown, limit?: number): TaxonomyCandidateSummary[];
    buildPatch(result: unknown, candidate: unknown, updatedAt: string): TaxonomySuggestionPatch;
  }>;
  maintenance: Readonly<{
    createIssue(
      severity: unknown,
      code: unknown,
      title: unknown,
      detail?: unknown,
      fixable?: unknown
    ): MaintenanceIssue;
    countIssues(issues: unknown): MaintenanceIssueCounts;
    sortIssues(issues: unknown): unknown[];
  }>;
  speciesReference: Readonly<{
    createPanelController(): SpeciesReferencePanelController;
  }>;
}

declare global {
  interface Window {
    rendererDomain?: RendererDomainBridge;
  }
}

export function createRendererDomainBridge(): RendererDomainBridge {
  return Object.freeze({
    version: 'renderer-domain-v1' as const,
    project: Object.freeze({
      adaptZone: adaptZoneRecord,
      adaptPoint: adaptPointRecord,
      adaptPhenology: adaptPhenologyRecord,
      adaptRecords: adaptProjectRecords
    }),
    phenology: Object.freeze({
      hasDraftChanges,
      createDraftController: createPhenologyDraftController
    }),
    taxonomy: Object.freeze({
      compactCandidates: compactTaxonomyCandidates,
      buildPatch: buildTaxonomySuggestionPatch
    }),
    maintenance: Object.freeze({
      createIssue: createMaintenanceIssue,
      countIssues: countMaintenanceIssues,
      sortIssues: sortMaintenanceIssues
    }),
    speciesReference: Object.freeze({
      createPanelController: createSpeciesReferencePanelController
    })
  });
}

export function installRendererDomainBridge(): RendererDomainBridge {
  if (window.rendererDomain) return window.rendererDomain;
  const bridge = createRendererDomainBridge();
  Object.defineProperty(window, 'rendererDomain', {
    configurable: false,
    enumerable: false,
    writable: false,
    value: bridge
  });
  return bridge;
}
