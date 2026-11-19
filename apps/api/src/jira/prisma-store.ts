import { Prisma, type EpicResolution, type IssueKind } from '@prisma/client';
import type { Projection } from '../domain/types';
import { prisma } from '../lib/prisma';
import type { ApplyStats } from './memory-store';

function asDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function applyProjectionToPrisma(projection: Projection, syncedAt: Date): Promise<ApplyStats> {
  for (const project of projection.projects) {
    await prisma.jiraProject.upsert({
      where: { jiraId: project.id },
      create: {
        jiraId: project.id,
        key: project.key,
        name: project.name,
        activeInJira: true,
        lastSyncedAt: syncedAt,
      },
      update: { key: project.key, name: project.name, activeInJira: true, lastSyncedAt: syncedAt },
    });
  }
  if (projection.projects.length > 0) {
    await prisma.jiraProject.updateMany({
      where: { jiraId: { notIn: projection.projects.map((project) => project.id) } },
      data: { activeInJira: false },
    });
  }

  const boardIds = new Map<string, string>();
  for (const board of projection.boards) {
    const saved = await prisma.board.upsert({
      where: { jiraId: board.id },
      create: {
        jiraId: board.id,
        name: board.name,
        type: board.type,
        projectKey: board.projectKey,
        activeInJira: true,
      },
      update: { name: board.name, type: board.type, projectKey: board.projectKey, activeInJira: true },
    });
    boardIds.set(board.id, saved.id);
  }

  const sprintIds = new Map<string, string>();
  for (const sprint of projection.sprints) {
    const saved = await prisma.sprint.upsert({
      where: { jiraId: sprint.id },
      create: {
        jiraId: sprint.id,
        boardId: boardIds.get(sprint.boardId) ?? null,
        name: sprint.name,
        state: sprint.state,
        startDate: asDate(sprint.startDate),
        endDate: asDate(sprint.endDate),
        activeInJira: true,
      },
      update: {
        boardId: boardIds.get(sprint.boardId) ?? null,
        name: sprint.name,
        state: sprint.state,
        startDate: asDate(sprint.startDate),
        endDate: asDate(sprint.endDate),
        activeInJira: true,
      },
    });
    sprintIds.set(sprint.id, saved.id);
  }

  const personIds = new Map<string, string>();
  for (const person of projection.people) {
    const existing = await prisma.person.findUnique({ where: { accountId: person.accountId } });
    if (!existing) {
      const created = await prisma.person.create({
        data: {
          accountId: person.accountId,
          displayName: person.displayName,
          email: person.email,
          active: person.active,
          lastSeenAt: syncedAt,
        },
      });
      personIds.set(person.accountId, created.id);
    } else {
      await prisma.person.update({
        where: { id: existing.id },
        data: {
          displayName: person.displayName,
          email: person.email ?? existing.email,
          active: existing.active || person.active,
          lastSeenAt: syncedAt,
        },
      });
      personIds.set(person.accountId, existing.id);
    }
  }

  const epicIds = new Map<string, string>();
  for (const epic of projection.epics) {
    const shared = {
      key: epic.key,
      summary: epic.summary,
      description: epic.description,
      statusName: epic.statusName,
      statusCategory: epic.statusCategory,
      assigneeAccountId: epic.assigneeAccountId,
      assigneeName: epic.assigneeName,
      originalSeconds: epic.originalSeconds,
      spentSeconds: epic.spentSeconds,
      remainingSeconds: epic.remainingSeconds,
      storyPoints: epic.storyPoints,
      jiraUrl: epic.jiraUrl,
      activeInJira: true,
      lastSyncedAt: syncedAt,
    };
    const existing = await prisma.epic.findUnique({ where: { jiraIssueId: epic.jiraIssueId } });
    const saved = existing
      ? await prisma.epic.update({ where: { id: existing.id }, data: shared })
      : await prisma.epic.create({ data: { jiraIssueId: epic.jiraIssueId, ...shared } });
    epicIds.set(epic.key, saved.id);
  }
  if (projection.epics.length > 0) {
    await prisma.epic.updateMany({
      where: { jiraIssueId: { notIn: projection.epics.map((epic) => epic.jiraIssueId) } },
      data: { activeInJira: false },
    });
  }

  for (const issue of projection.issues) {
    const linkedEpicId = issue.epicKey ? epicIds.get(issue.epicKey) ?? null : null;
    const resolution: EpicResolution = linkedEpicId ? issue.epicResolution : 'UNRESOLVED';
    const data = {
      key: issue.key,
      summary: issue.summary,
      description: issue.description,
      issueType: issue.issueType,
      kind: issue.kind as IssueKind,
      statusName: issue.statusName,
      statusCategory: issue.statusCategory,
      epicId: linkedEpicId,
      epicResolution: resolution,
      assigneeId: issue.assigneeAccountId ? personIds.get(issue.assigneeAccountId) ?? null : null,
      currentSprintId: issue.currentSprintJiraId ? sprintIds.get(issue.currentSprintJiraId) ?? null : null,
      inBacklog: issue.inBacklog,
      originalSeconds: issue.originalSeconds,
      spentSeconds: issue.spentSeconds,
      remainingSeconds: issue.remainingSeconds,
      storyPoints: issue.storyPoints,
      createdAtJira: asDate(issue.createdAt),
      resolvedAt: asDate(issue.resolvedAt),
      jiraUrl: issue.jiraUrl,
      activeInJira: true,
      lastSyncedAt: syncedAt,
    };
    const saved = await prisma.issue.upsert({
      where: { jiraIssueId: issue.jiraIssueId },
      create: { jiraIssueId: issue.jiraIssueId, ...data },
      update: data,
    });
    const localSprints = issue.sprintJiraIds
      .map((jiraId) => sprintIds.get(jiraId))
      .filter((id): id is string => Boolean(id));
    await prisma.issueSprint.deleteMany({ where: { issueId: saved.id } });
    if (localSprints.length > 0) {
      await prisma.issueSprint.createMany({
        data: localSprints.map((sprintId) => ({ issueId: saved.id, sprintId })),
      });
    }
    const logs = projection.worklogs.filter((worklog) => worklog.issueJiraId === issue.jiraIssueId);
    for (const worklog of logs) {
      const payload = {
        issueId: saved.id,
        personId: personIds.get(worklog.accountId) ?? null,
        accountId: worklog.accountId,
        displayName: worklog.displayName,
        seconds: worklog.seconds,
        startedAt: asDate(worklog.startedAt) ?? syncedAt,
        sprintId: worklog.sprintJiraId ? sprintIds.get(worklog.sprintJiraId) ?? null : null,
      };
      await prisma.worklog.upsert({
        where: { jiraId: worklog.jiraId },
        create: { jiraId: worklog.jiraId, ...payload },
        update: payload,
      });
    }
    if (logs.length === 0) {
      await prisma.worklog.deleteMany({ where: { issueId: saved.id } });
    } else {
      await prisma.worklog.deleteMany({
        where: { issueId: saved.id, jiraId: { notIn: logs.map((worklog) => worklog.jiraId) } },
      });
    }
  }
  if (projection.issues.length > 0) {
    await prisma.issue.updateMany({
      where: { jiraIssueId: { notIn: projection.issues.map((issue) => issue.jiraIssueId) } },
      data: { activeInJira: false },
    });
  }

  return {
    projects: projection.projects.length,
    boards: projection.boards.length,
    sprints: projection.sprints.length,
    people: projection.people.length,
    epics: projection.epics.length,
    issues: projection.issues.length,
    worklogs: projection.worklogs.length,
    unresolved: projection.issues.filter((issue) => issue.kind !== 'EPIC' && (issue.epicKey == null || !epicIds.has(issue.epicKey))).length,
  };
}

export function statsToJson(stats: ApplyStats): Prisma.InputJsonValue {
  return { ...stats };
}
