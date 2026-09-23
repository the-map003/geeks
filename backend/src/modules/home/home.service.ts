import { prisma } from '../../utils/prisma.js';
import {
  articleSummaryInclude,
  courseSummaryInclude,
  problemSummaryInclude,
  quizSummaryInclude,
  toArticleSummary,
  toCourseSummary,
  toProblemSummary,
  toQuizSummary,
  toTutorialSummary,
  tutorialSummaryInclude,
} from '../../utils/content-serializers.js';
import { buildTree } from '../categories/categories.service.js';

const CACHE_TTL_MS = 60_000;
let cache: { at: number; data: Awaited<ReturnType<typeof buildHome>> } | null = null;

export async function getHome() {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data;
  const data = await buildHome();
  cache = { at: Date.now(), data };
  return data;
}

export function invalidateHomeCache() {
  cache = null;
}

async function buildHome() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [
    categories,
    featuredArticles,
    latestArticles,
    tutorials,
    popularProblems,
    problemOfTheDay,
    courses,
    quizzes,
    trendingGroups,
    counts,
  ] = await Promise.all([
    prisma.category.findMany({ orderBy: [{ order: 'asc' }] }),
    prisma.article.findMany({ where: { status: 'PUBLISHED', isFeatured: true }, orderBy: { publishedAt: 'desc' }, take: 6, include: articleSummaryInclude }),
    prisma.article.findMany({ where: { status: 'PUBLISHED' }, orderBy: { publishedAt: 'desc' }, take: 8, include: articleSummaryInclude }),
    prisma.tutorial.findMany({ where: { status: 'PUBLISHED' }, orderBy: { order: 'asc' }, take: 6, include: tutorialSummaryInclude }),
    prisma.problem.findMany({ where: { status: 'PUBLISHED' }, orderBy: { submissionCount: 'desc' }, take: 8, include: problemSummaryInclude }),
    prisma.problem.findFirst({ where: { status: 'PUBLISHED', isProblemOfTheDay: true }, include: problemSummaryInclude }),
    prisma.course.findMany({ where: { status: 'PUBLISHED' }, orderBy: [{ isFeatured: 'desc' }, { enrollmentCount: 'desc' }], take: 6, include: courseSummaryInclude }),
    prisma.quiz.findMany({ where: { status: 'PUBLISHED' }, orderBy: { attemptCount: 'desc' }, take: 6, include: quizSummaryInclude }),
    prisma.articleView.groupBy({
      by: ['articleId'],
      where: { viewedAt: { gte: since }, article: { status: 'PUBLISHED' } },
      _count: { _all: true },
      orderBy: { _count: { articleId: 'desc' } },
      take: 6,
    }),
    Promise.all([
      prisma.article.count({ where: { status: 'PUBLISHED' } }),
      prisma.problem.count({ where: { status: 'PUBLISHED' } }),
      prisma.course.count({ where: { status: 'PUBLISHED' } }),
      prisma.quiz.count({ where: { status: 'PUBLISHED' } }),
      prisma.user.count({ where: { isActive: true } }),
    ]),
  ]);

  const trendingIds = trendingGroups.map((g) => g.articleId);
  const trendingRows = trendingIds.length
    ? await prisma.article.findMany({ where: { id: { in: trendingIds } }, include: articleSummaryInclude })
    : [];
  const trending = trendingIds
    .map((id) => trendingRows.find((r) => r.id === id))
    .filter((r): r is NonNullable<typeof r> => !!r)
    .map(toArticleSummary);

  const tree = buildTree(categories);
  const featuredCategories = tree.filter((c) => c.isFeatured);

  return {
    featuredCategories,
    featuredArticles: featuredArticles.map(toArticleSummary),
    latestArticles: latestArticles.map(toArticleSummary),
    tutorials: tutorials.map(toTutorialSummary),
    popularProblems: popularProblems.map((p) => toProblemSummary(p)),
    problemOfTheDay: problemOfTheDay ? toProblemSummary(problemOfTheDay) : null,
    courses: courses.map(toCourseSummary),
    quizzes: quizzes.map(toQuizSummary),
    trending,
    stats: { articles: counts[0], problems: counts[1], courses: counts[2], quizzes: counts[3], learners: counts[4] },
  };
}
