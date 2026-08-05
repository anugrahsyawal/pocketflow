import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    statusCode: number;
    details?: unknown;
  };
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_SERVER_ERROR', details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function handleAppError(
  error: FastifyError | AppError | Error,
  _request: FastifyRequest,
  reply: FastifyReply
): void {
  const isDev = process.env.NODE_ENV === 'development';

  if (error instanceof AppError) {
    reply.status(error.statusCode).send({
      error: {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        details: error.details,
      },
    } satisfies ApiErrorResponse);
    return;
  }

  const statusCode = (error as FastifyError).statusCode || 500;
  const code = (error as FastifyError).code || 'INTERNAL_SERVER_ERROR';

  // Sanitize message to prevent leaking secrets/connection strings
  const message = statusCode >= 500 && !isDev ? 'An internal server error occurred' : error.message;

  reply.status(statusCode).send({
    error: {
      code,
      message,
      statusCode,
    },
  } satisfies ApiErrorResponse);
}
