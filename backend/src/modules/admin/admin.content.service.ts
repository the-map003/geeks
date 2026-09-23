import type { ContentStatus, Prisma } from '@prisma/client';
import { prisma } from '../../utils/prisma.js';
import { ApiError } from '../../utils/errors.js';
import { paginate } from '../../utils/response.js';
import { toSkipTake } from '../../utils/pagination.js';
import { readingTimeMinutes, slugify, uniqueSlug } from '../../utils/slug.js';
import { authorSelect, toAuthorSummary } from '../../utils/serializers.js';
import { invalidateHomeCache } from '../home/home.service.js';
import type { ArticleInput, ContentListQuery, CourseInput, CourseLessonInput, TutorialInput, TutorialLessonInput } from './admin.schemas.js';

type ContentModel = 'article' | 'tutorial' | 'course' | 'problem' | 'quiz';

const listSelectByModel: Record<ContentModel, Record<string, unknown>> = {
  article: { id: true, title: true, slug: true, status: true, difficulty: true, isFeatured: true, viewCount: true, likeCount: true, commentCount: true, publishedAt: true, createdAt: true, updatedAt: true, author: { select: authorSelect }, category: { select: { id: true, name: true, slug: true } } },
  tutorial: { id: true, title: true, slug: true, status: true, order: true, publishedAt: true, createdAt: true, updatedAt: true, author: { select: authorSelect }, category: { select: { id: true, name: true, slug: true } }, _count: { select: { lessons: true } } },
  course: { id: true, title: true, slug: true, status: true, level: true, price: true, isFree: true, isFeatured: true, enrollmentCount: true, publishedAt: true, createdAt: true, updatedAt: true, instructor: { select: authorSelect }, category: { select: { id: true, name: true, slug: true } }, _count: { select: { modules: true } } },
  problem: { id: true, title: true, slug: true, status: true, difficulty: true, points: true, submissionCount: true, acceptedCount: true, isProblemOfTheDay: true, publishedAt: true, createdAt: true, updatedAt: true, author: { select: authorSelect }, _count: { select: { testCases: true } } },
  quiz: { id: true, title: true, slug: true, status: true, difficulty: true, attemptCount: true, publishedAt: true, createdAt: true, updatedAt: true, author: { select: authorSelect }, category: { select: { id: true, name: true, slug: true } }, _count: { select: { questions: true } } },
};

function delegate(model: ContentModel) {
  // Prisma delegates share the same method surface for our purposes.
  return (prisma as unknown as Record<ContentModel, Prisma.ArticleDelegate>)[model];
}

export async function listContent(model: ContentModel, query: ContentListQuery) {
  const where: Record<string, unknown> = {};
  if (query.status) where.status = query.status;
  if (query.q) where.title = { contains: query.q, mode: 'insensitive' };
  const orderBy = query.sort === 'title' ? { title: 'asc' } : query.sort === 'created' ? { createdAt: 'desc' } : { updatedAt: 'desc' };
  const d = delegate(model);
  const [rows, total, byStatus] = await Promise.all([
    d.findMany({ where, orderBy, ...toSkipTake(query), select: listSelectByModel[model] } as never),
    d.count({ where } as never),
    d.groupBy({ by: ['status'], _count: { _all: true } } as never) as unknown as Promise<Array<{ status: ContentStatus; _count: { _all: number } }>>,
  ]);
  const counts: Record<string, number> = { DRAFT: 0, PUBLISHED: 0, ARCHIVED: 0 };
  for (const b of byStatus) counts[b.status] = b._count._all;
  const items = (rows as Array<Record<string, unknown>>).map((r) => ({
    ...r,
    ...(r.author ? { author: toAuthorSummary(r.author as never) } : {}),
    ...(r.instructor ? { instructor: toAuthorSummary(r.instructor as never) } : {}),
    ...(r.price !== undefined ? { price: String(r.price) } : {}),
  }));
  return { ...paginate(items, total, query.page, query.pageSize), counts };
}

