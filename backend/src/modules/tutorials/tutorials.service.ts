import type { Prisma } from '@prisma/client';
import { prisma } from '../../utils/prisma.js';
import { ApiError } from '../../utils/errors.js';
import { paginate } from '../../utils/response.js';
import { toSkipTake, type PaginationQuery } from '../../utils/pagination.js';
import { tutorialSummaryInclude, toTutorialSummary } from '../../utils/content-serializers.js';
import { categoryIdsForSlug } from '../../utils/categories.js';
import { recordActivity } from '../../utils/activity.js';

const lessonSummarySelect = { id: true, title: true, slug: true, order: true, readingTimeMin: true, chapterId: true } as const;

export async function listTutorials(query: PaginationQuery & { category?: string }) {
  const where: Prisma.TutorialWhereInput = { status: 'PUBLISHED' };
  const categoryIds = await categoryIdsForSlug(query.category);
  if (categoryIds) where.categoryId = { in: categoryIds };

  const [items, total] = await Promise.all([
    prisma.tutorial.findMany({ where, orderBy: [{ order: 'asc' }, { title: 'asc' }], ...toSkipTake(query), include: tutorialSummaryInclude }),
    prisma.tutorial.count({ where }),
  ]);
  return paginate(items.map(toTutorialSummary), total, query.page, query.pageSize);
}

async function loadTutorialStructure(slug: string) {
  const tutorial = await prisma.tutorial.findUnique({
    where: { slug },
    include: {
      ...tutorialSummaryInclude,
      chapters: { orderBy: { order: 'asc' }, include: { lessons: { orderBy: { order: 'asc' }, select: lessonSummarySelect } } },
      lessons: { where: { chapterId: null }, orderBy: { order: 'asc' }, select: lessonSummarySelect },
    },
  });
  if (!tutorial || tutorial.status !== 'PUBLISHED') throw ApiError.notFound('Tutorial not found');
  return tutorial;
}

function buildChapters(tutorial: Awaited<ReturnType<typeof loadTutorialStructure>>, completed: Set<string>) {
  const chapters = tutorial.chapters.map((c) => ({
    id: c.id,
    title: c.title,
    order: c.order,
    lessons: c.lessons.map((l) => ({ ...l, completed: completed.has(l.id) })),
  }));
  if (tutorial.lessons.length) {
    chapters.push({
      id: 'uncategorised',
      title: 'Lessons',
      order: chapters.length,
      lessons: tutorial.lessons.map((l) => ({ ...l, completed: completed.has(l.id) })),
    });
  }
  return chapters;
}

async function completedLessonIds(userId: string | undefined, tutorialId: string): Promise<Set<string>> {
  if (!userId) return new Set();
  const rows = await prisma.lessonProgress.findMany({
    where: { userId, lesson: { tutorialId } },
    select: { lessonId: true },
  });
  return new Set(rows.map((r) => r.lessonId));
}

export async function getTutorial(slug: string, userId?: string) {
  const tutorial = await loadTutorialStructure(slug);
  const completed = await completedLessonIds(userId, tutorial.id);
  const bookmarked = userId
    ? !!(await prisma.bookmark.findUnique({ where: { userId_tutorialId: { userId, tutorialId: tutorial.id } } }))
    : false;
  const chapters = buildChapters(tutorial, completed);
  const total = tutorial._count.lessons;

  return {
    ...toTutorialSummary(tutorial),
    chapters,
    completedLessonIds: [...completed],
    progressPercent: total ? Math.round((completed.size / total) * 100) : 0,
    bookmarked,
  };
}

