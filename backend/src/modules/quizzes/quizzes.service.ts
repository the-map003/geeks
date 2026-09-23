import type { Prisma } from '@prisma/client';
import { prisma } from '../../utils/prisma.js';
import { ApiError } from '../../utils/errors.js';
import { paginate } from '../../utils/response.js';
import { toSkipTake } from '../../utils/pagination.js';
import { quizSummaryInclude, toQuizSummary } from '../../utils/content-serializers.js';
import { authorSelect, toAuthorSummary } from '../../utils/serializers.js';
import { categoryIdsForSlug } from '../../utils/categories.js';
import { recordActivity } from '../../utils/activity.js';
import type { AuthUser } from '../../types/auth.js';
import { hasRole } from '../../types/auth.js';
import type { AnswerInput, ListQuizzesQuery } from './quizzes.schemas.js';

export async function listQuizzes(query: ListQuizzesQuery) {
  const where: Prisma.QuizWhereInput = { status: 'PUBLISHED' };
  const categoryIds = await categoryIdsForSlug(query.category);
  if (categoryIds) where.categoryId = { in: categoryIds };
  if (query.difficulty) where.difficulty = query.difficulty;
  if (query.q) where.title = { contains: query.q, mode: 'insensitive' };
  const orderBy: Prisma.QuizOrderByWithRelationInput[] =
    query.sort === 'newest' ? [{ publishedAt: 'desc' }] : query.sort === 'title' ? [{ title: 'asc' }] : [{ attemptCount: 'desc' }, { title: 'asc' }];

  const [rows, total] = await Promise.all([
    prisma.quiz.findMany({ where, orderBy, ...toSkipTake(query), include: quizSummaryInclude }),
    prisma.quiz.count({ where }),
  ]);
  return paginate(rows.map(toQuizSummary), total, query.page, query.pageSize);
}

const attemptSummarySelect = {
  id: true,
  status: true,
  startedAt: true,
  submittedAt: true,
  expiresAt: true,
  score: true,
  maxScore: true,
  correctCount: true,
  totalCount: true,
} as const;

export async function getQuiz(slug: string, viewer?: AuthUser) {
  const quiz = await prisma.quiz.findUnique({ where: { slug }, include: { ...quizSummaryInclude, author: { select: authorSelect } } });
  if (!quiz) throw ApiError.notFound('Quiz not found');
  if (quiz.status !== 'PUBLISHED' && !(viewer && (hasRole(viewer.role, 'EDITOR') || viewer.id === quiz.authorId))) throw ApiError.notFound('Quiz not found');

  let attempts: Array<Record<string, unknown>> = [];
  let bestScore: number | null = null;
  let activeAttemptId: string | null = null;
  if (viewer) {
    const rows = await prisma.quizAttempt.findMany({ where: { userId: viewer.id, quizId: quiz.id }, orderBy: { startedAt: 'desc' }, take: 10, select: attemptSummarySelect });
    attempts = rows;
    const submitted = rows.filter((a) => a.status === 'SUBMITTED');
    bestScore = submitted.length ? Math.max(...submitted.map((a) => a.score)) : null;
    activeAttemptId = rows.find((a) => a.status === 'IN_PROGRESS' && (!a.expiresAt || a.expiresAt > new Date()))?.id ?? null;
  }
  return { ...toQuizSummary(quiz), status: quiz.status, author: toAuthorSummary(quiz.author), bestScore, attempts, activeAttemptId, publishedAt: quiz.publishedAt };
}

export async function startAttempt(viewer: AuthUser, slug: string) {
  const quiz = await prisma.quiz.findUnique({ where: { slug }, select: { id: true, status: true, timeLimitMin: true, _count: { select: { questions: true } } } });
  if (!quiz || quiz.status !== 'PUBLISHED') throw ApiError.notFound('Quiz not found');
  if (quiz._count.questions === 0) throw ApiError.unprocessable('This quiz has no questions yet');

  const existing = await prisma.quizAttempt.findFirst({ where: { userId: viewer.id, quizId: quiz.id, status: 'IN_PROGRESS' }, orderBy: { startedAt: 'desc' } });
  if (existing) {
    if (!existing.expiresAt || existing.expiresAt > new Date()) return { attempt: existing, resumed: true };
    await expireAttempt(existing.id);
  }

  const questions = await prisma.question.findMany({ where: { quizId: quiz.id }, select: { points: true } });
  const attempt = await prisma.quizAttempt.create({
    data: {
      userId: viewer.id,
      quizId: quiz.id,
      totalCount: questions.length,
      maxScore: questions.reduce((s, q) => s + q.points, 0),
      expiresAt: quiz.timeLimitMin ? new Date(Date.now() + quiz.timeLimitMin * 60_000 + 15_000) : null,
    },
  });
  return { attempt, resumed: false };
}

