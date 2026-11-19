import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma';
import { validationError } from '../lib/zod-reply';
import { authenticate, requireAdmin } from '../plugins/authenticate';
import { analysisQuerySchema, emailSchema } from '../schemas';
import { deliverQualityEmail, previewQualityEmail } from '../services/email.service';
import { qualityReport } from '../services/quality.service';
import { loadWorkModel, toAnalysisFilter } from '../services/snapshot.service';

export const qualityRoutes: FastifyPluginAsync = async (app) => {
  app.get('/quality', { preHandler: authenticate }, async (request, reply) => {
    const parsed = analysisQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) return validationError(reply, parsed.error);
    const model = await loadWorkModel();
    return qualityReport(model, toAnalysisFilter(parsed.data, model), parsed.data.kind);
  });

  app.post('/quality/email/preview', { preHandler: authenticate }, async (request, reply) => {
    const parsed = emailSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error);
    const query = analysisQuerySchema.safeParse(request.query ?? {});
    if (!query.success) return validationError(reply, query.error);
    const model = await loadWorkModel();
    const report = qualityReport(model, toAnalysisFilter(query.data, model));
    const rows = report.items.filter((item) => parsed.data.kinds.includes(item.reason));
    const preview = await previewQualityEmail(rows);
    return preview;
  });

  app.post('/quality/email/send', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    const parsed = emailSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error);
    const query = analysisQuerySchema.safeParse(request.query ?? {});
    if (!query.success) return validationError(reply, query.error);
    const model = await loadWorkModel();
    const report = qualityReport(model, toAnalysisFilter(query.data, model));
    const rows = report.items.filter((item) => parsed.data.kinds.includes(item.reason));
    return deliverQualityEmail({
      rows,
      kinds: parsed.data.kinds,
      dryRun: parsed.data.dryRun ?? false,
      userId: request.currentUser.id,
    });
  });

  app.get('/quality/emails', { preHandler: authenticate }, async () => {
    return prisma.emailDispatch.findMany({ orderBy: { sentAt: 'desc' }, take: 50, include: { user: { select: { email: true, displayName: true } } } });
  });
};
