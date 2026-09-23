import type { Prisma } from '@prisma/client';
import { prisma } from '../../utils/prisma.js';
import { ApiError } from '../../utils/errors.js';
import { paginate } from '../../utils/response.js';
import { toSkipTake } from '../../utils/pagination.js';
import { accuracy, problemSummaryInclude, toProblemSummary } from '../../utils/content-serializers.js';
import { categoryIdsForSlug } from '../../utils/categories.js';
import { hasRole, type AuthUser } from '../../types/auth.js';
import { executeCode, executorHealth } from '../../utils/executor-client.js';
import type { ListProblemsQuery, RunInput } from './problems.schemas.js';

export async function overview() {
  const [byDifficulty, topics, potd, total, recent] = await Promise.all([
    prisma.problem.groupBy({ by: ['difficulty'], where: { status: 'PUBLISHED' }, _count: { _all: true } }),
    prisma.topic.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { problems: { where: { problem: { status: 'PUBLISHED' } } } } } },
    }),
    prisma.problem.findFirst({ where: { status: 'PUBLISHED', isProblemOfTheDay: true }, include: problemSummaryInclude }),
    prisma.problem.count({ where: { status: 'PUBLISHED' } }),
    prisma.problem.findMany({ where: { status: 'PUBLISHED' }, orderBy: { publishedAt: 'desc' }, take: 6, include: problemSummaryInclude }),
  ]);
  const counts: Record<string, number> = { SCHOOL: 0, BASIC: 0, EASY: 0, MEDIUM: 0, HARD: 0 };
  for (const row of byDifficulty) counts[row.difficulty] = row._count._all;
  const health = await executorHealth();
  return {
    total,
    byDifficulty: counts,
    topics: topics.filter((t) => t._count.problems > 0).map((t) => ({ id: t.id, name: t.name, slug: t.slug, description: t.description, problemCount: t._count.problems })),
    problemOfTheDay: potd ? toProblemSummary(potd) : null,
    recent: recent.map((p) => toProblemSummary(p)),
    executor: health ? { available: true, driver: health.driver, languages: health.languages } : { available: false, driver: null, languages: [] },
  };
}

export async function listProblems(query: ListProblemsQuery, viewer?: AuthUser) {
  const where: Prisma.ProblemWhereInput = { status: 'PUBLISHED' };
  if (query.difficulty.length) where.difficulty = { in: query.difficulty };
  if (query.topic) where.topics = { some: { topic: { slug: query.topic } } };
  if (query.company) where.companyTags = { has: query.company };
  const categoryIds = await categoryIdsForSlug(query.category);
  if (categoryIds) where.categoryId = { in: categoryIds };
  if (query.q) where.title = { contains: query.q, mode: 'insensitive' };

  if (query.status && viewer) {
    if (query.status === 'solved') where.userStates = { some: { userId: viewer.id, state: 'SOLVED' } };
    else if (query.status === 'attempted') where.userStates = { some: { userId: viewer.id, state: 'ATTEMPTED' } };
    else where.userStates = { none: { userId: viewer.id } };
  }

  const orderBy: Prisma.ProblemOrderByWithRelationInput[] =
    query.sort === 'newest'
      ? [{ publishedAt: 'desc' }]
      : query.sort === 'accuracy'
        ? [{ acceptedCount: 'desc' }, { submissionCount: 'asc' }]
        : query.sort === 'difficulty'
          ? [{ difficulty: 'asc' }, { title: 'asc' }]
          : query.sort === 'title'
            ? [{ title: 'asc' }]
            : [{ submissionCount: 'desc' }, { title: 'asc' }];

  const [rows, total] = await Promise.all([
    prisma.problem.findMany({ where, orderBy, ...toSkipTake(query), include: problemSummaryInclude }),
    prisma.problem.count({ where }),
  ]);

  const states = new Map<string, 'ATTEMPTED' | 'SOLVED'>();
  if (viewer && rows.length) {
    const s = await prisma.userProblemStatus.findMany({ where: { userId: viewer.id, problemId: { in: rows.map((r) => r.id) } } });
    for (const row of s) states.set(row.problemId, row.state);
  }

  const items = rows.map((p) => toProblemSummary(p, states.get(p.id) ?? null));
  if (query.sort === 'accuracy') items.sort((a, b) => b.accuracy - a.accuracy);
  return paginate(items, total, query.page, query.pageSize);
}