export async function setStatus(model: ContentModel, id: string, status: ContentStatus) {
  const d = delegate(model);
  const existing = await d.findUnique({ where: { id }, select: { id: true, status: true, publishedAt: true } } as never);
  if (!existing) throw ApiError.notFound('Content not found');
  if (status === 'PUBLISHED' && model === 'problem') {
    const tests = await prisma.testCase.count({ where: { problemId: id } });
    if (tests === 0) throw ApiError.unprocessable('Add at least one test case before publishing a problem');
  }
  if (status === 'PUBLISHED' && model === 'quiz') {
    const questions = await prisma.question.count({ where: { quizId: id } });
    if (questions === 0) throw ApiError.unprocessable('Add at least one question before publishing a quiz');
  }
  const updated = await d.update({
    where: { id },
    data: { status, ...(status === 'PUBLISHED' && !(existing as { publishedAt: Date | null }).publishedAt ? { publishedAt: new Date() } : {}) },
    select: { id: true, status: true, publishedAt: true, slug: true },
  } as never);
  invalidateHomeCache();
  return updated;
}

export async function deleteContent(model: ContentModel, id: string) {
  const d = delegate(model);
  const existing = await d.findUnique({ where: { id }, select: { id: true, title: true } } as never);
  if (!existing) throw ApiError.notFound('Content not found');
  await d.delete({ where: { id } } as never);
  invalidateHomeCache();
  return existing as { id: string; title: string };
}

// ---------------------------------------------------------------------------
// Articles
// ---------------------------------------------------------------------------

async function tagIdsFor(names: string[]): Promise<string[]> {
  const ids: string[] = [];
  for (const raw of names) {
    const s = slugify(raw);
    if (!s) continue;
    const tag = await prisma.tag.upsert({ where: { slug: s }, update: {}, create: { slug: s, name: raw.trim() } });
    ids.push(tag.id);
  }
  return [...new Set(ids)];
}

export async function getArticle(id: string) {
  const a = await prisma.article.findUnique({ where: { id }, include: { author: { select: authorSelect }, category: { select: { id: true, name: true, slug: true } }, tags: { include: { tag: true } } } });
  if (!a) throw ApiError.notFound('Article not found');
  return { ...a, author: toAuthorSummary(a.author), tags: a.tags.map((t) => t.tag) };
}

export async function createArticle(authorId: string, input: ArticleInput) {
  const slugValue = await uniqueSlug(input.slug ?? input.title, async (s) => !!(await prisma.article.findUnique({ where: { slug: s }, select: { id: true } })));
  const tagIds = await tagIdsFor(input.tags);
  const article = await prisma.article.create({
    data: {
      title: input.title,
      slug: slugValue,
      excerpt: input.excerpt,
      content: input.content,
      coverImageUrl: input.coverImageUrl ?? null,
      categoryId: input.categoryId ?? null,
      difficulty: input.difficulty ?? null,
      isFeatured: input.isFeatured ?? false,
      readingTimeMin: readingTimeMinutes(input.content),
      authorId,
      tags: { create: tagIds.map((tagId) => ({ tagId })) },
    },
  });
  return getArticle(article.id);
}

export async function updateArticle(id: string, input: ArticleInput) {
  const existing = await prisma.article.findUnique({ where: { id }, select: { id: true, slug: true } });
  if (!existing) throw ApiError.notFound('Article not found');
  const slugValue = input.slug && input.slug !== existing.slug
    ? await uniqueSlug(input.slug, async (s) => !!(await prisma.article.findFirst({ where: { slug: s, NOT: { id } }, select: { id: true } })))
    : existing.slug;
  const tagIds = await tagIdsFor(input.tags);
  await prisma.$transaction([
    prisma.articleTag.deleteMany({ where: { articleId: id } }),
    prisma.article.update({
      where: { id },
      data: {
        title: input.title,
        slug: slugValue,
        excerpt: input.excerpt,
        content: input.content,
        coverImageUrl: input.coverImageUrl ?? null,
        categoryId: input.categoryId ?? null,
        difficulty: input.difficulty ?? null,
        isFeatured: input.isFeatured ?? false,
        readingTimeMin: readingTimeMinutes(input.content),
        tags: { create: tagIds.map((tagId) => ({ tagId })) },
      },
    }),
  ]);
  invalidateHomeCache();
  return getArticle(id);
}

