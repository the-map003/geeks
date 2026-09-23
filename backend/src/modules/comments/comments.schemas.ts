import { z } from 'zod';
import { paginationQuerySchema } from '../../utils/pagination.js';

export const commentTargetSchema = z.enum(['ARTICLE', 'PROBLEM', 'TUTORIAL_LESSON', 'COURSE', 'QUIZ']);

export const listCommentsQuerySchema = paginationQuerySchema.extend({
  targetType: commentTargetSchema,
  targetId: z.string().min(1).max(64),
  sort: z.enum(['newest', 'oldest', 'top']).default('top'),
});
export type ListCommentsQuery = z.infer<typeof listCommentsQuerySchema>;

export const createCommentSchema = z.object({
  targetType: commentTargetSchema,
  targetId: z.string().min(1).max(64),
  parentId: z.string().min(1).max(64).optional(),
  content: z.string().trim().min(2, 'Comment is too short').max(2000, 'Comment must be at most 2000 characters'),
});
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const updateCommentSchema = z.object({
  content: z.string().trim().min(2).max(2000),
});

export const reportCommentSchema = z.object({
  reason: z.enum(['SPAM', 'HARASSMENT', 'OFF_TOPIC', 'INAPPROPRIATE', 'OTHER']),
  details: z.string().trim().max(500).optional(),
});
export type ReportCommentInput = z.infer<typeof reportCommentSchema>;
