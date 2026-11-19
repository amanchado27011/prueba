import { describe, expect, it } from 'vitest';
import { buildProjection } from '../src/domain/project';
import { buildExportBook, EXPORT_SHEETS } from '../src/domain/export-book';
import { epicRollup, initiativeRollup, issueMetrics, productivity } from '../src/domain/metrics';
import { parseDemandCsv } from '../src/domain/demand-csv';
import { fixtureSnapshot, metricsModel } from '../src/domain/scenario';
import { qualityKinds } from '../src/domain/quality';
import { buildQualityEmail, decideDelivery } from '../src/domain/quality-mail';
import { JiraWriteForbiddenError, ReadOnlyHttp } from '../src/jira/http';
import { MemoryProjectionStore } from '../src/jira/memory-store';
import { createFixtureReader } from '../src/jira/fixture';
import { runSync } from '../src/jira/sync';
import { createCloudReader } from '../src/jira/cloud';
import { renderWorkbook } from '../src/services/excel.service';

const BASE = 'https://example.atlassian.net';

describe('épica', () => {
  it('resuelve parent, epic link, jerarquía y fallback, y omite subtareas', () => {
    const projection = buildProjection(fixtureSnapshot(), BASE);
    const byKey = Object.fromEntries(projection.issues.map((issue) => [issue.key, issue]));
    expect(byKey['GD-1'].epicKey).toBe('EP-1');
    expect(byKey['GD-1'].epicResolution).toBe('PARENT');
    expect(byKey['GD-2'].epicResolution).toBe('EPIC_LINK');
    expect(byKey['GD-2'].epicKey).toBe('EP-2');
    expect(byKey['GD-3'].epicResolution).toBe('HIERARCHY');
    expect(byKey['GD-4'].epicResolution).toBe('UNRESOLVED');
    expect(byKey['GD-9']).toBeUndefined();
    expect(projection.epics).toHaveLength(2);
  });
});

describe('sincronización simulada', () => {
  it('es idempotente, solo GET y conserva la clasificación local', async () => {
    const store = new MemoryProjectionStore();
    const first = await runSync(createFixtureReader(), store, BASE);
    expect(first.httpMethods).toEqual(['GET']);
    const epic = [...store.epics.values()][0];
    epic.initiativeId = 'ini-local';
    epic.maintenanceType = 'CORRECTIVE';
    const person = [...store.people.values()][0];
    person.subareaId = 'sub-1';
    const second = await runSync(createFixtureReader(), store, BASE);
    expect(second.stats).toEqual(first.stats);
    expect(store.applies).toBe(2);
    expect([...store.epics.values()].find((item) => item.jiraIssueId === epic.jiraIssueId)?.initiativeId).toBe('ini-local');
    expect([...store.epics.values()].find((item) => item.jiraIssueId === epic.jiraIssueId)?.maintenanceType).toBe('CORRECTIVE');
    expect([...store.people.values()].find((item) => item.accountId === person.accountId)?.subareaId).toBe('sub-1');
    expect(store.worklogs.size).toBe(2);
  });

  it('aborta si el lector declara un método que no es GET', async () => {
    const raw = fixtureSnapshot();
    raw.httpMethods = ['POST'];
    await expect(runSync({ mode: 'fixture', read: async () => raw }, new MemoryProjectionStore(), BASE)).rejects.toThrow(/GET/);
  });
});

describe('cliente Jira', () => {
  it('rechaza escrituras antes de llamar a la red', async () => {
    let called = false;
    const http = new ReadOnlyHttp(async () => {
      called = true;
      return new Response('{}');
    });
    await expect(http.request('POST', 'https://example.atlassian.net/rest/api/3/issue', {})).rejects.toBeInstanceOf(JiraWriteForbiddenError);
    expect(called).toBe(false);
    expect(http.calls.map((call) => call.method)).toEqual(['POST']);
  });

  it('pagina proyectos solo con GET', async () => {
    const seen: string[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      seen.push(url);
      expect(init?.method ?? 'GET').toBe('GET');
      const path = new URL(url).pathname;
      const start = Number(new URL(url).searchParams.get('startAt') ?? '0');
      const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
      if (path === '/rest/api/3/project/search') {
        if (start === 0) return json({ values: [{ id: '1', key: 'A', name: 'A' }], total: 2, isLast: false });
        return json({ values: [{ id: '2', key: 'B', name: 'B' }], total: 2, isLast: true });
      }
      if (path === '/rest/api/3/field') return json([]);
      if (path.startsWith('/rest/agile/1.0/board')) return json({ values: [], total: 0, isLast: true });
      if (path.includes('/search')) return json({ issues: [], isLast: true });
      return json({});
    };
    const reader = createCloudReader({
      baseUrl: BASE,
      email: 'a@b.c',
      apiToken: 'token-secreto',
      projectKeys: [],
      maxProjects: 10,
      maxIssues: 10,
      pageSize: 1,
      minIntervalMs: 0,
      fetchImpl,
    });
    const raw = await reader.read();
    expect(raw.projects.map((project) => project.key)).toEqual(['A', 'B']);
    expect(raw.httpMethods).toEqual(['GET']);
    expect(seen.every((url) => url.startsWith(BASE))).toBe(true);
    expect(JSON.stringify(seen)).not.toContain('token-secreto');
  });
});

