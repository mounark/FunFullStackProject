import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../domain/errors';

/** Media type of every error response. */
const PROBLEM_JSON = 'application/problem+json';

/** Sends an RFC 7807 problem document with a stable `code`. */
function problem(reply: FastifyReply, status: number, title: string, code: string, detail: string) {
  return reply
    .status(status)
    .type(PROBLEM_JSON)
    .send({ type: 'about:blank', title, status, code, detail });
}

/** The one place errors become HTTP responses. */
export function errorHandler(error: FastifyError | Error, request: FastifyRequest, reply: FastifyReply) {
  if (error instanceof AppError) {
    request.log.warn({ code: error.code, cause: error.detailForLog }, error.message);
    return problem(reply, error.status, error.title, error.code, error.message);
  }
  request.log.error({ err: error }, 'unhandled error');
  return problem(reply, 500, 'Internal server error', 'INTERNAL_ERROR', 'An unexpected error occurred.');
}
