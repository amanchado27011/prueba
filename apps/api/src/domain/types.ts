export type StatusCategory = 'new' | 'indeterminate' | 'done';

export type EpicResolution = 'PARENT' | 'EPIC_LINK' | 'HIERARCHY' | 'UNRESOLVED';

export type IssueKind = 'EPIC' | 'STORY' | 'TASK' | 'OTHER';

export type MaintenanceType = 'ADAPTIVE' | 'CORRECTIVE' | 'EVOLUTIVE';

export interface RawSprintRef {
  id: string;
  name?: string;
  state?: string;
  startDate?: string | null;
  endDate?: string | null;
}

export interface RawIssue {
  id: string;
  key: string;
  summary: string;
  description: string | null;
  issueTypeName: string;
  subtask: boolean;
  hierarchyLevel: number | null;
  statusName: string;
  statusCategory: StatusCategory;
  assigneeAccountId: string | null;
  assigneeName: string | null;
  assigneeEmail: string | null;
  assigneeActive: boolean;
  parentKey: string | null;
  parentIssueTypeName: string | null;
  parentHierarchyLevel: number | null;
  epicLinkKey: string | null;
  hierarchyEpicKey: string | null;
  sprintIds: string[];
  inBacklog: boolean;
  originalSeconds: number;
  spentSeconds: number;
  remainingSeconds: number;
  storyPoints: number | null;
  createdAt: string | null;
  resolvedAt: string | null;
  projectKey: string | null;
}

export interface RawWorklog {
  id: string;
  issueId: string;
  accountId: string;
  displayName: string;
  email: string | null;
  seconds: number;
  startedAt: string;
  sprintId: string | null;
}

export interface RawProject {
  id: string;
  key: string;
  name: string;
}

export interface RawBoard {
  id: string;
  name: string;
  type: string | null;
  projectKey: string | null;
}

export interface RawSprint {
  id: string;
  boardId: string;
  name: string;
  state: string;
  startDate: string | null;
  endDate: string | null;
}

export interface RawSnapshot {
  projects: RawProject[];
  boards: RawBoard[];
  sprints: RawSprint[];
  issues: RawIssue[];
  worklogs: RawWorklog[];
  /** Métodos HTTP observados. El lector cloud solo puede añadir GET. */
  httpMethods: string[];
}

export interface ProjectionPerson {
  accountId: string;
  displayName: string;
  email: string | null;
  active: boolean;
}

export interface ProjectionEpic {
  jiraIssueId: string;
  key: string;
  summary: string;
  description: string | null;
  statusName: string;
  statusCategory: StatusCategory;
  assigneeAccountId: string | null;
  assigneeName: string | null;
  originalSeconds: number;
  spentSeconds: number;
  remainingSeconds: number;
  storyPoints: number | null;
  jiraUrl: string;
}

export interface ProjectionIssue {
  jiraIssueId: string;
  key: string;
  summary: string;
  description: string | null;
  issueType: string;
  kind: IssueKind;
  statusName: string;
  statusCategory: StatusCategory;
  epicKey: string | null;
  epicResolution: EpicResolution;
  assigneeAccountId: string | null;
  assigneeName: string | null;
  sprintJiraIds: string[];
  currentSprintJiraId: string | null;
  inBacklog: boolean;
  originalSeconds: number;
  spentSeconds: number;
  remainingSeconds: number;
  storyPoints: number | null;
  createdAt: string | null;
  resolvedAt: string | null;
  jiraUrl: string;
}

export interface ProjectionWorklog {
  jiraId: string;
  issueJiraId: string;
  accountId: string;
  displayName: string;
  seconds: number;
  startedAt: string;
  sprintJiraId: string | null;
}

export interface Projection {
  projects: RawProject[];
  boards: RawBoard[];
  sprints: RawSprint[];
  people: ProjectionPerson[];
  epics: ProjectionEpic[];
  issues: ProjectionIssue[];
  worklogs: ProjectionWorklog[];
  httpMethods: string[];
}
