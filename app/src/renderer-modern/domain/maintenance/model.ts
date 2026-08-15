import type { UnknownRecord } from '../project/types';

export type MaintenanceSeverity = 'error' | 'warn' | 'info';

export interface MaintenanceIssue {
  severity: MaintenanceSeverity;
  code: string;
  title: string;
  detail: string;
  fixable: boolean;
}

export interface MaintenanceIssueCounts {
  error: number;
  warn: number;
  info: number;
  fixable: number;
}

const SEVERITY_ORDER: Readonly<Record<MaintenanceSeverity, number>> = Object.freeze({
  error: 0,
  warn: 1,
  info: 2
});

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : {};
}

function severity(value: unknown): MaintenanceSeverity {
  return value === 'error' || value === 'warn' ? value : 'info';
}

export function createMaintenanceIssue(
  level: unknown,
  code: unknown,
  title: unknown,
  detail: unknown = '',
  fixable: unknown = false
): MaintenanceIssue {
  return {
    severity: severity(level),
    code: String(code ?? ''),
    title: String(title ?? ''),
    detail: String(detail ?? ''),
    fixable: Boolean(fixable)
  };
}

export function countMaintenanceIssues(issuesValue: unknown): MaintenanceIssueCounts {
  const counts: MaintenanceIssueCounts = { error: 0, warn: 0, info: 0, fixable: 0 };
  const issues = Array.isArray(issuesValue) ? issuesValue : [];
  issues.forEach(value => {
    const issue = asRecord(value);
    counts[severity(issue.severity)] += 1;
    if (issue.fixable) counts.fixable += 1;
  });
  return counts;
}

export function sortMaintenanceIssues(issuesValue: unknown): unknown[] {
  const issues = Array.isArray(issuesValue) ? [...issuesValue] : [];
  return issues.sort((leftValue, rightValue) => {
    const left = asRecord(leftValue);
    const right = asRecord(rightValue);
    const severityDelta = SEVERITY_ORDER[severity(left.severity)]
      - SEVERITY_ORDER[severity(right.severity)];
    return severityDelta || String(left.code ?? '').localeCompare(String(right.code ?? ''));
  });
}
