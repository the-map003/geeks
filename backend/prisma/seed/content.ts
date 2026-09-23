import type { PrismaClient } from '@prisma/client';
import { categories, tags, topics } from './data/taxonomy.js';
import { articles } from './data/articles.js';
import { tutorials } from './data/tutorials.js';
import { courses } from './data/courses.js';
import { problems } from './data/problems.js';
import { quizzes } from './data/quizzes.js';
import type { UserMap } from './users.js';
import { daysAgo, readingTime } from './utils.js';

export interface SeededContent {
  categoryIds: Record<string, string>;
  tagIds: Record<string, string>;
  topicIds: Record<string, string>;
  articleIds: Record<string, string>;
  tutorialIds: Record<string, string>;
  tutorialLessonIds: Record<string, string[]>; // tutorial slug -> lesson ids in order
  courseIds: Record<string, string>;
  courseLessonIds: Record<string, string[]>; // course slug -> lesson ids in order
  problemIds: Record<string, string>;
  quizIds: Record<string, string>;
}

function requireId(map: Record<string, string>, slug: string, kind: string): string {
  const id = map[slug];
  if (!id) throw new Error(`Seed error: unknown ${kind} slug "${slug}"`);
  return id;
}

export async function seedTaxonomy(prisma: PrismaClient) {
  const categoryIds: Record<string, string> = {};
  let order = 0;
  for (const cat of categories) {
    const parent = await prisma.category.create({
      data: {
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        icon: cat.icon,
        color: cat.color,
        isFeatured: cat.isFeatured ?? false,
        showInNav: cat.showInNav ?? false,
        order: order++,
      },
    });
    categoryIds[cat.slug] = parent.id;
    let childOrder = 0;
    for (const child of cat.children ?? []) {
      const c = await prisma.category.create({
        data: {
          name: child.name,
          slug: child.slug,
          description: child.description,
          icon: child.icon ?? cat.icon,
          color: cat.color,
          parentId: parent.id,
          order: childOrder++,
        },
      });
      categoryIds[child.slug] = c.id;
    }
  }

  const tagIds: Record<string, string> = {};
  for (const tag of tags) {
    const t = await prisma.tag.create({ data: tag });
    tagIds[tag.slug] = t.id;
  }

  const topicIds: Record<string, string> = {};
  for (const topic of topics) {
    const t = await prisma.topic.create({ data: topic });
    topicIds[topic.slug] = t.id;
  }

  return { categoryIds, tagIds, topicIds };
}

export async function seedArticles(
  prisma: PrismaClient,
  users: UserMap,
  categoryIds: Record<string, string>,
  tagIds: Record<string, string>,
) {
  const articleIds: Record<string, string> = {};
  for (const a of articles) {
    const published = daysAgo(a.publishedDaysAgo);
    const article = await prisma.article.create({
      data: {
        title: a.title,
        slug: a.slug,
        excerpt: a.excerpt,
        content: a.content,
        status: 'PUBLISHED',
        difficulty: a.difficulty,
        authorId: users[a.authorKey].id,
        categoryId: requireId(categoryIds, a.categorySlug, 'category'),
        readingTimeMin: readingTime(a.content),
        viewCount: a.viewCount ?? 0,
        isFeatured: a.isFeatured ?? false,
        publishedAt: published,
        createdAt: published,
        tags: {
          create: a.tags.map((slug) => ({ tagId: requireId(tagIds, slug, 'tag') })),
        },
      },
    });
    articleIds[a.slug] = article.id;
  }
  return articleIds;
}

export async function seedTutorials(prisma: PrismaClient, users: UserMap, categoryIds: Record<string, string>) {
  const tutorialIds: Record<string, string> = {};
  const tutorialLessonIds: Record<string, string[]> = {};
  for (const t of tutorials) {
    const tutorial = await prisma.tutorial.create({
      data: {
        title: t.title,
        slug: t.slug,
        description: t.description,
        status: 'PUBLISHED',
        categoryId: requireId(categoryIds, t.categorySlug, 'category'),
        authorId: users[t.authorKey].id,
        order: t.order,
        publishedAt: daysAgo(200),
      },
    });
    tutorialIds[t.slug] = tutorial.id;
    tutorialLessonIds[t.slug] = [];
    let lessonOrder = 0;
    let chapterOrder = 0;
    for (const ch of t.chapters) {
      const chapter = await prisma.tutorialChapter.create({
        data: { tutorialId: tutorial.id, title: ch.title, order: chapterOrder++ },
      });
      for (const l of ch.lessons) {
        const lesson = await prisma.tutorialLesson.create({
          data: {
            tutorialId: tutorial.id,
            chapterId: chapter.id,
            title: l.title,
            slug: l.slug,
            content: l.content,
            order: lessonOrder++,
            readingTimeMin: l.readingTimeMin ?? readingTime(l.content),
          },
        });
        tutorialLessonIds[t.slug]!.push(lesson.id);
      }
    }
  }
  return { tutorialIds, tutorialLessonIds };
}

