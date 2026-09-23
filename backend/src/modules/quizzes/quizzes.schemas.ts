import { z } from 'zod';
import { paginationQuerySchema } from '../../utils/pagination.js';

export const listQuizzesQuerySchema = paginationQuerySchema.extend({
  category: z.string().trim().max(80).optional(),
  difficulty: z.enum(['SCHOOL', 'BASIC', 'EASY', 'MEDIUM', 'HARD']).optional(),
  q: z.string().trim().max(100).optional(),
  sort: z.enum(['popular', 'newest', 'title']).default('popular'),
});
export type ListQuizzesQuery = z.infer<typeof listQuizzesQuerySchema>;

export const answerSchema = z.object({
  questionId: z.string().min(1).max(64),
  optionId: z.string().min(1).max(64).nullable(),
});
export type AnswerInput = z.infer<typeof answerSchema>;
