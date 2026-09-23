import { Router } from 'express';
import { validate, getQuery } from '../../middleware/validate.js';
import { optionalAuth, requireAuth } from '../../middleware/auth.js';
import { ok } from '../../utils/response.js';
import { listArticlesQuerySchema, slugParamSchema, type ListArticlesQuery } from './articles.schemas.js';
import * as service from './articles.service.js';

export const articlesRouter = Router();

articlesRouter.get('/', validate(listArticlesQuerySchema, 'query'), async (req, res) => {
  ok(res, await service.listArticles(getQuery<ListArticlesQuery>(req)));
});

articlesRouter.get('/:slug', optionalAuth, validate(slugParamSchema, 'params'), async (req, res) => {
  ok(res, { article: await service.getArticle(req.params.slug as string, req.user, req.ip) });
});

articlesRouter.get('/:slug/related', validate(slugParamSchema, 'params'), async (req, res) => {
  ok(res, { articles: await service.getRelated(req.params.slug as string) });
});

articlesRouter.post('/:slug/like', requireAuth, validate(slugParamSchema, 'params'), async (req, res) => {
  ok(res, await service.toggleLike(req.user!.id, req.params.slug as string));
});