export async function seedCourses(prisma: PrismaClient, users: UserMap, categoryIds: Record<string, string>) {
  const courseIds: Record<string, string> = {};
  const courseLessonIds: Record<string, string[]> = {};
  for (const c of courses) {
    const course = await prisma.course.create({
      data: {
        title: c.title,
        slug: c.slug,
        subtitle: c.subtitle,
        description: c.description,
        level: c.level,
        status: 'PUBLISHED',
        price: c.price,
        isFree: c.price === 0,
        durationHours: c.durationHours,
        categoryId: requireId(categoryIds, c.categorySlug, 'category'),
        instructorId: users[c.instructorKey].id,
        enrollmentCount: c.enrollmentCount,
        ratingAvg: c.ratingAvg,
        ratingCount: c.ratingCount,
        isFeatured: c.isFeatured ?? false,
        publishedAt: daysAgo(150),
      },
    });
    courseIds[c.slug] = course.id;
    courseLessonIds[c.slug] = [];
    let moduleOrder = 0;
    for (const m of c.modules) {
      const mod = await prisma.courseModule.create({
        data: { courseId: course.id, title: m.title, description: m.description, order: moduleOrder++ },
      });
      let lessonOrder = 0;
      for (const l of m.lessons) {
        const lesson = await prisma.courseLesson.create({
          data: {
            moduleId: mod.id,
            title: l.title,
            slug: l.slug,
            content: l.content,
            durationMin: l.durationMin,
            order: lessonOrder++,
            isPreview: l.isPreview ?? false,
          },
        });
        courseLessonIds[c.slug]!.push(lesson.id);
      }
    }
  }
  return { courseIds, courseLessonIds };
}

export async function seedProblems(
  prisma: PrismaClient,
  users: UserMap,
  categoryIds: Record<string, string>,
  topicIds: Record<string, string>,
) {
  const problemIds: Record<string, string> = {};
  for (const p of problems) {
    const problem = await prisma.problem.create({
      data: {
        title: p.title,
        slug: p.slug,
        description: p.description,
        difficulty: p.difficulty,
        status: 'PUBLISHED',
        categoryId: requireId(categoryIds, p.categorySlug, 'category'),
        authorId: users[p.authorKey].id,
        constraints: p.constraints,
        inputFormat: p.inputFormat,
        outputFormat: p.outputFormat,
        hints: p.hints,
        editorial: p.editorial,
        expectedTimeComplexity: p.expectedTimeComplexity,
        expectedSpaceComplexity: p.expectedSpaceComplexity,
        points: p.points,
        companyTags: p.companyTags,
        isProblemOfTheDay: p.isProblemOfTheDay ?? false,
        publishedAt: daysAgo(120),
        topics: { create: p.topics.map((slug) => ({ topicId: requireId(topicIds, slug, 'topic') })) },
        examples: {
          create: p.examples.map((e, i) => ({ input: e.input, output: e.output, explanation: e.explanation, order: i })),
        },
        starterCode: {
          create: (Object.keys(p.starterCode) as Array<keyof typeof p.starterCode>).map((lang) => ({
            language: lang,
            code: p.starterCode[lang],
          })),
        },
        testCases: {
          create: p.testCases.map((t, i) => ({
            input: t.input,
            expectedOutput: t.expectedOutput,
            isSample: t.isSample ?? false,
            order: i,
          })),
        },
      },
    });
    problemIds[p.slug] = problem.id;
  }
  return problemIds;
}

export async function seedQuizzes(prisma: PrismaClient, users: UserMap, categoryIds: Record<string, string>) {
  const quizIds: Record<string, string> = {};
  for (const q of quizzes) {
    const quiz = await prisma.quiz.create({
      data: {
        title: q.title,
        slug: q.slug,
        description: q.description,
        categoryId: requireId(categoryIds, q.categorySlug, 'category'),
        difficulty: q.difficulty,
        status: 'PUBLISHED',
        authorId: users[q.authorKey].id,
        timeLimitMin: q.timeLimitMin,
        publishedAt: daysAgo(90),
        questions: {
          create: q.questions.map((question, qi) => ({
            prompt: question.prompt,
            explanation: question.explanation,
            order: qi,
            points: question.points ?? 1,
            options: {
              create: question.options.map((o, oi) => ({ text: o.text, isCorrect: o.isCorrect, order: oi })),
            },
          })),
        },
      },
    });
    quizIds[q.slug] = quiz.id;
  }
  return quizIds;
}
