import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';
import { env } from '../config/env.js';

const disabled = env.isTest;

function keyByUserOrIp(req: Request): string {
  const user = (req as Request & { user?: { id: string } }).user;
  return user?.id ?? ipKeyGenerator(req.ip ?? '0.0.0.0');
}

const jsonMessage = (message: string) => ({ success: false, message, errors: [] });

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => disabled,
  message: jsonMessage('Too many requests, please try again later'),
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => disabled,
  message: jsonMessage('Too many authentication attempts, please try again later'),
});

export const executionLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => disabled,
  keyGenerator: keyByUserOrIp,
  message: jsonMessage('Too many code executions, please wait a moment'),
});

export const commentLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => disabled,
  keyGenerator: keyByUserOrIp,
  message: jsonMessage('You are posting too quickly, please wait a moment'),
});
