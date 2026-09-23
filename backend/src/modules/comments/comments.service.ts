import type { CommentTarget, Prisma } from '@prisma/client';
import { prisma } from '../../utils/prisma.js';
import { ApiError } from '../../utils/errors.js';
import { paginate } from '../../utils/response.js';
import { toSkipTake } from '../../utils/pagination.js';
import { hasRole, type AuthUser } from '../../types/auth.js';
import type { CreateCommentInput, ListCommentsQuery, ReportCommentInput } from './comments.schemas.js';

const targetColumn: Record<CommentTarget, 'articleId' | 'problemId' | 'tutorialLessonId' | 'courseId' | 'quizId'> = {
  ARTICLE: 'articleId',
  PROBLEM: 'problemId',
  TUTORIAL_LESSON: 'tutorialLessonId',
  COURSE: 'courseId',
  QUIZ: 'quizId',
};

const commentInclude = {
  author: { select: { id: true, username: true, role: true, profile: { select: { displayName: true, avatarUrl: true } } } },
} satisfies Prisma.CommentInclude;

type CommentRow = Prisma.CommentGetPayload<{ include: typeof commentInclude }>;

function serialize(c: CommentRow, likedIds: Set<string>, viewer?: AuthUser) {
  const hiddenForViewer = c.isHidden && !(viewer && hasRole(viewer.role, 'EDITOR'));
  return {
    id: c.id,
    content: c.isDeleted ? '[deleted]' : hiddenForViewer ? '[hidden by moderators]' : c.content,
    likeCount: c.likeCount,
    replyCount: c.replyCount,
    isDeleted: c.isDeleted,
    isHidden: c.isHidden,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    parentId: c.parentId,
    author: {
      id: c.author.id,
      username: c.author.username,
      role: c.author.role,
      displayName: c.author.profile?.displayName ?? c.author.username,
      avatarUrl: c.author.profile?.avatarUrl ?? null,
    },
    liked: likedIds.has(c.id),
  };
}

async function likedSet(viewer: AuthUser | undefined, ids: string[]): Promise<Set<string>> {
  if (!viewer || ids.length === 0) return new Set();
  const rows = await prisma.commentLike.findMany({ where: { userId: viewer.id, commentId: { in: ids } }, select: { commentId: true } });
  return new Set(rows.map((r) => r.commentId));
}

async function assertTargetExists(type: CommentTarget, id: string) {
  const published = { id, status: 'PUBLISHED' as const };
  let exists: unknown;
  switch (type) {
    case 'ARTICLE':
      exists = await prisma.article.findFirst({ where: published, select: { id: true } });
      break;
    case 'PROBLEM':
      exists = await prisma.problem.findFirst({ where: published, select: { id: true } });
      break;
    case 'COURSE':
      exists = await prisma.course.findFirst({ where: published, select: { id: true } });
      break;
    case 'QUIZ':
      exists = await prisma.quiz.findFirst({ where: published, select: { id: true } });
      break;
    case 'TUTORIAL_LESSON':
      exists = await prisma.tutorialLesson.findFirst({ where: { id, tutorial: { status: 'PUBLISHED' } }, select: { id: true } });
      break;
  }
  if (!exists) throw ApiError.notFound('Content not found');
}

export async function listComments(query: ListCommentsQuery, viewer?: AuthUser) {
  const column = targetColumn[query.targetType];
  const where: Prisma.CommentWhereInput = { [column]: query.targetId, parentId: null };
  const orderBy: Prisma.CommentOrderByWithRelationInput[] =
    query.sort === 'top' ? [{ likeCount: 'desc' }, { createdAt: 'desc' }] : query.sort === 'oldest' ? [{ createdAt: 'asc' }] : [{ createdAt: 'desc' }];

  const [roots, total] = await Promise.all([
    prisma.comment.findMany({
      where,
      orderBy,
      ...toSkipTake(query),
      include: { ...commentInclude, replies: { orderBy: { createdAt: 'asc' }, take: 3, include: commentInclude } },
    }),
    prisma.comment.count({ where }),
  ]);

  const allIds = roots.flatMap((r) => [r.id, ...r.replies.map((x) => x.id)]);
  const liked = await likedSet(viewer, allIds);

  const items = roots.map((r) => ({
    ...serialize(r, liked, viewer),
    replies: r.replies.map((x) => serialize(x, liked, viewer)),
  }));
  return paginate(items, total, query.page, query.pageSize);
}

export async function listReplies(parentId: string, page: number, pageSize: number, viewer?: AuthUser) {
  const where = { parentId };
  const [rows, total] = await Promise.all([
    prisma.comment.findMany({ where, orderBy: { createdAt: 'asc' }, skip: (page - 1) * pageSize, take: pageSize, include: commentInclude }),
    prisma.comment.count({ where }),
  ]);
  const liked = await likedSet(viewer, rows.map((r) => r.id));
  return paginate(rows.map((r) => serialize(r, liked, viewer)), total, page, pageSize);
}

