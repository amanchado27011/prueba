import type { IssueFact, IssueMetrics } from './metrics';

export const QUALITY_KINDS = [
  'no_epic',
  'no_estimate',
  'sprint_no_hours',
  'hours_open',
  'closed_no_hours',
  'incomplete',
  'no_assignee',
] as const;

export type QualityKind = (typeof QUALITY_KINDS)[number];

export const QUALITY_LABEL: Record<QualityKind, string> = {
  no_epic: 'Sin épica',
  no_estimate: 'Sin estimación',
  sprint_no_hours: 'En sprint sin horas',
  hours_open: 'Con horas y sigue abierta',
  closed_no_hours: 'Cerrada sin horas',
  incomplete: 'Datos incompletos',
  no_assignee: 'Sin responsable',
};

export function qualityKinds(issue: IssueFact, metrics: IssueMetrics): QualityKind[] {
  const kinds: QualityKind[] = [];
  const hasHours = issue.spentSeconds > 0 || metrics.hasHours;
  if (!issue.epicId) kinds.push('no_epic');
  if (metrics.missingEstimate) kinds.push('no_estimate');
  if (issue.sprintIds.length > 0 && issue.spentSeconds <= 0) kinds.push('sprint_no_hours');
  if (hasHours && issue.statusCategory !== 'done') kinds.push('hours_open');
  if (issue.statusCategory === 'done' && issue.spentSeconds <= 0) kinds.push('closed_no_hours');
  if (!issue.assigneeAccountId) kinds.push('no_assignee');
  if (!issue.epicId || metrics.missingEstimate || !issue.assigneeAccountId) kinds.push('incomplete');
  return kinds;
}

export const QUALITY_RECOMMENDATION =
  'Revisa en Jira la épica, la estimación original, el responsable y las horas imputadas. Esta aplicación no modifica las issues.';
