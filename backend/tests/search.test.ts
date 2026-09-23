import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { api, createUser, resetDatabase } from './helpers.js';
import { prisma } from '../src/utils/prisma.js';

beforeAll(async () => {
  await resetDatabase();
  const editor = await createUser('EDITOR');
  const cat = await prisma.category.create({ data: { name: 'DSA', slug: 'dsa' } });
  await prisma.article.createMany({
    data: [
      { title: 'Binary Search Explained', slug: 'binary-search', excerpt: 'Halve the search space each step.', content: 'Binary search works on sorted arrays.', status: 'PUBLISHED', authorId: editor.id, categoryId: cat.id, publishedAt: new Date() },
      { title: 'Draft about binary trees', slug: 'draft-trees', excerpt: 'x', content: 'binary', status: 'DRAFT', authorId: editor.id, publishedAt: null },
      { title: 'CSS Flexbox Guide', slug: 'flexbox', excerpt: 'Layouts made easy.', content: 'flex container items', status: 'PUBLISHED', authorId: editor.id, publishedAt: new Date() },
    ],
  });
  await prisma.problem.create({ data: { title: 'Binary Search Position', slug: 'bs-pos', description: 'Find the index with binary search.', difficulty: 'EASY', status: 'PUBLISHED', authorId: editor.id, categoryId: cat.id, publishedAt: new Date() } });
  await prisma.quiz.create({ data: { title: 'Searching Algorithms Quiz', slug: 'search-quiz', description: 'Questions about binary and linear search.', difficulty: 'MEDIUM', status: 'PUBLISHED', authorId: editor.id, publishedAt: new Date() } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /api/search', () => {
  it('requires a query of at least two characters', async () => {
    expect((await api().get('/api/search?q=a')).status).toBe(400);
  });

  it('finds published content across types with counts and ignores drafts', async () => {
    const res = await api().get('/api/search?q=binary%20search');
    expect(res.status).toBe(200);
    const { items, counts } = res.body.data;
    expect(counts.articles).toBe(1);
    expect(counts.problems).toBe(1);
    expect(counts.quizzes).toBe(1);
    expect(items.map((i: { type: string }) => i.type).sort()).toEqual(['article', 'problem', 'quiz']);
    expect(items.find((i: { slug: string }) => i.slug === 'draft-trees')).toBeUndefined();
    expect(items[0].url).toMatch(/^\//);
  });

  it('filters by type, category and difficulty', async () => {
    const problems = await api().get('/api/search?q=binary&type=problems');
    expect(problems.body.data.items).toHaveLength(1);
    expect(problems.body.data.items[0].type).toBe('problem');
    const hard = await api().get('/api/search?q=binary&difficulty=HARD');
    expect(hard.body.data.total).toBe(0);
    const inCategory = await api().get('/api/search?q=binary&category=dsa');
    expect(inCategory.body.data.counts.quizzes).toBe(0);
    expect(inCategory.body.data.counts.articles).toBe(1);
  });

  it('falls back to title matching for partial words', async () => {
    const res = await api().get('/api/search?q=flexb');
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.fuzzy).toBe(true);
  });
});
