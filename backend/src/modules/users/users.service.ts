import { prisma } from '../../utils/prisma.js';
import { ApiError } from '../../utils/errors.js';
import { toAuthUser, toPublicUser } from '../../utils/serializers.js';
import type { UpdateProfileInput } from './users.schemas.js';

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
  if (!user) throw ApiError.notFound('User not found');
  const stats = await getUserStats(userId);
  return { ...toAuthUser(user), stats };
}

export async function updateMe(userId: string, input: UpdateProfileInput) {
  const { username, ...profile } = input;

  if (username) {
    const taken = await prisma.user.findFirst({ where: { username, NOT: { id: userId } }, select: { id: true } });
    if (taken) throw ApiError.conflict('This username is already taken');
  }

  const profileData = Object.fromEntries(Object.entries(profile).filter(([, v]) => v !== undefined));

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(username ? { username } : {}),
      profile: {
        upsert: {
          create: { displayName: (profileData.displayName as string | undefined) ?? username ?? 'Learner', ...profileData },
          update: profileData,
        },
      },
    },
    include: { profile: true },
  });
  return toAuthUser(user);
}

export async function getPublicProfile(username: string) {
  const user = await prisma.user.findUnique({ where: { username: username.toLowerCase() }, include: { profile: true } });
  if (!user || !user.isActive) throw ApiError.notFound('User not found');
  const stats = await getUserStats(user.id);
  const recentSolved = await prisma.userProblemStatus.findMany({
    where: { userId: user.id, state: 'SOLVED' },
    orderBy: { solvedAt: 'desc' },
    take: 8,
    include: { problem: { select: { title: true, slug: true, difficulty: true } } },
  });
  return {
    ...toPublicUser(user),
    stats,
    recentSolved: recentSolved.map((s) => ({ ...s.problem, solvedAt: s.solvedAt })),
  };
}

export interface UserStats {
  solved: { total: number; byDifficulty: Record<string, number> };
  attempted: number;
  submissions: number;
  quizAttempts: number;
  lessonsCompleted: number;
  coursesEnrolled: number;
  articlesLiked: number;
  streak: { current: number; longest: number; activeDays: number };
}

export async function getUserStats(userId: string): Promise<UserStats> {
  const [solvedRows, attempted, submissions, quizAttempts, lessonsCompleted, courseLessons, coursesEnrolled, articlesLiked, activity] =
    await Promise.all([
      prisma.userProblemStatus.findMany({
        where: { userId, state: 'SOLVED' },
        select: { problem: { select: { difficulty: true } } },
      }),
      prisma.userProblemStatus.count({ where: { userId, state: 'ATTEMPTED' } }),
      prisma.submission.count({ where: { userId } }),
      prisma.quizAttempt.count({ where: { userId, status: 'SUBMITTED' } }),
      prisma.lessonProgress.count({ where: { userId } }),
      prisma.courseLessonProgress.count({ where: { userId } }),
      prisma.enrollment.count({ where: { userId } }),
      prisma.articleLike.count({ where: { userId } }),
      prisma.userActivity.findMany({ where: { userId }, select: { date: true }, orderBy: { date: 'desc' } }),
    ]);

  const byDifficulty: Record<string, number> = { SCHOOL: 0, BASIC: 0, EASY: 0, MEDIUM: 0, HARD: 0 };
  for (const row of solvedRows) byDifficulty[row.problem.difficulty] = (byDifficulty[row.problem.difficulty] ?? 0) + 1;

  return {
    solved: { total: solvedRows.length, byDifficulty },
    attempted,
    submissions,
    quizAttempts,
    lessonsCompleted: lessonsCompleted + courseLessons,
    coursesEnrolled,
    articlesLiked,
    streak: computeStreak(activity.map((a) => a.date)),
  };
}

/** Streak from a list of active dates (UTC days), newest first. */
export function computeStreak(dates: Date[]): { current: number; longest: number; activeDays: number } {
  if (dates.length === 0) return { current: 0, longest: 0, activeDays: 0 };
  const days = [...new Set(dates.map((d) => Math.floor(d.getTime() / 86_400_000)))].sort((a, b) => b - a);
  const today = Math.floor(Date.now() / 86_400_000);

  let current = 0;
  if (days[0] === today || days[0] === today - 1) {
    current = 1;
    for (let i = 1; i < days.length; i++) {
      if (days[i - 1]! - days[i]! === 1) current++;
      else break;
    }
  }

  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    if (days[i - 1]! - days[i]! === 1) {
      run++;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }
  return { current, longest: Math.max(longest, current), activeDays: days.length };
}
