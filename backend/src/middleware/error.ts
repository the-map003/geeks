import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { ApiError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
};

function fromPrismaError(err: Prisma.PrismaClientKnownRequestError): ApiError {
  switch (err.code) {
    case 'P2002': {
      const target = Array.isArray(err.meta?.target) ? (err.meta?.target as string[]).join(', ') : 'field';
      return ApiError.conflict(`A record with this ${target} already exists`);
    }
    case 'P2025':
      return ApiError.notFound('Resource not found');
    case 'P2003':
      return ApiError.unprocessable('Related resource does not exist');
    default:
      return ApiError.internal();
  }
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  let apiError: ApiError;

  if (err instanceof ApiError) {
    apiError = err;
  } else if (err instanceof ZodError) {
    apiError = ApiError.badRequest(
      'Validation failed',
      err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    );
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    apiError = fromPrismaError(err);
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    apiError = ApiError.badRequest('Invalid query');
  } else if (err && typeof err === 'object' && 'type' in err && err.type === 'entity.too.large') {
    apiError = new ApiError(413, 'Request body too large');
  } else if (err && typeof err === 'object' && 'type' in err && err.type === 'entity.parse.failed') {
    apiError = ApiError.badRequest('Malformed JSON body');
  } else {
    apiError = ApiError.internal();
  }

  if (apiError.statusCode >= 500) {
    logger.error({ err, path: req.originalUrl, method: req.method }, 'Unhandled error');
  } else if (apiError.statusCode !== 404) {
    logger.debug({ status: apiError.statusCode, path: req.originalUrl, message: apiError.message }, 'Request error');
  }

  const message =
    apiError.statusCode >= 500 && env.isProd ? 'Internal server error' : apiError.message;

  res.status(apiError.statusCode).json({
    success: false,
    message,
    errors: apiError.errors,
  });
};
