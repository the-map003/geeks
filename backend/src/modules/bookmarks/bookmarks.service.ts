import type { BookmarkType, Prisma } from '@prisma/client';
import { prisma } from '../../utils/prisma.js';
import { ApiError } from '../../utils/errors.js';
import { paginate } from '../../utils/response.js';
import { toSkipTake, type PaginationQuery } from '../../utils/pagination.js';
import {
  articleSummaryInclude,
  courseSummaryInclude,
  problemSummaryInclude,
  toArticleSummary,
  toCourseSummary,
  toProblemSummary,
  toTutorialSummary,
  tutorialSummaryInclude,
} from '../../utils/content-serializers.js';

const columnFor: Record<BookmarkType, 'articleId' | 'problemId' | 'tutorialId' | 'courseId'> = {
  ARTICLE: 'articleId',
  PROBLEM: 'problemId',
  TUTORIAL: 'tutorialId',
  COURSE: 'courseId',
};

async function assertTargetExists(type: BookmarkType, targetId: string) {
  const published = { id: targetId, status: 'PUBLISHED' as const };
  const exists =
    type === 'ARTICLE'
      ? await prisma.article.findFirst({ where: published, select: { id: true } })
      : type === 'PROBLEM'
        ? await prisma.problem.findFirst({ where: published, select: { id: true } })
        : type === 'TUTORIAL'
          ? await prisma.tutorial.findFirst({ where: published, select: { id: true } })
          : await prisma.course.findFirst({ where: published, select: { id: true } });
  if (!exists) throw ApiError.notFound('Content not found');
}

export async function addBookmark(userId: string, type: BookmarkType, targetId: string) {
  await assertTargetExists(type, targetId);
  const column = columnFor[type];
  const existing = await prisma.bookmark.findFirst({ where: { userId, [column]: targetId } });
  if (existing) return { bookmark: existing, created: false };
  const bookmark = await prisma.bookmark.create({ data: { userId, type, [column]: targetId } });
  return { bookmark, created: true };
}

export async function removeBookmark(userId: string, type: BookmarkType, targetId: string) {
  const column = columnFor[type];
  const result = await prisma.bookmark.deleteMany({ where: { userId, [column]: targetId } });
  return result.count > 0;
}

export async function removeBookmarkById(userId: string, id: string) {
  const result = await prisma.bookmark.deleteMany({ where: { id, userId } });
  if (result.count === 0) throw ApiError.notFound('Bookmark not found');
}

export async function status(userId: string, type: BookmarkType, targetId: string) {
  const column = columnFor[type];
  const existing = await prisma.bookmark.findFirst({ where: { userId, [column]: targetId }, select: { id: true } });
  return { bookmarked: !!existing, id: existing?.id ?? null };
}

export async function listBookmarks(userId: string, query: PaginationQuery & { type?: BookmarkType }) {
  const where: Prisma.BookmarkWhereInput = { userId, ...(query.type ? { type: query.type } : {}) };
  const [rows, total, counts] = await Promise.all([
    prisma.bookmark.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...toSkipTake(query),
      include: {
        article: { include: articleSummaryInclude },
        problem: { include: problemSummaryInclude },
        tutorial: { include: tutorialSummaryInclude },
        course: { include: courseSummaryInclude },
      },
    }),
    prisma.bookmark.count({ where }),
    prisma.bookmark.groupBy({ by: ['type'], where: { userId }, _count: { _all: true } }),
  ]);

  const items = rows
    .map((b) => {
      const base = { id: b.id, type: b.type, createdAt: b.createdAt };
      if (b.type === 'ARTICLE' && b.article) return { ...base, target: { type: 'ARTICLE' as const, item: toArticleSummary(b.article) } };
      if (b.type === 'PROBLEM' && b.problem) return { ...base, target: { type: 'PROBLEM' as const, item: toProblemSummary(b.problem) } };
      if (b.type === 'TUTORIAL' && b.tutorial) return { ...base, target: { type: 'TUTORIAL' as const, item: toTutorialSummary(b.tutorial) } };
      if (b.type === 'COURSE' && b.course) return { ...base, target: { type: 'COURSE' as const, item: toCourseSummary(b.course) } };
      return null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const countsByType: Record<string, number> = { ARTICLE: 0, PROBLEM: 0, TUTORIAL: 0, COURSE: 0 };
  for (const c of counts) countsByType[c.type] = c._count._all;

  return { ...paginate(items, total, query.page, query.pageSize), counts: countsByType };
}
