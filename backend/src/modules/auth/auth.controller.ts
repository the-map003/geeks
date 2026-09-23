import type { Request, RequestHandler } from 'express';
import * as service from './auth.service.js';
import { created, noContent, ok } from '../../utils/response.js';
import { clearRefreshCookie, hashToken, REFRESH_COOKIE, setRefreshCookie } from '../../utils/tokens.js';
import { audit } from '../../utils/audit.js';
import type { ChangePasswordInput, LoginInput, RegisterInput } from './auth.schemas.js';

function meta(req: Request): service.SessionMeta {
  return { userAgent: req.headers['user-agent'], ip: req.ip };
}

function refreshCookie(req: Request): string | undefined {
  const cookies = req.cookies as Record<string, string | undefined> | undefined;
  return cookies?.[REFRESH_COOKIE];
}

export const register: RequestHandler = async (req, res) => {
  const result = await service.register(req.body as RegisterInput, meta(req));
  setRefreshCookie(res, result.refreshToken);
  req.user = { id: result.user.id, role: result.user.role, username: result.user.username };
  await audit(req, { action: 'USER_REGISTERED', entityType: 'User', entityId: result.user.id });
  created(res, { user: result.user, accessToken: result.accessToken }, 'Account created');
};

export const login: RequestHandler = async (req, res) => {
  const result = await service.login(req.body as LoginInput, meta(req));
  setRefreshCookie(res, result.refreshToken);
  ok(res, { user: result.user, accessToken: result.accessToken }, 'Signed in');
};

export const refresh: RequestHandler = async (req, res, next) => {
  try {
    const result = await service.refresh(refreshCookie(req), meta(req));
    setRefreshCookie(res, result.refreshToken);
    ok(res, { user: result.user, accessToken: result.accessToken });
  } catch (err) {
    clearRefreshCookie(res);
    next(err);
  }
};

export const logout: RequestHandler = async (req, res) => {
  await service.logout(refreshCookie(req));
  clearRefreshCookie(res);
  noContent(res);
};

export const logoutAll: RequestHandler = async (req, res) => {
  await service.logoutAll(req.user!.id);
  clearRefreshCookie(res);
  noContent(res);
};

export const me: RequestHandler = async (req, res) => {
  const user = await service.getCurrentUser(req.user!.id);
  ok(res, { user });
};

export const changePassword: RequestHandler = async (req, res) => {
  const current = refreshCookie(req);
  await service.changePassword(req.user!.id, req.body as ChangePasswordInput, current ? hashToken(current) : undefined);
  await audit(req, { action: 'PASSWORD_CHANGED', entityType: 'User', entityId: req.user!.id });
  noContent(res);
};
