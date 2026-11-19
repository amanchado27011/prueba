import { getEnv } from '../config/env';
import { HttpError } from '../lib/http-error';
import { prisma } from '../lib/prisma';
import { createCloudReader } from '../jira/cloud';
import { createFixtureReader } from '../jira/fixture';
import { applyProjectionToPrisma, statsToJson } from '../jira/prisma-store';
import { runSync } from '../jira/sync';

let running = false;

export function syncIsRunning(): boolean {
  return running;
}

async function linkFirstFixtureInitiative(): Promise<void> {
  const [unassigned, assigned, initiative] = await Promise.all([
    prisma.epic.count({ where: { activeInJira: true, initiativeId: null } }),
    prisma.epic.count({ where: { activeInJira: true, initiativeId: { not: null } } }),
    prisma.initiative.findFirst({ where: { status: 'ACTIVE' }, orderBy: { createdAt: 'asc' } }),
  ]);
  if (assigned === 0 && unassigned > 0 && initiative) {
    await prisma.epic.updateMany({
      where: { activeInJira: true, initiativeId: null },
      data: { initiativeId: initiative.id },
    });
  }
}

export async function startSync(mode: 'cloud' | 'fixture') {
  const env = getEnv();
  if (running) throw new HttpError(409, 'Ya hay una sincronización en curso');
  if (mode === 'cloud' && !env.jiraConfigured) {
    throw new HttpError(400, 'Jira no está configurado. Revisa JIRA_BASE_URL, JIRA_EMAIL y JIRA_API_TOKEN.');
  }
  if (mode === 'fixture' && !env.allowFixture) {
    throw new HttpError(400, 'La sincronización simulada no está permitida');
  }
  running = true;
  const run = await prisma.syncRun.create({
    data: { status: 'RUNNING', trigger: 'MANUAL', mode },
  });
  try {
    const reader = mode === 'fixture'
      ? createFixtureReader()
      : createCloudReader({
          baseUrl: env.JIRA_BASE_URL as string,
          email: env.JIRA_EMAIL as string,
          apiToken: env.JIRA_API_TOKEN as string,
          projectKeys: env.projectKeys,
          maxProjects: env.JIRA_MAX_PROJECTS,
          maxIssues: env.JIRA_MAX_ISSUES,
          pageSize: env.JIRA_PAGE_SIZE,
          minIntervalMs: env.JIRA_MIN_INTERVAL_MS,
        });
    const baseUrl = env.JIRA_BASE_URL || 'https://jira.local';
    const result = await runSync(reader, {
      apply: (projection) => applyProjectionToPrisma(projection, new Date()),
    }, baseUrl);
    if (result.httpMethods.some((method) => method !== 'GET')) {
      throw new Error('Se detectó un método distinto de GET');
    }
    if (mode === 'fixture') await linkFirstFixtureInitiative();
    await prisma.syncRun.update({
      where: { id: run.id },
      data: { status: 'SUCCESS', finishedAt: new Date(), stats: statsToJson(result.stats) },
    });
    return { id: run.id, mode: result.mode, stats: result.stats, httpMethods: result.httpMethods };
  } catch (error) {
    const message = error instanceof HttpError ? error.message : error instanceof Error ? error.message : 'Error de sincronización';
    await prisma.syncRun.update({
      where: { id: run.id },
      data: { status: 'FAILED', finishedAt: new Date(), error: message },
    });
    if (error instanceof HttpError) throw error;
    throw new HttpError(502, message);
  } finally {
    running = false;
  }
}

export async function syncStatus() {
  const env = getEnv();
  const [lastSuccess, last] = await Promise.all([
    prisma.syncRun.findFirst({ where: { status: 'SUCCESS' }, orderBy: { startedAt: 'desc' } }),
    prisma.syncRun.findFirst({ orderBy: { startedAt: 'desc' } }),
  ]);
  const finished = lastSuccess?.finishedAt ?? lastSuccess?.startedAt ?? null;
  const ageHours = finished ? Math.round(((Date.now() - finished.getTime()) / 36e5) * 10) / 10 : null;
  const failedAfter = Boolean(last && last.status === 'FAILED' && (!lastSuccess || last.startedAt > lastSuccess.startedAt));
  const isStale = !lastSuccess || failedAfter || (ageHours != null && ageHours > env.STALE_AFTER_HOURS);
  return {
    running,
    lastSuccessAt: finished?.toISOString() ?? null,
    lastAttemptAt: last?.startedAt.toISOString() ?? null,
    lastStatus: last?.status ?? null,
    lastError: last?.status === 'FAILED' ? last.error : null,
    lastStats: lastSuccess?.stats ?? null,
    isStale,
    failedAfter,
    staleAfterHours: env.STALE_AFTER_HOURS,
    ageHours,
  };
}
