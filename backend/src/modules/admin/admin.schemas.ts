import { z } from 'zod';
import { paginationQuerySchema } from '../../utils/pagination.js';

export const statusSchema = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);
export const difficultySchema = z.enum(['SCHOOL', 'BASIC', 'EASY', 'MEDIUM', 'HARD']);
export const roleSchema = z.enum(['USER', 'EDITOR', 'ADMIN', 'SUPER_ADMIN']);
export const languageSchema = z.enum(['PYTHON', 'JAVASCRIPT', 'CPP', 'JAVA']);
export const idParams = z.object({ id: z.string().min(1).max(64) });

const slug = z.string().trim().min(2).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens');
const optionalId = z.string().min(1).max(64).nullable().optional();
const markdown = z.string().max(200_000);

export const contentListQuerySchema = paginationQuerySchema.extend({
  status: statusSchema.optional(),
  q: z.string().trim().max(100).optional(),
  sort: z.enum(['updated', 'created', 'title']).default('updated'),
});
export type ContentListQuery = z.infer<typeof contentListQuerySchema>;

// ---- Articles ----
export const articleInputSchema = z.object({
  title: z.string().trim().min(3).max(200),
  slug: slug.optional(),
  excerpt: z.string().trim().min(10).max(500),
  content: markdown.min(20),
  coverImageUrl: z.string().url().max(500).nullable().optional(),
  categoryId: optionalId,
  difficulty: difficultySchema.nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  isFeatured: z.boolean().optional(),
});
export type ArticleInput = z.infer<typeof articleInputSchema>;

// ---- Tutorials ----
export const tutorialInputSchema = z.object({
  title: z.string().trim().min(3).max(200),
  slug: slug.optional(),
  description: z.string().trim().min(10).max(1000),
  coverImageUrl: z.string().url().max(500).nullable().optional(),
  categoryId: optionalId,
  order: z.number().int().min(0).optional(),
});
export type TutorialInput = z.infer<typeof tutorialInputSchema>;

export const chapterInputSchema = z.object({ title: z.string().trim().min(2).max(200), order: z.number().int().min(0).optional() });
export const tutorialLessonInputSchema = z.object({
  title: z.string().trim().min(2).max(200),
  slug: slug.optional(),
  content: markdown.min(10),
  chapterId: optionalId,
  order: z.number().int().min(0).optional(),
  readingTimeMin: z.number().int().min(1).max(120).optional(),
});
export type TutorialLessonInput = z.infer<typeof tutorialLessonInputSchema>;

// ---- Courses ----
export const courseInputSchema = z.object({
  title: z.string().trim().min(3).max(200),
  slug: slug.optional(),
  subtitle: z.string().trim().max(300).nullable().optional(),
  description: markdown.min(20),
  coverImageUrl: z.string().url().max(500).nullable().optional(),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS']).optional(),
  price: z.number().min(0).max(100000).optional(),
  durationHours: z.number().int().min(0).max(10000).optional(),
  categoryId: optionalId,
  instructorId: z.string().min(1).max(64).optional(),
  isFeatured: z.boolean().optional(),
});
export type CourseInput = z.infer<typeof courseInputSchema>;

export const moduleInputSchema = z.object({ title: z.string().trim().min(2).max(200), description: z.string().trim().max(1000).nullable().optional(), order: z.number().int().min(0).optional() });
export const courseLessonInputSchema = z.object({
  title: z.string().trim().min(2).max(200),
  slug: slug.optional(),
  content: markdown.min(10),
  videoUrl: z.string().url().max(500).nullable().optional(),
  durationMin: z.number().int().min(1).max(600).optional(),
  order: z.number().int().min(0).optional(),
  isPreview: z.boolean().optional(),
});
export type CourseLessonInput = z.infer<typeof courseLessonInputSchema>;

