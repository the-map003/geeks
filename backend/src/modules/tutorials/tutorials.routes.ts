import { Router } from 'express';
import { z } from 'zod';
import { validate, getQuery } from '../../middleware/validate.js';
import { optionalAuth, requireAuth } from '../../middleware/auth.js';
import { ok } from '../../utils/response.js';
import { paginationQuerySchema } from '../../utils/pagination.js';
import * as service from './tutorials.service.js';

export const tutorialsRouter = Router();

const listQuery = paginationQuerySchema.extend({ category: z.string().trim().max(80).optional() });
const slugParams = z.object({ slug: z.string().min(1).max(200) });
const lessonParams = z.object({ slug: z.string().min(1).max(200), lessonSlug: z.string().min(1).max(200) });
const idParams = z.object({ id: z.string().min(1).max(64) });

tutorialsRouter.get('/', validate(listQuery, 'query'), async (req, res) => {
  ok(res, await service.listTutorials(getQuery<z.infer<typeof listQuery>>(req)));
});

tutorialsRouter.get('/:slug', optionalAuth, validate(slugParams, 'params'), async (req, res) => {
  ok(res, { tutorial: await service.getTutorial(req.params.slug as string, req.user?.id) });
});

tutorialsRouter.get('/:slug/lessons/:lessonSlug', optionalAuth, validate(lessonParams, 'params'), async (req, res) => {
  ok(res, { lesson: await service.getLesson(req.params.slug as string, req.params.lessonSlug as string, req.user?.id) });
});

tutorialsRouter.post('/lessons/:id/complete', requireAuth, validate(idParams, 'params'), async (req, res) => {
  ok(res, await service.toggleLessonComplete(req.user!.id, req.params.id as string));
});
