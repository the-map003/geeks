import type { RequestHandler } from 'express';
import * as service from './users.service.js';
import { ok } from '../../utils/response.js';
import type { UpdateProfileInput } from './users.schemas.js';

export const getMe: RequestHandler = async (req, res) => {
  ok(res, { user: await service.getMe(req.user!.id) });
};

export const updateMe: RequestHandler = async (req, res) => {
  const user = await service.updateMe(req.user!.id, req.body as UpdateProfileInput);
  ok(res, { user }, 'Profile updated');
};

export const getPublicProfile: RequestHandler = async (req, res) => {
  const { username } = req.params as { username: string };
  ok(res, { user: await service.getPublicProfile(username) });
};
