import { createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../utils/prisma.js';
import { ApiError } from '../../utils/errors.js';
import { paginate } from '../../utils/response.js';
import { toSkipTake } from '../../utils/pagination.js';
import { articleSummaryInclude, toArticleSummary } from '../../utils/content-serializers.js';
import { categoryIdsForSlug } from '../../utils/categories.js';
import { hasRole } from '../../types/auth.js';
import type { AuthUser } from '../../types/auth.js';
import { recordActivity } from '../../utils/activity.js';
import type { ListArticlesQuery } from './articles.schemas.js';

export async function listArticles(query: ListArticlesQuery) {
  const where: Prisma.ArticleWhereInput = { status: 'PUBLISHED' };

  const categoryIds = await categoryIdsForSlug(query.category);
  if (categoryIds) where.categoryId = { in: categoryIds };
  if (query.tag) where.tags = { some: { tag: { slug: query.tag } } };
  if (query.difficulty) where.difficulty = query.difficulty;
  if (query.author) where.author = { username: query.author.toLowerCase() };
  if (query.featured === 'true') where.isFeatured = true;
  if (query.q) {
    where.OR = [
      { title: { contains: query.q, mode: 'insensitive' } },
      { excerpt: { contains: query.q, mode: 'insensitive' } },
    ];
  }

  let orderBy: Prisma.ArticleOrderByWithRelationInput[] = [{ publishedAt: 'desc' }];
  if (query.sort === 'popular') orderBy = [{ viewCount: 'desc' }, { publishedAt: 'desc' }];
  if (query.sort === 'oldest') orderBy = [{ publishedAt: 'asc' }];

  if (query.sort === 'trending') {
    return listTrending(where, query);
  }

  const [items, total] = await Promise.all([
    prisma.article.findMany({ where, orderBy, ...toSkipTake(query), include: articleSummaryInclude }),
    prisma.article.count({ where }),
  ]);
  return paginate(items.map(toArticleSummary), total, query.page, query.pageSize);
}

/** Trending = most views in the last 7 days. */
async function listTrending(where: Prisma.ArticleWhereInput, query: ListArticlesQuery) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const grouped = await prisma.articleView.groupBy({
    by: ['articleId'],
    where: { viewedAt: { gte: since }, article: where },
    _count: { _all: true },
    orderBy: { _count: { articleId: 'desc' } },
    take: 200,
  });
  const orderedIds = grouped.map((g) => g.articleId);
  const total = orderedIds.length;
  const { skip, take } = toSkipTake(query);
  const pageIds = orderedIds.slice(skip, skip + take);
  const rows = await prisma.article.findMany({ where: { id: { in: pageIds } }, include: articleSummaryInclude });
  const byId = new Map(rows.map((r) => [r.id, r]));
  const items = pageIds.map((id) => byId.get(id)).filter((r): r is NonNullable<typeof r> => !!r).map(toArticleSummary);
  return paginate(items, total, query.page, query.pageSize);
}

export async function getArticle(slug: string, viewer: AuthUser | undefined, ip: string | undefined) {
  const article = await prisma.article.findUnique({ where: { slug }, include: articleSummaryInclude });
  if (!article) throw ApiError.notFound('Article not found');

  const canSeeUnpublished = viewer && (hasRole(viewer.role, 'EDITOR') || viewer.id === article.authorId);
  if (article.status !== 'PUBLISHED' && !canSeeUnpublished) throw ApiError.notFound('Article not found');

  const [liked, bookmarked] = viewer
    ? await Promise.all([
        prisma.articleLike.findUnique({ where: { userId_articleId: { userId: viewer.id, articleId: article.id } } }),
        prisma.bookmark.findUnique({ where: { userId_articleId: { userId: viewer.id, articleId: article.id } } }),
      ])
    : [null, null];

  if (article.status === 'PUBLISHED') void recordView(article.id, viewer?.id, ip);

  return {
    ...toArticleSummary(article),
    content: article.content,
    status: article.status,
    liked: !!liked,
    bookmarked: !!bookmarked,
  };
}

/** Counts at most one view per viewer (user or hashed IP) per article per hour. */
async function recordView(articleId: string, userId: string | undefined, ip: string | undefined) {
  try {
    const ipHash = ip ? createHash('sha256').update(ip).digest('hex').slice(0, 32) : null;
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await prisma.articleView.findFirst({
      where: {
        articleId,
        viewedAt: { gte: since },
        ...(userId ? { userId } : { ipHash }),
      },
      select: { id: true },
    });
    if (recent) return;
    await prisma.$transaction([
      prisma.articleView.create({ data: { articleId, userId: userId ?? null, ipHash } }),
      prisma.article.update({ where: { id: articleId }, data: { viewCount: { increment: 1 } } }),
    ]);
    if (userId) await recordActivity(userId, 'articlesRead');
  } catch {
    // View tracking must never fail the request.
  }
}

export async function getRelated(slug: string, limit = 6) {
  const article = await prisma.article.findUnique({ where: { slug }, select: { id: true, categoryId: true, tags: { select: { tagId: true } } } });
  if (!article) throw ApiError.notFound('Article not found');
  const tagIds = article.tags.map((t) => t.tagId);

  const rows = await prisma.article.findMany({
    where: {
      status: 'PUBLISHED',
      id: { not: article.id },
      OR: [
        ...(article.categoryId ? [{ categoryId: article.categoryId }] : []),
        ...(tagIds.length ? [{ tags: { some: { tagId: { in: tagIds } } } }] : []),
      ],
    },
    orderBy: [{ viewCount: 'desc' }],
    take: limit,
    include: articleSummaryInclude,
  });

  if (rows.length < limit) {
    const fill = await prisma.article.findMany({
      where: { status: 'PUBLISHED', id: { notIn: [article.id, ...rows.map((r) => r.id)] } },
      orderBy: { publishedAt: 'desc' },
      take: limit - rows.length,
      include: articleSummaryInclude,
    });
    rows.push(...fill);
  }
  return rows.map(toArticleSummary);
}

export async function toggleLike(userId: string, slug: string) {
  const article = await prisma.article.findUnique({ where: { slug }, select: { id: true, status: true } });
  if (!article || article.status !== 'PUBLISHED') throw ApiError.notFound('Article not found');

  const existing = await prisma.articleLike.findUnique({ where: { userId_articleId: { userId, articleId: article.id } } });
  if (existing) {
    const [, updated] = await prisma.$transaction([
      prisma.articleLike.delete({ where: { id: existing.id } }),
      prisma.article.update({ where: { id: article.id }, data: { likeCount: { decrement: 1 } }, select: { likeCount: true } }),
    ]);
    return { liked: false, likeCount: Math.max(0, updated.likeCount) };
  }
  const [, updated] = await prisma.$transaction([
    prisma.articleLike.create({ data: { userId, articleId: article.id } }),
    prisma.article.update({ where: { id: article.id }, data: { likeCount: { increment: 1 } }, select: { likeCount: true } }),
  ]);
  return { liked: true, likeCount: updated.likeCount };
}
