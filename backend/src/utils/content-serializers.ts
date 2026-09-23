import type { Prisma } from '@prisma/client';
import { authorSelect, toAuthorSummary } from './serializers.js';

export const categoryRefSelect = { id: true, name: true, slug: true } as const;

// ---------------------------------------------------------------------------
// Articles
// ---------------------------------------------------------------------------

export const articleSummaryInclude = {
  author: { select: authorSelect },
  category: { select: categoryRefSelect },
  tags: { include: { tag: true } },
} satisfies Prisma.ArticleInclude;

type ArticleRow = Prisma.ArticleGetPayload<{ include: typeof articleSummaryInclude }>;

export function toArticleSummary(a: ArticleRow) {
  return {
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
  };
}

// ---------------------------------------------------------------------------
// Tutorials
// ---------------------------------------------------------------------------

export const tutorialSummaryInclude = {
  author: { select: authorSelect },
  category: { select: categoryRefSelect },
  _count: { select: { lessons: true } },
} satisfies Prisma.TutorialInclude;

type TutorialRow = Prisma.TutorialGetPayload<{ include: typeof tutorialSummaryInclude }>;

export function toTutorialSummary(t: TutorialRow) {
  return {
    id: t.id,
    title: t.title,
    slug: t.slug,
    description: t.description,
    coverImageUrl: t.coverImageUrl,
    lessonCount: t._count.lessons,
    category: t.category,
    author: toAuthorSummary(t.author),
  };
}

// ---------------------------------------------------------------------------
// Courses
// ---------------------------------------------------------------------------

export const courseSummaryInclude = {
  instructor: { select: authorSelect },
  category: { select: categoryRefSelect },
  modules: { select: { _count: { select: { lessons: true } } } },
} satisfies Prisma.CourseInclude;

type CourseRow = Prisma.CourseGetPayload<{ include: typeof courseSummaryInclude }>;

export function toCourseSummary(c: CourseRow) {
  return {
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
  };
}

// ---------------------------------------------------------------------------
// Problems
// ---------------------------------------------------------------------------

export const problemSummaryInclude = {
  topics: { include: { topic: true } },
} satisfies Prisma.ProblemInclude;

type ProblemRow = Prisma.ProblemGetPayload<{ include: typeof problemSummaryInclude }>;

export function accuracy(accepted: number, total: number): number {
  return total ? Math.round((accepted / total) * 100) : 0;
}

export function toProblemSummary(p: ProblemRow, userState: 'ATTEMPTED' | 'SOLVED' | null = null) {
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    difficulty: p.difficulty,
    points: p.points,
    submissionCount: p.submissionCount,
    acceptedCount: p.acceptedCount,
    accuracy: accuracy(p.acceptedCount, p.submissionCount),
    companyTags: p.companyTags,
    topics: p.topics.map((t) => t.topic),
    userState,
  };
}

// ---------------------------------------------------------------------------
// Quizzes
// ---------------------------------------------------------------------------

export const quizSummaryInclude = {
  category: { select: categoryRefSelect },
  _count: { select: { questions: true } },
} satisfies Prisma.QuizInclude;

type QuizRow = Prisma.QuizGetPayload<{ include: typeof quizSummaryInclude }>;

export function toQuizSummary(q: QuizRow) {
  return {
    id: q.id,
    title: q.title,
    slug: q.slug,
    description: q.description,
    difficulty: q.difficulty,
    timeLimitMin: q.timeLimitMin,
    questionCount: q._count.questions,
    attemptCount: q.attemptCount,
    category: q.category,
  };
}
