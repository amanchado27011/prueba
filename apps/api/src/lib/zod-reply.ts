import type { FastifyReply } from 'fastify';
import type { ZodError } from 'zod';

export function validationError(reply: FastifyReply, error: ZodError) {
  return reply.status(400).send({
    statusCode: 400,
    error: 'Bad Request',
    message: 'Validation error',
    issues: error.flatten(),
  });
}
