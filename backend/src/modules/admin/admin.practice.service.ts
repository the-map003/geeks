import type { Language } from '@prisma/client';
import { prisma } from '../../utils/prisma.js';
import { ApiError } from '../../utils/errors.js';
import { slugify, uniqueSlug } from '../../utils/slug.js';
import { authorSelect, toAuthorSummary } from '../../utils/serializers.js';
import { executeCode } from '../../utils/executor-client.js';
import { invalidateHomeCache } from '../home/home.service.js';
import type { ProblemInput, QuizInput } from './admin.schemas.js';

// ---------------------------------------------------------------------------
// Problems
// ---------------------------------------------------------------------------

export async function getProblem(id: string) {
  const p = await prisma.problem.findUnique({
    where: { id },
    include: {
      author: { select: authorSelect },
      category: { select: { id: true, name: true, slug: true } },
      topics: { include: { topic: true } },
      examples: { orderBy: { order: 'asc' } },
      starterCode: true,
      testCases: { orderBy: { order: 'asc' } },
      _count: { select: { submissions: true } },
    },
  });
  if (!p) throw ApiError.notFound('Problem not found');
  return { ...p, author: toAuthorSummary(p.author), topics: p.topics.map((t) => t.topic) };
}

async function topicIdsFor(names: string[]): Promise<string[]> {
  const ids: string[] = [];
  for (const raw of names) {
    const s = slugify(raw);
    if (!s) continue;
    const topic = await prisma.topic.upsert({ where: { slug: s }, update: {}, create: { slug: s, name: raw.trim() } });
    ids.push(topic.id);
  }
  return [...new Set(ids)];
}

function problemScalars(input: ProblemInput) {
  return {
    title: input.title,
    description: input.description,
    difficulty: input.difficulty,
    categoryId: input.categoryId ?? null,
    constraints: input.constraints ?? null,
    inputFormat: input.inputFormat ?? null,
    outputFormat: input.outputFormat ?? null,
    hints: input.hints,
    editorial: input.editorial ?? null,
    expectedTimeComplexity: input.expectedTimeComplexity ?? null,
    expectedSpaceComplexity: input.expectedSpaceComplexity ?? null,
    timeLimitMs: input.timeLimitMs ?? 2000,
    memoryLimitMb: input.memoryLimitMb ?? 256,
    points: input.points ?? 4,
    companyTags: input.companyTags,
    isProblemOfTheDay: input.isProblemOfTheDay ?? false,
  };
}

function nestedCreates(input: ProblemInput, topicIds: string[]) {
  return {
    topics: { create: topicIds.map((topicId) => ({ topicId })) },
    examples: { create: input.examples.map((e, i) => ({ input: e.input, output: e.output, explanation: e.explanation ?? null, order: i })) },
    starterCode: { create: dedupeLanguages(input.starterCode).map((s) => ({ language: s.language, code: s.code })) },
    testCases: { create: input.testCases.map((t, i) => ({ input: t.input, expectedOutput: t.expectedOutput, isSample: t.isSample, weight: t.weight, order: i })) },
  };
}

function dedupeLanguages(list: Array<{ language: Language; code: string }>) {
  const seen = new Map<Language, string>();
  for (const s of list) seen.set(s.language, s.code);
  return [...seen.entries()].map(([language, code]) => ({ language, code }));
}

export async function createProblem(authorId: string, input: ProblemInput) {
  const slugValue = await uniqueSlug(input.slug ?? input.title, async (s) => !!(await prisma.problem.findUnique({ where: { slug: s }, select: { id: true } })));
  const topicIds = await topicIdsFor(input.topics);
  const p = await prisma.problem.create({ data: { ...problemScalars(input), slug: slugValue, authorId, ...nestedCreates(input, topicIds) } });
  if (input.isProblemOfTheDay) await prisma.problem.updateMany({ where: { isProblemOfTheDay: true, NOT: { id: p.id } }, data: { isProblemOfTheDay: false } });
  return getProblem(p.id);
}

