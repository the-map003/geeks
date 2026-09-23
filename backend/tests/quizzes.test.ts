import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { api, auth, createUser, resetDatabase, type TestUser } from './helpers.js';
import { prisma } from '../src/utils/prisma.js';

let user: TestUser;
let other: TestUser;
let quizSlug: string;
let questionIds: string[] = [];
const correctOption: Record<string, string> = {};
const wrongOption: Record<string, string> = {};

beforeAll(async () => {
  await resetDatabase();
  user = await createUser('USER');
  other = await createUser('USER');
  const editor = await createUser('EDITOR');
  const quiz = await prisma.quiz.create({
    data: {
      title: 'Basics Quiz',
      slug: 'basics-quiz',
      description: 'Test quiz',
      status: 'PUBLISHED',
      authorId: editor.id,
      publishedAt: new Date(),
      questions: {
        create: [0, 1, 2].map((i) => ({
          prompt: `Question ${i + 1}?`,
          explanation: 'Because.',
          order: i,
          points: i === 2 ? 2 : 1,
          options: { create: [{ text: 'A', isCorrect: i !== 1, order: 0 }, { text: 'B', isCorrect: i === 1, order: 1 }, { text: 'C', isCorrect: false, order: 2 }] },
        })),
      },
    },
    include: { questions: { orderBy: { order: 'asc' }, include: { options: true } } },
  });
  quizSlug = quiz.slug;
  questionIds = quiz.questions.map((q) => q.id);
  for (const q of quiz.questions) {
    correctOption[q.id] = q.options.find((o) => o.isCorrect)!.id;
    wrongOption[q.id] = q.options.find((o) => !o.isCorrect)!.id;
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('quizzes', () => {
  it('lists quizzes with question counts and hides correctness from attempt payloads', async () => {
    const list = await api().get('/api/quizzes');
    expect(list.status).toBe(200);
    expect(list.body.data.items[0].questionCount).toBe(3);

    const detail = await api().get(`/api/quizzes/${quizSlug}`);
    expect(detail.body.data.quiz.attempts).toEqual([]);

    const start = await api().post(`/api/quizzes/${quizSlug}/attempts`).set(auth(user));
    expect(start.status).toBe(201);
    const attemptId = start.body.data.attempt.id as string;

    const attempt = await api().get(`/api/quiz-attempts/${attemptId}`).set(auth(user));
    expect(attempt.status).toBe(200);
    expect(attempt.body.data.attempt.questions).toHaveLength(3);
    const serialized = JSON.stringify(attempt.body.data.attempt);
    expect(serialized).not.toContain('isCorrect');
    expect(serialized).not.toContain('explanation');

    // Resuming returns the same attempt.
    const again = await api().post(`/api/quizzes/${quizSlug}/attempts`).set(auth(user));
    expect(again.status).toBe(200);
    expect(again.body.data.attempt.id).toBe(attemptId);
  });

  it('scores on the server and ignores client-supplied scores', async () => {
    const start = await api().post(`/api/quizzes/${quizSlug}/attempts`).set(auth(user));
    const attemptId = start.body.data.attempt.id as string;

    // 2 correct (q1 worth 1, q3 worth 2) + 1 wrong.
    await api().put(`/api/quiz-attempts/${attemptId}/answers`).set(auth(user)).send({ questionId: questionIds[0], optionId: correctOption[questionIds[0]!] });
    await api().put(`/api/quiz-attempts/${attemptId}/answers`).set(auth(user)).send({ questionId: questionIds[1], optionId: wrongOption[questionIds[1]!] });
    await api().put(`/api/quiz-attempts/${attemptId}/answers`).set(auth(user)).send({ questionId: questionIds[2], optionId: correctOption[questionIds[2]!] });

    // Other users cannot touch this attempt.
    const forbidden = await api().get(`/api/quiz-attempts/${attemptId}`).set(auth(other));
    expect(forbidden.status).toBe(403);

    // Attempting to tamper: option from another question is rejected.
    const tamper = await api().put(`/api/quiz-attempts/${attemptId}/answers`).set(auth(user)).send({ questionId: questionIds[0], optionId: correctOption[questionIds[1]!] });
    expect(tamper.status).toBe(400);

    const submit = await api().post(`/api/quiz-attempts/${attemptId}/submit`).set(auth(user)).send({ score: 999 });
    expect(submit.status).toBe(200);
    expect(submit.body.data.result.score).toBe(3);
    expect(submit.body.data.result.maxScore).toBe(4);
    expect(submit.body.data.result.correctCount).toBe(2);
    expect(submit.body.data.result.questions[1].isCorrect).toBe(false);
    expect(submit.body.data.result.questions[1].explanation).toBe('Because.');

    const twice = await api().post(`/api/quiz-attempts/${attemptId}/submit`).set(auth(user));
    expect(twice.status).toBe(409);

    const afterSubmit = await api().put(`/api/quiz-attempts/${attemptId}/answers`).set(auth(user)).send({ questionId: questionIds[1], optionId: correctOption[questionIds[1]!] });
    expect(afterSubmit.status).toBe(409);

    const detail = await api().get(`/api/quizzes/${quizSlug}`).set(auth(user));
    expect(detail.body.data.quiz.bestScore).toBe(3);
    const quiz = await prisma.quiz.findUnique({ where: { slug: quizSlug } });
    expect(quiz!.attemptCount).toBe(1);
  });

  it('requires authentication to start an attempt', async () => {
    const res = await api().post(`/api/quizzes/${quizSlug}/attempts`);
    expect(res.status).toBe(401);
  });
});