// ---------------------------------------------------------------------------
// Tutorials
// ---------------------------------------------------------------------------

export async function getTutorial(id: string) {
  const t = await prisma.tutorial.findUnique({
    where: { id },
    include: {
      author: { select: authorSelect },
      category: { select: { id: true, name: true, slug: true } },
      chapters: { orderBy: { order: 'asc' }, include: { lessons: { orderBy: { order: 'asc' }, select: { id: true, title: true, slug: true, order: true, readingTimeMin: true, chapterId: true, updatedAt: true } } } },
      lessons: { where: { chapterId: null }, orderBy: { order: 'asc' }, select: { id: true, title: true, slug: true, order: true, readingTimeMin: true, chapterId: true, updatedAt: true } },
    },
  });
  if (!t) throw ApiError.notFound('Tutorial not found');
  return { ...t, author: toAuthorSummary(t.author) };
}

export async function createTutorial(authorId: string, input: TutorialInput) {
  const slugValue = await uniqueSlug(input.slug ?? input.title, async (s) => !!(await prisma.tutorial.findUnique({ where: { slug: s }, select: { id: true } })));
  const t = await prisma.tutorial.create({ data: { title: input.title, slug: slugValue, description: input.description, coverImageUrl: input.coverImageUrl ?? null, categoryId: input.categoryId ?? null, order: input.order ?? 0, authorId } });
  return getTutorial(t.id);
}

export async function updateTutorial(id: string, input: TutorialInput) {
  const existing = await prisma.tutorial.findUnique({ where: { id }, select: { slug: true } });
  if (!existing) throw ApiError.notFound('Tutorial not found');
  const slugValue = input.slug && input.slug !== existing.slug
    ? await uniqueSlug(input.slug, async (s) => !!(await prisma.tutorial.findFirst({ where: { slug: s, NOT: { id } }, select: { id: true } })))
    : existing.slug;
  await prisma.tutorial.update({ where: { id }, data: { title: input.title, slug: slugValue, description: input.description, coverImageUrl: input.coverImageUrl ?? null, categoryId: input.categoryId ?? null, order: input.order ?? 0 } });
  invalidateHomeCache();
  return getTutorial(id);
}

export async function createChapter(tutorialId: string, input: { title: string; order?: number }) {
  await assertExists(prisma.tutorial.findUnique({ where: { id: tutorialId }, select: { id: true } }), 'Tutorial');
  const count = await prisma.tutorialChapter.count({ where: { tutorialId } });
  return prisma.tutorialChapter.create({ data: { tutorialId, title: input.title, order: input.order ?? count } });
}
export async function updateChapter(id: string, input: { title: string; order?: number }) {
  await assertExists(prisma.tutorialChapter.findUnique({ where: { id }, select: { id: true } }), 'Chapter');
  return prisma.tutorialChapter.update({ where: { id }, data: { title: input.title, ...(input.order !== undefined ? { order: input.order } : {}) } });
}
export async function deleteChapter(id: string) {
  await assertExists(prisma.tutorialChapter.findUnique({ where: { id }, select: { id: true } }), 'Chapter');
  await prisma.tutorialChapter.delete({ where: { id } });
}

