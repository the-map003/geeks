import { Router } from 'express';
import { z } from 'zod';
import { validate, getQuery } from '../../middleware/validate.js';
import { optionalAuth, requireAuth } from '../../middleware/auth.js';
import { executionLimiter } from '../../middleware/rateLimit.js';
import { accepted, ok } from '../../utils/response.js';
import {
  listProblemsQuerySchema,
  problemDetailQuerySchema,
  runSchema,
  submitSchema,
  type ListProblemsQuery,
  type RunInput,
  type SubmitInput,
} from './problems.schemas.js';
import * as service from './problems.service.js';
import * as submissions from '../submissions/submissions.service.js';

export const problemsRouter = Router();
const slugParams = z.object({ slug: z.string().min(1).max(200) });

problemsRouter.get('/overview', async (_req, res) => {
  ok(res, await service.overview());
});

problemsRouter.get('/', optionalAuth, validate(listProblemsQuerySchema, 'query'), async (req, res) => {
  ok(res, await service.listProblems(getQuery<ListProblemsQuery>(req), req.user));
});

problemsRouter.get('/:slug', optionalAuth, validate(slugParams, 'params'), validate(problemDetailQuerySchema, 'query'), async (req, res) => {
  const { editorial } = getQuery<{ editorial?: string }>(req);
  ok(res, { problem: await service.getProblem(req.params.slug as string, req.user, editorial === 'true') });
});

problemsRouter.post('/:slug/run', requireAuth, executionLimiter, validate(slugParams, 'params'), validate(runSchema), async (req, res) => {
  ok(res, await service.runCode(req.params.slug as string, req.body as RunInput));
});

problemsRouter.post('/:slug/submit', requireAuth, executionLimiter, validate(slugParams, 'params'), validate(submitSchema), async (req, res) => {
  const body = req.body as SubmitInput;
  accepted(res, await submissions.createSubmission(req.user!, req.params.slug as string, body.language, body.sourceCode), 'Submission queued');
});
