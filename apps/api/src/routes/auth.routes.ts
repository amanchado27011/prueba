import rateLimit from '@fastify/rate-limit';
import type { FastifyPluginAsync } from 'fastify';
import { getEnv } from '../config/env';
import { validationError } from '../lib/zod-reply';
import { authenticate } from '../plugins/authenticate';
import { loginSchema } from '../schemas';
import { loginUser } from '../services/auth.service';

export const authRoutes: FastifyPluginAsync = async (app) => {
  const env = getEnv();
  await app.register(rateLimit, { global: false });
  const rateCfg = {
    max: env.NODE_ENV === 'test' ? 50_000 : env.AUTH_RATE_LIMIT_MAX,
    timeWindow: env.AUTH_RATE_LIMIT_WINDOW_MS,
  };

  app.post('/login', { config: { rateLimit: rateCfg } }, async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error);
    return loginUser(app, parsed.data.email, parsed.data.password);
  });

  app.get('/me', { preHandler: authenticate }, async (request) => ({
    user: request.currentUser,
  }));
};
