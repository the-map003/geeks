import { Router, type RequestHandler } from 'express';
import type { z } from 'zod';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate, getQuery } from '../../middleware/validate.js';
import { created, noContent, ok } from '../../utils/response.js';
import { audit } from '../../utils/audit.js';
import * as schemas from './admin.schemas.js';
import * as content from './admin.content.service.js';
import * as practice from './admin.practice.service.js';
import * as system from './admin.system.service.js';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole('EDITOR'));

const adminOnly = requireRole('ADMIN');
const superOnly = requireRole('SUPER_ADMIN');
const idParams = schemas.idParams;

// ---- dashboard ----
adminRouter.get('/stats', async (req, res) => ok(res, await system.getStats(req.user!)));
adminRouter.get('/analytics', adminOnly, validate(schemas.analyticsQuerySchema, 'query'), async (req, res) => {
  const { range } = getQuery<{ range: '7d' | '30d' | '90d' }>(req);
  ok(res, await system.getAnalytics(range));
});
adminRouter.get('/meta', async (_req, res) => ok(res, { categories: await system.listCategoriesFlat(), staff: await system.listStaff() }));

// ---- users ----
adminRouter.get('/users', adminOnly, validate(schemas.usersListQuerySchema, 'query'), async (req, res) => ok(res, await system.listUsers(getQuery(req))));
adminRouter.patch('/users/:id', adminOnly, validate(idParams, 'params'), validate(schemas.userPatchSchema), async (req, res) => {
  const user = await system.patchUser(req.user!, req.params.id as string, req.body as { role?: never; isActive?: boolean });
  await audit(req, { action: 'USER_UPDATED', entityType: 'User', entityId: user.id, metadata: req.body as Record<string, never> });
  ok(res, { user }, 'User updated');
});

// ---- generic content status/delete ----
type Model = 'article' | 'tutorial' | 'course' | 'problem' | 'quiz';
const models: Array<{ path: string; model: Model; entity: string }> = [
  { path: 'articles', model: 'article', entity: 'Article' },
  { path: 'tutorials', model: 'tutorial', entity: 'Tutorial' },
  { path: 'courses', model: 'course', entity: 'Course' },
  { path: 'problems', model: 'problem', entity: 'Problem' },
  { path: 'quizzes', model: 'quiz', entity: 'Quiz' },
];

for (const { path, model, entity } of models) {
  adminRouter.get(`/${path}`, validate(schemas.contentListQuerySchema, 'query'), async (req, res) => ok(res, await content.listContent(model, getQuery(req))));
  const statusHandler = (status: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED', action: string): RequestHandler => async (req, res) => {
    const updated = await content.setStatus(model, req.params.id as string, status);
    await audit(req, { action, entityType: entity, entityId: req.params.id as string });
    ok(res, { item: updated }, `${entity} ${status.toLowerCase()}`);
  };
  adminRouter.post(`/${path}/:id/publish`, adminOnly, validate(idParams, 'params'), statusHandler('PUBLISHED', `${entity.toUpperCase()}_PUBLISHED`));
  adminRouter.post(`/${path}/:id/unpublish`, adminOnly, validate(idParams, 'params'), statusHandler('DRAFT', `${entity.toUpperCase()}_UNPUBLISHED`));
  adminRouter.post(`/${path}/:id/archive`, adminOnly, validate(idParams, 'params'), statusHandler('ARCHIVED', `${entity.toUpperCase()}_ARCHIVED`));
  adminRouter.delete(`/${path}/:id`, adminOnly, validate(idParams, 'params'), async (req, res) => {
    const deleted = await content.deleteContent(model, req.params.id as string);
    await audit(req, { action: `${entity.toUpperCase()}_DELETED`, entityType: entity, entityId: deleted.id, metadata: { title: deleted.title } });
    noContent(res);
  });
}

// ---- articles ----
adminRouter.get('/articles/:id', validate(idParams, 'params'), async (req, res) => ok(res, { article: await content.getArticle(req.params.id as string) }));
adminRouter.post('/articles', validate(schemas.articleInputSchema), async (req, res) => {
  const article = await content.createArticle(req.user!.id, req.body as schemas.ArticleInput);
  await audit(req, { action: 'ARTICLE_CREATED', entityType: 'Article', entityId: article.id });
  created(res, { article }, 'Article created');
});
adminRouter.put('/articles/:id', validate(idParams, 'params'), validate(schemas.articleInputSchema), async (req, res) => {
  const article = await content.updateArticle(req.params.id as string, req.body as schemas.ArticleInput);
  await audit(req, { action: 'ARTICLE_UPDATED', entityType: 'Article', entityId: article.id });
  ok(res, { article }, 'Article saved');
});

