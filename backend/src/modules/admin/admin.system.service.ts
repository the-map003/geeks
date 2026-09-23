import { Prisma, type Role } from '@prisma/client';
import type { z } from 'zod';
import { prisma } from '../../utils/prisma.js';
import { ApiError } from '../../utils/errors.js';
import { paginate } from '../../utils/response.js';
import { toSkipTake } from '../../utils/pagination.js';
import { hasRole, ROLE_RANK, type AuthUser } from '../../types/auth.js';
import { authorSelect, toAuthorSummary } from '../../utils/serializers.js';
import type { auditListQuerySchema, commentActionSchema, commentsListQuerySchema, reportActionSchema, reportsListQuerySchema, settingsPutSchema, usersListQuerySchema } from './admin.schemas.js';

// ---------------------------------------------------------------------------
// Stats & analytics
// ---------------------------------------------------------------------------

export async function getStats(viewer: AuthUser) {
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [articles, tutorials, courses, problems, quizzes, comments, submissionsToday, recentAudit] = await Promise.all([
    prisma.article.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.tutorial.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.course.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.problem.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.quiz.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.comment.count({ where: { isDeleted: false } }),
    prisma.submission.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 10, include: { actor: { select: authorSelect } } }),
  ]);

  const byStatus = (rows: Array<{ status: string; _count: { _all: number } }>) => {
    const out: Record<string, number> = { DRAFT: 0, PUBLISHED: 0, ARCHIVED: 0, total: 0 };
    for (const r of rows) {
      out[r.status] = r._count._all;
      out.total = (out.total ?? 0) + r._count._all;
    }
    return out;
  };

  const base = {
    content: { articles: byStatus(articles), tutorials: byStatus(tutorials), courses: byStatus(courses), problems: byStatus(problems), quizzes: byStatus(quizzes) },
    comments,
    submissionsToday,
    recentAudit: recentAudit.map((a) => ({ ...a, actor: a.actor ? toAuthorSummary(a.actor) : null })),
  };

  if (!hasRole(viewer.role, 'ADMIN')) return base;

  const [users, newUsersWeek, openReports, hiddenComments, totalSubmissions, acceptedSubmissions] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.report.count({ where: { status: 'OPEN' } }),
    prisma.comment.count({ where: { isHidden: true, isDeleted: false } }),
    prisma.submission.count(),
    prisma.submission.count({ where: { status: 'ACCEPTED' } }),
  ]);
  return { ...base, users: { total: users, newThisWeek: newUsersWeek }, openReports, hiddenComments, submissions: { total: totalSubmissions, accepted: acceptedSubmissions } };
}

export async function getAnalytics(range: '7d' | '30d' | '90d') {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (days - 1));
  since.setUTCHours(0, 0, 0, 0);

  const daily = async (table: string, column: string, where = '') =>
    prisma.$queryRaw<Array<{ day: Date; count: bigint }>>(
      Prisma.sql`SELECT date_trunc('day', ${Prisma.raw(`"${column}"`)}) AS day, count(*)::bigint AS count FROM ${Prisma.raw(`"${table}"`)} WHERE ${Prisma.raw(`"${column}"`)} >= ${since} ${Prisma.raw(where)} GROUP BY 1 ORDER BY 1`,
    );

  const [signups, submissions, accepted, views, attempts, comments, topProblems, topArticles, languages] = await Promise.all([
    daily('User', 'createdAt'),
    daily('Submission', 'createdAt'),
    daily('Submission', 'createdAt', `AND "status" = 'ACCEPTED'`),
    daily('ArticleView', 'viewedAt'),
    daily('QuizAttempt', 'submittedAt', `AND "status" = 'SUBMITTED'`),
    daily('Comment', 'createdAt'),
    prisma.problem.findMany({ where: { status: 'PUBLISHED' }, orderBy: { submissionCount: 'desc' }, take: 5, select: { id: true, title: true, slug: true, submissionCount: true, acceptedCount: true, difficulty: true } }),
    prisma.article.findMany({ where: { status: 'PUBLISHED' }, orderBy: { viewCount: 'desc' }, take: 5, select: { id: true, title: true, slug: true, viewCount: true, likeCount: true } }),
    prisma.submission.groupBy({ by: ['language'], _count: { _all: true }, where: { createdAt: { gte: since } } }),
  ]);

  const toSeries = (rows: Array<{ day: Date; count: bigint }>) => {
    const map = new Map(rows.map((r) => [r.day.toISOString().slice(0, 10), Number(r.count)]));
    const out: Array<{ date: string; value: number }> = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setUTCDate(since.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      out.push({ date: key, value: map.get(key) ?? 0 });
    }
    return out;
  };

  return {
    range,
    series: { signups: toSeries(signups), submissions: toSeries(submissions), accepted: toSeries(accepted), views: toSeries(views), quizAttempts: toSeries(attempts), comments: toSeries(comments) },
    topProblems,
    topArticles,
    languages: languages.map((l) => ({ language: l.language, count: l._count._all })),
  };
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function listUsers(query: z.infer<typeof usersListQuerySchema>) {
  const where: Prisma.UserWhereInput = {};
  if (query.role) where.role = query.role;
  if (query.active) where.isActive = query.active === 'true';
  if (query.q) where.OR = [{ email: { contains: query.q, mode: 'insensitive' } }, { username: { contains: query.q, mode: 'insensitive' } }, { profile: { displayName: { contains: query.q, mode: 'insensitive' } } }];
  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...toSkipTake(query),
      select: { id: true, email: true, username: true, role: true, isActive: true, createdAt: true, lastLoginAt: true, profile: { select: { displayName: true, avatarUrl: true } }, _count: { select: { submissions: true, comments: true, articles: true } } },
    }),
    prisma.user.count({ where }),
  ]);
  return paginate(rows, total, query.page, query.pageSize);
}

