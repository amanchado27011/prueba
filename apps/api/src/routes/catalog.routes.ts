import type { FastifyPluginAsync } from 'fastify';
import { HttpError } from '../lib/http-error';
import { prisma } from '../lib/prisma';
import { validationError } from '../lib/zod-reply';
import { authenticate, requireAdmin } from '../plugins/authenticate';
import { namedSchema, objectiveSchema, personPatchSchema } from '../schemas';
import { slug } from '../services/catalog-bootstrap';

async function uniqueSlug(kind: 'subarea' | 'family' | 'activity', name: string): Promise<string> {
  const base = slug(name) || 'item';
  let candidate = base;
  for (let index = 2; index < 50; index += 1) {
    const existing = kind === 'subarea'
      ? await prisma.subarea.findUnique({ where: { slug: candidate } })
      : kind === 'family'
        ? await prisma.serviceFamily.findUnique({ where: { slug: candidate } })
        : await prisma.activityType.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
    candidate = `${base}-${index}`;
  }
  throw new HttpError(409, 'No se pudo asignar un identificador único');
}

export const catalogRoutes: FastifyPluginAsync = async (app) => {
  app.get('/objectives', { preHandler: authenticate }, async () =>
    prisma.objective.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }));

  app.post('/objectives', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    const parsed = objectiveSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error);
    return prisma.objective.create({ data: parsed.data });
  });

  app.patch('/objectives/:id', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    const parsed = objectiveSchema.partial().safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error);
    const params = request.params as { id: string };
    try {
      return await prisma.objective.update({ where: { id: params.id }, data: parsed.data });
    } catch {
      throw new HttpError(404, 'Objetivo no encontrado');
    }
  });

  app.delete('/objectives/:id', { preHandler: [authenticate, requireAdmin] }, async (request) => {
    const params = request.params as { id: string };
    return prisma.objective.update({ where: { id: params.id }, data: { active: false } });
  });

  app.get('/subareas', { preHandler: authenticate }, async () =>
    prisma.subarea.findMany({ orderBy: { sortOrder: 'asc' } }));

  app.post('/subareas', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    const parsed = namedSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error);
    return prisma.subarea.create({
      data: { name: parsed.data.name, slug: await uniqueSlug('subarea', parsed.data.name), active: parsed.data.active ?? true, sortOrder: parsed.data.sortOrder ?? 0 },
    });
  });

  app.patch('/subareas/:id', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    const parsed = namedSchema.partial().safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error);
    const params = request.params as { id: string };
    return prisma.subarea.update({ where: { id: params.id }, data: parsed.data });
  });

  app.delete('/subareas/:id', { preHandler: [authenticate, requireAdmin] }, async (request) => {
    const params = request.params as { id: string };
    return prisma.subarea.update({ where: { id: params.id }, data: { active: false } });
  });

  app.get('/service-families', { preHandler: authenticate }, async () =>
    prisma.serviceFamily.findMany({ orderBy: { sortOrder: 'asc' } }));

  app.post('/service-families', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    const parsed = namedSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error);
    return prisma.serviceFamily.create({
      data: { name: parsed.data.name, slug: await uniqueSlug('family', parsed.data.name), active: parsed.data.active ?? true, sortOrder: parsed.data.sortOrder ?? 0 },
    });
  });

  app.patch('/service-families/:id', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    const parsed = namedSchema.partial().safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error);
    const params = request.params as { id: string };
    return prisma.serviceFamily.update({ where: { id: params.id }, data: parsed.data });
  });

  app.delete('/service-families/:id', { preHandler: [authenticate, requireAdmin] }, async (request) => {
    const params = request.params as { id: string };
    return prisma.serviceFamily.update({ where: { id: params.id }, data: { active: false } });
  });

  app.get('/activity-types', { preHandler: authenticate }, async () =>
    prisma.activityType.findMany({ orderBy: { sortOrder: 'asc' } }));

  app.post('/activity-types', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    const parsed = namedSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error);
    return prisma.activityType.create({
      data: { name: parsed.data.name, slug: await uniqueSlug('activity', parsed.data.name), active: parsed.data.active ?? true, sortOrder: parsed.data.sortOrder ?? 0, system: false },
    });
  });

  app.patch('/activity-types/:id', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    const parsed = namedSchema.partial().safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error);
    const params = request.params as { id: string };
    return prisma.activityType.update({ where: { id: params.id }, data: parsed.data });
  });

  app.delete('/activity-types/:id', { preHandler: [authenticate, requireAdmin] }, async (request) => {
    const params = request.params as { id: string };
    const row = await prisma.activityType.findUnique({ where: { id: params.id } });
    if (!row) throw new HttpError(404, 'Tipo de actividad no encontrado');
    const used = await prisma.epic.count({ where: { activityTypeId: row.id } });
    if (row.system && used > 0) {
      return prisma.activityType.update({ where: { id: row.id }, data: { active: false } });
    }
    return prisma.activityType.update({ where: { id: row.id }, data: { active: false } });
  });

  app.get('/maintenance-types', { preHandler: authenticate }, async () => [
    { id: 'ADAPTIVE', name: 'Adaptativo' },
    { id: 'CORRECTIVE', name: 'Correctivo' },
    { id: 'EVOLUTIVE', name: 'Evolutivo' },
  ]);

  app.patch('/people/:id', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    const parsed = personPatchSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error);
    const params = request.params as { id: string };
    try {
      return await prisma.person.update({ where: { id: params.id }, data: parsed.data, include: { subarea: true, serviceFamily: true } });
    } catch {
      throw new HttpError(404, 'Persona no encontrada');
    }
  });
};