// ---- tutorials ----
adminRouter.get('/tutorials/:id', validate(idParams, 'params'), async (req, res) => ok(res, { tutorial: await content.getTutorial(req.params.id as string) }));
adminRouter.post('/tutorials', validate(schemas.tutorialInputSchema), async (req, res) => {
  const tutorial = await content.createTutorial(req.user!.id, req.body as schemas.TutorialInput);
  await audit(req, { action: 'TUTORIAL_CREATED', entityType: 'Tutorial', entityId: tutorial.id });
  created(res, { tutorial }, 'Tutorial created');
});
adminRouter.put('/tutorials/:id', validate(idParams, 'params'), validate(schemas.tutorialInputSchema), async (req, res) => {
  const tutorial = await content.updateTutorial(req.params.id as string, req.body as schemas.TutorialInput);
  await audit(req, { action: 'TUTORIAL_UPDATED', entityType: 'Tutorial', entityId: tutorial.id });
  ok(res, { tutorial }, 'Tutorial saved');
});
adminRouter.post('/tutorials/:id/chapters', validate(idParams, 'params'), validate(schemas.chapterInputSchema), async (req, res) => created(res, { chapter: await content.createChapter(req.params.id as string, req.body as z.infer<typeof schemas.chapterInputSchema>) }));
adminRouter.put('/tutorials/chapters/:id', validate(idParams, 'params'), validate(schemas.chapterInputSchema), async (req, res) => ok(res, { chapter: await content.updateChapter(req.params.id as string, req.body as z.infer<typeof schemas.chapterInputSchema>) }));
adminRouter.delete('/tutorials/chapters/:id', validate(idParams, 'params'), async (req, res) => {
  await content.deleteChapter(req.params.id as string);
  noContent(res);
});
adminRouter.get('/tutorials/lessons/:id', validate(idParams, 'params'), async (req, res) => ok(res, { lesson: await content.getTutorialLesson(req.params.id as string) }));
adminRouter.post('/tutorials/:id/lessons', validate(idParams, 'params'), validate(schemas.tutorialLessonInputSchema), async (req, res) => {
  const lesson = await content.createTutorialLesson(req.params.id as string, req.body as schemas.TutorialLessonInput);
  await audit(req, { action: 'TUTORIAL_LESSON_CREATED', entityType: 'TutorialLesson', entityId: lesson.id });
  created(res, { lesson }, 'Lesson created');
});
adminRouter.put('/tutorials/lessons/:id', validate(idParams, 'params'), validate(schemas.tutorialLessonInputSchema), async (req, res) => {
  const lesson = await content.updateTutorialLesson(req.params.id as string, req.body as schemas.TutorialLessonInput);
  await audit(req, { action: 'TUTORIAL_LESSON_UPDATED', entityType: 'TutorialLesson', entityId: lesson.id });
  ok(res, { lesson }, 'Lesson saved');
});
adminRouter.delete('/tutorials/lessons/:id', adminOnly, validate(idParams, 'params'), async (req, res) => {
  await content.deleteTutorialLesson(req.params.id as string);
  await audit(req, { action: 'TUTORIAL_LESSON_DELETED', entityType: 'TutorialLesson', entityId: req.params.id as string });
  noContent(res);
});

// ---- courses ----
adminRouter.get('/courses/:id', validate(idParams, 'params'), async (req, res) => ok(res, { course: await content.getCourse(req.params.id as string) }));
adminRouter.post('/courses', validate(schemas.courseInputSchema), async (req, res) => {
  const course = await content.createCourse(req.user!.id, req.body as schemas.CourseInput);
  await audit(req, { action: 'COURSE_CREATED', entityType: 'Course', entityId: course.id });
  created(res, { course }, 'Course created');
});
adminRouter.put('/courses/:id', validate(idParams, 'params'), validate(schemas.courseInputSchema), async (req, res) => {
  const course = await content.updateCourse(req.params.id as string, req.body as schemas.CourseInput);
  await audit(req, { action: 'COURSE_UPDATED', entityType: 'Course', entityId: course.id });
  ok(res, { course }, 'Course saved');
});
adminRouter.post('/courses/:id/modules', validate(idParams, 'params'), validate(schemas.moduleInputSchema), async (req, res) => created(res, { module: await content.createModule(req.params.id as string, req.body as z.infer<typeof schemas.moduleInputSchema>) }));
adminRouter.put('/courses/modules/:id', validate(idParams, 'params'), validate(schemas.moduleInputSchema), async (req, res) => ok(res, { module: await content.updateModule(req.params.id as string, req.body as z.infer<typeof schemas.moduleInputSchema>) }));
adminRouter.delete('/courses/modules/:id', adminOnly, validate(idParams, 'params'), async (req, res) => {
  await content.deleteModule(req.params.id as string);
  noContent(res);
});
adminRouter.get('/courses/lessons/:id', validate(idParams, 'params'), async (req, res) => ok(res, { lesson: await content.getCourseLesson(req.params.id as string) }));
adminRouter.post('/courses/modules/:id/lessons', validate(idParams, 'params'), validate(schemas.courseLessonInputSchema), async (req, res) => {
  const lesson = await content.createCourseLesson(req.params.id as string, req.body as schemas.CourseLessonInput);
  await audit(req, { action: 'COURSE_LESSON_CREATED', entityType: 'CourseLesson', entityId: lesson.id });
  created(res, { lesson }, 'Lesson created');
});
adminRouter.put('/courses/lessons/:id', validate(idParams, 'params'), validate(schemas.courseLessonInputSchema), async (req, res) => {
  const lesson = await content.updateCourseLesson(req.params.id as string, req.body as schemas.CourseLessonInput);
  await audit(req, { action: 'COURSE_LESSON_UPDATED', entityType: 'CourseLesson', entityId: lesson.id });
  ok(res, { lesson }, 'Lesson saved');
});
adminRouter.delete('/courses/lessons/:id', adminOnly, validate(idParams, 'params'), async (req, res) => {
  await content.deleteCourseLesson(req.params.id as string);
  noContent(res);
});

