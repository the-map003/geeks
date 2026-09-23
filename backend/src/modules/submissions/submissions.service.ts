import type { Language, Prisma, SubmissionStatus } from '@prisma/client';
import { prisma } from '../../utils/prisma.js';
import { ApiError } from '../../utils/errors.js';
import { paginate } from '../../utils/response.js';
import { toSkipTake } from '../../utils/pagination.js';
import { logger } from '../../utils/logger.js';
import { hasRole, type AuthUser } from '../../types/auth.js';
import { aggregateStatus, executeCode } from '../../utils/executor-client.js';
import { recordActivity } from '../../utils/activity.js';
import type { ListSubmissionsQuery } from '../problems/problems.schemas.js';

const problemRef = { select: { id: true, title: true, slug: true, difficulty: true } } as const;

interface StoredTestResult {
  id: string;
  status: SubmissionStatus;
  isSample: boolean;
  runtimeMs: number;
  memoryKb: number | null;
  stderr?: string;
  actualOutput?: string;
}

export async function createSubmission(user: AuthUser, slug: string, language: Language, sourceCode: string) {
  const problem = await prisma.problem.findUnique({
    where: { slug },
    select: { id: true, status: true, timeLimitMs: true, memoryLimitMb: true, _count: { select: { testCases: true } } },
  });
  if (!problem || problem.status !== 'PUBLISHED') throw ApiError.notFound('Problem not found');
  if (problem._count.testCases === 0) throw ApiError.unprocessable('This problem has no test cases yet');

  const pending = await prisma.submission.count({ where: { userId: user.id, status: { in: ['PENDING', 'RUNNING'] } } });
  if (pending >= 3) throw ApiError.tooMany('You already have submissions being judged. Please wait for them to finish.');

  const submission = await prisma.submission.create({
    data: { userId: user.id, problemId: problem.id, language, sourceCode, status: 'PENDING', totalCount: problem._count.testCases },
  });

  // Judge asynchronously; the client polls GET /submissions/:id.
  void judge(submission.id).catch((err) => logger.error({ err, submissionId: submission.id }, 'Judging failed'));

  return { submissionId: submission.id, status: submission.status as SubmissionStatus };
}

async function judge(submissionId: string) {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { problem: { select: { id: true, timeLimitMs: true, memoryLimitMb: true, testCases: { orderBy: { order: 'asc' } } } } },
  });
  if (!submission || submission.status !== 'PENDING') return;

  await prisma.submission.update({ where: { id: submissionId }, data: { status: 'RUNNING' } });
  const tests = submission.problem.testCases;

  try {
    const result = await executeCode({
      language: submission.language,
      sourceCode: submission.sourceCode,
      tests: tests.map((t) => ({ id: t.id, input: t.input, expectedOutput: t.expectedOutput })),
      timeLimitMs: submission.problem.timeLimitMs,
      memoryLimitMb: submission.problem.memoryLimitMb,
    });

    const status = aggregateStatus(result.results, result.compile.ok);
    const sampleIds = new Set(tests.filter((t) => t.isSample).map((t) => t.id));
    const testResults: StoredTestResult[] = result.results.map((r) => ({
      id: r.id,
      status: r.status,
      isSample: sampleIds.has(r.id),
      runtimeMs: r.runtimeMs,
      memoryKb: r.memoryKb,
      // Only sample outputs are stored verbatim so hidden test data is never leaked.
      ...(sampleIds.has(r.id) ? { stderr: r.stderr.slice(0, 4000), actualOutput: r.stdout.slice(0, 4000) } : { stderr: r.stderr.slice(0, 2000) }),
    }));
    const passedCount = result.results.filter((r) => r.status === 'ACCEPTED').length;
    const runtimeMs = result.results.length ? Math.max(...result.results.map((r) => r.runtimeMs)) : 0;
    const memoryValues = result.results.map((r) => r.memoryKb).filter((m): m is number => m !== null);
    const firstFailure = result.results.find((r) => r.status !== 'ACCEPTED');

    await finalize(submission.id, submission.userId, submission.problem.id, {
      status,
      passedCount,
      totalCount: tests.length,
      runtimeMs,
      memoryKb: memoryValues.length ? Math.max(...memoryValues) : null,
      compileOutput: result.compile.ok ? null : result.compile.output.slice(0, 8000),
      errorMessage: firstFailure && firstFailure.status !== 'WRONG_ANSWER' ? firstFailure.stderr.slice(0, 2000) || null : null,
      testResults: testResults as unknown as Prisma.InputJsonValue,
    });
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Judging failed unexpectedly';
    await finalize(submission.id, submission.userId, submission.problem.id, {
      status: 'INTERNAL_ERROR',
      passedCount: 0,
      totalCount: tests.length,
      runtimeMs: null,
      memoryKb: null,
      compileOutput: null,
      errorMessage: message,
      testResults: [] as unknown as Prisma.InputJsonValue,
    });
  }
}