export async function getProblem(slug: string, viewer: AuthUser | undefined, includeEditorial: boolean) {
  const problem = await prisma.problem.findUnique({
    where: { slug },
    include: {
      ...problemSummaryInclude,
      category: { select: { id: true, name: true, slug: true } },
      examples: { orderBy: { order: 'asc' } },
      starterCode: true,
      testCases: { where: { isSample: true }, orderBy: { order: 'asc' }, select: { id: true, input: true, expectedOutput: true } },
    },
  });
  if (!problem) throw ApiError.notFound('Problem not found');
  const canSeeUnpublished = viewer && (hasRole(viewer.role, 'EDITOR') || viewer.id === problem.authorId);
  if (problem.status !== 'PUBLISHED' && !canSeeUnpublished) throw ApiError.notFound('Problem not found');

  const [state, bookmark] = viewer
    ? await Promise.all([
        prisma.userProblemStatus.findUnique({ where: { userId_problemId: { userId: viewer.id, problemId: problem.id } } }),
        prisma.bookmark.findUnique({ where: { userId_problemId: { userId: viewer.id, problemId: problem.id } } }),
      ])
    : [null, null];

  const starterCode: Record<string, string> = {};
  for (const s of problem.starterCode) starterCode[s.language] = s.code;

  return {
    ...toProblemSummary(problem, state?.state ?? null),
    status: problem.status,
    description: problem.description,
    constraints: problem.constraints,
    inputFormat: problem.inputFormat,
    outputFormat: problem.outputFormat,
    hints: problem.hints,
    expectedTimeComplexity: problem.expectedTimeComplexity,
    expectedSpaceComplexity: problem.expectedSpaceComplexity,
    timeLimitMs: problem.timeLimitMs,
    memoryLimitMb: problem.memoryLimitMb,
    examples: problem.examples.map((e) => ({ id: e.id, input: e.input, output: e.output, explanation: e.explanation })),
    sampleTests: problem.testCases,
    starterCode,
    category: problem.category,
    bookmarked: !!bookmark,
    editorial: includeEditorial ? problem.editorial : undefined,
    publishedAt: problem.publishedAt,
  };
}

/** Runs code against the sample tests (or a custom input) synchronously. Nothing is persisted. */
export async function runCode(slug: string, input: RunInput) {
  const problem = await prisma.problem.findUnique({
    where: { slug },
    select: {
      id: true,
      status: true,
      timeLimitMs: true,
      memoryLimitMb: true,
      testCases: { where: { isSample: true }, orderBy: { order: 'asc' }, select: { id: true, input: true, expectedOutput: true } },
    },
  });
  if (!problem || problem.status !== 'PUBLISHED') throw ApiError.notFound('Problem not found');

  const tests =
    input.customInput !== undefined && input.customInput.trim() !== ''
      ? [{ id: 'custom', input: input.customInput.endsWith('\n') ? input.customInput : `${input.customInput}\n` }]
      : problem.testCases.map((t) => ({ id: t.id, input: t.input, expectedOutput: t.expectedOutput }));
  if (tests.length === 0) throw ApiError.unprocessable('This problem has no sample tests. Provide a custom input.');

  const started = Date.now();
  const result = await executeCode({ language: input.language, sourceCode: input.sourceCode, tests, timeLimitMs: problem.timeLimitMs, memoryLimitMb: problem.memoryLimitMb });
  const byId = new Map(problem.testCases.map((t) => [t.id, t]));

  return {
    status: result.compile.ok ? (result.results.every((r) => r.status === 'ACCEPTED') ? 'ACCEPTED' : (result.results.find((r) => r.status !== 'ACCEPTED')?.status ?? 'ACCEPTED')) : 'COMPILE_ERROR',
    compileOutput: result.compile.ok ? null : result.compile.output,
    results: result.results.map((r) => {
      const t = byId.get(r.id);
      return {
        id: r.id,
        status: r.status,
        isSample: r.id !== 'custom',
        input: t?.input ?? input.customInput,
        expectedOutput: t?.expectedOutput,
        actualOutput: r.stdout,
        stderr: r.stderr,
        runtimeMs: r.runtimeMs,
        memoryKb: r.memoryKb,
      };
    }),
    runtimeMs: Date.now() - started,
    driver: result.driver,
  };
}

export { accuracy };
