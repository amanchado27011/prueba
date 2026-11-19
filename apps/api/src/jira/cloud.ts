import type { RawBoard, RawProject, RawSnapshot, RawSprint, RawWorklog } from '../domain/types';
import { ReadOnlyHttp, sleep } from './http';
import { mapEmbeddedWorklogs, mapJiraIssue, mapWorklog } from './map-issue';

export interface CloudReaderOptions {
  baseUrl: string;
  email: string;
  apiToken: string;
  projectKeys: string[];
  maxProjects: number;
  maxIssues: number;
  pageSize: number;
  minIntervalMs: number;
  http?: ReadOnlyHttp;
  fetchImpl?: typeof fetch;
}

interface FieldDef {
  id: string;
  name?: string;
  schema?: { custom?: string };
}

export function createCloudReader(options: CloudReaderOptions): {
  mode: 'cloud';
  read: () => Promise<RawSnapshot>;
  http: ReadOnlyHttp;
} {
  const http = options.http ?? new ReadOnlyHttp(options.fetchImpl);
  const base = options.baseUrl.replace(/\/$/, '');
  const token = Buffer.from(`${options.email}:${options.apiToken}`).toString('base64');
  const headers = {
    Authorization: `Basic ${token}`,
    Accept: 'application/json',
  };

  async function getJson(pathname: string): Promise<{ status: number; body: unknown; headers: Headers }> {
    if (options.minIntervalMs > 0) await sleep(options.minIntervalMs);
    const url = `${base}${pathname}`;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await http.request('GET', url, headers);
      if (response.status === 429 || response.status === 503) {
        const retry = Number(response.headers.get('retry-after') || '1');
        await sleep(Math.min(Math.max(retry, 1), 30) * 1000);
        continue;
      }
      const text = await response.text();
      let body: unknown = null;
      if (text) {
        try {
          body = JSON.parse(text) as unknown;
        } catch {
          body = text;
        }
      }
      return { status: response.status, body, headers: response.headers };
    }
    throw new Error(`Jira no respondió tras varios reintentos: ${pathname}`);
  }

  async function getOk(pathname: string): Promise<unknown> {
    const result = await getJson(pathname);
    if (result.status < 200 || result.status >= 300) {
      const detail = typeof result.body === 'string' ? result.body : JSON.stringify(result.body);
      throw new Error(`Jira ${result.status} en ${pathname}: ${detail.slice(0, 400)}`);
    }
    return result.body;
  }

  async function collectArray(
    pathname: string,
    pick: (body: unknown) => { values: unknown[]; total?: number; isLast?: boolean },
  ): Promise<unknown[]> {
    const all: unknown[] = [];
    let startAt = 0;
    for (let page = 0; page < 200; page += 1) {
      const sep = pathname.includes('?') ? '&' : '?';
      const body = await getOk(`${pathname}${sep}startAt=${startAt}&maxResults=${options.pageSize}`);
      const picked = pick(body);
      all.push(...picked.values);
      if (picked.isLast || picked.values.length === 0) break;
      if (picked.total != null && all.length >= picked.total) break;
      startAt += picked.values.length;
    }
    return all;
  }

  return {
    mode: 'cloud',
    http,
    async read() {
      const projectRows = (await collectArray('/rest/api/3/project/search', (body) => {
        const record = body as { values?: unknown[]; total?: number; isLast?: boolean };
        return { values: record.values ?? [], total: record.total, isLast: record.isLast };
      })) as Array<{ id: string; key: string; name: string }>;
      const projects: RawProject[] = projectRows.slice(0, options.maxProjects).map((project) => ({
        id: String(project.id),
        key: project.key,
        name: project.name,
      }));
      const keys = options.projectKeys.length > 0
        ? options.projectKeys
        : projects.map((project) => project.key).slice(0, options.maxProjects);

      const fieldBody = (await getOk('/rest/api/3/field')) as FieldDef[];
      const epicLinkField = findField(fieldBody, ['epic link'], ['com.pyxis.greenhopper.jira:gh-epic-link']);
      const storyPointsField = findField(
        fieldBody,
        ['story points', 'story point estimate', 'puntos de historia'],
        ['com.pyxis.greenhopper.jira:jsw-story-points'],
      );
      const sprintField = findField(fieldBody, ['sprint'], ['com.pyxis.greenhopper.jira:gh-sprint']);

      const boards: RawBoard[] = [];
      const sprints: RawSprint[] = [];
      const backlogKeys = new Set<string>();
      for (const key of keys) {
        const boardRows = (await collectArray(
          `/rest/agile/1.0/board?projectKeyOrId=${encodeURIComponent(key)}`,
          (body) => {
            const record = body as { values?: Array<Record<string, unknown>>; total?: number; isLast?: boolean };
            return { values: record.values ?? [], total: record.total, isLast: record.isLast };
          },
        )) as Array<Record<string, unknown>>;
        for (const board of boardRows) {
          const boardId = String(board.id);
          boards.push({
            id: boardId,
            name: String(board.name ?? boardId),
            type: typeof board.type === 'string' ? board.type : null,
            projectKey: key,
          });
          const sprintRows = (await collectArray(
            `/rest/agile/1.0/board/${encodeURIComponent(boardId)}/sprint?state=active,closed,future`,
            (body) => {
              const record = body as { values?: Array<Record<string, unknown>>; total?: number; isLast?: boolean };
              return { values: record.values ?? [], total: record.total, isLast: record.isLast };
            },
          )) as Array<Record<string, unknown>>;
          for (const sprint of sprintRows) {
            sprints.push({
              id: String(sprint.id),
              boardId,
              name: String(sprint.name ?? sprint.id),
              state: String(sprint.state ?? 'future'),
              startDate: typeof sprint.startDate === 'string' ? sprint.startDate : null,
              endDate: typeof sprint.endDate === 'string' ? sprint.endDate : null,
            });
          }
          try {
            const backlog = (await collectArray(
              `/rest/agile/1.0/board/${encodeURIComponent(boardId)}/backlog`,
              (body) => {
                const record = body as { issues?: Array<{ key?: string }>; total?: number; isLast?: boolean };
                return { values: record.issues ?? [], total: record.total, isLast: record.isLast };
              },
            )) as Array<{ key?: string }>;
            for (const item of backlog) {
              if (item.key) backlogKeys.add(item.key);
            }
          } catch {
            // Algunos tableros Kanban no exponen backlog. La búsqueda de issues sigue.
          }
        }
      }

      const jql = keys.length
        ? `project in (${keys.map((key) => `"${key}"`).join(',')}) AND issuetype not in subTaskIssueTypes() ORDER BY key`
        : 'issuetype not in subTaskIssueTypes() ORDER BY updated DESC';
      const fields = [
        'summary',
        'description',
        'issuetype',
        'status',
        'assignee',
        'parent',
        'timetracking',
        'timeoriginalestimate',
        'timespent',
        'timeestimate',
        'created',
        'resolutiondate',
        'project',
        'worklog',
        epicLinkField,
        storyPointsField,
        sprintField,
      ].filter((field): field is string => Boolean(field));
      const foundIssues = await searchIssues(getJson, jql, fields, options.pageSize, options.maxIssues);

      const issues = [];
      const worklogs: RawWorklog[] = [];
      for (const rawIssue of foundIssues) {
        const mapped = mapJiraIssue(rawIssue, { epicLinkField, storyPointsField, sprintField, backlogKeys });
        if (!mapped || mapped.subtask || mapped.hierarchyLevel === -1) continue;
        issues.push(mapped);
        const fieldsBag = (rawIssue as { fields?: Record<string, unknown> }).fields;
        const embedded = mapEmbeddedWorklogs(mapped.id, fieldsBag);
        if (embedded.total > embedded.logs.length) {
          const full = await collectArray(`/rest/api/3/issue/${encodeURIComponent(mapped.id)}/worklog`, (body) => {
            const record = body as { worklogs?: unknown[]; total?: number };
            const values = record.worklogs ?? [];
            return { values, total: record.total, isLast: record.total != null ? false : values.length === 0 };
          });
          for (const row of full) {
            const log = mapWorklog(mapped.id, row as Record<string, unknown>);
            if (log) worklogs.push(log);
          }
        } else {
          worklogs.push(...embedded.logs);
        }
      }

      const methods = [...new Set(http.calls.map((call) => call.method))];
      if (methods.some((method) => method !== 'GET')) {
        throw new Error('La lectura de Jira registró un método que no es GET');
      }
      return { projects, boards, sprints, issues, worklogs, httpMethods: methods.length ? methods : ['GET'] };
    },
  };
}