export async function updateProblem(id: string, input: ProblemInput) {
  const existing = await prisma.problem.findUnique({ where: { id }, select: { slug: true } });
  if (!existing) throw ApiError.notFound('Problem not found');
  const slugValue = input.slug && input.slug !== existing.slug
    ? await uniqueSlug(input.slug, async (s) => !!(await prisma.problem.findFirst({ where: { slug: s, NOT: { id } }, select: { id: true } })))
    : existing.slug;
  const topicIds = await topicIdsFor(input.topics);
  await prisma.$transaction([
    prisma.problemTopic.deleteMany({ where: { problemId: id } }),
    prisma.problemExample.deleteMany({ where: { problemId: id } }),
    prisma.problemStarterCode.deleteMany({ where: { problemId: id } }),
    prisma.testCase.deleteMany({ where: { problemId: id } }),
    prisma.problem.update({ where: { id }, data: { ...problemScalars(input), slug: slugValue, ...nestedCreates(input, topicIds) } }),
    ...(input.isProblemOfTheDay ? [prisma.problem.updateMany({ where: { isProblemOfTheDay: true, NOT: { id } }, data: { isProblemOfTheDay: false } })] : []),
  ]);
  invalidateHomeCache();
  return getProblem(id);
}

/** Runs a reference solution against every stored test case so editors can validate expected outputs. */
export async function validateProblem(id: string, language: Language, sourceCode: string) {
  const problem = await prisma.problem.findUnique({ where: { id }, select: { timeLimitMs: true, memoryLimitMb: true, testCases: { orderBy: { order: 'asc' } } } });
  if (!problem) throw ApiError.notFound('Problem not found');
  if (problem.testCases.length === 0) throw ApiError.unprocessable('This problem has no test cases');
  const result = await executeCode({
    language,
    sourceCode,
    tests: problem.testCases.map((t) => ({ id: t.id, input: t.input, expectedOutput: t.expectedOutput })),
    timeLimitMs: problem.timeLimitMs,
    memoryLimitMb: problem.memoryLimitMb,
  });
  const byId = new Map(problem.testCases.map((t) => [t.id, t]));
  return {
    compile: result.compile,
    passed: result.results.filter((r) => r.status === 'ACCEPTED').length,
    total: result.results.length,
    results: result.results.map((r) => ({
      id: r.id,
      status: r.status,
      input: byId.get(r.id)?.input,
      expectedOutput: byId.get(r.id)?.expectedOutput,
      actualOutput: r.stdout,
      stderr: r.stderr,
      runtimeMs: r.runtimeMs,
    })),
  };
}

// ---------------------------------------------------------------------------
// Quizzes
// ---------------------------------------------------------------------------

export async function getQuiz(id: string) {
  const q = await prisma.quiz.findUnique({
    where: { id },
    include: {
      author: { select: authorSelect },
      category: { select: { id: true, name: true, slug: true } },
      questions: { orderBy: { order: 'asc' }, include: { options: { orderBy: { order: 'asc' } } } },
      _count: { select: { attempts: true } },
    },
  });
  if (!q) throw ApiError.notFound('Quiz not found');
  return { ...q, author: toAuthorSummary(q.author) };
}

function quizScalars(input: QuizInput) {
  return { title: input.title, description: input.description, categoryId: input.categoryId ?? null, difficulty: input.difficulty, timeLimitMin: input.timeLimitMin ?? null };
}

function questionCreates(input: QuizInput) {
  return {
    questions: {
      create: input.questions.map((q, qi) => ({
        prompt: q.prompt,
        explanation: q.explanation ?? null,
        points: q.points,
        order: qi,
        options: { create: q.options.map((o, oi) => ({ text: o.text, isCorrect: o.isCorrect, order: oi })) },
      })),
    },
  };
}

export async function createQuiz(authorId: string, input: QuizInput) {
  const slugValue = await uniqueSlug(input.slug ?? input.title, async (s) => !!(await prisma.quiz.findUnique({ where: { slug: s }, select: { id: true } })));
  const q = await prisma.quiz.create({ data: { ...quizScalars(input), slug: slugValue, authorId, ...questionCreates(input) } });
  return getQuiz(q.id);
}

export async function updateQuiz(id: string, input: QuizInput) {
  const existing = await prisma.quiz.findUnique({ where: { id }, select: { slug: true, _count: { select: { attempts: { where: { status: 'IN_PROGRESS' } } } } } });
  if (!existing) throw ApiError.notFound('Quiz not found');
  if (existing._count.attempts > 0) throw ApiError.conflict('This quiz has attempts in progress; try again later');
  const slugValue = input.slug && input.slug !== existing.slug
    ? await uniqueSlug(input.slug, async (s) => !!(await prisma.quiz.findFirst({ where: { slug: s, NOT: { id } }, select: { id: true } })))
    : existing.slug;
  // Replacing questions deletes their historical answers (cascade); attempts keep their scores.
  await prisma.$transaction([
    prisma.question.deleteMany({ where: { quizId: id } }),
    prisma.quiz.update({ where: { id }, data: { ...quizScalars(input), slug: slugValue, ...questionCreates(input) } }),
  ]);
  invalidateHomeCache();
  return getQuiz(id);
}
