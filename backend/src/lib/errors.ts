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
    const errObj: ApiErrorResponse['error'] = {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
    };
    if (error.details !== undefined) {
      errObj.details = error.details;
    }
    reply.status(error.statusCode).send({ error: errObj });
    return;
  }

  const fastifyErr = error as FastifyError;
  const isValidationError =
    fastifyErr.code === 'FST_ERR_VALIDATION' || Boolean((fastifyErr as any).validation);

  if (isValidationError) {
    const rawVal = (fastifyErr as any).validation;
    const details = Array.isArray(rawVal)
      ? rawVal.map((v: any) => ({
          field: v.instancePath
            ? v.instancePath.replace(/^\//, '').replace(/\//g, '.')
            : v.params?.missingProperty || 'body',
          message: v.message || 'invalid input',
        }))
      : undefined;

    reply.status(400).send({
      error: {
        code: 'INVALID_INPUT',
        message: fastifyErr.message || 'Validation failed',
        statusCode: 400,
        ...(details !== undefined ? { details } : {}),
      },
    });
    return;
  }

  const statusCode = fastifyErr.statusCode || 500;
  let code = fastifyErr.code || 'INTERNAL_SERVER_ERROR';

  if (statusCode === 400 && code.startsWith('FST_')) {
    code = 'INVALID_INPUT';
  } else if (statusCode === 401 && code.startsWith('FST_')) {
    code = 'UNAUTHENTICATED';
  } else if (statusCode === 403 && code.startsWith('FST_')) {
    code = 'INVALID_CSRF_TOKEN';
  } else if (statusCode === 404 && code.startsWith('FST_')) {
    code = 'NOT_FOUND';
  }

  // Sanitize message to prevent leaking secrets/connection strings
  const message = statusCode >= 500 && !isDev ? 'An internal server error occurred' : error.message;

  reply.status(statusCode).send({
    error: {
      code,
      message,
      statusCode,
    },
  });
}
