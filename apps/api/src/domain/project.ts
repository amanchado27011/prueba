import { classifyKind, pickCurrentSprint, resolveEpic } from './epic-resolve';
import type { Projection, ProjectionIssue, ProjectionPerson, RawSnapshot } from './types';

export function issueUrl(baseUrl: string, key: string): string {
  return `${baseUrl.replace(/\/$/, '')}/browse/${key}`;
}

export function buildProjection(raw: RawSnapshot, jiraBaseUrl: string): Projection {
  const epicKeys = new Set<string>();
  for (const issue of raw.issues) {
    if (classifyKind(issue) === 'EPIC') epicKeys.add(issue.key);
  }

  const people = new Map<string, ProjectionPerson>();
  const remember = (
    accountId: string | null,
    name: string | null,
    email: string | null,
    active: boolean,
  ) => {
    if (!accountId) return;
    const current = people.get(accountId);
    people.set(accountId, {
      accountId,
      displayName: name || current?.displayName || accountId,
      email: email ?? current?.email ?? null,
      active: Boolean(current?.active) || active,
    });
  };

  const issues: ProjectionIssue[] = [];
  const epics = [];

  for (const issue of raw.issues) {
    const kind = classifyKind(issue);
    if (!kind) continue;
    remember(issue.assigneeAccountId, issue.assigneeName, issue.assigneeEmail, issue.assigneeActive);
    const resolved =
      kind === 'EPIC'
        ? { epicKey: null, resolution: 'UNRESOLVED' as const }
        : resolveEpic(issue, epicKeys);
    const row: ProjectionIssue = {
      jiraIssueId: issue.id,
      key: issue.key,
      summary: issue.summary,
      description: issue.description,
      issueType: issue.issueTypeName,
      kind,
      statusName: issue.statusName,
      statusCategory: issue.statusCategory,
      epicKey: resolved.epicKey,
      epicResolution: resolved.resolution,
      assigneeAccountId: issue.assigneeAccountId,
      assigneeName: issue.assigneeName,
      sprintJiraIds: issue.sprintIds,
      currentSprintJiraId: pickCurrentSprint(issue.sprintIds, raw.sprints),
      inBacklog: issue.inBacklog && issue.sprintIds.length === 0,
      originalSeconds: Math.max(0, issue.originalSeconds || 0),
      spentSeconds: Math.max(0, issue.spentSeconds || 0),
      remainingSeconds: Math.max(0, issue.remainingSeconds || 0),
      storyPoints: issue.storyPoints,
      createdAt: issue.createdAt,
      resolvedAt: issue.resolvedAt,
      jiraUrl: issueUrl(jiraBaseUrl, issue.key),
    };
    issues.push(row);
    if (kind === 'EPIC') {
      epics.push({
        jiraIssueId: issue.id,
        key: issue.key,
        summary: issue.summary,
        description: issue.description,
        statusName: issue.statusName,
        statusCategory: issue.statusCategory,
        assigneeAccountId: issue.assigneeAccountId,
        assigneeName: issue.assigneeName,
        originalSeconds: row.originalSeconds,
        spentSeconds: row.spentSeconds,
        remainingSeconds: row.remainingSeconds,
        storyPoints: issue.storyPoints,
        jiraUrl: row.jiraUrl,
      });
    }
  }

  const knownIssueIds = new Set(issues.map((issue) => issue.jiraIssueId));
  const worklogs = raw.worklogs
    .filter((worklog) => knownIssueIds.has(worklog.issueId))
    .map((worklog) => {
      remember(worklog.accountId, worklog.displayName, worklog.email, true);
      return {
        jiraId: worklog.id,
        issueJiraId: worklog.issueId,
        accountId: worklog.accountId,
        displayName: worklog.displayName,
        seconds: Math.max(0, worklog.seconds || 0),
        startedAt: worklog.startedAt,
        sprintJiraId: worklog.sprintId ?? matchSprintByDate(worklog.startedAt, raw.sprints),
      };
    });

  return {
    projects: raw.projects,
    boards: raw.boards,
    sprints: raw.sprints,
    people: [...people.values()].sort((a, b) => a.displayName.localeCompare(b.displayName, 'es')),
    epics,
    issues,
    worklogs,
    httpMethods: raw.httpMethods,
  };
}

function matchSprintByDate(startedAt: string, sprints: RawSnapshot['sprints']): string | null {
  const time = Date.parse(startedAt);
  if (Number.isNaN(time)) return null;
  const hit = sprints.find((sprint) => {
    if (!sprint.startDate || !sprint.endDate) return false;
    const start = Date.parse(sprint.startDate);
    const end = Date.parse(sprint.endDate);
    return time >= start && time <= end;
  });
  return hit?.id ?? null;
}
