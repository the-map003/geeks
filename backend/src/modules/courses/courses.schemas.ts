import { z } from 'zod';
import { paginationQuerySchema } from '../../utils/pagination.js';

export const listCoursesQuerySchema = paginationQuerySchema.extend({
  category: z.string().trim().max(80).optional(),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS']).optional(),
  free: z.enum(['true', 'false']).optional(),
  q: z.string().trim().max(100).optional(),
  sort: z.enum(['popular', 'newest', 'rating']).default('popular'),
});

export type ListCoursesQuery = z.infer<typeof listCoursesQuerySchema>;
