import { prisma } from '../../utils/prisma.js';
import { getUserStats } from './users.service.js';
import { inProgressTutorials } from '../tutorials/tutorials.service.js';
import { myEnrollments } from '../courses/courses.service.js';
import { myAttempts } from '../quizzes/quizzes.service.js';
import type { AuthUser } from '../../types/auth.js';
import { problemSummaryInclude, toProblemSummary } from '../../utils/content-serializers.js';

export async function getDashboard(user: AuthUser) {
  const [stats, tutorials, enrollments, attempts, recentSubmissions, bookmarks, notifications, recommended] = await Promise.all([
    getUserStats(user.id),
    inProgressTutorials(user.id, 4),
    myEnrollments(user.id),
    myAttempts(user, 5),
    prisma.submission.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: { id: true, language: true, status: true, runtimeMs: true, passedCount: true, totalCount: true, createdAt: true, problem: { select: { id: true, title: true, slug: true, difficulty: true } } },
    }),
    prisma.bookmark.count({ where: { userId: user.id } }),
    prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 5 }),
    // Unsolved problems in the difficulty band the user is working on.
    prisma.problem.findMany({
      where: { status: 'PUBLISHED', userStates: { none: { userId: user.id } } },
      orderBy: [{ difficulty: 'asc' }, { submissionCount: 'desc' }],
      take: 4,
      include: problemSummaryInclude,
    }),
  ]);

  return {
    stats,
    continueLearning: {
      tutorials,
      courses: enrollments.filter((e) => !e.enrollment.completedAt).slice(0, 4),
    },
    recentSubmissions,
    recentAttempts: attempts,
    bookmarkCount: bookmarks,
    notifications,
    recommendedProblems: recommended.map((p) => toProblemSummary(p)),
  };
}

export async function getActivity(userId: string, days: number) {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);
  since.setUTCHours(0, 0, 0, 0);
  const rows = await prisma.userActivity.findMany({ where: { userId, date: { gte: since } }, orderBy: { date: 'asc' } });
  return rows.map((r) => ({
    date: r.date.toISOString().slice(0, 10),
    count: r.problemsSolved + r.lessonsCompleted + r.quizzesTaken + r.articlesRead,
    problemsSolved: r.problemsSolved,
    lessonsCompleted: r.lessonsCompleted,
    quizzesTaken: r.quizzesTaken,
    articlesRead: r.articlesRead,
  }));
}

export async function markNotificationsRead(userId: string, ids?: string[]) {
  await prisma.notification.updateMany({ where: { userId, readAt: null, ...(ids?.length ? { id: { in: ids } } : {}) }, data: { readAt: new Date() } });
}
