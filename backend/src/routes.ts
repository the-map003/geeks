import { Router } from 'express';
import { prisma } from './utils/prisma.js';
import { ok } from './utils/response.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { usersRouter } from './modules/users/users.routes.js';
import { categoriesRouter, tagsRouter, topicsRouter } from './modules/categories/categories.routes.js';
import { articlesRouter } from './modules/articles/articles.routes.js';
import { tutorialsRouter } from './modules/tutorials/tutorials.routes.js';
import { coursesRouter } from './modules/courses/courses.routes.js';
import { homeRouter } from './modules/home/home.routes.js';
import { bookmarksRouter } from './modules/bookmarks/bookmarks.routes.js';
import { commentsRouter } from './modules/comments/comments.routes.js';
import { problemsRouter } from './modules/problems/problems.routes.js';
import { submissionsRouter } from './modules/submissions/submissions.routes.js';
import { quizAttemptsRouter, quizzesRouter } from './modules/quizzes/quizzes.routes.js';
import { searchRouter } from './modules/search/search.routes.js';
import { adminRouter } from './modules/admin/admin.routes.js';
import { sitemapRouter } from './modules/home/sitemap.routes.js';

export const apiRouter = Router();

apiRouter.get('/health', async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    ok(res, { status: 'ok', database: 'up', timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/categories', categoriesRouter);
apiRouter.use('/tags', tagsRouter);
apiRouter.use('/topics', topicsRouter);
apiRouter.use('/home', homeRouter);
apiRouter.use('/articles', articlesRouter);
apiRouter.use('/tutorials', tutorialsRouter);
apiRouter.use('/courses', coursesRouter);
apiRouter.use('/bookmarks', bookmarksRouter);
apiRouter.use('/comments', commentsRouter);
apiRouter.use('/problems', problemsRouter);
apiRouter.use('/submissions', submissionsRouter);
apiRouter.use('/quizzes', quizzesRouter);
apiRouter.use('/quiz-attempts', quizAttemptsRouter);
apiRouter.use('/search', searchRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/sitemap', sitemapRouter);

// Feature modules are mounted here as they are implemented (see docs/API_SPEC.md).
