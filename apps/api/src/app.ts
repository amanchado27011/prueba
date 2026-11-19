import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import Fastify from 'fastify';
import { randomUUID } from 'node:crypto';
import { getEnv } from './config/env';
import { prisma } from './lib/prisma';
import { v1Routes } from './routes/v1';

export async function buildApp() {
  const env = getEnv();
  const app = Fastify({
    logger: env.NODE_ENV === 'development',
    bodyLimit: 3 * 1024 * 1024,
    requestIdHeader: 'x-request-id',
    genReqId: () => randomUUID(),
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });
  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES_IN },
  });
  await app.register(cors, { origin: env.CORS_ORIGIN, credentials: true });
  await app.register(multipart, { limits: { fileSize: 8 * 1024 * 1024, files: 1 } });

  app.get('/health', async () => ({ ok: true }));
  await app.register(v1Routes, { prefix: '/v1' });

  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });

  app.setErrorHandler((error: unknown, request, reply) => {
    if (reply.sent) return;
    const err = error instanceof Error ? error : new Error('Error');
    const statusCode = typeof (error as { statusCode?: number }).statusCode === 'number'
      ? (error as { statusCode: number }).statusCode
      : 500;
    if (statusCode >= 500) request.log.error(err);
    const message = statusCode >= 500 ? 'Internal Server Error' : err.message || 'Error';
    return reply.status(statusCode).send({
      statusCode,
      error: statusCode >= 500 ? 'Internal Server Error' : err.name || 'Error',
      message,
    });
  });

  return app;
}
