import { prisma } from './prisma.js';
import { logger } from './logger.js';

type ActivityField = 'problemsSolved' | 'lessonsCompleted' | 'quizzesTaken' | 'articlesRead';

function todayUtc(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Increments one activity counter for the user's current UTC day. Never throws. */
export async function recordActivity(userId: string, field: ActivityField, amount = 1): Promise<void> {
  const date = todayUtc();
  try {
    await prisma.userActivity.upsert({
      where: { userId_date: { userId, date } },
      create: { userId, date, [field]: amount },
      update: { [field]: { increment: amount } },
    });
  } catch (err) {
    logger.warn({ err, userId, field }, 'Failed to record activity');
  }
}
