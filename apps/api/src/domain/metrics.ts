import type { MaintenanceType, StatusCategory } from './types';

export interface AnalysisFilter {
  sprintId?: string | null;
  from?: string | null;
  to?: string | null;
  personAccountId?: string | null;
  subareaId?: string | null;
  serviceFamilyId?: string | null;
  initiativeId?: string | null;
  objectiveId?: string | null;
  epicId?: string | null;
  maintenanceType?: MaintenanceType | null;
  activityTypeId?: string | null;
  q?: string | null;
}

export interface SprintWindow {
  id: string;
  name: string;
  state: string;
  startDate: string | null;
  endDate: string | null;
}

export interface PersonFact {
  id: string;
  accountId: string;
  name: string;
  subareaId: string | null;
  subareaName: string | null;
  familyId: string | null;
  familyName: string | null;
}

export interface EpicFact {
  id: string;
  key: string;
  jiraIssueId: string;
  summary: string;
  statusName: string;
  statusCategory: StatusCategory;
  assigneeName: string | null;
  initiativeId: string | null;
  initiativeName: string | null;
  objectiveId: string | null;
  objectiveName: string | null;
  objectiveExplicit: boolean;
  maintenanceType: MaintenanceType | null;
  activityTypeId: string | null;
  activityName: string | null;
  jiraUrl: string;
  ownStoryPoints: number | null;
}

export interface IssueFact {
  id: string;
  jiraIssueId: string;
  key: string;
  summary: string;
  issueType: string;
  kind: 'EPIC' | 'STORY' | 'TASK' | 'OTHER';
  statusName: string;
  statusCategory: StatusCategory;
  epicId: string | null;
  epicResolution: string;
  assigneeAccountId: string | null;
  assigneeName: string | null;
  sprintIds: string[];
  currentSprintId: string | null;
  currentSprintName: string | null;
  inBacklog: boolean;
  originalSeconds: number;
  spentSeconds: number;
  remainingSeconds: number;
  storyPoints: number | null;
  createdAt: string | null;
  resolvedAt: string | null;
  jiraUrl: string;
}

export interface WorklogFact {
  id: string;
  issueId: string;
  accountId: string;
  displayName: string;
  seconds: number;
  startedAt: string;
  sprintId: string | null;
}

export interface DemandFact {
  id: string;
  title: string;
  requester: string;
  occurredAt: string;
  priority: string;
  estimatedHours: number;
  initiativeId: string | null;
  initiativeName: string | null;
  objectiveId: string | null;
  objectiveName: string | null;
  subareaId: string | null;
  subareaName: string | null;
  familyId: string | null;
  familyName: string | null;
  status: string;
  epicId: string | null;
  epicKey: string | null;
  jiraKey: string | null;
  description: string | null;
  notes: string | null;
}

export interface WorkModel {
  epics: EpicFact[];
  issues: IssueFact[];
  worklogs: WorklogFact[];
  people: PersonFact[];
  sprints: SprintWindow[];
  demands: DemandFact[];
}

export interface HoursByPerson {
  accountId: string;
  name: string;
  hours: number;
  subareaName: string | null;
  familyName: string | null;
}

export interface DistributionSlice {
  key: string;
  label: string;
  hours: number;
}

export interface IssueMetrics {
  originalHours: number;
  loggedHours: number;
  remainingHours: number;
  consumedPct: number | null;
  done: boolean;
  inProgress: boolean;
  pending: boolean;
  hasHours: boolean;
  missingEpic: boolean;
  missingEstimate: boolean;
  workers: HoursByPerson[];
}

export interface RollupMetrics {
  issueCount: number;
  done: number;
  inProgress: number;
  pending: number;
  withoutEstimate: number;
  withoutHours: number;
  originalHours: number;
  loggedHours: number;
  remainingHours: number;
  executedPct: number | null;
  storyPoints: number;
  people: HoursByPerson[];
  bySubarea: DistributionSlice[];
  byFamily: DistributionSlice[];
  byMaintenance: DistributionSlice[];
  byActivity: DistributionSlice[];
}

export function hours(seconds: number): number {
  return Math.round((seconds / 3600) * 100) / 100;
}

