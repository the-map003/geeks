import { Router } from 'express';
import { z } from 'zod';
import { validate, getQuery } from '../../middleware/validate.js';
import { optionalAuth, requireAuth } from '../../middleware/auth.js';
import { created, ok } from '../../utils/response.js';
import { listCoursesQuerySchema, type ListCoursesQuery } from './courses.schemas.js';
import * as service from './courses.service.js';

export const coursesRouter = Router();

const slugParams = z.object({ slug: z.string().min(1).max(200) });
const lessonParams = z.object({ slug: z.string().min(1).max(200), lessonSlug: z.string().min(1).max(200) });
const idParams = z.object({ id: z.string().min(1).max(64) });

coursesRouter.get('/', validate(listCoursesQuerySchema, 'query'), async (req, res) => {
  ok(res, await service.listCourses(getQuery<ListCoursesQuery>(req)));
});

coursesRouter.get('/me/enrollments', requireAuth, async (req, res) => {
  ok(res, { enrollments: await service.myEnrollments(req.user!.id) });
});

coursesRouter.get('/:slug', optionalAuth, validate(slugParams, 'params'), async (req, res) => {
  ok(res, { course: await service.getCourse(req.params.slug as string, req.user?.id) });
});

coursesRouter.post('/:slug/enroll', requireAuth, validate(slugParams, 'params'), async (req, res) => {
  created(res, { enrollment: await service.enroll(req.user!.id, req.params.slug as string) }, 'Enrolled successfully');
});

coursesRouter.get('/:slug/lessons/:lessonSlug', optionalAuth, validate(lessonParams, 'params'), async (req, res) => {
  ok(res, { lesson: await service.getLesson(req.params.slug as string, req.params.lessonSlug as string, req.user?.id) });
});

coursesRouter.post('/lessons/:id/complete', requireAuth, validate(idParams, 'params'), async (req, res) => {
  ok(res, await service.toggleLessonComplete(req.user!.id, req.params.id as string));
});
