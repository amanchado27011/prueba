import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma';
import { paginatedResult, resolvePagination } from '../lib/pagination';
import { validationError } from '../lib/zod-reply';
import { authenticate, requireAdmin } from '../plugins/authenticate';
import { analysisQuerySchema, epicPatchSchema, initiativeSchema } from '../schemas';
import { loadWorkModel, toAnalysisFilter } from '../services/snapshot.service';
import { buildEpicDetail, buildInitiativeDetail, buildProductivity, buildTree, listIssueViews } from '../services/work.service';
import { HttpError } from '../lib/http-error';

export const workRoutes: FastifyPluginAsync = async (app) => {
  app.get('/filters/options', { preHandler: authenticate }, async () => {
    const [sprints, people, subareas, families, initiatives, objectives, epics, activities] = await Promise.all([
      prisma.sprint.findMany({ where: { activeInJira: true }, orderBy: { startDate: 'desc' } }),
      prisma.person.findMany({ orderBy: { displayName: 'asc' } }),
      prisma.subarea.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.serviceFamily.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.initiative.findMany({ orderBy: { name: 'asc' } }),
      prisma.objective.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.epic.findMany({ where: { activeInJira: true }, orderBy: { key: 'asc' } }),
      prisma.activityType.findMany({ orderBy: { sortOrder: 'asc' } }),
    ]);
    return {
      sprints: sprints.map((sprint) => ({ id: sprint.id, name: sprint.name, state: sprint.state })),
      people: people.map((person) => ({ id: person.id, name: person.displayName, accountId: person.accountId })),
      subareas: subareas.map((item) => ({ id: item.id, name: item.name, active: item.active })),
      families: families.map((item) => ({ id: item.id, name: item.name, active: item.active })),
      initiatives: initiatives.map((item) => ({ id: item.id, name: item.name, status: item.status })),
      objectives: objectives.map((item) => ({ id: item.id, name: item.name, active: item.active })),
      epics: epics.map((item) => ({ id: item.id, key: item.key, summary: item.summary })),
      activities: activities.map((item) => ({ id: item.id, name: item.name, active: item.active })),
      maintenanceTypes: [
        { id: 'ADAPTIVE', name: 'Adaptativo' },
        { id: 'CORRECTIVE', name: 'Correctivo' },
        { id: 'EVOLUTIVE', name: 'Evolutivo' },
      ],
    };
  });

  app.get('/work/tree', { preHandler: authenticate }, async (request, reply) => {
    const parsed = analysisQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) return validationError(reply, parsed.error);
    const model = await loadWorkModel();
    return buildTree(model, toAnalysisFilter(parsed.data, model));
  });

  app.get('/productivity', { preHandler: authenticate }, async (request, reply) => {
    const parsed = analysisQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) return validationError(reply, parsed.error);
    const model = await loadWorkModel();
    return buildProductivity(model, toAnalysisFilter(parsed.data, model));
  });

  app.get('/initiatives', { preHandler: authenticate }, async (request, reply) => {
    const parsed = analysisQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) return validationError(reply, parsed.error);
    const model = await loadWorkModel();
    const filter = toAnalysisFilter(parsed.data, model);
    const rows = await prisma.initiative.findMany({ include: { objective: true }, orderBy: { updatedAt: 'desc' } });
    return rows.map((row) => ({
      ...row,
      metrics: buildInitiativeDetail(model, row.id, filter).metrics,
    }));
  });

  app.post('/initiatives', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    const parsed = initiativeSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error);
    return prisma.initiative.create({ data: parsed.data });
  });

  app.get('/initiatives/:id', { preHandler: authenticate }, async (request, reply) => {
    const params = request.params as { id: string };
    const row = await prisma.initiative.findUnique({ where: { id: params.id }, include: { objective: true } });
    if (!row) throw new HttpError(404, 'Iniciativa no encontrada');
    const parsed = analysisQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) return validationError(reply, parsed.error);
    const model = await loadWorkModel();
    return { ...row, ...buildInitiativeDetail(model, row.id, toAnalysisFilter(parsed.data, model)) };
  });

  app.patch('/initiatives/:id', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    const params = request.params as { id: string };
    const parsed = initiativeSchema.partial().safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error);
    try {
      return await prisma.initiative.update({ where: { id: params.id }, data: parsed.data });
    } catch {
      throw new HttpError(404, 'Iniciativa no encontrada');
    }
  });

  app.get('/epics', { preHandler: authenticate }, async (request, reply) => {
    const parsed = analysisQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) return validationError(reply, parsed.error);
    const model = await loadWorkModel();
    const filter = toAnalysisFilter(parsed.data, model);
    return model.epics
      .filter((epic) => !filter.initiativeId || epic.initiativeId === filter.initiativeId)
      .filter((epic) => !filter.epicId || epic.id === filter.epicId)
      .map((epic) => ({ ...epic, metrics: buildEpicDetail(model, epic.id, filter).metrics }));
  });

  app.get('/epics/:id', { preHandler: authenticate }, async (request, reply) => {
    const params = request.params as { id: string };
    const parsed = analysisQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) return validationError(reply, parsed.error);
    const model = await loadWorkModel();
    return buildEpicDetail(model, params.id, toAnalysisFilter(parsed.data, model));
  });

  app.patch('/epics/:id', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    const params = request.params as { id: string };
    const parsed = epicPatchSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error);
    try {
      return await prisma.epic.update({ where: { id: params.id }, data: parsed.data });
    } catch {
      throw new HttpError(404, 'Épica no encontrada');
    }
  });

  app.get('/issues', { preHandler: authenticate }, async (request, reply) => {
    const parsed = analysisQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) return validationError(reply, parsed.error);
    const model = await loadWorkModel();
    const page = resolvePagination(parsed.data.limit, parsed.data.offset);
    const all = listIssueViews(model, toAnalysisFilter(parsed.data, model));
    return paginatedResult(all.slice(page.offset, page.offset + page.limit), all.length, page.limit, page.offset);
  });

  app.get('/issues/:id', { preHandler: authenticate }, async (request, reply) => {
    const params = request.params as { id: string };
    const parsed = analysisQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) return validationError(reply, parsed.error);
    const model = await loadWorkModel();
    const filter = toAnalysisFilter(parsed.data, model);
    const views = listIssueViews(model, { ...filter, q: null });
    const found = views.find((issue) => issue.id === params.id) ?? listIssueViews(model, {}).find((issue) => issue.id === params.id);
    if (!found) throw new HttpError(404, 'Issue no encontrada');
    return found;
  });

  app.get('/sprints', { preHandler: authenticate }, async () => {
    const rows = await prisma.sprint.findMany({ where: { activeInJira: true }, orderBy: { startDate: 'desc' } });
    return rows;
  });

  app.get('/people', { preHandler: authenticate }, async () => {
    return prisma.person.findMany({
      include: { subarea: true, serviceFamily: true },
      orderBy: { displayName: 'asc' },
    });
  });
};
