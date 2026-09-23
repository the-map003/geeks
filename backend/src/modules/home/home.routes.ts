import { Router } from 'express';
import { ok } from '../../utils/response.js';
import { getHome } from './home.service.js';

export const homeRouter = Router();

homeRouter.get('/', async (_req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=60');
  ok(res, await getHome());
});