async function loadOwnedAttempt(viewer: AuthUser, id: string) {
  const attempt = await prisma.quizAttempt.findUnique({ where: { id }, include: { quiz: { select: { id: true, title: true, slug: true, timeLimitMin: true } } } });
  if (!attempt) throw ApiError.notFound('Attempt not found');
  if (attempt.userId !== viewer.id && !hasRole(viewer.role, 'EDITOR')) throw ApiError.forbidden();
  return attempt;
}

/** Questions and options WITHOUT correctness flags, plus saved answers. */
export async function getAttempt(viewer: AuthUser, id: string) {
  const attempt = await loadOwnedAttempt(viewer, id);
  if (attempt.status === 'IN_PROGRESS' && attempt.expiresAt && attempt.expiresAt <= new Date()) {
    await expireAttempt(attempt.id);
    attempt.status = 'EXPIRED';
  }
  const [questions, answers] = await Promise.all([
    prisma.question.findMany({
      where: { quizId: attempt.quizId },
      orderBy: { order: 'asc' },
      select: { id: true, prompt: true, order: true, points: true, options: { orderBy: { order: 'asc' }, select: { id: true, text: true, order: true } } },
    }),
    prisma.quizAnswer.findMany({ where: { attemptId: attempt.id }, select: { questionId: true, selectedOptionId: true } }),
  ]);
  const answerMap: Record<string, string | null> = {};
  for (const a of answers) answerMap[a.questionId] = a.selectedOptionId;
  return {
    id: attempt.id,
    status: attempt.status,
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt,
    expiresAt: attempt.expiresAt,
    score: attempt.score,
    maxScore: attempt.maxScore,
    correctCount: attempt.correctCount,
    totalCount: attempt.totalCount,
    quiz: attempt.quiz,
    questions,
    answers: answerMap,
  };
}

export async function saveAnswer(viewer: AuthUser, id: string, input: AnswerInput) {
  const attempt = await loadOwnedAttempt(viewer, id);
  if (attempt.status !== 'IN_PROGRESS') throw ApiError.conflict('This attempt has already been submitted');
  if (attempt.expiresAt && attempt.expiresAt <= new Date()) {
    await expireAttempt(attempt.id);
    throw ApiError.conflict('Time is up for this attempt');
  }
  const question = await prisma.question.findFirst({ where: { id: input.questionId, quizId: attempt.quizId }, select: { id: true } });
  if (!question) throw ApiError.badRequest('Question does not belong to this quiz');
  if (input.optionId) {
    const option = await prisma.questionOption.findFirst({ where: { id: input.optionId, questionId: question.id }, select: { id: true } });
    if (!option) throw ApiError.badRequest('Option does not belong to this question');
  }
  // Correctness is computed only at submit time; never trusted from the client.
  await prisma.quizAnswer.upsert({
    where: { attemptId_questionId: { attemptId: attempt.id, questionId: question.id } },
    create: { attemptId: attempt.id, questionId: question.id, selectedOptionId: input.optionId },
    update: { selectedOptionId: input.optionId, isCorrect: false },
  });
  const answered = await prisma.quizAnswer.count({ where: { attemptId: attempt.id, selectedOptionId: { not: null } } });
  return { saved: true, answered, total: attempt.totalCount };
}

