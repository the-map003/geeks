import type { Request, RequestHandler } from 'express';
import type { ZodType } from 'zod';

type Source = 'body' | 'query' | 'params';

/**
 * Validates one part of the request with a Zod schema and replaces it with the parsed value.
 * Zod errors are forwarded to the global error handler, which formats them as 400 responses.
 */
export function validate<T>(schema: ZodType<T>, source: Source = 'body'): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) return next(result.error);
    if (source === 'query') {
      // Express 5 exposes `req.query` through a getter; store the parsed copy separately.
      req.validatedQuery = result.data;
    } else {
      (req as unknown as Record<Source, unknown>)[source] = result.data;
    }
    next();
  };
}

/** Returns the query object parsed by `validate(schema, 'query')`. */
export function getQuery<T>(req: Request): T {
  return (req.validatedQuery ?? req.query) as T;
}