export async function getTutorialLesson(id: string) {
  const l = await prisma.tutorialLesson.findUnique({ where: { id }, include: { tutorial: { select: { id: true, title: true, slug: true } }, chapter: { select: { id: true, title: true } } } });
  if (!l) throw ApiError.notFound('Lesson not found');
  return l;
}
export async function createTutorialLesson(tutorialId: string, input: TutorialLessonInput) {
  await assertExists(prisma.tutorial.findUnique({ where: { id: tutorialId }, select: { id: true } }), 'Tutorial');
  if (input.chapterId) {
    const ch = await prisma.tutorialChapter.findFirst({ where: { id: input.chapterId, tutorialId }, select: { id: true } });
    if (!ch) throw ApiError.badRequest('Chapter does not belong to this tutorial');
  }
  const slugValue = await uniqueSlug(input.slug ?? input.title, async (s) => !!(await prisma.tutorialLesson.findUnique({ where: { tutorialId_slug: { tutorialId, slug: s } }, select: { id: true } })));
  const count = await prisma.tutorialLesson.count({ where: { tutorialId } });
  const l = await prisma.tutorialLesson.create({
    data: { tutorialId, chapterId: input.chapterId ?? null, title: input.title, slug: slugValue, content: input.content, order: input.order ?? count, readingTimeMin: input.readingTimeMin ?? readingTimeMinutes(input.content) },
  });
  return getTutorialLesson(l.id);
}
export async function updateTutorialLesson(id: string, input: TutorialLessonInput) {
  const existing = await prisma.tutorialLesson.findUnique({ where: { id }, select: { tutorialId: true, slug: true } });
  if (!existing) throw ApiError.notFound('Lesson not found');
  if (input.chapterId) {
    const ch = await prisma.tutorialChapter.findFirst({ where: { id: input.chapterId, tutorialId: existing.tutorialId }, select: { id: true } });
    if (!ch) throw ApiError.badRequest('Chapter does not belong to this tutorial');
  }
  const slugValue = input.slug && input.slug !== existing.slug
    ? await uniqueSlug(input.slug, async (s) => !!(await prisma.tutorialLesson.findFirst({ where: { tutorialId: existing.tutorialId, slug: s, NOT: { id } }, select: { id: true } })))
    : existing.slug;
  await prisma.tutorialLesson.update({
    where: { id },
    data: { title: input.title, slug: slugValue, content: input.content, chapterId: input.chapterId ?? null, ...(input.order !== undefined ? { order: input.order } : {}), readingTimeMin: input.readingTimeMin ?? readingTimeMinutes(input.content) },
  });
  return getTutorialLesson(id);
}
export async function deleteTutorialLesson(id: string) {
  await assertExists(prisma.tutorialLesson.findUnique({ where: { id }, select: { id: true } }), 'Lesson');
  await prisma.tutorialLesson.delete({ where: { id } });
}

// ---------------------------------------------------------------------------
// Courses
// ---------------------------------------------------------------------------

export async function getCourse(id: string) {
  const c = await prisma.course.findUnique({
    where: { id },
    include: {
      instructor: { select: authorSelect },
      category: { select: { id: true, name: true, slug: true } },
      modules: { orderBy: { order: 'asc' }, include: { lessons: { orderBy: { order: 'asc' }, select: { id: true, title: true, slug: true, order: true, durationMin: true, isPreview: true, updatedAt: true } } } },
    },
  });
  if (!c) throw ApiError.notFound('Course not found');
  return { ...c, price: c.price.toString(), ratingAvg: c.ratingAvg.toString(), instructor: toAuthorSummary(c.instructor) };
}

export async function createCourse(actorId: string, input: CourseInput) {
  const slugValue = await uniqueSlug(input.slug ?? input.title, async (s) => !!(await prisma.course.findUnique({ where: { slug: s }, select: { id: true } })));
  const price = input.price ?? 0;
  const c = await prisma.course.create({
    data: {
      title: input.title,
      slug: slugValue,
      subtitle: input.subtitle ?? null,
      description: input.description,
      coverImageUrl: input.coverImageUrl ?? null,
      level: input.level ?? 'ALL_LEVELS',
      price,
      isFree: price === 0,
      durationHours: input.durationHours ?? 0,
      categoryId: input.categoryId ?? null,
      instructorId: input.instructorId ?? actorId,
      isFeatured: input.isFeatured ?? false,
    },
  });
  return getCourse(c.id);
}

