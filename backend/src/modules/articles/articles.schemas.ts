import { z } from 'zod';
import { paginationQuerySchema } from '../../utils/pagination.js';

export const listArticlesQuerySchema = paginationQuerySchema.extend({
  category: z.string().trim().max(80).optional(),
  tag: z.string().trim().max(80).optional(),
  difficulty: z.enum(['SCHOOL', 'BASIC', 'EASY', 'MEDIUM', 'HARD']).optional(),
  author: z.string().trim().max(30).optional(),
  featured: z.enum(['true', 'false']).optional(),
  q: z.string().trim().max(100).optional(),
  sort: z.enum(['latest', 'popular', 'trending', 'oldest']).default('latest'),
});

export type ListArticlesQuery = z.infer<typeof listArticlesQuerySchema>;

export const slugParamSchema = z.object({ slug: z.string().trim().min(1).max(200) });