export function inRange(iso: string, from?: string | null, to?: string | null): boolean {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return false;
  if (from && time < Date.parse(startOfDay(from))) return false;
  if (to && time > Date.parse(endOfDay(to))) return false;
  return true;
}

function startOfDay(day: string): string {
  return day.length <= 10 ? `${day}T00:00:00.000Z` : day;
}

function endOfDay(day: string): string {
  return day.length <= 10 ? `${day}T23:59:59.999Z` : day;
}

function personMatches(person: PersonFact | undefined, filter: AnalysisFilter): boolean {
  if (!person) return false;
  if (filter.subareaId && person.subareaId !== filter.subareaId) return false;
  if (filter.serviceFamilyId && person.familyId !== filter.serviceFamilyId) return false;
  if (filter.personAccountId && person.accountId !== filter.personAccountId) return false;
  return true;
}

function textMatch(issue: IssueFact, epic: EpicFact | undefined, q: string): boolean {
  const hay = `${issue.key} ${issue.summary} ${epic?.key ?? ''} ${epic?.summary ?? ''}`.toLowerCase();
  return hay.includes(q.trim().toLowerCase());
}

export function worklogsForIssue(model: WorkModel, issueId: string): WorklogFact[] {
  return model.worklogs.filter((worklog) => worklog.issueId === issueId);
}

export function scopeWorklogs(
  model: WorkModel,
  issue: IssueFact,
  filter: AnalysisFilter,
): WorklogFact[] {
  const logs = worklogsForIssue(model, issue.id);
  return logs.filter((worklog) => worklogInScope(model, worklog, filter));
}

export function worklogInScope(model: WorkModel, worklog: WorklogFact, filter: AnalysisFilter): boolean {
  if (filter.sprintId) {
    if (worklog.sprintId === filter.sprintId) return true;
    if (!worklog.sprintId) {
      const sprint = model.sprints.find((item) => item.id === filter.sprintId);
      if (sprint?.startDate && sprint.endDate) {
        return inRange(worklog.startedAt, sprint.startDate, sprint.endDate);
      }
    }
    return false;
  }
  if (filter.from || filter.to) return inRange(worklog.startedAt, filter.from, filter.to);
  return true;
}

function narrowPeople(model: WorkModel, worklog: WorklogFact, filter: AnalysisFilter): boolean {
  if (!filter.personAccountId && !filter.subareaId && !filter.serviceFamilyId) return true;
  const person = model.people.find((item) => item.accountId === worklog.accountId);
  return personMatches(person, filter);
}

export function issueInScope(model: WorkModel, issue: IssueFact, filter: AnalysisFilter): boolean {
  if (issue.kind === 'EPIC') return false;
  const epic = issue.epicId ? model.epics.find((item) => item.id === issue.epicId) : undefined;
  if (filter.epicId && issue.epicId !== filter.epicId) return false;
  if (filter.initiativeId && epic?.initiativeId !== filter.initiativeId) return false;
  if (filter.objectiveId && epic?.objectiveId !== filter.objectiveId) return false;
  if (filter.maintenanceType && epic?.maintenanceType !== filter.maintenanceType) return false;
  if (filter.activityTypeId && epic?.activityTypeId !== filter.activityTypeId) return false;
  if (filter.sprintId && !issue.sprintIds.includes(filter.sprintId)) return false;
  if (filter.q && !textMatch(issue, epic, filter.q)) return false;

  const scoped = scopeWorklogs(model, issue, filter).filter((worklog) =>
    narrowPeople(model, worklog, filter),
  );
  if ((filter.from || filter.to) && scoped.length === 0) {
    const created = issue.createdAt ? inRange(issue.createdAt, filter.from, filter.to) : false;
    const resolved = issue.resolvedAt ? inRange(issue.resolvedAt, filter.from, filter.to) : false;
    if (!created && !resolved) return false;
  }
  if (filter.personAccountId || filter.subareaId || filter.serviceFamilyId) {
    const assignee = model.people.find((item) => item.accountId === issue.assigneeAccountId);
    const assigneeOk = personMatches(assignee, filter);
    if (!assigneeOk && scoped.length === 0) return false;
  }
  return true;
}

