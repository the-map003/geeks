import type { Category } from '@prisma/client';
import { prisma } from '../../utils/prisma.js';
import { ApiError } from '../../utils/errors.js';
import { authorSelect, toAuthorSummary } from '../../utils/serializers.js';

export type CategoryNode = Category & { children: CategoryNode[] };

export async function listCategories(options: { tree?: boolean; nav?: boolean }) {
  const all = await prisma.category.findMany({ orderBy: [{ order: 'asc' }, { name: 'asc' }] });
  if (options.nav) return all.filter((c) => c.showInNav && !c.parentId);
  if (!options.tree) return all;
  return buildTree(all);
}

export function buildTree(flat: Category[]): CategoryNode[] {
  const byId = new Map<string, CategoryNode>();
  for (const c of flat) byId.set(c.id, { ...c, children: [] });
  const roots: CategoryNode[] = [];
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) byId.get(node.parentId)!.children.push(node);
    else roots.push(node);
  }
  return roots;
}

export async function getCategoryHub(slug: string) {
  const category = await prisma.category.findUnique({
    where: { slug },
    include: { parent: true, children: { orderBy: { order: 'asc' } } },
  });
  if (!category) throw ApiError.notFound('Category not found');

  const ids = [category.id, ...category.children.map((c) => c.id)];
  const inCategory = { categoryId: { in: ids }, status: 'PUBLISHED' as const };

  const [articles, tutorials, problems, courses, quizzes, counts] = await Promise.all([
    prisma.article.findMany({
      where: inCategory,
      orderBy: { publishedAt: 'desc' },
      take: 12,
      include: {
        author: { select: authorSelect },
        category: { select: { id: true, name: true, slug: true } },
        tags: { include: { tag: true } },
      },
    }),
    prisma.tutorial.findMany({
      where: inCategory,
      orderBy: { order: 'asc' },
      take: 6,
      include: {
        author: { select: authorSelect },
        category: { select: { id: true, name: true, slug: true } },
        _count: { select: { lessons: true } },
      },
    }),
    prisma.problem.findMany({
      where: inCategory,
      orderBy: { submissionCount: 'desc' },
      take: 10,
      include: { topics: { include: { topic: true } } },
    }),
    prisma.course.findMany({
      where: inCategory,
      orderBy: { enrollmentCount: 'desc' },
      take: 4,
      include: {
        instructor: { select: authorSelect },
        category: { select: { id: true, name: true, slug: true } },
        modules: { select: { _count: { select: { lessons: true } } } },
      },
    }),
    prisma.quiz.findMany({
      where: inCategory,
      orderBy: { attemptCount: 'desc' },
      take: 6,
      include: { category: { select: { id: true, name: true, slug: true } }, _count: { select: { questions: true } } },
    }),
    Promise.all([
      prisma.article.count({ where: inCategory }),
      prisma.tutorial.count({ where: inCategory }),
      prisma.problem.count({ where: inCategory }),
      prisma.course.count({ where: inCategory }),
      prisma.quiz.count({ where: inCategory }),
    ]),
  ]);

  return {
    category: {
      ...category,
      counts: { articles: counts[0], tutorials: counts[1], problems: counts[2], courses: counts[3], quizzes: counts[4] },
    },
    articles: articles.map((a) => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
      excerpt: a.excerpt,
      coverImageUrl: a.coverImageUrl,
      difficulty: a.difficulty,
      readingTimeMin: a.readingTimeMin,
      viewCount: a.viewCount,
      likeCount: a.likeCount,
      commentCount: a.commentCount,
      isFeatured: a.isFeatured,
      publishedAt: a.publishedAt,
      updatedAt: a.updatedAt,
      author: toAuthorSummary(a.author),
      category: a.category,
      tags: a.tags.map((t) => t.tag),
    })),
    tutorials: tutorials.map((t) => ({
      id: t.id,
      title: t.title,
      slug: t.slug,
      description: t.description,
      coverImageUrl: t.coverImageUrl,
      lessonCount: t._count.lessons,
      category: t.category,
      author: toAuthorSummary(t.author),
    })),
    problems: problems.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      difficulty: p.difficulty,
      points: p.points,
      submissionCount: p.submissionCount,
      acceptedCount: p.acceptedCount,
      accuracy: p.submissionCount ? Math.round((p.acceptedCount / p.submissionCount) * 100) : 0,
      companyTags: p.companyTags,
      topics: p.topics.map((t) => t.topic),
      userState: null,
    })),
    courses: courses.map((c) => ({
      id: c.id,
      title: c.title,
      slug: c.slug,
      subtitle: c.subtitle,
      coverImageUrl: c.coverImageUrl,
      level: c.level,
      price: c.price.toString(),
      isFree: c.isFree,
      durationHours: c.durationHours,
      enrollmentCount: c.enrollmentCount,
      ratingAvg: c.ratingAvg.toString(),
      ratingCount: c.ratingCount,
      isFeatured: c.isFeatured,
      lessonCount: c.modules.reduce((s, m) => s + m._count.lessons, 0),
      category: c.category,
      instructor: toAuthorSummary(c.instructor),
    })),
    quizzes: quizzes.map((q) => ({
      id: q.id,
      title: q.title,
      slug: q.slug,
      description: q.description,
      difficulty: q.difficulty,
      timeLimitMin: q.timeLimitMin,
      questionCount: q._count.questions,
      attemptCount: q.attemptCount,
      category: q.category,
    })),
  };
}

export async function listTags(q?: string) {
  return prisma.tag.findMany({
    where: q ? { name: { contains: q, mode: 'insensitive' } } : undefined,
    orderBy: { name: 'asc' },
    take: 100,
  });
}

export async function listTopics() {
  const topics = await prisma.topic.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { problems: { where: { problem: { status: 'PUBLISHED' } } } } } },
  });
  return topics.map((t) => ({ id: t.id, name: t.name, slug: t.slug, description: t.description, problemCount: t._count.problems }));
}
