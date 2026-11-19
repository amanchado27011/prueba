import type { UserRole } from '@prisma/client';

export interface CurrentUser {
  id: string;
  email: string;
  role: UserRole;
  displayName: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

declare module 'fastify' {
  interface FastifyRequest {
    currentUser: CurrentUser;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}