// ---- Problems ----
export const problemInputSchema = z.object({
  title: z.string().trim().min(3).max(200),
  slug: slug.optional(),
  description: markdown.min(10),
  difficulty: difficultySchema,
  categoryId: optionalId,
  constraints: z.string().max(5000).nullable().optional(),
  inputFormat: z.string().max(5000).nullable().optional(),
  outputFormat: z.string().max(5000).nullable().optional(),
  hints: z.array(z.string().trim().min(1).max(1000)).max(5).default([]),
  editorial: markdown.nullable().optional(),
  expectedTimeComplexity: z.string().trim().max(100).nullable().optional(),
  expectedSpaceComplexity: z.string().trim().max(100).nullable().optional(),
  timeLimitMs: z.number().int().min(100).max(20000).optional(),
  memoryLimitMb: z.number().int().min(16).max(1024).optional(),
  points: z.number().int().min(0).max(100).optional(),
  companyTags: z.array(z.string().trim().min(1).max(60)).max(10).default([]),
  topics: z.array(z.string().trim().min(1).max(60)).max(10).default([]),
  isProblemOfTheDay: z.boolean().optional(),
  examples: z.array(z.object({ input: z.string().max(10000), output: z.string().max(10000), explanation: z.string().max(2000).nullable().optional() })).max(10).default([]),
  starterCode: z.array(z.object({ language: languageSchema, code: z.string().max(50000) })).max(4).default([]),
  testCases: z.array(z.object({ input: z.string().max(200000), expectedOutput: z.string().max(200000), isSample: z.boolean().default(false), weight: z.number().int().min(1).max(100).default(1) })).max(100).default([]),
});
export type ProblemInput = z.infer<typeof problemInputSchema>;

export const validateProblemSchema = z.object({ language: languageSchema, sourceCode: z.string().min(1).max(100_000) });

// ---- Quizzes ----
export const quizInputSchema = z.object({
  title: z.string().trim().min(3).max(200),
  slug: slug.optional(),
  description: z.string().trim().min(10).max(1000),
  categoryId: optionalId,
  difficulty: difficultySchema,
  timeLimitMin: z.number().int().min(1).max(300).nullable().optional(),
  questions: z
    .array(
      z.object({
        prompt: z.string().trim().min(3).max(2000),
        explanation: z.string().trim().max(2000).nullable().optional(),
        points: z.number().int().min(1).max(10).default(1),
        options: z
          .array(z.object({ text: z.string().trim().min(1).max(500), isCorrect: z.boolean() }))
          .min(2)
          .max(6)
          .refine((opts) => opts.filter((o) => o.isCorrect).length === 1, 'Each question must have exactly one correct option'),
      }),
    )
    .max(100)
    .default([]),
});
export type QuizInput = z.infer<typeof quizInputSchema>;

// ---- Users ----
export const usersListQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().max(100).optional(),
  role: roleSchema.optional(),
  active: z.enum(['true', 'false']).optional(),
});
export const userPatchSchema = z.object({ role: roleSchema.optional(), isActive: z.boolean().optional() }).refine((v) => v.role !== undefined || v.isActive !== undefined, 'Nothing to update');

// ---- Moderation ----
export const commentsListQuerySchema = paginationQuerySchema.extend({
  state: z.enum(['all', 'hidden', 'deleted', 'reported']).default('all'),
  q: z.string().trim().max(100).optional(),
});
export const commentActionSchema = z.object({ action: z.enum(['hide', 'restore', 'delete']), reason: z.string().trim().max(200).optional() });
export const reportsListQuerySchema = paginationQuerySchema.extend({ status: z.enum(['OPEN', 'RESOLVED', 'DISMISSED']).optional() });
export const reportActionSchema = z.object({ action: z.enum(['resolve', 'dismiss']), note: z.string().trim().max(500).optional(), hideComment: z.boolean().optional() });

// ---- System ----
export const analyticsQuerySchema = z.object({ range: z.enum(['7d', '30d', '90d']).default('30d') });
export const settingsPutSchema = z.object({ settings: z.array(z.object({ key: z.string().trim().min(1).max(100).regex(/^[a-z0-9_.-]+$/i), value: z.unknown(), description: z.string().trim().max(300).optional() })).min(1).max(50) });
export const auditListQuerySchema = paginationQuerySchema.extend({ action: z.string().trim().max(60).optional(), entityType: z.string().trim().max(60).optional() });
