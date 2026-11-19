import type { FastifyPluginAsync } from 'fastify';
import { buildExportBook } from '../domain/export-book';
import { toCsv } from '../domain/demand-csv';
import { prisma } from '../lib/prisma';
import { validationError } from '../lib/zod-reply';
import { authenticate } from '../plugins/authenticate';
import { analysisQuerySchema } from '../schemas';
import { renderWorkbook } from '../services/excel.service';
import { loadWorkModel, toAnalysisFilter } from '../services/snapshot.service';
import { listIssueViews } from '../services/work.service';

export const exportRoutes: FastifyPluginAsync = async (app) => {
  app.get('/exports/excel', { preHandler: authenticate }, async (request, reply) => {
    const parsed = analysisQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) return validationError(reply, parsed.error);
    const model = await loadWorkModel();
    const filter = toAnalysisFilter(parsed.data, model);
    const [objectives, subareas, families, activities] = await Promise.all([
      prisma.objective.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.subarea.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.serviceFamily.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.activityType.findMany({ orderBy: { sortOrder: 'asc' } }),
    ]);
    const catalogs = [
      ...objectives.map((item) => ['Objetivo', item.name, item.active ? 'activo' : 'inactivo']),
      ...subareas.map((item) => ['Subárea', item.name, item.active ? 'activo' : 'inactivo']),
      ...families.map((item) => ['Familia', item.name, item.active ? 'activo' : 'inactivo']),
      ...activities.map((item) => ['Actividad', item.name, item.active ? 'activo' : 'inactivo']),
      ['Mantenimiento', 'Adaptativo', 'ADAPTIVE'],
      ['Mantenimiento', 'Correctivo', 'CORRECTIVE'],
      ['Mantenimiento', 'Evolutivo', 'EVOLUTIVE'],
      ['Criterio', 'Horas sin sprint ni periodo', 'timeSpent de la issue, una sola vez'],
      ['Criterio', 'Horas con sprint', 'worklogs de ese sprint, sin duplicar entre sprints'],
      ['Criterio', 'Épica', 'suma de hijas más worklogs directos de la épica'],
      ['Criterio', 'Iniciativa', 'suma de sus épicas'],
      ['Criterio', 'Personas', 'orden alfabético; capacidad y carga, no ranking'],
    ];
    const book = buildExportBook(model, filter, catalogs);
    const buffer = await renderWorkbook(book);
    return reply
      .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .header('Content-Disposition', 'attachment; filename="gestion-demanda.xlsx"')
      .send(buffer);
  });

  app.get('/exports/issues.csv', { preHandler: authenticate }, async (request, reply) => {
    const parsed = analysisQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) return validationError(reply, parsed.error);
    const model = await loadWorkModel();
    const views = listIssueViews(model, toAnalysisFilter(parsed.data, model));
    const csv = toCsv(
      ['clave', 'resumen', 'tipo', 'estado', 'epica', 'iniciativa', 'objetivo', 'asignada', 'sprint', 'estimacion_h', 'imputadas_h', 'restantes_h', 'consumido_pct', 'url'],
      views.map((issue) => [
        issue.key,
        issue.summary,
        issue.issueType,
        issue.statusName,
        issue.epicKey ?? '',
        issue.initiativeName ?? '',
        issue.objectiveName ?? '',
        issue.assigneeName ?? '',
        issue.sprintName ?? '',
        String(issue.metrics.originalHours),
        String(issue.metrics.loggedHours),
        String(issue.metrics.remainingHours),
        issue.metrics.consumedPct == null ? '' : String(issue.metrics.consumedPct),
        issue.jiraUrl,
      ]),
    );
    return reply.header('Content-Type', 'text/csv; charset=utf-8').send(csv);
  });
};
