import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { api, auth, createUser, resetDatabase, type TestUser } from './helpers.js';
import { prisma } from '../src/utils/prisma.js';
import { executorHealth } from '../src/utils/executor-client.js';

let user: TestUser;
let editor: TestUser;
let problemSlug: string;

const PY_SOLUTION = 'import sys\na,b=map(int,sys.stdin.read().split())\nprint(a+b)\n';
const JS_WRONG = "const [a,b]=require('fs').readFileSync(0,'utf8').trim().split(/\\s+/).map(Number);console.log(a-b);";

beforeAll(async () => {
  await resetDatabase();
  user = await createUser('USER');
  editor = await createUser('EDITOR');
  const topic = await prisma.topic.create({ data: { name: 'Math', slug: 'math' } });
  const problem = await prisma.problem.create({
    data: {
      title: 'Sum of Two',
      slug: 'sum-of-two',
      description: 'Print the sum of two integers.',
      difficulty: 'SCHOOL',
      status: 'PUBLISHED',
      authorId: editor.id,
      points: 1,
      publishedAt: new Date(),
      editorial: 'Just add them.',
      topics: { create: [{ topicId: topic.id }] },
      examples: { create: [{ input: '1 2\n', output: '3', order: 0 }] },
      starterCode: { create: [{ language: 'PYTHON', code: '# starter' }] },
      testCases: {
        create: [
          { input: '1 2\n', expectedOutput: '3', isSample: true, order: 0 },
          { input: '10 20\n', expectedOutput: '30', isSample: false, order: 1 },
          { input: '-5 5\n', expectedOutput: '0', isSample: false, order: 2 },
        ],
      },
    },
  });
  problemSlug = problem.slug;
  await prisma.problem.create({
    data: { title: 'Draft problem', slug: 'draft-problem', description: 'x', status: 'DRAFT', authorId: editor.id },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /api/problems', () => {
  it('lists only published problems with summary fields', async () => {
    const res = await api().get('/api/problems');
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(1);
    const item = res.body.data.items[0];
    expect(item.slug).toBe('sum-of-two');
    expect(item.topics[0].slug).toBe('math');
    expect(item.userState).toBeNull();
  });

  it('filters by difficulty and topic', async () => {
    const none = await api().get('/api/problems?difficulty=HARD');
    expect(none.body.data.total).toBe(0);
    const some = await api().get('/api/problems?difficulty=SCHOOL,EASY&topic=math');
    expect(some.body.data.total).toBe(1);
  });

  it('hides drafts from anonymous users but shows them to editors', async () => {
    expect((await api().get('/api/problems/draft-problem')).status).toBe(404);
    expect((await api().get('/api/problems/draft-problem').set(auth(editor))).status).toBe(200);
  });

  it('returns detail without editorial unless requested and never includes hidden tests', async () => {
    const res = await api().get(`/api/problems/${problemSlug}`);
    expect(res.status).toBe(200);
    expect(res.body.data.problem.editorial).toBeUndefined();
    expect(res.body.data.problem.sampleTests).toHaveLength(1);
    expect(res.body.data.problem.starterCode.PYTHON).toBe('# starter');
    const withEditorial = await api().get(`/api/problems/${problemSlug}?editorial=true`);
    expect(withEditorial.body.data.problem.editorial).toBe('Just add them.');
  });
});

describe('run & submit', () => {
  it('requires authentication', async () => {
    const run = await api().post(`/api/problems/${problemSlug}/run`).send({ language: 'PYTHON', sourceCode: PY_SOLUTION });
    expect(run.status).toBe(401);
    const submit = await api().post(`/api/problems/${problemSlug}/submit`).send({ language: 'PYTHON', sourceCode: PY_SOLUTION });
    expect(submit.status).toBe(401);
  });

  it('validates the payload', async () => {
    const res = await api().post(`/api/problems/${problemSlug}/submit`).set(auth(user)).send({ language: 'COBOL', sourceCode: '' });
    expect(res.status).toBe(400);
  });

  it('runs sample tests and judges a submission end to end (requires executor)', async () => {
    const health = await executorHealth();
    if (!health) {
      console.warn('Executor not running; skipping execution test');
      return;
    }

    const run = await api().post(`/api/problems/${problemSlug}/run`).set(auth(user)).send({ language: 'PYTHON', sourceCode: PY_SOLUTION });
    expect(run.status).toBe(200);
    expect(run.body.data.status).toBe('ACCEPTED');
    expect(run.body.data.results[0].actualOutput.trim()).toBe('3');

    const custom = await api().post(`/api/problems/${problemSlug}/run`).set(auth(user)).send({ language: 'PYTHON', sourceCode: PY_SOLUTION, customInput: '7 8' });
    expect(custom.body.data.results[0].actualOutput.trim()).toBe('15');

    const submit = await api().post(`/api/problems/${problemSlug}/submit`).set(auth(user)).send({ language: 'PYTHON', sourceCode: PY_SOLUTION });
    expect(submit.status).toBe(202);
    const id = submit.body.data.submissionId as string;

    let final: Record<string, unknown> | null = null;
    for (let i = 0; i < 40; i++) {
      const poll = await api().get(`/api/submissions/${id}`).set(auth(user));
      expect(poll.status).toBe(200);
      if (!['PENDING', 'RUNNING'].includes(poll.body.data.submission.status)) {
        final = poll.body.data.submission;
        break;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    expect(final).not.toBeNull();
    expect(final!.status).toBe('ACCEPTED');
    expect(final!.passedCount).toBe(3);
    // Hidden test outputs are not leaked.
    const results = final!.testResults as Array<{ isSample: boolean; actualOutput?: string }>;
    expect(results.filter((r) => !r.isSample).every((r) => r.actualOutput === undefined)).toBe(true);

    const listed = await api().get('/api/problems').set(auth(user));
    expect(listed.body.data.items[0].userState).toBe('SOLVED');
    const problem = await prisma.problem.findUnique({ where: { slug: problemSlug } });
    expect(problem!.submissionCount).toBe(1);
    expect(problem!.acceptedCount).toBe(1);

    const wrong = await api().post(`/api/problems/${problemSlug}/submit`).set(auth(user)).send({ language: 'JAVASCRIPT', sourceCode: JS_WRONG });
    expect(wrong.status).toBe(202);
    let wrongFinal: Record<string, unknown> | null = null;
    for (let i = 0; i < 40; i++) {
      const poll = await api().get(`/api/submissions/${wrong.body.data.submissionId}`).set(auth(user));
      if (!['PENDING', 'RUNNING'].includes(poll.body.data.submission.status)) {
        wrongFinal = poll.body.data.submission;
        break;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    expect(wrongFinal!.status).toBe('WRONG_ANSWER');

    const mine = await api().get('/api/submissions').set(auth(user));
    expect(mine.body.data.total).toBe(2);
    const other = await api().get(`/api/submissions/${id}`).set(auth(await createUser('USER')));
    expect(other.status).toBe(403);
  }, 60_000);
});
