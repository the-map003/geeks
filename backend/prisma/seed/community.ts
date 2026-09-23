import type { PrismaClient } from '@prisma/client';
import type { UserMap } from './users.js';
import type { SeededContent } from './content.js';
import { problems } from './data/problems.js';
import { daysAgo } from './utils.js';

const commentBank = [
  'Really clear explanation, the diagrams in my head finally clicked.',
  'Could you add a note about the edge case when the input is empty?',
  'The complexity section helped me a lot for my interview prep. Thanks!',
  'I implemented this in Java and it worked on the first try.',
  'Small typo in the second paragraph, otherwise great article.',
  'How does this compare to the recursive approach in terms of memory?',
  'Bookmarked. This is the best summary I have read on the topic.',
  'The output block after the code makes it very easy to verify.',
];

const replyBank = [
  'Good catch, that case is handled by the early return at the top of the loop.',
  'Glad it helped! We are adding a follow-up article on the iterative version.',
  'Fixed the typo, thank you for reporting it.',
  'The recursive version uses O(n) stack space; the iterative one is O(1).',
];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length]!;
}

export async function seedCommunity(prisma: PrismaClient, users: UserMap, content: SeededContent) {
  const { student, learner2, learner3, editor } = users;
  const articleIds = Object.values(content.articleIds);
  const problemIds = Object.values(content.problemIds);

  // ---- Comments on the first 10 articles with replies and likes ----
  let i = 0;
  for (const articleId of articleIds.slice(0, 10)) {
    const rootAuthors = [student, learner2, learner3];
    const roots = [];
    for (let k = 0; k < 2; k++) {
      const author = pick(rootAuthors, i + k);
      const root = await prisma.comment.create({
        data: {
          authorId: author.id,
          targetType: 'ARTICLE',
          articleId,
          content: pick(commentBank, i + k),
          createdAt: daysAgo(30 - ((i + k) % 25)),
        },
      });
      roots.push(root);
    }
    const reply = await prisma.comment.create({
      data: {
        authorId: editor.id,
        targetType: 'ARTICLE',
        articleId,
        parentId: roots[0]!.id,
        content: pick(replyBank, i),
        createdAt: daysAgo(28 - (i % 25)),
      },
    });
    await prisma.comment.update({ where: { id: roots[0]!.id }, data: { replyCount: 1 } });
    await prisma.commentLike.createMany({
      data: [
        { userId: learner2.id, commentId: roots[0]!.id },
        { userId: learner3.id, commentId: roots[0]!.id },
        { userId: student.id, commentId: reply.id },
      ],
    });
    await prisma.comment.update({ where: { id: roots[0]!.id }, data: { likeCount: 2 } });
    await prisma.comment.update({ where: { id: reply.id }, data: { likeCount: 1 } });
    await prisma.article.update({ where: { id: articleId }, data: { commentCount: 3 } });
    i++;
  }

  // ---- Comments on 3 problems ----
  for (const problemId of problemIds.slice(0, 3)) {
    await prisma.comment.create({
      data: {
        authorId: learner2.id,
        targetType: 'PROBLEM',
        problemId,
        content: 'Hint 2 was the key for me. Try to think about what information you need to remember while scanning.',
        createdAt: daysAgo(12),
      },
    });
  }

  // ---- Article likes ----
  for (const [idx, articleId] of articleIds.entries()) {
    const likers = [student, learner2, learner3].slice(0, (idx % 3) + 1);
    await prisma.articleLike.createMany({ data: likers.map((u) => ({ userId: u.id, articleId })) });
    await prisma.article.update({ where: { id: articleId }, data: { likeCount: likers.length } });
  }

  // ---- Article views over the last 14 days (feeds "Trending") ----
  const viewRows: Array<{ articleId: string; userId: string | null; viewedAt: Date }> = [];
  articleIds.forEach((articleId, idx) => {
    const perDay = 3 + ((idx * 7) % 9);
    for (let d = 0; d < 14; d++) {
      for (let v = 0; v < perDay; v++) {
        viewRows.push({
          articleId,
          userId: v % 4 === 0 ? student.id : null,
          viewedAt: daysAgo(d),
        });
      }
    }
  });
  await prisma.articleView.createMany({ data: viewRows });

  // ---- Bookmarks for the student ----
  const bookmarkArticles = articleIds.slice(0, 4);
  await prisma.bookmark.createMany({
    data: bookmarkArticles.map((articleId) => ({ userId: student.id, type: 'ARTICLE' as const, articleId })),
  });
  await prisma.bookmark.createMany({
    data: problemIds.slice(0, 3).map((problemId) => ({ userId: student.id, type: 'PROBLEM' as const, problemId })),
  });
  const firstTutorialId = Object.values(content.tutorialIds)[0];
  if (firstTutorialId) {
    await prisma.bookmark.create({ data: { userId: student.id, type: 'TUTORIAL', tutorialId: firstTutorialId } });
  }
  const firstCourseId = Object.values(content.courseIds)[0];
  if (firstCourseId) {
    await prisma.bookmark.create({ data: { userId: student.id, type: 'COURSE', courseId: firstCourseId } });
  }

  // ---- Tutorial progress: student completed the first 4 lessons of the first tutorial ----
  const [firstTutorialSlug] = Object.keys(content.tutorialLessonIds);
  if (firstTutorialSlug) {
    const lessons = content.tutorialLessonIds[firstTutorialSlug]!.slice(0, 4);
    await prisma.lessonProgress.createMany({
      data: lessons.map((lessonId, idx) => ({ userId: student.id, lessonId, completedAt: daysAgo(10 - idx) })),
    });
  }

  // ---- Enrollments + course progress ----
  const courseSlugs = Object.keys(content.courseIds);
  for (const [idx, slug] of courseSlugs.slice(0, 2).entries()) {
    const courseId = content.courseIds[slug]!;
    const lessonIds = content.courseLessonIds[slug]!;
    const completed = idx === 0 ? Math.min(5, lessonIds.length) : 1;
    await prisma.enrollment.create({
      data: {
        userId: student.id,
        courseId,
        enrolledAt: daysAgo(20),
        progressPercent: Math.round((completed / lessonIds.length) * 100),
        lastLessonId: lessonIds[completed - 1],
      },
    });
    await prisma.courseLessonProgress.createMany({
      data: lessonIds.slice(0, completed).map((lessonId, k) => ({ userId: student.id, lessonId, completedAt: daysAgo(18 - k) })),
    });
  }
  await prisma.enrollment.create({
    data: { userId: learner2.id, courseId: content.courseIds[courseSlugs[0]!]!, enrolledAt: daysAgo(5), progressPercent: 0 },
  });

  // ---- Submissions: student solved 6 problems (accepted), attempted 2 (wrong answer) ----
  const solvedSlugs = problems.slice(0, 6).map((p) => p.slug);
  const attemptedSlugs = problems.slice(6, 8).map((p) => p.slug);
  let day = 25;
  for (const slug of solvedSlugs) {
    const p = problems.find((x) => x.slug === slug)!;
    const problemId = content.problemIds[slug]!;
    const total = p.testCases.length;
    // one failed attempt followed by an accepted one for realism
    await prisma.submission.create({
      data: {
        userId: student.id,
        problemId,
        language: 'PYTHON',
        sourceCode: p.starterCode.PYTHON,
        status: 'WRONG_ANSWER',
        runtimeMs: 18,
        memoryKb: 9200,
        passedCount: Math.max(0, Math.floor(total / 3)),
        totalCount: total,
        testResults: p.testCases.map((t, k) => ({
          id: `t${k}`,
          status: k < Math.floor(total / 3) ? 'ACCEPTED' : 'WRONG_ANSWER',
          isSample: t.isSample ?? false,
          runtimeMs: 3,
        })),
        createdAt: daysAgo(day),
        judgedAt: daysAgo(day),
      },
    });
    await prisma.submission.create({
      data: {
        userId: student.id,
        problemId,
        language: 'PYTHON',
        sourceCode: p.referenceSolutions.PYTHON ?? p.starterCode.PYTHON,
        status: 'ACCEPTED',
        runtimeMs: 22,
        memoryKb: 9400,
        passedCount: total,
        totalCount: total,
        testResults: p.testCases.map((t, k) => ({ id: `t${k}`, status: 'ACCEPTED', isSample: t.isSample ?? false, runtimeMs: 3 })),
        createdAt: daysAgo(day - 1),
        judgedAt: daysAgo(day - 1),
      },
    });
    await prisma.userProblemStatus.create({
      data: { userId: student.id, problemId, state: 'SOLVED', solvedAt: daysAgo(day - 1), lastAttemptAt: daysAgo(day - 1) },
    });
    await prisma.problem.update({
      where: { id: problemId },
      data: { submissionCount: { increment: 2 }, acceptedCount: { increment: 1 } },
    });
    day -= 3;
  }
  for (const slug of attemptedSlugs) {
    const p = problems.find((x) => x.slug === slug)!;
    const problemId = content.problemIds[slug]!;
    const total = p.testCases.length;
    await prisma.submission.create({
      data: {
        userId: student.id,
        problemId,
        language: 'JAVASCRIPT',
        sourceCode: p.starterCode.JAVASCRIPT,
        status: 'WRONG_ANSWER',
        runtimeMs: 40,
        memoryKb: 30200,
        passedCount: 1,
        totalCount: total,
        testResults: p.testCases.map((t, k) => ({ id: `t${k}`, status: k === 0 ? 'ACCEPTED' : 'WRONG_ANSWER', isSample: t.isSample ?? false, runtimeMs: 5 })),
        createdAt: daysAgo(2),
        judgedAt: daysAgo(2),
      },
    });
    await prisma.userProblemStatus.create({
      data: { userId: student.id, problemId, state: 'ATTEMPTED', lastAttemptAt: daysAgo(2) },
    });
    await prisma.problem.update({ where: { id: problemId }, data: { submissionCount: { increment: 1 } } });
  }

  // Background submission volume from other learners so accuracy percentages look realistic.
  for (const [idx, p] of problems.entries()) {
    const problemId = content.problemIds[p.slug]!;
    const extraSubs = 40 + ((idx * 37) % 400);
    const extraAcc = Math.floor(extraSubs * (0.35 + ((idx * 13) % 50) / 100));
    await prisma.problem.update({
      where: { id: problemId },
      data: { submissionCount: { increment: extraSubs }, acceptedCount: { increment: extraAcc } },
    });
  }

  // ---- Quiz attempts for the student on the first two quizzes ----
  const quizSlugs = Object.keys(content.quizIds).slice(0, 2);
  for (const [idx, slug] of quizSlugs.entries()) {
    const quizId = content.quizIds[slug]!;
    const questions = await prisma.question.findMany({
      where: { quizId },
      include: { options: true },
      orderBy: { order: 'asc' },
    });
    const attempt = await prisma.quizAttempt.create({
      data: {
        userId: student.id,
        quizId,
        status: 'SUBMITTED',
        startedAt: daysAgo(6 + idx),
        submittedAt: daysAgo(6 + idx),
        totalCount: questions.length,
        maxScore: questions.reduce((s, q) => s + q.points, 0),
      },
    });
    let score = 0;
    let correct = 0;
    for (const [qi, q] of questions.entries()) {
      const correctOpt = q.options.find((o) => o.isCorrect)!;
      const wrongOpt = q.options.find((o) => !o.isCorrect)!;
      const answerCorrect = (qi + idx) % 4 !== 0; // ~75% correct
      const selected = answerCorrect ? correctOpt : wrongOpt;
      if (answerCorrect) {
        score += q.points;
        correct++;
      }
      await prisma.quizAnswer.create({
        data: { attemptId: attempt.id, questionId: q.id, selectedOptionId: selected.id, isCorrect: answerCorrect },
      });
    }
    await prisma.quizAttempt.update({ where: { id: attempt.id }, data: { score, correctCount: correct } });
    await prisma.quiz.update({ where: { id: quizId }, data: { attemptCount: { increment: 25 + idx * 10 } } });
  }

  // ---- Daily activity for a streak ----
  const activity = [];
  for (let d = 0; d < 30; d++) {
    if (d % 6 === 5) continue; // a missed day here and there, but the last 5 days are consecutive
    activity.push({
      userId: student.id,
      date: daysAgo(d),
      problemsSolved: d % 3 === 0 ? 1 : 0,
      lessonsCompleted: d % 2 === 0 ? 1 : 0,
      quizzesTaken: d % 7 === 0 ? 1 : 0,
      articlesRead: 1 + (d % 3),
    });
  }
  await prisma.userActivity.createMany({ data: activity });

  // ---- Notifications ----
  await prisma.notification.createMany({
    data: [
      { userId: student.id, type: 'ACHIEVEMENT', title: 'First problem solved!', body: 'You solved your first coding problem. Keep the streak going.', link: '/dashboard', createdAt: daysAgo(24) },
      { userId: student.id, type: 'COMMENT_REPLY', title: 'Eli Editor replied to your comment', link: `/articles`, createdAt: daysAgo(9) },
      { userId: student.id, type: 'SYSTEM', title: 'Welcome to GeeksHub', body: 'Explore tutorials, practice problems and quizzes.', link: '/', readAt: daysAgo(29), createdAt: daysAgo(30) },
    ],
  });

  // ---- Reports (one open, one resolved) ----
  const someComment = await prisma.comment.findFirst({ where: { targetType: 'ARTICLE' } });
  if (someComment) {
    await prisma.report.create({
      data: { reporterId: learner3.id, targetType: 'COMMENT', commentId: someComment.id, reason: 'SPAM', details: 'Looks like a duplicate post.', status: 'OPEN', createdAt: daysAgo(1) },
    });
    await prisma.report.create({
      data: {
        reporterId: learner2.id,
        targetType: 'COMMENT',
        commentId: someComment.id,
        reason: 'OFF_TOPIC',
        status: 'DISMISSED',
        resolvedById: users.admin.id,
        resolvedAt: daysAgo(3),
        resolutionNote: 'Comment is on topic.',
        createdAt: daysAgo(4),
      },
    });
  }

  // ---- Site settings ----
  await prisma.siteSetting.createMany({
    data: [
      { key: 'site.name', value: 'GeeksHub', description: 'Public site name', updatedById: users.superadmin.id },
      { key: 'site.tagline', value: 'Learn, practice and grow as a programmer.', description: 'Homepage tagline', updatedById: users.superadmin.id },
      { key: 'features.registration', value: true, description: 'Allow new user registration', updatedById: users.superadmin.id },
      { key: 'features.comments', value: true, description: 'Enable comments site-wide', updatedById: users.superadmin.id },
      { key: 'practice.maxSubmissionsPerMinute', value: 20, description: 'Per-user submission rate limit', updatedById: users.superadmin.id },
    ],
  });

  await prisma.auditLog.create({
    data: { actorId: users.superadmin.id, action: 'SEED_DATABASE', entityType: 'System', metadata: { source: 'prisma/seed' } },
  });
}
