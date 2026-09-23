import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../utils/prisma.js';
import { paginationQuerySchema } from '../../utils/pagination.js';
import { categoryIdsForSlug } from '../../utils/categories.js';

export const searchQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().min(2, 'Search query must be at least 2 characters').max(100),
  type: z.enum(['all', 'articles', 'tutorials', 'courses', 'problems', 'quizzes']).default('all'),
  category: z.string().trim().max(80).optional(),
  difficulty: z.enum(['SCHOOL', 'BASIC', 'EASY', 'MEDIUM', 'HARD']).optional(),
});
export type SearchQuery = z.infer<typeof searchQuerySchema>;

type SearchType = Exclude<SearchQuery['type'], 'all'>;

interface RawRow {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  rank: number;
  meta: Record<string, string | number | null>;
}

interface TableConfig {
  table: string;
  /** SQL expression for the excerpt column. */
  excerpt: string;
  /** JSON object expression for type-specific metadata. */
  meta: string;
  hasDifficulty: boolean;
  hasCategory: boolean;
  /** Extra join / where clauses. */
  publishedWhere: string;
  url: (row: { slug: string; meta: Record<string, string | number | null> }) => string;
}

const tables: Record<SearchType, TableConfig> = {
  articles: {
    table: 'Article',
    excerpt: 't."excerpt"',
    meta: `json_build_object('difficulty', t."difficulty", 'readingTimeMin', t."readingTimeMin", 'viewCount', t."viewCount", 'publishedAt', t."publishedAt")`,
    hasDifficulty: true,
    hasCategory: true,
    publishedWhere: `t."status" = 'PUBLISHED'`,
    url: (r) => `/articles/${r.slug}`,
  },
  tutorials: {
    table: 'Tutorial',
    excerpt: 't."description"',
    meta: `json_build_object('lessonCount', (SELECT count(*) FROM "TutorialLesson" l WHERE l."tutorialId" = t."id"))`,
    hasDifficulty: false,
    hasCategory: true,
    publishedWhere: `t."status" = 'PUBLISHED'`,
    url: (r) => `/tutorials/${r.slug}`,
  },
  courses: {
    table: 'Course',
    excerpt: 'coalesce(t."subtitle", left(t."description", 200))',
    meta: `json_build_object('level', t."level", 'isFree', t."isFree", 'price', t."price"::text, 'ratingAvg', t."ratingAvg"::text, 'enrollmentCount', t."enrollmentCount")`,
    hasDifficulty: false,
    hasCategory: true,
    publishedWhere: `t."status" = 'PUBLISHED'`,
    url: (r) => `/courses/${r.slug}`,
  },
  problems: {
    table: 'Problem',
    excerpt: 'left(t."description", 200)',
    meta: `json_build_object('difficulty', t."difficulty", 'points', t."points", 'submissionCount', t."submissionCount", 'acceptedCount', t."acceptedCount")`,
    hasDifficulty: true,
    hasCategory: true,
    publishedWhere: `t."status" = 'PUBLISHED'`,
    url: (r) => `/problems/${r.slug}`,
  },
  quizzes: {
    table: 'Quiz',
    excerpt: 't."description"',
    meta: `json_build_object('difficulty', t."difficulty", 'questionCount', (SELECT count(*) FROM "Question" q WHERE q."quizId" = t."id"), 'timeLimitMin', t."timeLimitMin")`,
    hasDifficulty: true,
    hasCategory: true,
    publishedWhere: `t."status" = 'PUBLISHED'`,
    url: (r) => `/quizzes/${r.slug}`,
  },
};

function buildWhere(cfg: TableConfig, q: SearchQuery, categoryIds: string[] | null, fuzzy: boolean): Prisma.Sql {
  const parts: Prisma.Sql[] = [Prisma.raw(cfg.publishedWhere)];
  parts.push(fuzzy ? Prisma.sql`t."title" ILIKE ${'%' + q.q + '%'}` : Prisma.sql`t."searchVector" @@ websearch_to_tsquery('english', ${q.q})`);
  if (cfg.hasDifficulty && q.difficulty) parts.push(Prisma.sql`t."difficulty"::text = ${q.difficulty}`);
  if (cfg.hasCategory && categoryIds) {
    if (categoryIds.length === 0) parts.push(Prisma.sql`false`);
    else parts.push(Prisma.sql`t."categoryId" IN (${Prisma.join(categoryIds)})`);
  }
  return Prisma.join(parts, ' AND ');
}