export async function submitAttempt(viewer: AuthUser, id: string) {
  const attempt = await loadOwnedAttempt(viewer, id);
  if (attempt.status === 'SUBMITTED') throw ApiError.conflict('This attempt has already been submitted');
  if (attempt.status === 'EXPIRED') throw ApiError.conflict('This attempt expired before it was submitted');
  await score(attempt.id, 'SUBMITTED');
  await prisma.quiz.update({ where: { id: attempt.quizId }, data: { attemptCount: { increment: 1 } } });
  await recordActivity(viewer.id, 'quizzesTaken');
  return getResult(viewer, id);
}

async function expireAttempt(id: string) {
  await score(id, 'EXPIRED');
}

/** Server-side scoring: compares saved answers to the correct options. */
async function score(attemptId: string, status: 'SUBMITTED' | 'EXPIRED') {
  const attempt = await prisma.quizAttempt.findUnique({ where: { id: attemptId }, select: { quizId: true } });
  if (!attempt) return;
  const [questions, answers] = await Promise.all([
    prisma.question.findMany({ where: { quizId: attempt.quizId }, select: { id: true, points: true, options: { where: { isCorrect: true }, select: { id: true } } } }),
    prisma.quizAnswer.findMany({ where: { attemptId } }),
  ]);
  const correctByQuestion = new Map(questions.map((q) => [q.id, { correctIds: new Set(q.options.map((o) => o.id)), points: q.points }]));
  let total = 0;
  let correctCount = 0;
  const updates: Prisma.PrismaPromise<unknown>[] = [];
  for (const a of answers) {
    const q = correctByQuestion.get(a.questionId);
    const isCorrect = !!(q && a.selectedOptionId && q.correctIds.has(a.selectedOptionId));
    if (isCorrect) {
      total += q!.points;
      correctCount++;
    }
    if (a.isCorrect !== isCorrect) updates.push(prisma.quizAnswer.update({ where: { id: a.id }, data: { isCorrect } }));
  }
  updates.push(
    prisma.quizAttempt.update({
      where: { id: attemptId },
      data: { status, submittedAt: new Date(), score: total, correctCount, totalCount: questions.length, maxScore: questions.reduce((s, q) => s + q.points, 0) },
    }),
  );
  await prisma.$transaction(updates);
}

export async function getResult(viewer: AuthUser, id: string) {
  const attempt = await loadOwnedAttempt(viewer, id);
  if (attempt.status === 'IN_PROGRESS') {
    if (attempt.expiresAt && attempt.expiresAt <= new Date()) await expireAttempt(attempt.id);
    else throw ApiError.conflict('This attempt has not been submitted yet');
  }
  const fresh = await prisma.quizAttempt.findUniqueOrThrow({ where: { id }, include: { quiz: { select: { id: true, title: true, slug: true } } } });
  const [questions, answers] = await Promise.all([
    prisma.question.findMany({
      where: { quizId: fresh.quizId },
      orderBy: { order: 'asc' },
      select: { id: true, prompt: true, explanation: true, points: true, order: true, options: { orderBy: { order: 'asc' }, select: { id: true, text: true, isCorrect: true } } },
    }),
    prisma.quizAnswer.findMany({ where: { attemptId: id } }),
  ]);
  const byQuestion = new Map(answers.map((a) => [a.questionId, a]));
  return {
    id: fresh.id,
    status: fresh.status,
    startedAt: fresh.startedAt,
    submittedAt: fresh.submittedAt,
    expiresAt: fresh.expiresAt,
    score: fresh.score,
    maxScore: fresh.maxScore,
    correctCount: fresh.correctCount,
    totalCount: fresh.totalCount,
    quiz: fresh.quiz,
    questions: questions.map((q) => ({
      ...q,
      selectedOptionId: byQuestion.get(q.id)?.selectedOptionId ?? null,
      isCorrect: byQuestion.get(q.id)?.isCorrect ?? false,
    })),
  };
}

export async function myAttempts(viewer: AuthUser, limit = 10) {
  const rows = await prisma.quizAttempt.findMany({
    where: { userId: viewer.id, status: { in: ['SUBMITTED', 'EXPIRED'] } },
    orderBy: { submittedAt: 'desc' },
    take: limit,
    select: { ...attemptSummarySelect, quiz: { select: { id: true, title: true, slug: true, difficulty: true } } },
  });
  return rows;
}