export function loggedSeconds(model: WorkModel, issue: IssueFact, filter: AnalysisFilter): number {
  const logs = scopeWorklogs(model, issue, filter).filter((worklog) => narrowPeople(model, worklog, filter));
  const restricted =
    Boolean(filter.sprintId) ||
    Boolean(filter.from) ||
    Boolean(filter.to) ||
    Boolean(filter.personAccountId) ||
    Boolean(filter.subareaId) ||
    Boolean(filter.serviceFamilyId);
  if (restricted) return logs.reduce((sum, worklog) => sum + worklog.seconds, 0);
  return issue.spentSeconds;
}

export function issueMetrics(model: WorkModel, issue: IssueFact, filter: AnalysisFilter): IssueMetrics {
  const logged = loggedSeconds(model, issue, filter);
  const people = hoursByPerson(model, scopeWorklogs(model, issue, filter).filter((worklog) => narrowPeople(model, worklog, filter)));
  if (people.length === 0 && issue.spentSeconds > 0 && !filter.sprintId && !filter.from && !filter.to) {
    const assignee = model.people.find((item) => item.accountId === issue.assigneeAccountId);
    if (assignee && personMatches(assignee, filter)) {
      people.push({
        accountId: assignee.accountId,
        name: assignee.name,
        hours: hours(issue.spentSeconds),
        subareaName: assignee.subareaName,
        familyName: assignee.familyName,
      });
    }
  }
  return {
    originalHours: hours(issue.originalSeconds),
    loggedHours: hours(logged),
    remainingHours: hours(issue.remainingSeconds),
    consumedPct: issue.originalSeconds > 0 ? Math.round((logged / issue.originalSeconds) * 1000) / 10 : null,
    done: issue.statusCategory === 'done',
    inProgress: issue.statusCategory === 'indeterminate',
    pending: issue.statusCategory === 'new',
    hasHours: logged > 0 || issue.spentSeconds > 0,
    missingEpic: !issue.epicId,
    missingEstimate: issue.originalSeconds <= 0,
    workers: people.sort((a, b) => a.name.localeCompare(b.name, 'es')),
  };
}

function hoursByPerson(model: WorkModel, logs: WorklogFact[]): HoursByPerson[] {
  const map = new Map<string, HoursByPerson>();
  for (const worklog of logs) {
    const person = model.people.find((item) => item.accountId === worklog.accountId);
    const current = map.get(worklog.accountId) ?? {
      accountId: worklog.accountId,
      name: person?.name || worklog.displayName,
      hours: 0,
      subareaName: person?.subareaName ?? null,
      familyName: person?.familyName ?? null,
    };
    current.hours = hours(current.hours * 3600 + worklog.seconds);
    map.set(worklog.accountId, current);
  }
  return [...map.values()];
}

function addSlice(map: Map<string, DistributionSlice>, key: string, label: string, seconds: number) {
  const current = map.get(key) ?? { key, label, hours: 0 };
  current.hours = hours(current.hours * 3600 + seconds);
  map.set(key, current);
}

const MAINTENANCE_LABEL: Record<string, string> = {
  ADAPTIVE: 'Adaptativo',
  CORRECTIVE: 'Correctivo',
  EVOLUTIVE: 'Evolutivo',
};

