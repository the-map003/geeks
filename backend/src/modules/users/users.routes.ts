import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { validate, getQuery } from '../../middleware/validate.js';
import { noContent, ok } from '../../utils/response.js';
import { updateProfileSchema, usernameParamSchema } from './users.schemas.js';
import * as controller from './users.controller.js';
import * as dashboard from './dashboard.service.js';

export const usersRouter = Router();

usersRouter.get('/me', requireAuth, controller.getMe);
usersRouter.patch('/me', requireAuth, validate(updateProfileSchema), controller.updateMe);
usersRouter.get('/me/dashboard', requireAuth, async (req, res) => {
  ok(res, await dashboard.getDashboard(req.user!));
});
usersRouter.get('/me/activity', requireAuth, validate(z.object({ days: z.coerce.number().int().min(7).max(365).default(90) }), 'query'), async (req, res) => {
  const { days } = getQuery<{ days: number }>(req);
  ok(res, { activity: await dashboard.getActivity(req.user!.id, days) });
});
usersRouter.post('/me/notifications/read', requireAuth, validate(z.object({ ids: z.array(z.string()).max(100).optional() })), async (req, res) => {
  await dashboard.markNotificationsRead(req.user!.id, (req.body as { ids?: string[] }).ids);
  noContent(res);
});
usersRouter.get('/:username', validate(usernameParamSchema, 'params'), controller.getPublicProfile);
