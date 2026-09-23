import { Router } from 'express';
import { z } from 'zod';
import { validate, getQuery } from '../../middleware/validate.js';
import { optionalAuth, requireAuth } from '../../middleware/auth.js';
import { commentLimiter } from '../../middleware/rateLimit.js';
import { created, ok } from '../../utils/response.js';
import { paginationQuerySchema } from '../../utils/pagination.js';
import { audit } from '../../utils/audit.js';
import {
  createCommentSchema,
  listCommentsQuerySchema,
  reportCommentSchema,
  updateCommentSchema,
  type CreateCommentInput,
  type ListCommentsQuery,
  type ReportCommentInput,
} from './comments.schemas.js';
import * as service from './comments.service.js';

export const commentsRouter = Router();
const idParams = z.object({ id: z.string().min(1).max(64) });

commentsRouter.get('/', optionalAuth, validate(listCommentsQuerySchema, 'query'), async (req, res) => {
  ok(res, await service.listComments(getQuery<ListCommentsQuery>(req), req.user));
});

commentsRouter.get('/:id/replies', optionalAuth, validate(idParams, 'params'), validate(paginationQuerySchema, 'query'), async (req, res) => {
  const { page, pageSize } = getQuery<{ page: number; pageSize: number }>(req);
  ok(res, await service.listReplies(req.params.id as string, page, pageSize, req.user));
});

commentsRouter.post('/', requireAuth, commentLimiter, validate(createCommentSchema), async (req, res) => {
  created(res, { comment: await service.createComment(req.user!, req.body as CreateCommentInput) }, 'Comment posted');
});

commentsRouter.patch('/:id', requireAuth, validate(idParams, 'params'), validate(updateCommentSchema), async (req, res) => {
  ok(res, { comment: await service.updateComment(req.user!, req.params.id as string, (req.body as { content: string }).content) }, 'Comment updated');
});

commentsRouter.delete('/:id', requireAuth, validate(idParams, 'params'), async (req, res) => {
  const result = await service.deleteComment(req.user!, req.params.id as string);
  if (result.moderated) await audit(req, { action: 'COMMENT_DELETED_BY_MODERATOR', entityType: 'Comment', entityId: req.params.id as string });
  ok(res, { deleted: true }, 'Comment deleted');
});

commentsRouter.post('/:id/like', requireAuth, validate(idParams, 'params'), async (req, res) => {
  ok(res, await service.toggleLike(req.user!, req.params.id as string));
});

commentsRouter.post('/:id/report', requireAuth, commentLimiter, validate(idParams, 'params'), validate(reportCommentSchema), async (req, res) => {
  const result = await service.reportComment(req.user!, req.params.id as string, req.body as ReportCommentInput);
  ok(res, { reported: true }, result.duplicate ? 'You have already reported this comment' : 'Thanks, our moderators will review this comment');
});
