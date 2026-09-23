import { Router } from 'express';
import { z } from 'zod';
import { validate, getQuery } from '../../middleware/validate.js';
import { optionalAuth, requireAuth } from '../../middleware/auth.js';
import { created, ok } from '../../utils/response.js';
import { answerSchema, listQuizzesQuerySchema, type AnswerInput, type ListQuizzesQuery } from './quizzes.schemas.js';
import * as service from './quizzes.service.js';

export const quizzesRouter = Router();
export const quizAttemptsRouter = Router();

const slugParams = z.object({ slug: z.string().min(1).max(200) });
const idParams = z.object({ id: z.string().min(1).max(64) });

quizzesRouter.get('/', validate(listQuizzesQuerySchema, 'query'), async (req, res) => {
  ok(res, await service.listQuizzes(getQuery<ListQuizzesQuery>(req)));
});

quizzesRouter.get('/me/attempts', requireAuth, async (req, res) => {
  ok(res, { attempts: await service.myAttempts(req.user!) });
});

quizzesRouter.get('/:slug', optionalAuth, validate(slugParams, 'params'), async (req, res) => {
  ok(res, { quiz: await service.getQuiz(req.params.slug as string, req.user) });
});

quizzesRouter.post('/:slug/attempts', requireAuth, validate(slugParams, 'params'), async (req, res) => {
  const result = await service.startAttempt(req.user!, req.params.slug as string);
  if (result.resumed) ok(res, { attempt: result.attempt, resumed: true }, 'Resuming your attempt');
  else created(res, { attempt: result.attempt, resumed: false }, 'Attempt started');
});

quizAttemptsRouter.use(requireAuth);
quizAttemptsRouter.get('/:id', validate(idParams, 'params'), async (req, res) => {
  ok(res, { attempt: await service.getAttempt(req.user!, req.params.id as string) });
});
quizAttemptsRouter.put('/:id/answers', validate(idParams, 'params'), validate(answerSchema), async (req, res) => {
  ok(res, await service.saveAnswer(req.user!, req.params.id as string, req.body as AnswerInput));
});
quizAttemptsRouter.post('/:id/submit', validate(idParams, 'params'), async (req, res) => {
  ok(res, { result: await service.submitAttempt(req.user!, req.params.id as string) }, 'Quiz submitted');
});
quizAttemptsRouter.get('/:id/result', validate(idParams, 'params'), async (req, res) => {
  ok(res, { result: await service.getResult(req.user!, req.params.id as string) });
});
