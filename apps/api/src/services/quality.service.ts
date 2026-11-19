import type { AnalysisFilter, WorkModel } from '../domain/metrics';
import { issueMetrics, scopedIssues } from '../domain/metrics';
import { QUALITY_KINDS, QUALITY_LABEL, qualityKinds, type QualityKind } from '../domain/quality';
import type { QualityRow } from '../domain/quality-mail';

export function qualityReport(model: WorkModel, filter: AnalysisFilter, kind?: QualityKind) {
  const issues = scopedIssues(model, filter);
  const counts = Object.fromEntries(QUALITY_KINDS.map((item) => [item, 0])) as Record<QualityKind, number>;
  const rows: Array<QualityRow & { statusName: string; epicKey: string | null }> = [];
  for (const issue of issues) {
    const metrics = issueMetrics(model, issue, filter);
    const kinds = qualityKinds(issue, metrics);
    for (const item of kinds) counts[item] += 1;
    const epic = model.epics.find((item) => item.id === issue.epicId);
    for (const item of kinds) {
      if (kind && item !== kind) continue;
      rows.push({
        key: issue.key,
        summary: issue.summary,
        sprint: issue.currentSprintName ?? '',
        assignee: issue.assigneeName ?? '',
        url: issue.jiraUrl,
        reason: item,
        statusName: issue.statusName,
        epicKey: epic?.key ?? null,
      });
    }
  }
  const unique = new Set(rows.map((row) => row.key));
  return {
    counts,
    labels: QUALITY_LABEL,
    total: kind ? counts[kind] : unique.size,
    items: rows,
  };
}
