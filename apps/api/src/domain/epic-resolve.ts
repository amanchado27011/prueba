import type { EpicResolution, IssueKind, RawIssue, StatusCategory } from './types';

const EPIC_NAME = /epic|épica|epica/i;

export function normalizeStatusCategory(key: string | null | undefined): StatusCategory {
  const value = (key ?? '').toLowerCase();
  if (value === 'done') return 'done';
  if (value === 'indeterminate' || value === 'in progress' || value === 'in-progress') {
    return 'indeterminate';
  }
  return 'new';
}

export function isEpicType(name: string, hierarchyLevel: number | null, subtask: boolean): boolean {
  if (subtask) return false;
  if (hierarchyLevel === 1) return true;
  return EPIC_NAME.test(name);
}

export function classifyKind(issue: Pick<RawIssue, 'issueTypeName' | 'subtask' | 'hierarchyLevel'>): IssueKind | null {
  if (issue.subtask || issue.hierarchyLevel === -1) return null;
  if (isEpicType(issue.issueTypeName, issue.hierarchyLevel, issue.subtask)) return 'EPIC';
  const name = issue.issueTypeName.toLowerCase();
  if (name.includes('histor') || name === 'story' || name === 'user story') return 'STORY';
  if (name.includes('tarea') || name === 'task') return 'TASK';
  return 'OTHER';
}

export function resolveEpic(
  issue: RawIssue,
  epicKeys: Set<string>,
): { epicKey: string | null; resolution: EpicResolution } {
  if (issue.parentKey) {
    const parentIsEpic =
      (issue.parentIssueTypeName != null &&
        isEpicType(issue.parentIssueTypeName, issue.parentHierarchyLevel, false)) ||
      issue.parentHierarchyLevel === 1 ||
      epicKeys.has(issue.parentKey);
    if (parentIsEpic) {
      return { epicKey: issue.parentKey, resolution: 'PARENT' };
    }
  }
  if (issue.epicLinkKey) {
    return { epicKey: issue.epicLinkKey, resolution: 'EPIC_LINK' };
  }
  if (issue.hierarchyEpicKey) {
    return { epicKey: issue.hierarchyEpicKey, resolution: 'HIERARCHY' };
  }
  return { epicKey: null, resolution: 'UNRESOLVED' };
}

export function pickCurrentSprint(
  sprintIds: string[],
  sprints: Array<{ id: string; state: string; endDate: string | null }>,
): string | null {
  if (sprintIds.length === 0) return null;
  const mine = sprints.filter((sprint) => sprintIds.includes(sprint.id));
  const active = mine.find((sprint) => sprint.state === 'active');
  if (active) return active.id;
  const sorted = [...mine].sort((a, b) => {
    const ae = a.endDate ? Date.parse(a.endDate) : 0;
    const be = b.endDate ? Date.parse(b.endDate) : 0;
    return be - ae;
  });
  return sorted[0]?.id ?? sprintIds[0] ?? null;
}
