import type { FastifyPluginAsync } from 'fastify';
import { demandTemplateCsv, toCsv } from '../domain/demand-csv';
import { demandInScope } from '../domain/metrics';
import { HttpError } from '../lib/http-error';
import { prisma } from '../lib/prisma';
import { validationError } from '../lib/zod-reply';
import { authenticate, requireAdmin } from '../plugins/authenticate';
import { analysisQuerySchema, demandImportSchema, demandSchema } from '../schemas';
import { createDemand, importDemandText, tableFromUpload } from '../services/demand.service';
import { loadWorkModel, toAnalysisFilter } from '../services/snapshot.service';

export const demandRoutes: FastifyPluginAsync = async (app) => {
  app.get('/demand/template.csv', { preHandler: authenticate }, async (_request, reply) => {
    return reply.header('Content-Type', 'text/csv; charset=utf-8').send(demandTemplateCsv());
  });

  app.get('/demand', { preHandler: authenticate }, async (request, reply) => {
    const parsed = analysisQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) return validationError(reply, parsed.error);
    const model = await loadWorkModel();
    const filter = toAnalysisFilter(parsed.data, model);
    return model.demands.filter((demand) => demandInScope(demand, filter));
  });

  app.post('/demand', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    const parsed = demandSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error);
    return createDemand(parsed.data);
  });

  app.patch('/demand/:id', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    const parsed = demandSchema.partial().safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error);
    const params = request.params as { id: string };
    const data = { ...parsed.data } as Record<string, unknown>;
    if (typeof parsed.data.occurredAt === 'string') data.occurredAt = new Date(`${parsed.data.occurredAt}T00:00:00.000Z`);
    try {
      return await prisma.impulsiveDemand.update({ where: { id: params.id }, data });
    } catch {
      throw new HttpError(404, 'Demanda no encontrada');
    }
  });

  app.delete('/demand/:id', { preHandler: [authenticate, requireAdmin] }, async (request) => {
    const params = request.params as { id: string };
    try {
      await prisma.impulsiveDemand.delete({ where: { id: params.id } });
      return { ok: true };
    } catch {
      throw new HttpError(404, 'Demanda no encontrada');
    }
  });

  app.post('/demand/import', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    const contentType = request.headers['content-type'] ?? '';
    if (contentType.includes('application/json')) {
      const parsed = demandImportSchema.safeParse(request.body);
      if (!parsed.success) return validationError(reply, parsed.error);
      return importDemandText(parsed.data.csv);
    }
    const file = await request.file();
    if (!file) throw new HttpError(400, 'Falta el fichero');
    const buffer = await file.toBuffer();
    const text = await tableFromUpload(file.filename, buffer);
    return importDemandText(text);
  });

  app.get('/exports/demand.csv', { preHandler: authenticate }, async (request, reply) => {
    const parsed = analysisQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) return validationError(reply, parsed.error);
    const model = await loadWorkModel();
    const rows = model.demands
      .filter((demand) => demandInScope(demand, toAnalysisFilter(parsed.data, model)))
      .map((demand) => [
        demand.title,
        demand.description ?? '',
        demand.requester,
        demand.occurredAt.slice(0, 10),
        demand.priority,
        String(demand.estimatedHours),
        demand.initiativeName ?? '',
        demand.objectiveName ?? '',
        demand.subareaName ?? '',
        demand.familyName ?? '',
        demand.status,
        demand.jiraKey ?? '',
        demand.notes ?? '',
      ]);
    const csv = toCsv(
      ['titulo', 'descripcion', 'solicitante', 'fecha', 'prioridad', 'esfuerzo_horas', 'iniciativa', 'objetivo', 'subarea', 'familia', 'estado', 'clave_jira', 'observaciones'],
      rows,
    );
    return reply.header('Content-Type', 'text/csv; charset=utf-8').send(csv);
  });
};
