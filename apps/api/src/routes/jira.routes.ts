import type { FastifyPluginAsync } from 'fastify';
import { getEnv } from '../config/env';
import { validationError } from '../lib/zod-reply';
import { authenticate, requireAdmin } from '../plugins/authenticate';
import { recipientSchema, syncSchema } from '../schemas';
import { getRecipient, setRecipient } from '../services/settings.service';
import { startSync, syncStatus } from '../services/sync.service';

export const jiraRoutes: FastifyPluginAsync = async (app) => {
  app.get('/config', { preHandler: authenticate }, async () => {
    const env = getEnv();
    const recipient = await getRecipient();
    let host: string | null = null;
    if (env.JIRA_BASE_URL) {
      try {
        host = new URL(env.JIRA_BASE_URL).host;
      } catch {
        host = null;
      }
    }
    return {
      configured: env.jiraConfigured,
      baseUrlHost: host,
      emailConfigured: Boolean(env.JIRA_EMAIL),
      tokenConfigured: Boolean(env.JIRA_API_TOKEN),
      projectKeys: env.projectKeys,
      allowFixture: env.allowFixture,
      recipient: recipient.email,
      recipientSource: recipient.source,
      smtpConfigured: env.smtpConfigured,
      staleAfterHours: env.STALE_AFTER_HOURS,
    };
  });

  app.patch('/config/recipient', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    const parsed = recipientSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error);
    await setRecipient(parsed.data.recipient);
    return getRecipient();
  });

  app.post('/sync', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    const parsed = syncSchema.safeParse(request.body ?? {});
    if (!parsed.success) return validationError(reply, parsed.error);
    const env = getEnv();
    const mode = parsed.data.mode ?? (env.jiraConfigured ? 'cloud' : 'fixture');
    return startSync(mode);
  });

  app.get('/sync/status', { preHandler: authenticate }, async () => syncStatus());
};
