import jwt from 'jsonwebtoken';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Response } from 'express';
import { env } from '../config/env.js';
import type { AuthUser } from '../types/auth.js';
import { ApiError } from './errors.js';

export const REFRESH_COOKIE = 'gfg_refresh';
export const SESSION_HINT_COOKIE = 'gfg_session';
const REFRESH_COOKIE_PATH = '/api/auth';

interface AccessPayload {
  sub: string;
  role: AuthUser['role'];
  username: string;
}

export function signAccessToken(user: AuthUser): string {
  const payload: Omit<AccessPayload, 'sub'> = { role: user.role, username: user.username };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    subject: user.id,
    expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions['expiresIn'],
    issuer: 'geekshub',
  });
}

export function verifyAccessToken(token: string): AuthUser {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: 'geekshub' }) as jwt.JwtPayload & AccessPayload;
    if (!decoded.sub || !decoded.role || !decoded.username) throw new Error('malformed');
    return { id: decoded.sub, role: decoded.role, username: decoded.username };
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) throw ApiError.unauthorized('Access token expired');
    throw ApiError.unauthorized('Invalid access token');
  }
}

export function generateRefreshToken(): { raw: string; hash: string } {
  const raw = randomBytes(48).toString('base64url');
  return { raw, hash: hashToken(raw) };
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function newFamilyId(): string {
  return randomUUID();
}

export function refreshExpiryDate(): Date {
  return new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export function setRefreshCookie(res: Response, raw: string) {
  const maxAge = env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
  res.cookie(REFRESH_COOKIE, raw, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax',
    path: REFRESH_COOKIE_PATH,
    maxAge,
  });
  // Readable hint so the SPA knows whether to attempt a silent refresh on load.
  res.cookie(SESSION_HINT_COOKIE, '1', {
    httpOnly: false,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax',
    path: '/',
    maxAge,
  });
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
  res.clearCookie(SESSION_HINT_COOKIE, { path: '/' });
}
