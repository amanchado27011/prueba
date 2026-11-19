import type { AnalysisFilter, DemandFact, EpicFact, IssueFact, PersonFact, WorkModel } from '../domain/metrics';
import type { MaintenanceType, StatusCategory } from '../domain/types';
import { prisma } from '../lib/prisma';

function category(value: string): StatusCategory {
  if (value === 'done' || value === 'indeterminate' || value === 'new') return value;
  return 'new';
}

export async function loadWorkModel(): Promise<WorkModel> {
  const [epicRows, issueRows, peopleRows, sprintRows, demandRows] = await Promise.all([
    prisma.epic.findMany({
      where: { activeInJira: true },
      include: { initiative: { include: { objective: true } }, objective: true, activityType: true },
    }),
    prisma.issue.findMany({
      where: { activeInJira: true },
      include: { assignee: true, currentSprint: true, sprints: true, worklogs: true },
    }),
    prisma.person.findMany({ include: { subarea: true, serviceFamily: true } }),
    prisma.sprint.findMany({ where: { activeInJira: true }, orderBy: { startDate: 'asc' } }),
    prisma.impulsiveDemand.findMany({
      include: { initiative: true, objective: true, subarea: true, serviceFamily: true, epic: true },
      orderBy: { occurredAt: 'desc' },
    }),
  ]);

  const people: PersonFact[] = peopleRows.map((person) => ({
    id: person.id,
    accountId: person.accountId,
    name: person.displayName,
    subareaId: person.subareaId,
    subareaName: person.subarea?.name ?? null,
    familyId: person.serviceFamilyId,
    familyName: person.serviceFamily?.name ?? null,
  }));

  const epics: EpicFact[] = epicRows.map((epic) => {
    const objectiveId = epic.objectiveExplicit ? epic.objectiveId : epic.initiative?.objectiveId ?? null;
    const objectiveName = epic.objectiveExplicit ? epic.objective?.name ?? null : epic.initiative?.objective?.name ?? null;
    return {
      id: epic.id,
      key: epic.key,
      jiraIssueId: epic.jiraIssueId,
      summary: epic.summary,
      statusName: epic.statusName,
      statusCategory: category(epic.statusCategory),
      assigneeName: epic.assigneeName,
      initiativeId: epic.initiativeId,
      initiativeName: epic.initiative?.name ?? null,
      objectiveId,
      objectiveName,
      objectiveExplicit: epic.objectiveExplicit,
      maintenanceType: (epic.maintenanceType as MaintenanceType | null) ?? null,
      activityTypeId: epic.activityTypeId,
      activityName: epic.activityType?.name ?? null,
      jiraUrl: epic.jiraUrl,
      ownStoryPoints: epic.storyPoints,
    };
  });

  const issues: IssueFact[] = issueRows.map((issue) => ({
    id: issue.id,
    jiraIssueId: issue.jiraIssueId,
    key: issue.key,
    summary: issue.summary,
    issueType: issue.issueType,
    kind: issue.kind,
    statusName: issue.statusName,
    statusCategory: category(issue.statusCategory),
    epicId: issue.epicId,
    epicResolution: issue.epicResolution,
    assigneeAccountId: issue.assignee?.accountId ?? null,
    assigneeName: issue.assignee?.displayName ?? null,
    sprintIds: issue.sprints.map((link) => link.sprintId),
    currentSprintId: issue.currentSprintId,
    currentSprintName: issue.currentSprint?.name ?? null,
    inBacklog: issue.inBacklog,
    originalSeconds: issue.originalSeconds,
    spentSeconds: issue.spentSeconds,
    remainingSeconds: issue.remainingSeconds,
    storyPoints: issue.storyPoints,
    createdAt: issue.createdAtJira?.toISOString() ?? null,
    resolvedAt: issue.resolvedAt?.toISOString() ?? null,
    jiraUrl: issue.jiraUrl,
  }));

  const demands: DemandFact[] = demandRows.map((demand) => ({
    id: demand.id,
    title: demand.title,
    requester: demand.requester,
    occurredAt: demand.occurredAt.toISOString(),
    priority: demand.priority,
    estimatedHours: demand.estimatedHours,
    initiativeId: demand.initiativeId,
    initiativeName: demand.initiative?.name ?? null,
    objectiveId: demand.objectiveId,
    objectiveName: demand.objective?.name ?? null,
    subareaId: demand.subareaId,
    subareaName: demand.subarea?.name ?? null,
    familyId: demand.serviceFamilyId,
    familyName: demand.serviceFamily?.name ?? null,
    status: demand.status,
    epicId: demand.epicId,
    epicKey: demand.epic?.key ?? null,
    jiraKey: demand.jiraKey,
    description: demand.description,
    notes: demand.notes,
  }));

  return {
    epics,
    issues,
    people,
    sprints: sprintRows.map((sprint) => ({
      id: sprint.id,
      name: sprint.name,
      state: sprint.state,
      startDate: sprint.startDate?.toISOString() ?? null,
      endDate: sprint.endDate?.toISOString() ?? null,
    })),
    worklogs: issueRows.flatMap((issue) =>
      issue.worklogs.map((worklog) => ({
        id: worklog.id,
        issueId: issue.id,
        accountId: worklog.accountId,
        displayName: worklog.displayName,
        seconds: worklog.seconds,
        startedAt: worklog.startedAt.toISOString(),
        sprintId: worklog.sprintId,
      })),
    ),
    demands,
  };
}

export interface QueryFilters {
  sprintId?: string;
  from?: string;
  to?: string;
  personId?: string;
  subareaId?: string;
  serviceFamilyId?: string;
  initiativeId?: string;
  objectiveId?: string;
  epicId?: string;
  maintenanceType?: MaintenanceType;
  activityTypeId?: string;
  q?: string;
}

export function toAnalysisFilter(query: QueryFilters, model: WorkModel): AnalysisFilter {
  const person = query.personId ? model.people.find((item) => item.id === query.personId) : undefined;
  return {
    sprintId: query.sprintId ?? null,
    from: query.from ?? null,
    to: query.to ?? null,
    personAccountId: query.personId ? person?.accountId ?? '__missing__' : null,
    subareaId: query.subareaId ?? null,
    serviceFamilyId: query.serviceFamilyId ?? null,
    initiativeId: query.initiativeId ?? null,
    objectiveId: query.objectiveId ?? null,
    epicId: query.epicId ?? null,
    maintenanceType: query.maintenanceType ?? null,
    activityTypeId: query.activityTypeId ?? null,
    q: query.q ?? null,
  };
}
