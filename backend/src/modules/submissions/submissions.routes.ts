import { Router } from 'express';
import { z } from 'zod';
import { validate, getQuery } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { ok } from '../../utils/response.js';
import { listSubmissionsQuerySchema, type ListSubmissionsQuery } from '../problems/problems.schemas.js';
import * as service from './submissions.service.js';

export const submissionsRouter = Router();
submissionsRouter.use(requireAuth);

submissionsRouter.get('/', validate(listSubmissionsQuerySchema, 'query'), async (req, res) => {
  ok(res, await service.listSubmissions(req.user!, getQuery<ListSubmissionsQuery>(req)));
});

submissionsRouter.get('/:id', validate(z.object({ id: z.string().min(1).max(64) }), 'params'), async (req, res) => {
  ok(res, { submission: await service.getSubmission(req.user!, req.params.id as string) });
});