// ---- problems ----
adminRouter.get('/problems/:id', validate(idParams, 'params'), async (req, res) => ok(res, { problem: await practice.getProblem(req.params.id as string) }));
adminRouter.post('/problems', validate(schemas.problemInputSchema), async (req, res) => {
  const problem = await practice.createProblem(req.user!.id, req.body as schemas.ProblemInput);
  await audit(req, { action: 'PROBLEM_CREATED', entityType: 'Problem', entityId: problem.id });
  created(res, { problem }, 'Problem created');
});
adminRouter.put('/problems/:id', validate(idParams, 'params'), validate(schemas.problemInputSchema), async (req, res) => {
  const problem = await practice.updateProblem(req.params.id as string, req.body as schemas.ProblemInput);
  await audit(req, { action: 'PROBLEM_UPDATED', entityType: 'Problem', entityId: problem.id });
  ok(res, { problem }, 'Problem saved');
});
adminRouter.post('/problems/:id/validate', validate(idParams, 'params'), validate(schemas.validateProblemSchema), async (req, res) => {
  const body = req.body as z.infer<typeof schemas.validateProblemSchema>;
  ok(res, await practice.validateProblem(req.params.id as string, body.language, body.sourceCode));
});

// ---- quizzes ----
adminRouter.get('/quizzes/:id', validate(idParams, 'params'), async (req, res) => ok(res, { quiz: await practice.getQuiz(req.params.id as string) }));
adminRouter.post('/quizzes', validate(schemas.quizInputSchema), async (req, res) => {
  const quiz = await practice.createQuiz(req.user!.id, req.body as schemas.QuizInput);
  await audit(req, { action: 'QUIZ_CREATED', entityType: 'Quiz', entityId: quiz.id });
  created(res, { quiz }, 'Quiz created');
});
adminRouter.put('/quizzes/:id', validate(idParams, 'params'), validate(schemas.quizInputSchema), async (req, res) => {
  const quiz = await practice.updateQuiz(req.params.id as string, req.body as schemas.QuizInput);
  await audit(req, { action: 'QUIZ_UPDATED', entityType: 'Quiz', entityId: quiz.id });
  ok(res, { quiz }, 'Quiz saved');
});

// ---- moderation ----
adminRouter.get('/comments', validate(schemas.commentsListQuerySchema, 'query'), async (req, res) => ok(res, await system.listComments(getQuery(req))));
adminRouter.patch('/comments/:id', validate(idParams, 'params'), validate(schemas.commentActionSchema), async (req, res) => {
  const body = req.body as z.infer<typeof schemas.commentActionSchema>;
  const comment = await system.moderateComment(req.params.id as string, body);
  await audit(req, { action: `COMMENT_${body.action.toUpperCase()}`, entityType: 'Comment', entityId: comment.id, metadata: body.reason ? { reason: body.reason } : undefined });
  ok(res, { comment }, `Comment ${body.action === 'hide' ? 'hidden' : body.action === 'restore' ? 'restored' : 'deleted'}`);
});
adminRouter.get('/reports', validate(schemas.reportsListQuerySchema, 'query'), async (req, res) => ok(res, await system.listReports(getQuery(req))));
adminRouter.patch('/reports/:id', validate(idParams, 'params'), validate(schemas.reportActionSchema), async (req, res) => {
  const body = req.body as z.infer<typeof schemas.reportActionSchema>;
  const report = await system.resolveReport(req.user!, req.params.id as string, body);
  await audit(req, { action: `REPORT_${body.action.toUpperCase()}D`, entityType: 'Report', entityId: report.id, metadata: { note: body.note ?? null, hideComment: !!body.hideComment } });
  ok(res, { report }, `Report ${body.action}d`);
});

// ---- system ----
adminRouter.get('/audit-logs', adminOnly, validate(schemas.auditListQuerySchema, 'query'), async (req, res) => ok(res, await system.listAuditLogs(getQuery(req))));
adminRouter.get('/settings', superOnly, async (_req, res) => ok(res, { settings: await system.getSettings() }));
adminRouter.put('/settings', superOnly, validate(schemas.settingsPutSchema), async (req, res) => {
  const settings = await system.putSettings(req.user!, req.body as z.infer<typeof schemas.settingsPutSchema>);
  await audit(req, { action: 'SETTINGS_UPDATED', entityType: 'SiteSetting', metadata: { keys: (req.body as { settings: Array<{ key: string }> }).settings.map((s) => s.key) } });
  ok(res, { settings }, 'Settings saved');
});