export async function createComment(viewer: AuthUser, input: CreateCommentInput) {
  const commentsEnabled = await prisma.siteSetting.findUnique({ where: { key: 'features.comments' } });
  if (commentsEnabled && commentsEnabled.value === false) throw ApiError.forbidden('Comments are currently disabled');

  await assertTargetExists(input.targetType, input.targetId);
  const column = targetColumn[input.targetType];

  let parentId: string | null = null;
  if (input.parentId) {
    const parent = await prisma.comment.findUnique({ where: { id: input.parentId } });
    if (!parent || parent.isDeleted) throw ApiError.notFound('Parent comment not found');
    if (parent[column] !== input.targetId) throw ApiError.badRequest('Parent comment belongs to different content');
    // One nesting level: replying to a reply attaches to the root.
    parentId = parent.parentId ?? parent.id;
  }

  const comment = await prisma.$transaction(async (tx) => {
    const created = await tx.comment.create({
      data: { authorId: viewer.id, targetType: input.targetType, [column]: input.targetId, parentId, content: input.content },
      include: commentInclude,
    });
    if (parentId) await tx.comment.update({ where: { id: parentId }, data: { replyCount: { increment: 1 } } });
    if (input.targetType === 'ARTICLE') await tx.article.update({ where: { id: input.targetId }, data: { commentCount: { increment: 1 } } });
    return created;
  });

  if (parentId) {
    const parent = await prisma.comment.findUnique({ where: { id: parentId }, select: { authorId: true } });
    if (parent && parent.authorId !== viewer.id) {
      await prisma.notification
        .create({
          data: {
            userId: parent.authorId,
            type: 'COMMENT_REPLY',
            title: `${comment.author.profile?.displayName ?? viewer.username} replied to your comment`,
            body: input.content.slice(0, 140),
          },
        })
        .catch(() => undefined);
    }
  }

  return serialize(comment, new Set(), viewer);
}

export async function updateComment(viewer: AuthUser, id: string, content: string) {
  const comment = await prisma.comment.findUnique({ where: { id } });
  if (!comment || comment.isDeleted) throw ApiError.notFound('Comment not found');
  if (comment.authorId !== viewer.id) throw ApiError.forbidden('You can only edit your own comments');
  const updated = await prisma.comment.update({ where: { id }, data: { content }, include: commentInclude });
  const liked = await likedSet(viewer, [id]);
  return serialize(updated, liked, viewer);
}

export async function deleteComment(viewer: AuthUser, id: string) {
  const comment = await prisma.comment.findUnique({ where: { id } });
  if (!comment || comment.isDeleted) throw ApiError.notFound('Comment not found');
  const isModerator = hasRole(viewer.role, 'EDITOR');
  if (comment.authorId !== viewer.id && !isModerator) throw ApiError.forbidden();

  await prisma.$transaction(async (tx) => {
    await tx.comment.update({ where: { id }, data: { isDeleted: true, content: '' } });
    if (comment.articleId) await tx.article.update({ where: { id: comment.articleId }, data: { commentCount: { decrement: 1 } } });
  });
  return { moderated: comment.authorId !== viewer.id };
}

export async function toggleLike(viewer: AuthUser, id: string) {
  const comment = await prisma.comment.findUnique({ where: { id }, select: { id: true, isDeleted: true } });
  if (!comment || comment.isDeleted) throw ApiError.notFound('Comment not found');
  const existing = await prisma.commentLike.findUnique({ where: { userId_commentId: { userId: viewer.id, commentId: id } } });
  if (existing) {
    const [, updated] = await prisma.$transaction([
      prisma.commentLike.delete({ where: { id: existing.id } }),
      prisma.comment.update({ where: { id }, data: { likeCount: { decrement: 1 } }, select: { likeCount: true } }),
    ]);
    return { liked: false, likeCount: Math.max(0, updated.likeCount) };
  }
  const [, updated] = await prisma.$transaction([
    prisma.commentLike.create({ data: { userId: viewer.id, commentId: id } }),
    prisma.comment.update({ where: { id }, data: { likeCount: { increment: 1 } }, select: { likeCount: true } }),
  ]);
  return { liked: true, likeCount: updated.likeCount };
}

export async function reportComment(viewer: AuthUser, id: string, input: ReportCommentInput) {
  const comment = await prisma.comment.findUnique({ where: { id }, select: { id: true, authorId: true } });
  if (!comment) throw ApiError.notFound('Comment not found');
  if (comment.authorId === viewer.id) throw ApiError.badRequest('You cannot report your own comment');
  const existing = await prisma.report.findFirst({ where: { reporterId: viewer.id, commentId: id, status: 'OPEN' } });
  if (existing) return { report: existing, duplicate: true };
  const report = await prisma.report.create({
    data: { reporterId: viewer.id, targetType: 'COMMENT', commentId: id, reason: input.reason, details: input.details },
  });
  return { report, duplicate: false };
}
