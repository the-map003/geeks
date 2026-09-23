import { Router } from 'express';
import { z } from 'zod';
import { validate, getQuery } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { created, noContent, ok } from '../../utils/response.js';
import { paginationQuerySchema } from '../../utils/pagination.js';
import * as service from './bookmarks.service.js';

export const bookmarksRouter = Router();
bookmarksRouter.use(requireAuth);

const typeSchema = z.enum(['ARTICLE', 'PROBLEM', 'TUTORIAL', 'COURSE']);
const targetSchema = z.object({ type: typeSchema, targetId: z.string().min(1).max(64) });
const listQuery = paginationQuerySchema.extend({ type: typeSchema.optional() });

bookmarksRouter.get('/', validate(listQuery, 'query'), async (req, res) => {
  ok(res, await service.listBookmarks(req.user!.id, getQuery<z.infer<typeof listQuery>>(req)));
});

bookmarksRouter.get('/status', validate(targetSchema, 'query'), async (req, res) => {
  const { type, targetId } = getQuery<z.infer<typeof targetSchema>>(req);
  ok(res, await service.status(req.user!.id, type, targetId));
});

bookmarksRouter.post('/', validate(targetSchema), async (req, res) => {
  const { type, targetId } = req.body as z.infer<typeof targetSchema>;
  const result = await service.addBookmark(req.user!.id, type, targetId);
  if (result.created) created(res, { bookmark: result.bookmark, bookmarked: true }, 'Saved to bookmarks');
  else ok(res, { bookmark: result.bookmark, bookmarked: true });
});

bookmarksRouter.delete('/', validate(targetSchema), async (req, res) => {
  const { type, targetId } = req.body as z.infer<typeof targetSchema>;
  await service.removeBookmark(req.user!.id, type, targetId);
  ok(res, { bookmarked: false }, 'Removed from bookmarks');
});

bookmarksRouter.delete('/:id', async (req, res) => {
  await service.removeBookmarkById(req.user!.id, req.params.id as string);
  noContent(res);
});
