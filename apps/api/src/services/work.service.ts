import type { AnalysisFilter, IssueFact, IssueMetrics, RollupMetrics, WorkModel } from '../domain/metrics';
import { epicRollup, initiativeRollup, issueMetrics, productivity, rollupIssues, scopedIssues } from '../domain/metrics';
import { HttpError } from '../lib/http-error';

export interface IssueView {
  id: string;
  key: string;
  summary: string;
  issueType: string;
  kind: string;
  statusName: string;
  statusCategory: string;
  epicId: string | null;
  epicKey: string | null;
  epicResolution: string;
  assigneeName: string | null;
  sprintName: string | null;
  sprintIds: string[];
  inBacklog: boolean;
  jiraUrl: string;
  createdAt: string | null;
  resolvedAt: string | null;
  storyPoints: number | null;
  initiativeId: string | null;
  initiativeName: string | null;
  objectiveId: string | null;
  objectiveName: string | null;
  metrics: IssueMetrics;
}

function presentIssue(model: WorkModel, issue: IssueFact, filter: AnalysisFilter): IssueView {
  const epic = model.epics.find((item) => item.id === issue.epicId);
  return {
    id: issue.id,
    key: issue.key,
    summary: issue.summary,
    issueType: issue.issueType,
    kind: issue.kind,
    statusName: issue.statusName,
    statusCategory: issue.statusCategory,
    epicId: issue.epicId,
    epicKey: epic?.key ?? null,
    epicResolution: issue.epicResolution,
    assigneeName: issue.assigneeName,
    sprintName: issue.currentSprintName,
    sprintIds: issue.sprintIds,
    inBacklog: issue.inBacklog,
    jiraUrl: issue.jiraUrl,
    createdAt: issue.createdAt,
    resolvedAt: issue.resolvedAt,
    storyPoints: issue.storyPoints,
    initiativeId: epic?.initiativeId ?? null,
    initiativeName: epic?.initiativeName ?? null,
    objectiveId: epic?.objectiveId ?? null,
    objectiveName: epic?.objectiveName ?? null,
    metrics: issueMetrics(model, issue, filter),
  };
}

export function buildTree(model: WorkModel, filter: AnalysisFilter) {
  const issues = scopedIssues(model, filter);
  const byEpic = new Map<string, IssueFact[]>();
  const loose: IssueFact[] = [];
  for (const issue of issues) {
    if (!issue.epicId) loose.push(issue);
    else {
      const list = byEpic.get(issue.epicId) ?? [];
      list.push(issue);
      byEpic.set(issue.epicId, list);
    }
  }
  const epicNodes = [];
  for (const [epicId, children] of byEpic) {
    const epic = model.epics.find((item) => item.id === epicId);
    if (!epic) {
      loose.push(...children);
      continue;
    }
    const metrics: RollupMetrics = epicRollup(model, epic, filter);
    epicNodes.push({
      id: epic.id,
      key: epic.key,
      summary: epic.summary,
      statusName: epic.statusName,
      maintenanceType: epic.maintenanceType,
      activityName: epic.activityName,
      initiativeId: epic.initiativeId,
      initiativeName: epic.initiativeName,
      objectiveName: epic.objectiveName,
      jiraUrl: epic.jiraUrl,
      metrics,
      issues: children.map((issue) => presentIssue(model, issue, filter)),
    });
  }
  const initiatives = [];
  const grouped = new Map<string, typeof epicNodes>();
  const orphanEpics = [];
  for (const epic of epicNodes) {
    if (!epic.initiativeId) orphanEpics.push(epic);
    else {
      const list = grouped.get(epic.initiativeId) ?? [];
      list.push(epic);
      grouped.set(epic.initiativeId, list);
    }
  }
  for (const [id, epics] of grouped) {
    const sample = model.epics.find((epic) => epic.initiativeId === id);
    initiatives.push({
      id,
      name: sample?.initiativeName ?? id,
      objectiveName: sample?.objectiveName ?? null,
      metrics: initiativeRollup(model, id, filter),
      epics,
    });
  }
  const totals = rollupIssues(model, issues, filter);
  return {
    totals: { ...totals, initiatives: initiatives.length, epics: epicNodes.length },
    initiatives,
    epicsWithoutInitiative: orphanEpics,
    withoutEpic: loose.map((issue) => presentIssue(model, issue, filter)),
  };
}

export function buildEpicDetail(model: WorkModel, epicId: string, filter: AnalysisFilter) {
  const epic = model.epics.find((item) => item.id === epicId);
  if (!epic) throw new HttpError(404, 'Épica no encontrada');
  const scoped = { ...filter, epicId };
  const children = model.issues.filter((issue) => issue.kind !== 'EPIC' && issue.epicId === epicId && scopedIssues(model, scoped).some((item) => item.id === issue.id));
  return {
    epic,
    metrics: epicRollup(model, epic, scoped),
    issues: children.map((issue) => presentIssue(model, issue, scoped)),
  };
}

export function buildInitiativeDetail(model: WorkModel, initiativeId: string, filter: AnalysisFilter) {
  const epics = model.epics.filter((epic) => epic.initiativeId === initiativeId);
  const scoped = { ...filter, initiativeId };
  return {
    metrics: initiativeRollup(model, initiativeId, scoped),
    epics: epics.map((epic) => ({
      ...epic,
      metrics: epicRollup(model, epic, scoped),
      issues: scopedIssues(model, { ...scoped, epicId: epic.id })
        .filter((issue) => issue.epicId === epic.id)
        .map((issue) => presentIssue(model, issue, scoped)),
    })),
  };
}

export function buildProductivity(model: WorkModel, filter: AnalysisFilter) {
  return productivity(model, filter);
}

export function listIssueViews(model: WorkModel, filter: AnalysisFilter): IssueView[] {
  return scopedIssues(model, filter).map((issue) => presentIssue(model, issue, filter));
}

export { presentIssue };