async function searchIssues(
  getJson: (pathname: string) => Promise<{ status: number; body: unknown }>,
  jql: string,
  fields: string[],
  pageSize: number,
  maxIssues: number,
): Promise<unknown[]> {
  const issues: unknown[] = [];
  let nextPageToken = '';
  let classic = false;
  for (let page = 0; page < 200 && issues.length < maxIssues; page += 1) {
    const fieldQuery = encodeURIComponent(fields.join(','));
    const path = classic
      ? `/rest/api/3/search?jql=${encodeURIComponent(jql)}&startAt=${issues.length}&maxResults=${pageSize}&fields=${fieldQuery}`
      : `/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&maxResults=${pageSize}&fields=${fieldQuery}${nextPageToken ? `&nextPageToken=${encodeURIComponent(nextPageToken)}` : ''}`;
    const result = await getJson(path);
    if (!classic && (result.status === 404 || result.status === 410 || result.status === 405)) {
      classic = true;
      continue;
    }
    if (result.status < 200 || result.status >= 300) {
      throw new Error(`Jira ${result.status} al buscar issues`);
    }
    const body = result.body as { issues?: unknown[]; nextPageToken?: string; isLast?: boolean; total?: number };
    const batch = body.issues ?? [];
    issues.push(...batch);
    if (classic) {
      if (batch.length === 0 || (body.total != null && issues.length >= body.total)) break;
    } else if (body.isLast || !body.nextPageToken || batch.length === 0) {
      break;
    } else {
      nextPageToken = body.nextPageToken;
    }
  }
  return issues.slice(0, maxIssues);
}

function findField(fields: FieldDef[], names: string[], customs: string[]): string | null {
  const hit = fields.find((field) => {
    const name = (field.name ?? '').toLowerCase();
    return names.includes(name) || (field.schema?.custom != null && customs.includes(field.schema.custom));
  });
  return hit?.id ?? null;
}
