import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { api, auth, createUser, resetDatabase, type TestUser } from './helpers.js';
import { prisma } from '../src/utils/prisma.js';

let user: TestUser;
let editor: TestUser;
let admin: TestUser;
let superadmin: TestUser;

beforeAll(async () => {
  await resetDatabase();
  user = await createUser('USER');
  editor = await createUser('EDITOR');
  admin = await createUser('ADMIN');
  superadmin = await createUser('SUPER_ADMIN');
});

afterAll(async () => {
  await prisma.$disconnect();
});

const articleBody = {
  title: 'Admin Created Article',
  excerpt: 'An excerpt long enough to pass validation.',
  content: '## Heading\n\nSome markdown content that is long enough to pass validation rules.',
  tags: ['Testing', 'admin tools'],
  difficulty: 'EASY',
};

describe('admin authorization', () => {
  it('rejects anonymous and regular users', async () => {
    expect((await api().get('/api/admin/stats')).status).toBe(401);
    expect((await api().get('/api/admin/stats').set(auth(user))).status).toBe(403);
  });

  it('lets editors see stats but not user management or analytics', async () => {
    expect((await api().get('/api/admin/stats').set(auth(editor))).status).toBe(200);
    expect((await api().get('/api/admin/users').set(auth(editor))).status).toBe(403);
    expect((await api().get('/api/admin/analytics').set(auth(editor))).status).toBe(403);
    expect((await api().get('/api/admin/settings').set(auth(admin))).status).toBe(403);
    expect((await api().get('/api/admin/settings').set(auth(superadmin))).status).toBe(200);
  });
});

describe('content workflow', () => {
  it('editor drafts, admin publishes, public sees it, editor cannot publish or delete', async () => {
    const created = await api().post('/api/admin/articles').set(auth(editor)).send(articleBody);
    expect(created.status).toBe(201);
    const article = created.body.data.article;
    expect(article.status).toBe('DRAFT');
    expect(article.slug).toBe('admin-created-article');
    expect(article.tags.map((t: { slug: string }) => t.slug).sort()).toEqual(['admin-tools', 'testing']);

    // Draft is hidden from the public listing/detail.
    expect((await api().get('/api/articles')).body.data.total).toBe(0);
    expect((await api().get(`/api/articles/${article.slug}`)).status).toBe(404);
    // …but visible to the editor.
    expect((await api().get(`/api/articles/${article.slug}`).set(auth(editor))).status).toBe(200);

    expect((await api().post(`/api/admin/articles/${article.id}/publish`).set(auth(editor))).status).toBe(403);
    const published = await api().post(`/api/admin/articles/${article.id}/publish`).set(auth(admin));
    expect(published.status).toBe(200);
    expect(published.body.data.item.status).toBe('PUBLISHED');
    expect((await api().get(`/api/articles/${article.slug}`)).status).toBe(200);

    // Slug collisions are auto-suffixed.
    const dup = await api().post('/api/admin/articles').set(auth(editor)).send(articleBody);
    expect(dup.body.data.article.slug).toBe('admin-created-article-2');

    // Update keeps slug and replaces tags.
    const updated = await api().put(`/api/admin/articles/${article.id}`).set(auth(editor)).send({ ...articleBody, tags: ['Only One'] });
    expect(updated.status).toBe(200);
    expect(updated.body.data.article.tags).toHaveLength(1);

    expect((await api().delete(`/api/admin/articles/${article.id}`).set(auth(editor))).status).toBe(403);
    expect((await api().delete(`/api/admin/articles/${article.id}`).set(auth(admin))).status).toBe(204);
    expect((await api().get(`/api/articles/${article.slug}`)).status).toBe(404);

    const logs = await api().get('/api/admin/audit-logs').set(auth(admin));
    const actions = logs.body.data.items.map((l: { action: string }) => l.action);
    expect(actions).toEqual(expect.arrayContaining(['ARTICLE_CREATED', 'ARTICLE_PUBLISHED', 'ARTICLE_UPDATED', 'ARTICLE_DELETED']));
  });

  it('validates problem payloads and refuses to publish problems without tests', async () => {
    const bad = await api().post('/api/admin/problems').set(auth(editor)).send({ title: 'x', description: 'short', difficulty: 'NOPE' });
    expect(bad.status).toBe(400);

    const created = await api()
      .post('/api/admin/problems')
      .set(auth(editor))
      .send({
        title: 'Echo Number',
        description: 'Print the given number.',
        difficulty: 'SCHOOL',
        topics: ['Math'],
        examples: [{ input: '5\n', output: '5' }],
        starterCode: [{ language: 'PYTHON', code: 'print(input())' }],
        testCases: [],
      });
    expect(created.status).toBe(201);
    const id = created.body.data.problem.id as string;
    expect((await api().post(`/api/admin/problems/${id}/publish`).set(auth(admin))).status).toBe(422);

    const withTests = await api()
      .put(`/api/admin/problems/${id}`)
      .set(auth(editor))
      .send({
        title: 'Echo Number',
        description: 'Print the given number.',
        difficulty: 'SCHOOL',
        topics: ['Math'],
        examples: [{ input: '5\n', output: '5' }],
        starterCode: [{ language: 'PYTHON', code: 'print(input())' }],
        testCases: [
          { input: '5\n', expectedOutput: '5', isSample: true },
          { input: '42\n', expectedOutput: '42' },
        ],
      });
    expect(withTests.status).toBe(200);
    expect(withTests.body.data.problem.testCases).toHaveLength(2);
    expect((await api().post(`/api/admin/problems/${id}/publish`).set(auth(admin))).status).toBe(200);
    expect((await api().get('/api/problems/echo-number')).status).toBe(200);
  });

  it('enforces exactly one correct option per quiz question', async () => {
    const bad = await api()
      .post('/api/admin/quizzes')
      .set(auth(editor))
      .send({ title: 'Bad Quiz', description: 'A quiz with a broken question.', difficulty: 'EASY', questions: [{ prompt: 'Pick one', options: [{ text: 'A', isCorrect: true }, { text: 'B', isCorrect: true }] }] });
    expect(bad.status).toBe(400);
    const good = await api()
      .post('/api/admin/quizzes')
      .set(auth(editor))
      .send({ title: 'Good Quiz', description: 'A quiz with a valid question.', difficulty: 'EASY', questions: [{ prompt: 'Pick one', options: [{ text: 'A', isCorrect: true }, { text: 'B', isCorrect: false }] }] });
    expect(good.status).toBe(201);
    expect(good.body.data.quiz.questions[0].options).toHaveLength(2);
  });
});