export async function patchUser(actor: AuthUser, id: string, patch: { role?: Role; isActive?: boolean }) {
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true, isActive: true } });
  if (!target) throw ApiError.notFound('User not found');
  if (target.id === actor.id) throw ApiError.forbidden('You cannot change your own role or status');
  if (ROLE_RANK[target.role] >= ROLE_RANK[actor.role]) throw ApiError.forbidden('You cannot manage a user with an equal or higher role');
  if (patch.role !== undefined && ROLE_RANK[patch.role] >= ROLE_RANK[actor.role] && actor.role !== 'SUPER_ADMIN') {
    throw ApiError.forbidden('You cannot grant a role equal to or higher than your own');
  }
  const updated = await prisma.user.update({
    where: { id },
    data: { ...(patch.role !== undefined ? { role: patch.role } : {}), ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}) },
    select: { id: true, email: true, username: true, role: true, isActive: true },
  });
  if (patch.isActive === false) await prisma.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
  return updated;
}

// ---------------------------------------------------------------------------
// Comments moderation
// ---------------------------------------------------------------------------

export async function listComments(query: z.infer<typeof commentsListQuerySchema>) {
  const where: Prisma.CommentWhereInput = {};
  if (query.state === 'hidden') where.isHidden = true;
  if (query.state === 'deleted') where.isDeleted = true;
  if (query.state === 'reported') where.reports = { some: { status: 'OPEN' } };
  if (query.q) where.content = { contains: query.q, mode: 'insensitive' };
  const [rows, total] = await Promise.all([
    prisma.comment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...toSkipTake(query),
      include: {
        author: { select: authorSelect },
        article: { select: { title: true, slug: true } },
        problem: { select: { title: true, slug: true } },
        tutorialLesson: { select: { title: true, slug: true, tutorial: { select: { slug: true } } } },
        course: { select: { title: true, slug: true } },
        quiz: { select: { title: true, slug: true } },
        _count: { select: { reports: { where: { status: 'OPEN' } } } },
      },
    }),
    prisma.comment.count({ where }),
  ]);
  const items = rows.map((c) => ({
    id: c.id,
    content: c.content,
    targetType: c.targetType,
    isHidden: c.isHidden,
    isDeleted: c.isDeleted,
    hiddenReason: c.hiddenReason,
    likeCount: c.likeCount,
    openReports: c._count.reports,
    createdAt: c.createdAt,
    author: toAuthorSummary(c.author),
    target: c.article
      ? { title: c.article.title, url: `/articles/${c.article.slug}` }
      : c.problem
        ? { title: c.problem.title, url: `/problems/${c.problem.slug}` }
        : c.tutorialLesson
          ? { title: c.tutorialLesson.title, url: `/tutorials/${c.tutorialLesson.tutorial.slug}/${c.tutorialLesson.slug}` }
          : c.course
            ? { title: c.course.title, url: `/courses/${c.course.slug}` }
            : c.quiz
              ? { title: c.quiz.title, url: `/quizzes/${c.quiz.slug}` }
              : null,
  }));
  return paginate(items, total, query.page, query.pageSize);
}

