import { adfToText } from './adf';
import type { RawIssue, RawWorklog, StatusCategory } from '../domain/types';
import { normalizeStatusCategory } from '../domain/epic-resolve';

export function parseSprintIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const ids: string[] = [];
  for (const item of value) {
    if (item && typeof item === 'object' && 'id' in item) {
      ids.push(String((item as { id: unknown }).id));
      continue;
    }
    if (typeof item === 'string') {
      const match = item.match(/\bid=(\d+)/);
      if (match) ids.push(match[1]);
    }
  }
  return ids;
}

export function fieldKey(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value && 'key' in value) {
    const key = (value as { key?: unknown }).key;
    return typeof key === 'string' ? key : null;
  }
  return null;
}

function secondsOf(fields: Record<string, unknown>, trackingKey: string, flatKey: string): number {
  const tracking = fields.timetracking;
  if (tracking && typeof tracking === 'object' && trackingKey in tracking) {
    const value = (tracking as Record<string, unknown>)[trackingKey];
    if (typeof value === 'number') return value;
  }
  const flat = fields[flatKey];
  return typeof flat === 'number' ? flat : 0;
}

export function mapJiraIssue(
  raw: unknown,
  ctx: { epicLinkField: string | null; storyPointsField: string | null; sprintField: string | null; backlogKeys: Set<string> },
): RawIssue | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as { id?: unknown; key?: unknown; fields?: Record<string, unknown> };
  if (typeof row.id !== 'string' && typeof row.id !== 'number') return null;
  if (typeof row.key !== 'string') return null;
  const fields = row.fields ?? {};
  const issueType = (fields.issuetype ?? {}) as { name?: string; subtask?: boolean; hierarchyLevel?: number };
  const status = (fields.status ?? {}) as { name?: string; statusCategory?: { key?: string } };
  const assignee = fields.assignee as {
    accountId?: string;
    displayName?: string;
    emailAddress?: string;
    active?: boolean;
  } | null;
  const parent = fields.parent as {
    key?: string;
    fields?: { issuetype?: { name?: string; hierarchyLevel?: number } };
  } | undefined;
  const storyRaw = ctx.storyPointsField ? fields[ctx.storyPointsField] : null;
  const category: StatusCategory = normalizeStatusCategory(status.statusCategory?.key);
  return {
    id: String(row.id),
    key: row.key,
    summary: typeof fields.summary === 'string' ? fields.summary : row.key,
    description: adfToText(fields.description) || null,
    issueTypeName: issueType.name || 'Issue',
    subtask: Boolean(issueType.subtask),
    hierarchyLevel: typeof issueType.hierarchyLevel === 'number' ? issueType.hierarchyLevel : null,
    statusName: status.name || category,
    statusCategory: category,
    assigneeAccountId: assignee?.accountId ?? null,
    assigneeName: assignee?.displayName ?? null,
    assigneeEmail: assignee?.emailAddress ?? null,
    assigneeActive: assignee?.active !== false,
    parentKey: parent?.key ?? null,
    parentIssueTypeName: parent?.fields?.issuetype?.name ?? null,
    parentHierarchyLevel: parent?.fields?.issuetype?.hierarchyLevel ?? null,
    epicLinkKey: ctx.epicLinkField ? fieldKey(fields[ctx.epicLinkField]) : null,
    hierarchyEpicKey: fieldKey(fields.epic),
    sprintIds: ctx.sprintField ? parseSprintIds(fields[ctx.sprintField]) : [],
    inBacklog: ctx.backlogKeys.has(row.key),
    originalSeconds: secondsOf(fields, 'originalEstimateSeconds', 'timeoriginalestimate'),
    spentSeconds: secondsOf(fields, 'timeSpentSeconds', 'timespent'),
    remainingSeconds: secondsOf(fields, 'remainingEstimateSeconds', 'timeestimate'),
    storyPoints: typeof storyRaw === 'number' ? storyRaw : null,
    createdAt: typeof fields.created === 'string' ? fields.created : null,
    resolvedAt: typeof fields.resolutiondate === 'string' ? fields.resolutiondate : null,
    projectKey: fieldKey(fields.project) ?? (typeof (fields.project as { key?: string } | undefined)?.key === 'string'
      ? (fields.project as { key: string }).key
      : null),
  };
}

export function mapEmbeddedWorklogs(issueId: string, fields: Record<string, unknown> | undefined): {
  logs: RawWorklog[];
  total: number;
} {
  const worklog = fields?.worklog as { total?: number; worklogs?: Array<Record<string, unknown>> } | undefined;
  const rows = worklog?.worklogs ?? [];
  return {
    total: worklog?.total ?? rows.length,
    logs: rows.map((row) => mapWorklog(issueId, row)).filter((row): row is RawWorklog => row != null),
  };
}

export function mapWorklog(issueId: string, row: Record<string, unknown>): RawWorklog | null {
  const author = row.author as { accountId?: string; displayName?: string; emailAddress?: string } | undefined;
  if (!author?.accountId || typeof row.id !== 'string' && typeof row.id !== 'number') return null;
  const seconds = typeof row.timeSpentSeconds === 'number' ? row.timeSpentSeconds : 0;
  const started = typeof row.started === 'string' ? row.started : typeof row.startedAt === 'string' ? row.startedAt : null;
  if (!started) return null;
  return {
    id: String(row.id),
    issueId,
    accountId: author.accountId,
    displayName: author.displayName || author.accountId,
    email: author.emailAddress ?? null,
    seconds,
    startedAt: started,
    sprintId: null,
  };
}
