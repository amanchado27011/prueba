import type { FastifyPluginAsync } from 'fastify';
import { authRoutes } from './auth.routes';
import { catalogRoutes } from './catalog.routes';
import { demandRoutes } from './demand.routes';
import { exportRoutes } from './export.routes';
import { jiraRoutes } from './jira.routes';
import { qualityRoutes } from './quality.routes';
import { workRoutes } from './work.routes';

export const v1Routes: FastifyPluginAsync = async (app) => {
  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(jiraRoutes, { prefix: '/jira' });
  await app.register(workRoutes);
  await app.register(catalogRoutes);
  await app.register(demandRoutes);
  await app.register(qualityRoutes);
  await app.register(exportRoutes);
};