async function searchTable(type: SearchType, q: SearchQuery, categoryIds: string[] | null, limit: number, offset: number, fuzzy: boolean): Promise<RawRow[]> {
  const cfg = tables[type];
  const rank = fuzzy
    ? Prisma.sql`CASE WHEN t."title" ILIKE ${q.q + '%'} THEN 0.5 ELSE 0.25 END`
    : Prisma.sql`ts_rank_cd(t."searchVector", websearch_to_tsquery('english', ${q.q}))`;
  const rows = await prisma.$queryRaw<RawRow[]>(Prisma.sql`
    SELECT t."id", t."title", t."slug", ${Prisma.raw(cfg.excerpt)} AS "excerpt", ${rank}::float AS "rank", ${Prisma.raw(cfg.meta)} AS "meta"
    FROM ${Prisma.raw(`"${cfg.table}"`)} t
    WHERE ${buildWhere(cfg, q, categoryIds, fuzzy)}
    ORDER BY "rank" DESC, t."title" ASC
    LIMIT ${limit} OFFSET ${offset}
  `);
  return rows;
}

async function countTable(type: SearchType, q: SearchQuery, categoryIds: string[] | null, fuzzy: boolean): Promise<number> {
  const cfg = tables[type];
  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
    SELECT count(*)::bigint AS count FROM ${Prisma.raw(`"${cfg.table}"`)} t WHERE ${buildWhere(cfg, q, categoryIds, fuzzy)}
  `);
  return Number(rows[0]?.count ?? 0);
}

const typeSingular: Record<SearchType, 'article' | 'tutorial' | 'course' | 'problem' | 'quiz'> = {
  articles: 'article',
  tutorials: 'tutorial',
  courses: 'course',
  problems: 'problem',
  quizzes: 'quiz',
};

export async function search(q: SearchQuery) {
  const categoryIds = await categoryIdsForSlug(q.category);
  const types = Object.keys(tables) as SearchType[];

  // Full-text first; fall back to ILIKE when the query produces no matches anywhere.
  let fuzzy = false;
  let counts = Object.fromEntries(await Promise.all(types.map(async (t) => [t, await countTable(t, q, categoryIds, false)] as const))) as Record<SearchType, number>;
  if (Object.values(counts).every((c) => c === 0)) {
    fuzzy = true;
    counts = Object.fromEntries(await Promise.all(types.map(async (t) => [t, await countTable(t, q, categoryIds, true)] as const))) as Record<SearchType, number>;
  }

  const offset = (q.page - 1) * q.pageSize;
  let items: Array<RawRow & { type: SearchType }>;
  let total: number;

  if (q.type === 'all') {
    // Merge the top results of each type by rank, then paginate the merged list.
    const perType = Math.min(100, offset + q.pageSize);
    const lists = await Promise.all(types.map(async (t) => (await searchTable(t, q, categoryIds, perType, 0, fuzzy)).map((r) => ({ ...r, type: t }))));
    const merged = lists.flat().sort((a, b) => b.rank - a.rank || a.title.localeCompare(b.title));
    total = Object.values(counts).reduce((s, c) => s + c, 0);
    items = merged.slice(offset, offset + q.pageSize);
  } else {
    const rows = await searchTable(q.type, q, categoryIds, q.pageSize, offset, fuzzy);
    items = rows.map((r) => ({ ...r, type: q.type as SearchType }));
    total = counts[q.type];
  }

  return {
    items: items.map((r) => ({
      type: typeSingular[r.type],
      id: r.id,
      title: r.title,
      slug: r.slug,
      url: tables[r.type].url(r),
      excerpt: (r.excerpt ?? '').replace(/[#*_`>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 220),
      meta: r.meta,
      rank: r.rank,
    })),
    page: q.page,
    pageSize: q.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
    counts: { all: Object.values(counts).reduce((s, c) => s + c, 0), ...counts },
    fuzzy,
    query: q.q,
  };
}