async function finalize(
  submissionId: string,
  userId: string,
  problemId: string,
  data: {
    status: SubmissionStatus;
    passedCount: number;
    totalCount: number;
    runtimeMs: number | null;
    memoryKb: number | null;
    compileOutput: string | null;
    errorMessage: string | null;
    testResults: Prisma.InputJsonValue;
  },
) {
  const accepted = data.status === 'ACCEPTED';
  await prisma.$transaction(async (tx) => {
    await tx.submission.update({ where: { id: submissionId }, data: { ...data, judgedAt: new Date() } });
    if (data.status !== 'INTERNAL_ERROR') {
      await tx.problem.update({
        where: { id: problemId },
        data: { submissionCount: { increment: 1 }, ...(accepted ? { acceptedCount: { increment: 1 } } : {}) },
      });
      const existing = await tx.userProblemStatus.findUnique({ where: { userId_problemId: { userId, problemId } } });
      if (!existing) {
        await tx.userProblemStatus.create({
          data: { userId, problemId, state: accepted ? 'SOLVED' : 'ATTEMPTED', solvedAt: accepted ? new Date() : null },
        });
      } else if (accepted && existing.state !== 'SOLVED') {
        await tx.userProblemStatus.update({ where: { id: existing.id }, data: { state: 'SOLVED', solvedAt: new Date(), lastAttemptAt: new Date() } });
      } else {
        await tx.userProblemStatus.update({ where: { id: existing.id }, data: { lastAttemptAt: new Date() } });
      }
      if (accepted && existing?.state !== 'SOLVED') {
        await tx.notification.create({
          data: { userId, type: 'SUBMISSION_RESULT', title: 'Problem solved!', body: 'Your solution was accepted.', link: `/submissions` },
        });
      }
    }
  });
  if (accepted) await recordActivity(userId, 'problemsSolved');
}

export async function listSubmissions(user: AuthUser, query: ListSubmissionsQuery) {
  const where: Prisma.SubmissionWhereInput = { userId: user.id };
  if (query.problem) where.problem = { slug: query.problem };
  if (query.status) where.status = query.status;
  if (query.language) where.language = query.language;

  const [rows, total] = await Promise.all([
    prisma.submission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...toSkipTake(query),
      select: {
        id: true,
        language: true,
        status: true,
        runtimeMs: true,
        memoryKb: true,
        passedCount: true,
        totalCount: true,
        createdAt: true,
        judgedAt: true,
        problem: problemRef,
      },
    }),
    prisma.submission.count({ where }),
  ]);
  return paginate(rows, total, query.page, query.pageSize);
}

export async function getSubmission(viewer: AuthUser, id: string) {
  const submission = await prisma.submission.findUnique({ where: { id }, include: { problem: problemRef } });
  if (!submission) throw ApiError.notFound('Submission not found');
  if (submission.userId !== viewer.id && !hasRole(viewer.role, 'EDITOR')) throw ApiError.forbidden();
  return {
    id: submission.id,
    language: submission.language,
    status: submission.status,
    runtimeMs: submission.runtimeMs,
    memoryKb: submission.memoryKb,
    passedCount: submission.passedCount,
    totalCount: submission.totalCount,
    compileOutput: submission.compileOutput,
    errorMessage: submission.errorMessage,
    testResults: (submission.testResults as unknown as StoredTestResult[] | null) ?? [],
    sourceCode: submission.sourceCode,
    createdAt: submission.createdAt,
    judgedAt: submission.judgedAt,
    problem: submission.problem,
  };
}

/** Re-queue submissions stuck in PENDING/RUNNING (e.g. after a server restart). */
export async function requeueStale(): Promise<number> {
  const cutoff = new Date(Date.now() - 5 * 60 * 1000);
  const stale = await prisma.submission.findMany({ where: { status: { in: ['PENDING', 'RUNNING'] }, createdAt: { lt: cutoff } }, select: { id: true } });
  for (const s of stale) {
    await prisma.submission.update({ where: { id: s.id }, data: { status: 'PENDING' } });
    void judge(s.id).catch((err) => logger.error({ err, submissionId: s.id }, 'Re-judging failed'));
  }
  return stale.length;
}
