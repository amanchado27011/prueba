import type { FastifyReply, FastifyRequest } from 'fastify';
import { UserStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import type { CurrentUser, JwtPayload } from '../types/fastify';

export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Unauthorized' });
  }
  const payload = request.user as JwtPayload;
  const row = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!row || row.status !== UserStatus.ACTIVE) {
    return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Unauthorized' });
  }
  if (row.email.toLowerCase() !== payload.email.toLowerCase() || row.role !== payload.role) {
    return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Token no longer valid for this user' });
  }
  const currentUser: CurrentUser = {
    id: row.id,
    email: row.email,
    role: row.role,
    displayName: row.displayName,
  };
  request.currentUser = currentUser;
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (request.currentUser?.role !== 'ADMIN') {
    return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Se requiere rol ADMIN' });
  }
}