export function rollupIssues(model: WorkModel, issues: IssueFact[], filter: AnalysisFilter): RollupMetrics {
  let original = 0;
  let logged = 0;
  let remaining = 0;
  let done = 0;
  let inProgress = 0;
  let pending = 0;
  let withoutEstimate = 0;
  let withoutHours = 0;
  let storyPoints = 0;
  const personSeconds = new Map<string, { name: string; seconds: number; subareaName: string | null; familyName: string | null }>();
  const bySubarea = new Map<string, DistributionSlice>();
  const byFamily = new Map<string, DistributionSlice>();
  const byMaintenance = new Map<string, DistributionSlice>();
  const byActivity = new Map<string, DistributionSlice>();

  for (const issue of issues) {
    const metrics = issueMetrics(model, issue, filter);
    original += issue.originalSeconds;
    remaining += issue.remainingSeconds;
    const seconds = Math.round(metrics.loggedHours * 3600);
    logged += seconds;
    if (metrics.done) done += 1;
    else if (metrics.inProgress) inProgress += 1;
    else pending += 1;
    if (metrics.missingEstimate) withoutEstimate += 1;
    if (seconds <= 0) withoutHours += 1;
    storyPoints += issue.storyPoints ?? 0;
    const epic = issue.epicId ? model.epics.find((item) => item.id === issue.epicId) : undefined;
    const maintenanceKey = epic?.maintenanceType ?? 'none';
    const activityKey = epic?.activityTypeId ?? 'none';
    addSlice(byMaintenance, maintenanceKey, epic?.maintenanceType ? MAINTENANCE_LABEL[epic.maintenanceType] : 'Sin clasificar', seconds);
    addSlice(byActivity, activityKey, epic?.activityName ?? 'Sin clasificar', seconds);
    const logs = scopeWorklogs(model, issue, filter).filter((worklog) => narrowPeople(model, worklog, filter));
    if (logs.length === 0 && seconds > 0 && issue.assigneeAccountId) {
      const person = model.people.find((item) => item.accountId === issue.assigneeAccountId);
      const bucket = personSeconds.get(issue.assigneeAccountId) ?? {
        name: person?.name || issue.assigneeName || issue.assigneeAccountId,
        seconds: 0,
        subareaName: person?.subareaName ?? null,
        familyName: person?.familyName ?? null,
      };
      bucket.seconds += seconds;
      personSeconds.set(issue.assigneeAccountId, bucket);
      addSlice(bySubarea, person?.subareaId ?? 'none', person?.subareaName ?? 'Sin subárea', seconds);
      addSlice(byFamily, person?.familyId ?? 'none', person?.familyName ?? 'Sin familia', seconds);
    }
    for (const worklog of logs) {
      const person = model.people.find((item) => item.accountId === worklog.accountId);
      const bucket = personSeconds.get(worklog.accountId) ?? {
        name: person?.name || worklog.displayName,
        seconds: 0,
        subareaName: person?.subareaName ?? null,
        familyName: person?.familyName ?? null,
      };
      bucket.seconds += worklog.seconds;
      personSeconds.set(worklog.accountId, bucket);
      addSlice(bySubarea, person?.subareaId ?? 'none', person?.subareaName ?? 'Sin subárea', worklog.seconds);
      addSlice(byFamily, person?.familyId ?? 'none', person?.familyName ?? 'Sin familia', worklog.seconds);
    }
  }

  const people = [...personSeconds.entries()]
    .map(([accountId, value]) => ({
      accountId,
      name: value.name,
      hours: hours(value.seconds),
      subareaName: value.subareaName,
      familyName: value.familyName,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));

  return {
    issueCount: issues.length,
    done,
    inProgress,
    pending,
    withoutEstimate,
    withoutHours,
    originalHours: hours(original),
    loggedHours: hours(logged),
    remainingHours: hours(remaining),
    executedPct: original > 0 ? Math.round((logged / original) * 1000) / 10 : null,
    storyPoints: Math.round(storyPoints * 100) / 100,
    people,
    bySubarea: [...bySubarea.values()],
    byFamily: [...byFamily.values()],
    byMaintenance: [...byMaintenance.values()],
    byActivity: [...byActivity.values()],
  };
}

export function directEpicSeconds(model: WorkModel, epic: EpicFact, filter: AnalysisFilter): number {
  const epicIssue = model.issues.find((issue) => issue.kind === 'EPIC' && issue.jiraIssueId === epic.jiraIssueId);
  if (!epicIssue) return 0;
  const logs = scopeWorklogs(model, epicIssue, filter).filter((worklog) => narrowPeople(model, worklog, filter));
  if (logs.length > 0) return logs.reduce((sum, worklog) => sum + worklog.seconds, 0);
  const restricted =
    Boolean(filter.sprintId) ||
    Boolean(filter.from) ||
    Boolean(filter.to) ||
    Boolean(filter.personAccountId) ||
    Boolean(filter.subareaId) ||
    Boolean(filter.serviceFamilyId);
  if (restricted) return 0;
  return epicIssue.spentSeconds;
}

export function epicRollup(model: WorkModel, epic: EpicFact, filter: AnalysisFilter): RollupMetrics {
  const children = model.issues.filter((issue) => issue.kind !== 'EPIC' && issue.epicId === epic.id && issueInScope(model, issue, { ...filter, epicId: epic.id }));
  const rolled = rollupIssues(model, children, filter);
  const direct = directEpicSeconds(model, epic, filter);
  if (direct > 0) {
    rolled.loggedHours = hours(rolled.loggedHours * 3600 + direct);
    const epicIssue = model.issues.find((issue) => issue.kind === 'EPIC' && issue.jiraIssueId === epic.jiraIssueId);
    const logs = epicIssue
      ? scopeWorklogs(model, epicIssue, filter).filter((worklog) => narrowPeople(model, worklog, filter))
      : [];
    for (const worklog of logs) {
      const existing = rolled.people.find((person) => person.accountId === worklog.accountId);
      const person = model.people.find((item) => item.accountId === worklog.accountId);
      if (existing) existing.hours = hours(existing.hours * 3600 + worklog.seconds);
      else {
        rolled.people.push({
          accountId: worklog.accountId,
          name: person?.name || worklog.displayName,
          hours: hours(worklog.seconds),
          subareaName: person?.subareaName ?? null,
          familyName: person?.familyName ?? null,
        });
      }
    }
    rolled.people.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    rolled.executedPct =
      rolled.originalHours > 0 ? Math.round((rolled.loggedHours / rolled.originalHours) * 1000) / 10 : null;
  }
  return rolled;
}

export function initiativeRollup(
  model: WorkModel,
  initiativeId: string,
  filter: AnalysisFilter,
): RollupMetrics {
  const epics = model.epics.filter((epic) => epic.initiativeId === initiativeId);
  const children = model.issues.filter(
    (issue) => issue.kind !== 'EPIC' && epics.some((epic) => epic.id === issue.epicId) && issueInScope(model, issue, filter),
  );
  const rolled = rollupIssues(model, children, filter);
  let direct = 0;
  for (const epic of epics) direct += directEpicSeconds(model, epic, filter);
  if (direct > 0) {
    rolled.loggedHours = hours(rolled.loggedHours * 3600 + direct);
    rolled.executedPct =
      rolled.originalHours > 0 ? Math.round((rolled.loggedHours / rolled.originalHours) * 1000) / 10 : null;
  }
  return rolled;
}

export function scopedIssues(model: WorkModel, filter: AnalysisFilter): IssueFact[] {
  return model.issues.filter((issue) => issueInScope(model, issue, filter));
}

export interface ProductivityReport {
  hours: number;
  storiesDone: number;
  storiesInProgress: number;
  estimateDoneHours: number;
  estimatePendingHours: number;
  byPerson: Array<HoursByPerson & { stories: number }>;
  hourDistribution: DistributionSlice[];
  loadBySubarea: DistributionSlice[];
  loadByFamily: DistributionSlice[];
  sprintTrend: Array<{ sprintId: string; sprintName: string; state: string; hours: number; done: number }>;
  unplanned: {
    demandCount: number;
    demandHours: number;
    issuesWithoutEpic: number;
    hoursWithoutEpic: number;
  };
}

export function productivity(model: WorkModel, filter: AnalysisFilter): ProductivityReport {
  const issues = scopedIssues(model, filter);
  const rolled = rollupIssues(model, issues, filter);
  let direct = 0;
  for (const epic of model.epics) {
    if (filter.initiativeId && epic.initiativeId !== filter.initiativeId) continue;
    if (filter.epicId && epic.id !== filter.epicId) continue;
    if (filter.objectiveId && epic.objectiveId !== filter.objectiveId) continue;
    if (filter.maintenanceType && epic.maintenanceType !== filter.maintenanceType) continue;
    if (filter.activityTypeId && epic.activityTypeId !== filter.activityTypeId) continue;
    direct += directEpicSeconds(model, epic, filter);
  }
  const storiesByPerson = new Map<string, number>();
  for (const issue of issues) {
    const participants = new Set<string>();
    if (issue.assigneeAccountId) participants.add(issue.assigneeAccountId);
    for (const worklog of scopeWorklogs(model, issue, filter)) participants.add(worklog.accountId);
    for (const accountId of participants) {
      storiesByPerson.set(accountId, (storiesByPerson.get(accountId) ?? 0) + 1);
    }
  }
  const byPerson = rolled.people
    .map((person) => ({ ...person, stories: storiesByPerson.get(person.accountId) ?? 0 }));
  for (const epic of model.epics) {
    if (filter.initiativeId && epic.initiativeId !== filter.initiativeId) continue;
    if (filter.epicId && epic.id !== filter.epicId) continue;
    if (filter.objectiveId && epic.objectiveId !== filter.objectiveId) continue;
    if (filter.maintenanceType && epic.maintenanceType !== filter.maintenanceType) continue;
    if (filter.activityTypeId && epic.activityTypeId !== filter.activityTypeId) continue;
    const epicIssue = model.issues.find((issue) => issue.kind === 'EPIC' && issue.jiraIssueId === epic.jiraIssueId);
    if (!epicIssue) continue;
    const logs = scopeWorklogs(model, epicIssue, filter).filter((worklog) => narrowPeople(model, worklog, filter));
    for (const worklog of logs) {
      const person = model.people.find((item) => item.accountId === worklog.accountId);
      const existing = byPerson.find((item) => item.accountId === worklog.accountId);
      if (existing) existing.hours = hours(existing.hours * 3600 + worklog.seconds);
      else {
        byPerson.push({
          accountId: worklog.accountId,
          name: person?.name || worklog.displayName,
          hours: hours(worklog.seconds),
          subareaName: person?.subareaName ?? null,
          familyName: person?.familyName ?? null,
          stories: storiesByPerson.get(worklog.accountId) ?? 0,
        });
      }
    }
  }
  byPerson.sort((a, b) => a.name.localeCompare(b.name, 'es'));

  const sprintTrend = model.sprints
    .filter((sprint) => sprint.state === 'active' || sprint.state === 'closed')
    .map((sprint) => {
      const sprintFilter: AnalysisFilter = { ...filter, sprintId: sprint.id, from: null, to: null };
      const sprintIssues = model.issues.filter((issue) => issueInScope(model, issue, sprintFilter));
      const sprintRoll = rollupIssues(model, sprintIssues, sprintFilter);
      return {
        sprintId: sprint.id,
        sprintName: sprint.name,
        state: sprint.state,
        hours: sprintRoll.loggedHours,
        done: sprintRoll.done,
      };
    });

  const demands = model.demands.filter((demand) => demandInScope(demand, filter));
  const withoutEpic = issues.filter((issue) => !issue.epicId || issue.epicResolution === 'UNRESOLVED');
  const withoutRoll = rollupIssues(model, withoutEpic, filter);

  return {
    hours: hours(rolled.loggedHours * 3600 + direct),
    storiesDone: rolled.done,
    storiesInProgress: rolled.inProgress,
    estimateDoneHours: hours(issues.filter((issue) => issue.statusCategory === 'done').reduce((sum, issue) => sum + issue.originalSeconds, 0)),
    estimatePendingHours: hours(issues.filter((issue) => issue.statusCategory !== 'done').reduce((sum, issue) => sum + issue.originalSeconds, 0)),
    byPerson,
    hourDistribution: rolled.byActivity,
    loadBySubarea: rolled.bySubarea,
    loadByFamily: rolled.byFamily,
    sprintTrend,
    unplanned: {
      demandCount: demands.length,
      demandHours: Math.round(demands.reduce((sum, demand) => sum + demand.estimatedHours, 0) * 100) / 100,
      issuesWithoutEpic: withoutEpic.length,
      hoursWithoutEpic: withoutRoll.loggedHours,
    },
  };
}

export function demandInScope(demand: DemandFact, filter: AnalysisFilter): boolean {
  if (filter.initiativeId && demand.initiativeId !== filter.initiativeId) return false;
  if (filter.objectiveId && demand.objectiveId !== filter.objectiveId) return false;
  if (filter.subareaId && demand.subareaId !== filter.subareaId) return false;
  if (filter.serviceFamilyId && demand.familyId !== filter.serviceFamilyId) return false;
  if (filter.epicId && demand.epicId !== filter.epicId) return false;
  if ((filter.from || filter.to) && !inRange(demand.occurredAt, filter.from, filter.to)) return false;
  if (filter.q) {
    const hay = `${demand.title} ${demand.requester} ${demand.jiraKey ?? ''}`.toLowerCase();
    if (!hay.includes(filter.q.trim().toLowerCase())) return false;
  }
  return true;
}