export async function moderateComment(id: string, input: z.infer<typeof commentActionSchema>) {
  const comment = await prisma.comment.findUnique({ where: { id } });
  if (!comment) throw ApiError.notFound('Comment not found');
  if (input.action === 'hide') return prisma.comment.update({ where: { id }, data: { isHidden: true, hiddenReason: input.reason ?? 'Hidden by moderator' } });
  if (input.action === 'restore') return prisma.comment.update({ where: { id }, data: { isHidden: false, hiddenReason: null } });
  return prisma.$transaction(async (tx) => {
    const updated = await tx.comment.update({ where: { id }, data: { isDeleted: true, content: '' } });
    if (comment.articleId && !comment.isDeleted) await tx.article.update({ where: { id: comment.articleId }, data: { commentCount: { decrement: 1 } } });
    await tx.report.updateMany({ where: { commentId: id, status: 'OPEN' }, data: { status: 'RESOLVED', resolvedAt: new Date(), resolutionNote: 'Comment deleted' } });
    return updated;
  });
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export async function listReports(query: z.infer<typeof reportsListQuerySchema>) {
  const where: Prisma.ReportWhereInput = query.status ? { status: query.status } : {};
  const [rows, total, open] = await Promise.all([
    prisma.report.findMany({
      where,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      ...toSkipTake(query),
      include: {
        reporter: { select: authorSelect },
        resolvedBy: { select: authorSelect },
        comment: { select: { id: true, content: true, isHidden: true, isDeleted: true, author: { select: authorSelect } } },
        article: { select: { id: true, title: true, slug: true } },
        problem: { select: { id: true, title: true, slug: true } },
        reportedUser: { select: authorSelect },
      },
    }),
    prisma.report.count({ where }),
    prisma.report.count({ where: { status: 'OPEN' } }),
  ]);
  const items = rows.map((r) => ({
    ...r,
    reporter: toAuthorSummary(r.reporter),
    resolvedBy: r.resolvedBy ? toAuthorSummary(r.resolvedBy) : null,
    reportedUser: r.reportedUser ? toAuthorSummary(r.reportedUser) : null,
    comment: r.comment ? { ...r.comment, author: toAuthorSummary(r.comment.author) } : null,
  }));
  return { ...paginate(items, total, query.page, query.pageSize), openCount: open };
}

export async function resolveReport(actor: AuthUser, id: string, input: z.infer<typeof reportActionSchema>) {
  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) throw ApiError.notFound('Report not found');
  if (report.status !== 'OPEN') throw ApiError.conflict('This report has already been handled');
  const updated = await prisma.report.update({
    where: { id },
    data: { status: input.action === 'resolve' ? 'RESOLVED' : 'DISMISSED', resolvedById: actor.id, resolvedAt: new Date(), resolutionNote: input.note ?? null },
  });
  if (input.action === 'resolve' && input.hideComment && report.commentId) {
    await prisma.comment.update({ where: { id: report.commentId }, data: { isHidden: true, hiddenReason: `Report: ${report.reason}` } });
  }
  return updated;
}

// ---------------------------------------------------------------------------
// Audit log & settings
// ---------------------------------------------------------------------------

export async function listAuditLogs(query: z.infer<typeof auditListQuerySchema>) {
  const where: Prisma.AuditLogWhereInput = {};
  if (query.action) where.action = { contains: query.action, mode: 'insensitive' };
  if (query.entityType) where.entityType = query.entityType;
  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, ...toSkipTake(query), include: { actor: { select: authorSelect } } }),
    prisma.auditLog.count({ where }),
  ]);
  return paginate(rows.map((r) => ({ ...r, actor: r.actor ? toAuthorSummary(r.actor) : null })), total, query.page, query.pageSize);
}

export async function getSettings() {
  return prisma.siteSetting.findMany({ orderBy: { key: 'asc' }, include: { updatedBy: { select: authorSelect } } });
}

export async function putSettings(actor: AuthUser, input: z.infer<typeof settingsPutSchema>) {
  const ops = input.settings.map((s) =>
    prisma.siteSetting.upsert({
      where: { key: s.key },
      update: { value: s.value as Prisma.InputJsonValue, description: s.description, updatedById: actor.id },
      create: { key: s.key, value: s.value as Prisma.InputJsonValue, description: s.description, updatedById: actor.id },
    }),
  );
  await prisma.$transaction(ops);
  return getSettings();
}

export async function listCategoriesFlat() {
  return prisma.category.findMany({ orderBy: [{ order: 'asc' }, { name: 'asc' }], select: { id: true, name: true, slug: true, parentId: true } });
}

export async function listStaff() {
  return prisma.user.findMany({ where: { role: { in: ['EDITOR', 'ADMIN', 'SUPER_ADMIN'] }, isActive: true }, select: authorSelect, orderBy: { username: 'asc' } }).then((rows) => rows.map(toAuthorSummary));
}
