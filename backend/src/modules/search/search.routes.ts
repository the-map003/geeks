import { Router } from 'express';
import { validate, getQuery } from '../../middleware/validate.js';
import { ok } from '../../utils/response.js';
import { search, searchQuerySchema, type SearchQuery } from './search.service.js';

export const searchRouter = Router();

searchRouter.get('/', validate(searchQuerySchema, 'query'), async (req, res) => {
  ok(res, await search(getQuery<SearchQuery>(req)));
});
