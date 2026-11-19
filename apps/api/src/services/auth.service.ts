import bcrypt from 'bcrypt';
import type { FastifyInstance } from 'fastify';
import { getEnv } from '../config/env';
import { HttpError } from '../lib/http-error';
import { prisma } from '../lib/prisma';

export async function loginUser(app: FastifyInstance, email: string, password: string) {
  const env = getEnv();
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || user.status !== 'ACTIVE') {
    throw new HttpError(401, 'Credenciales no válidas');
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new HttpError(401, 'Credenciales no válidas');
  const accessToken = await app.jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    { expiresIn: env.JWT_EXPIRES_IN },
  );
  return {
    accessToken,
    user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role },
  };
}