describe('user management', () => {
  it('applies role hierarchy rules', async () => {
    const self = await api().patch(`/api/admin/users/${admin.id}`).set(auth(admin)).send({ role: 'USER' });
    expect(self.status).toBe(403);
    const elevate = await api().patch(`/api/admin/users/${user.id}`).set(auth(admin)).send({ role: 'ADMIN' });
    expect(elevate.status).toBe(403);
    const promote = await api().patch(`/api/admin/users/${user.id}`).set(auth(admin)).send({ role: 'EDITOR' });
    expect(promote.status).toBe(200);
    expect(promote.body.data.user.role).toBe('EDITOR');
    const touchSuper = await api().patch(`/api/admin/users/${superadmin.id}`).set(auth(admin)).send({ isActive: false });
    expect(touchSuper.status).toBe(403);
    const deactivate = await api().patch(`/api/admin/users/${user.id}`).set(auth(superadmin)).send({ isActive: false });
    expect(deactivate.status).toBe(200);
    // Deactivated users can no longer log in.
    const login = await api().post('/api/auth/login').send({ emailOrUsername: user.email, password: user.password });
    expect(login.status).toBe(403);
  });
});

describe('moderation', () => {
  it('hides reported comments and resolves reports', async () => {
    const editorReactivated = await createUser('USER');
    const target = await prisma.article.create({ data: { title: 'Target', slug: 'target', excerpt: 'x', content: 'y', status: 'PUBLISHED', authorId: editor.id, publishedAt: new Date() } });
    const comment = await api().post('/api/comments').set(auth(editorReactivated)).send({ targetType: 'ARTICLE', targetId: target.id, content: 'Buy cheap stuff at spam.example' });
    expect(comment.status).toBe(201);
    const reporter = await createUser('USER');
    const report = await api().post(`/api/comments/${comment.body.data.comment.id}/report`).set(auth(reporter)).send({ reason: 'SPAM' });
    expect(report.status).toBe(200);

    const reported = await api().get('/api/admin/comments?state=reported').set(auth(editor));
    expect(reported.body.data.total).toBe(1);
    const reports = await api().get('/api/admin/reports?status=OPEN').set(auth(editor));
    expect(reports.body.data.openCount).toBe(1);
    const reportId = reports.body.data.items[0].id as string;

    const resolved = await api().patch(`/api/admin/reports/${reportId}`).set(auth(editor)).send({ action: 'resolve', hideComment: true, note: 'Spam confirmed' });
    expect(resolved.status).toBe(200);
    const publicView = await api().get(`/api/comments?targetType=ARTICLE&targetId=${target.id}`);
    expect(publicView.body.data.items[0].content).toBe('[hidden by moderators]');
    expect((await api().patch(`/api/admin/reports/${reportId}`).set(auth(editor)).send({ action: 'dismiss' })).status).toBe(409);
  });
});
