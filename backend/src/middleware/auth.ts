import type { RequestHandler } from 'express';
import type { Role } from '@prisma/client';
import { ApiError } from '../utils/errors.js';
import { verifyAccessToken } from '../utils/tokens.js';
import { hasRole } from '../types/auth.js';

function extractBearer(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

/** Populates `req.user` when a valid bearer token is present; never fails the request. */
export const optionalAuth: RequestHandler = (req, _res, next) => {
  const token = extractBearer(req.headers.authorization);
  if (!token) return next();
  try {
    req.user = verifyAccessToken(token);
  } catch {
    // Ignore invalid tokens for optional routes; the client will refresh or re-login.
  }
  next();
};

/** Rejects the request with 401 unless a valid bearer token is present. */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const token = extractBearer(req.headers.authorization);
  if (!token) return next(ApiError.unauthorized());
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch (err) {
    next(err);
  }
};

/** Requires an authenticated user whose role is at least `minimum`. */
export function requireRole(minimum: Role): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!hasRole(req.user.role, minimum)) return next(ApiError.forbidden());
    next();
  };
}