describe('sumatorios', () => {
  const model = metricsModel();
  const gd1 = model.issues.find((issue) => issue.key === 'GD-1');
  if (!gd1) throw new Error('falta GD-1');

  it('no duplica las horas de una issue que está en dos sprints', () => {
    const all = issueMetrics(model, gd1, {});
    const sprintA = issueMetrics(model, gd1, { sprintId: 'sprint-a' });
    const sprintB = issueMetrics(model, gd1, { sprintId: 'sprint-b' });
    expect(all.loggedHours).toBe(10);
    expect(sprintA.loggedHours).toBe(6);
    expect(sprintB.loggedHours).toBe(4);
    expect(sprintA.loggedHours + sprintB.loggedHours).toBe(all.loggedHours);
  });

  it('suma historia, épica e iniciativa', () => {
    const epic1 = model.epics.find((epic) => epic.id === 'epic-1');
    const epic2 = model.epics.find((epic) => epic.id === 'epic-2');
    if (!epic1 || !epic2) throw new Error('faltan épicas');
    expect(epicRollup(model, epic1, {}).loggedHours).toBe(11);
    expect(epicRollup(model, epic2, {}).loggedHours).toBe(23);
    expect(initiativeRollup(model, 'ini-1', {}).loggedHours).toBe(34);
  });

  it('ordena a las personas por nombre', () => {
    const report = productivity(model, {});
    expect(report.byPerson.map((person) => person.name)).toEqual(['Ana', 'Luis', 'Zoe']);
    expect(report.byPerson[2].hours).toBeGreaterThan(report.byPerson[0].hours);
    expect(report.hours).toBe(34);
  });
});

describe('calidad y correo', () => {
  const model = metricsModel();

  function kindsOf(key: string) {
    const issue = model.issues.find((item) => item.key === key);
    if (!issue) throw new Error(key);
    return qualityKinds(issue, issueMetrics(model, issue, {}));
  }

  it('clasifica los motivos', () => {
    expect(kindsOf('GD-3')).toEqual(expect.arrayContaining(['no_epic', 'no_estimate', 'no_assignee', 'incomplete']));
    expect(kindsOf('GD-4')).toContain('closed_no_hours');
    expect(kindsOf('GD-5')).toContain('sprint_no_hours');
    expect(kindsOf('GD-6')).toContain('hours_open');
    expect(kindsOf('GD-1')).not.toContain('no_epic');
  });

  it('la previsualización no envía y el modo de prueba no abre SMTP', () => {
    const message = buildQualityEmail([
      { key: 'GD-3', summary: 'Sin épica', sprint: '', assignee: '', url: 'https://example.atlassian.net/browse/GD-3', reason: 'no_epic' },
    ]);
    expect(message.total).toBe(1);
    expect(message.text).toContain('GD-3');
    expect(message.html).toContain('https://example.atlassian.net/browse/GD-3');
    expect(decideDelivery({ dryRun: true, smtpConfigured: true, recipient: 'it.pime@example.com' })).toEqual({ result: 'DRY_RUN', error: null });
    expect(decideDelivery({ dryRun: false, smtpConfigured: false, recipient: 'it.pime@example.com' }).result).toBe('FAILED');
    expect(decideDelivery({ dryRun: false, smtpConfigured: true, recipient: null }).result).toBe('FAILED');
  });
});

describe('exportación y csv', () => {
  it('respeta el filtro de iniciativa y genera las diez hojas', async () => {
    const model = metricsModel();
    model.epics.push({
      ...model.epics[0],
      id: 'epic-9',
      key: 'EP-9',
      jiraIssueId: 'e9',
      initiativeId: 'ini-2',
      initiativeName: 'Otra',
    });
    model.issues.push({
      ...model.issues.find((issue) => issue.key === 'GD-1')!,
      id: 'iss-9',
      key: 'GD-90',
      jiraIssueId: 'i90',
      epicId: 'epic-9',
    });
    const book = buildExportBook(model, { initiativeId: 'ini-1' }, [['Criterio', 'Horas', 'sin duplicar']]);
    expect(book.sheets.map((sheet) => sheet.name)).toEqual([...EXPORT_SHEETS]);
    const epics = book.sheets.find((sheet) => sheet.name === 'Épicas');
    expect(epics?.rows.some((row) => row.includes('EP-9'))).toBe(false);
    expect(epics?.rows.some((row) => row.includes('EP-1'))).toBe(true);
    const buffer = await renderWorkbook(book);
    expect(buffer.subarray(0, 2).toString()).toBe('PK');
  });

  it('importa filas válidas e informa la fila inválida', () => {
    const parsed = parseDemandCsv('titulo,solicitante,fecha\nInforme,Dirección,2026-03-01\n,sin fecha,mal\n');
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0].title).toBe('Informe');
    expect(parsed.errors[0].row).toBe(3);
  });
});