export async function getLesson(tutorialSlug: string, lessonSlug: string, userId?: string) {
  const tutorial = await loadTutorialStructure(tutorialSlug);
  const lesson = await prisma.tutorialLesson.findUnique({
    where: { tutorialId_slug: { tutorialId: tutorial.id, slug: lessonSlug } },
  });
  if (!lesson) throw ApiError.notFound('Lesson not found');

  const completed = await completedLessonIds(userId, tutorial.id);
  const chapters = buildChapters(tutorial, completed);
  const flat = chapters.flatMap((c) => c.lessons);
  const idx = flat.findIndex((l) => l.id === lesson.id);
  const total = tutorial._count.lessons;

  return {
    id: lesson.id,
    title: lesson.title,
    slug: lesson.slug,
    order: lesson.order,
    readingTimeMin: lesson.readingTimeMin,
    content: lesson.content,
    updatedAt: lesson.updatedAt,
    completed: completed.has(lesson.id),
    tutorial: {
      id: tutorial.id,
      title: tutorial.title,
      slug: tutorial.slug,
      description: tutorial.description,
      category: tutorial.category,
    },
    chapters,
    prev: idx > 0 ? flat[idx - 1] : null,
    next: idx >= 0 && idx < flat.length - 1 ? flat[idx + 1] : null,
    completedLessonIds: [...completed],
    progressPercent: total ? Math.round((completed.size / total) * 100) : 0,
  };
}

export async function toggleLessonComplete(userId: string, lessonId: string) {
  const lesson = await prisma.tutorialLesson.findUnique({
    where: { id: lessonId },
    select: { id: true, tutorialId: true, tutorial: { select: { status: true, _count: { select: { lessons: true } } } } },
  });
  if (!lesson || lesson.tutorial.status !== 'PUBLISHED') throw ApiError.notFound('Lesson not found');

  const existing = await prisma.lessonProgress.findUnique({ where: { userId_lessonId: { userId, lessonId } } });
  let completed: boolean;
  if (existing) {
    await prisma.lessonProgress.delete({ where: { id: existing.id } });
    completed = false;
  } else {
    await prisma.lessonProgress.create({ data: { userId, lessonId } });
    await recordActivity(userId, 'lessonsCompleted');
    completed = true;
  }

  const done = await prisma.lessonProgress.count({ where: { userId, lesson: { tutorialId: lesson.tutorialId } } });
  const total = lesson.tutorial._count.lessons;
  return { completed, progressPercent: total ? Math.round((done / total) * 100) : 0 };
}

/** Tutorials the user has started, with progress — used by the dashboard. */
export async function inProgressTutorials(userId: string, limit = 4) {
  const rows = await prisma.lessonProgress.findMany({
    where: { userId },
    orderBy: { completedAt: 'desc' },
    select: { completedAt: true, lesson: { select: { tutorialId: true } } },
  });
  const seen = new Set<string>();
  const tutorialIds: string[] = [];
  for (const r of rows) {
    if (!seen.has(r.lesson.tutorialId)) {
      seen.add(r.lesson.tutorialId);
      tutorialIds.push(r.lesson.tutorialId);
    }
    if (tutorialIds.length >= limit) break;
  }
  if (!tutorialIds.length) return [];

  const tutorials = await prisma.tutorial.findMany({
    where: { id: { in: tutorialIds }, status: 'PUBLISHED' },
    include: tutorialSummaryInclude,
  });
  const counts = await prisma.lessonProgress.groupBy({
    by: ['lessonId'],
    where: { userId, lesson: { tutorialId: { in: tutorialIds } } },
  });
  const lessonTutorial = await prisma.tutorialLesson.findMany({
    where: { id: { in: counts.map((c) => c.lessonId) } },
    select: { id: true, tutorialId: true },
  });
  const doneByTutorial = new Map<string, number>();
  for (const l of lessonTutorial) doneByTutorial.set(l.tutorialId, (doneByTutorial.get(l.tutorialId) ?? 0) + 1);

  return tutorialIds
    .map((id) => tutorials.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => !!t)
    .map((t) => ({
      ...toTutorialSummary(t),
      progressPercent: t._count.lessons ? Math.round(((doneByTutorial.get(t.id) ?? 0) / t._count.lessons) * 100) : 0,
    }));
}
