import { z } from 'zod';
import { paginationQuerySchema } from '../../utils/pagination.js';

export const difficultySchema = z.enum(['SCHOOL', 'BASIC', 'EASY', 'MEDIUM', 'HARD']);
export const languageSchema = z.enum(['PYTHON', 'JAVASCRIPT', 'CPP', 'JAVA']);

export const listProblemsQuerySchema = paginationQuerySchema.extend({
  difficulty: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean) : []))
    .pipe(z.array(difficultySchema)),
  topic: z.string().trim().max(80).optional(),
  category: z.string().trim().max(80).optional(),
  company: z.string().trim().max(80).optional(),
  status: z.enum(['solved', 'attempted', 'unsolved']).optional(),
  q: z.string().trim().max(100).optional(),
  sort: z.enum(['newest', 'popular', 'accuracy', 'difficulty', 'title']).default('popular'),
});
export type ListProblemsQuery = z.infer<typeof listProblemsQuerySchema>;

export const problemDetailQuerySchema = z.object({ editorial: z.enum(['true', 'false']).optional() });

export const runSchema = z.object({
  language: languageSchema,
  sourceCode: z.string().min(1, 'Source code is required').max(100_000, 'Source code is too large'),
  customInput: z.string().max(20_000).optional(),
});
export type RunInput = z.infer<typeof runSchema>;

export const submitSchema = z.object({
  language: languageSchema,
  sourceCode: z.string().min(1, 'Source code is required').max(100_000, 'Source code is too large'),
});
export type SubmitInput = z.infer<typeof submitSchema>;

export const listSubmissionsQuerySchema = paginationQuerySchema.extend({
  problem: z.string().trim().max(200).optional(),
  status: z.enum(['PENDING', 'RUNNING', 'ACCEPTED', 'WRONG_ANSWER', 'TIME_LIMIT_EXCEEDED', 'MEMORY_LIMIT_EXCEEDED', 'RUNTIME_ERROR', 'COMPILE_ERROR', 'INTERNAL_ERROR']).optional(),
  language: languageSchema.optional(),
});
export type ListSubmissionsQuery = z.infer<typeof listSubmissionsQuerySchema>;
