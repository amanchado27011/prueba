import type { Projection, ProjectionEpic, ProjectionPerson } from '../domain/types';

export interface StoredEpic extends ProjectionEpic {
  initiativeId: string | null;
  objectiveExplicit: boolean;
  maintenanceType: string | null;
  activityTypeId: string | null;
}

export interface StoredPerson extends ProjectionPerson {
  subareaId: string | null;
  serviceFamilyId: string | null;
}

export interface ApplyStats {
  projects: number;
  boards: number;
  sprints: number;
  people: number;
  epics: number;
  issues: number;
  worklogs: number;
  unresolved: number;
}

export class MemoryProjectionStore {
  projects = new Map<string, Projection['projects'][number]>();
  boards = new Map<string, Projection['boards'][number]>();
  sprints = new Map<string, Projection['sprints'][number]>();
  people = new Map<string, StoredPerson>();
  epics = new Map<string, StoredEpic>();
  issues = new Map<string, Projection['issues'][number]>();
  worklogs = new Map<string, Projection['worklogs'][number]>();
  applies = 0;

  async apply(projection: Projection): Promise<ApplyStats> {
    this.applies += 1;
    for (const project of projection.projects) this.projects.set(project.id, project);
    for (const board of projection.boards) this.boards.set(board.id, board);
    for (const sprint of projection.sprints) this.sprints.set(sprint.id, sprint);
    for (const person of projection.people) {
      const previous = this.people.get(person.accountId);
      this.people.set(person.accountId, {
        ...person,
        subareaId: previous?.subareaId ?? null,
        serviceFamilyId: previous?.serviceFamilyId ?? null,
      });
    }
    for (const epic of projection.epics) {
      const previous = this.epics.get(epic.jiraIssueId);
      this.epics.set(epic.jiraIssueId, {
        ...epic,
        initiativeId: previous?.initiativeId ?? null,
        objectiveExplicit: previous?.objectiveExplicit ?? false,
        maintenanceType: previous?.maintenanceType ?? null,
        activityTypeId: previous?.activityTypeId ?? null,
      });
    }
    for (const issue of projection.issues) this.issues.set(issue.jiraIssueId, issue);
    const seenLogs = new Set(projection.worklogs.map((worklog) => worklog.jiraId));
    for (const worklog of projection.worklogs) this.worklogs.set(worklog.jiraId, worklog);
    for (const id of [...this.worklogs.keys()]) {
      if (!seenLogs.has(id)) this.worklogs.delete(id);
    }
    return this.stats();
  }

  stats(): ApplyStats {
    return {
      projects: this.projects.size,
      boards: this.boards.size,
      sprints: this.sprints.size,
      people: this.people.size,
      epics: this.epics.size,
      issues: this.issues.size,
      worklogs: this.worklogs.size,
      unresolved: [...this.issues.values()].filter((issue) => issue.kind !== 'EPIC' && issue.epicResolution === 'UNRESOLVED').length,
    };
  }
}
