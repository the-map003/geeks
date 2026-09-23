import { Router } from 'express';
import { z } from 'zod';
import { validate, getQuery } from '../../middleware/validate.js';
import { ok } from '../../utils/response.js';
import * as service from './categories.service.js';

export const categoriesRouter = Router();
export const tagsRouter = Router();
export const topicsRouter = Router();

const listQuery = z.object({
  tree: z.enum(['true', 'false']).optional(),
  nav: z.enum(['true', 'false']).optional(),
});

categoriesRouter.get('/', validate(listQuery, 'query'), async (req, res) => {
  const q = getQuery<z.infer<typeof listQuery>>(req);
  const categories = await service.listCategories({ tree: q.tree === 'true', nav: q.nav === 'true' });
  ok(res, { categories });
});

categoriesRouter.get('/:slug', async (req, res) => {
  ok(res, await service.getCategoryHub(req.params.slug as string));
});

tagsRouter.get('/', validate(z.object({ q: z.string().trim().max(50).optional() }), 'query'), async (req, res) => {
  const { q } = getQuery<{ q?: string }>(req);
  ok(res, { tags: await service.listTags(q) });
});

topicsRouter.get('/', async (_req, res) => {
  ok(res, { topics: await service.listTopics() });
});
