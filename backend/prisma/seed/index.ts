/**
 * Prisma seed entry point: `npm run db:seed` (from backend) or `npm run db:seed` (root).
 * Wipes all application tables and repopulates them with original demo content.
 * Refuses to run against a production database unless SEED_ALLOW_PRODUCTION=true.
 */
import { PrismaClient } from '@prisma/client';
import { seedUsers } from './users.js';
import {
  seedArticles,
  seedCourses,
  seedProblems,
  seedQuizzes,
  seedTaxonomy,
  seedTutorials,
  type SeededContent,
} from './content.js';
import { seedCommunity } from './community.js';

const prisma = new PrismaClient();

async function truncateAll() {
  const rows = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  if (rows.length === 0) return;
  const list = rows.map((r) => `"${r.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.SEED_ALLOW_PRODUCTION !== 'true') {
    throw new Error('Refusing to seed a production database. Set SEED_ALLOW_PRODUCTION=true to override.');
  }

  const started = Date.now();
  console.log('Clearing existing data ...');
  await truncateAll();

  console.log('Seeding users ...');
  const users = await seedUsers(prisma);

  console.log('Seeding taxonomy ...');
  const { categoryIds, tagIds, topicIds } = await seedTaxonomy(prisma);

  console.log('Seeding articles ...');
  const articleIds = await seedArticles(prisma, users, categoryIds, tagIds);

  console.log('Seeding tutorials ...');
  const { tutorialIds, tutorialLessonIds } = await seedTutorials(prisma, users, categoryIds);

  console.log('Seeding courses ...');
  const { courseIds, courseLessonIds } = await seedCourses(prisma, users, categoryIds);

  console.log('Seeding problems ...');
  const problemIds = await seedProblems(prisma, users, categoryIds, topicIds);

  console.log('Seeding quizzes ...');
  const quizIds = await seedQuizzes(prisma, users, categoryIds);

  const content: SeededContent = {
    categoryIds,
    tagIds,
    topicIds,
    articleIds,
    tutorialIds,
    tutorialLessonIds,
    courseIds,
    courseLessonIds,
    problemIds,
    quizIds,
  };

  console.log('Seeding community data (comments, bookmarks, progress, submissions, attempts) ...');
  await seedCommunity(prisma, users, content);

  const counts = {
    users: await prisma.user.count(),
    categories: await prisma.category.count(),
    articles: await prisma.article.count(),
    tutorialLessons: await prisma.tutorialLesson.count(),
    courses: await prisma.course.count(),
    courseLessons: await prisma.courseLesson.count(),
    problems: await prisma.problem.count(),
    testCases: await prisma.testCase.count(),
    quizzes: await prisma.quiz.count(),
    questions: await prisma.question.count(),
    comments: await prisma.comment.count(),
    submissions: await prisma.submission.count(),
  };
  console.table(counts);
  console.log(`Seed completed in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