export async function updateCourse(id: string, input: CourseInput) {
  const existing = await prisma.course.findUnique({ where: { id }, select: { slug: true, instructorId: true } });
  if (!existing) throw ApiError.notFound('Course not found');
  const slugValue = input.slug && input.slug !== existing.slug
    ? await uniqueSlug(input.slug, async (s) => !!(await prisma.course.findFirst({ where: { slug: s, NOT: { id } }, select: { id: true } })))
    : existing.slug;
  const price = input.price ?? 0;
  await prisma.course.update({
    where: { id },
    data: {
      title: input.title,
      slug: slugValue,
      subtitle: input.subtitle ?? null,
      description: input.description,
      coverImageUrl: input.coverImageUrl ?? null,
      level: input.level ?? 'ALL_LEVELS',
      price,
      isFree: price === 0,
      durationHours: input.durationHours ?? 0,
      categoryId: input.categoryId ?? null,
      instructorId: input.instructorId ?? existing.instructorId,
      isFeatured: input.isFeatured ?? false,
    },
  });
  invalidateHomeCache();
  return getCourse(id);
}

export async function createModule(courseId: string, input: { title: string; description?: string | null; order?: number }) {
  await assertExists(prisma.course.findUnique({ where: { id: courseId }, select: { id: true } }), 'Course');
  const count = await prisma.courseModule.count({ where: { courseId } });
  return prisma.courseModule.create({ data: { courseId, title: input.title, description: input.description ?? null, order: input.order ?? count } });
}
export async function updateModule(id: string, input: { title: string; description?: string | null; order?: number }) {
  await assertExists(prisma.courseModule.findUnique({ where: { id }, select: { id: true } }), 'Module');
  return prisma.courseModule.update({ where: { id }, data: { title: input.title, description: input.description ?? null, ...(input.order !== undefined ? { order: input.order } : {}) } });
}
export async function deleteModule(id: string) {
  await assertExists(prisma.courseModule.findUnique({ where: { id }, select: { id: true } }), 'Module');
  await prisma.courseModule.delete({ where: { id } });
}

export async function getCourseLesson(id: string) {
  const l = await prisma.courseLesson.findUnique({ where: { id }, include: { module: { select: { id: true, title: true, course: { select: { id: true, title: true, slug: true } } } } } });
  if (!l) throw ApiError.notFound('Lesson not found');
  return l;
}
export async function createCourseLesson(moduleId: string, input: CourseLessonInput) {
  await assertExists(prisma.courseModule.findUnique({ where: { id: moduleId }, select: { id: true } }), 'Module');
  const slugValue = await uniqueSlug(input.slug ?? input.title, async (s) => !!(await prisma.courseLesson.findUnique({ where: { moduleId_slug: { moduleId, slug: s } }, select: { id: true } })));
  const count = await prisma.courseLesson.count({ where: { moduleId } });
  const l = await prisma.courseLesson.create({
    data: { moduleId, title: input.title, slug: slugValue, content: input.content, videoUrl: input.videoUrl ?? null, durationMin: input.durationMin ?? 10, order: input.order ?? count, isPreview: input.isPreview ?? false },
  });
  return getCourseLesson(l.id);
}
export async function updateCourseLesson(id: string, input: CourseLessonInput) {
  const existing = await prisma.courseLesson.findUnique({ where: { id }, select: { moduleId: true, slug: true } });
  if (!existing) throw ApiError.notFound('Lesson not found');
  const slugValue = input.slug && input.slug !== existing.slug
    ? await uniqueSlug(input.slug, async (s) => !!(await prisma.courseLesson.findFirst({ where: { moduleId: existing.moduleId, slug: s, NOT: { id } }, select: { id: true } })))
    : existing.slug;
  await prisma.courseLesson.update({
    where: { id },
    data: { title: input.title, slug: slugValue, content: input.content, videoUrl: input.videoUrl ?? null, durationMin: input.durationMin ?? 10, ...(input.order !== undefined ? { order: input.order } : {}), isPreview: input.isPreview ?? false },
  });
  return getCourseLesson(id);
}
export async function deleteCourseLesson(id: string) {
  await assertExists(prisma.courseLesson.findUnique({ where: { id }, select: { id: true } }), 'Lesson');
  await prisma.courseLesson.delete({ where: { id } });
}

async function assertExists<T>(promise: Promise<T | null>, name: string): Promise<T> {
  const v = await promise;
  if (!v) throw ApiError.notFound(`${name} not found`);
  return v;
}
