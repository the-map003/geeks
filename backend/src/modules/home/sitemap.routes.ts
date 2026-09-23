import { Router } from 'express';
import { prisma } from '../../utils/prisma.js';
import { ok } from '../../utils/response.js';

export const sitemapRouter = Router();

/** Published slugs for the frontend sitemap generator. */
sitemapRouter.get('/', async (_req, res) => {
  const published = { status: 'PUBLISHED' as const };
  const [articles, tutorials, lessons, courses, problems, quizzes, categories, tags] = await Promise.all([
    prisma.article.findMany({ where: published, select: { slug: true, updatedAt: true } }),
    prisma.tutorial.findMany({ where: published, select: { slug: true, updatedAt: true } }),
    prisma.tutorialLesson.findMany({ where: { tutorial: published }, select: { slug: true, updatedAt: true, tutorial: { select: { slug: true } } } }),
    prisma.course.findMany({ where: published, select: { slug: true, updatedAt: true } }),
    prisma.problem.findMany({ where: published, select: { slug: true, updatedAt: true } }),
    prisma.quiz.findMany({ where: published, select: { slug: true, updatedAt: true } }),
    prisma.category.findMany({ select: { slug: true, updatedAt: true } }),
    prisma.tag.findMany({ select: { slug: true } }),
  ]);
  res.setHeader('Cache-Control', 'public, max-age=3600');
  ok(res, {
    articles,
    tutorials,
    lessons: lessons.map((l) => ({ slug: l.slug, tutorialSlug: l.tutorial.slug, updatedAt: l.updatedAt })),
    courses,
    problems,
    quizzes,
    categories,
    tags,
  });
});
