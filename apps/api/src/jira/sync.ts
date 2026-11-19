import { buildProjection } from '../domain/project';
import type { RawSnapshot } from '../domain/types';
import type { ApplyStats } from './memory-store';

export interface JiraReader {
  mode: 'cloud' | 'fixture';
  read: () => Promise<RawSnapshot>;
}

export interface ProjectionStore {
  apply: (projection: ReturnType<typeof buildProjection>) => Promise<ApplyStats>;
}

export async function runSync(reader: JiraReader, store: ProjectionStore, jiraBaseUrl: string): Promise<{
  stats: ApplyStats;
  httpMethods: string[];
  mode: 'cloud' | 'fixture';
}> {
  const raw = await reader.read();
  const methods = raw.httpMethods.length ? raw.httpMethods : ['GET'];
  if (methods.some((method) => method !== 'GET')) {
    throw new Error('Sincronización abortada: se observó un método HTTP distinto de GET');
  }
  const projection = buildProjection(raw, jiraBaseUrl);
  if (projection.httpMethods.some((method) => method !== 'GET')) {
    throw new Error('Sincronización abortada: la proyección no es de solo lectura');
  }
  const stats = await store.apply(projection);
  return { stats, httpMethods: methods, mode: reader.mode };
}
