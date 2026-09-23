interface Entry { slug: string; updatedAt?: string }
interface SitemapData {
  articles: Entry[];
  tutorials: Entry[];
  lessons: Array<Entry & { tutorialSlug: string }>;
  courses: Entry[];
  problems: Entry[];
  quizzes: Entry[];
  categories: Entry[];
  tags: Entry[];
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const site = config.public.siteUrl.replace(/\/$/, '');
  const data: SitemapData | null = await $fetch<{ data: SitemapData }>(`${config.apiBase}/sitemap`)
    .then((res) => res.data)
    .catch(() => null);

  const urls: Array<{ loc: string; lastmod?: string; priority: string; changefreq: string }> = [
    { loc: '/', priority: '1.0', changefreq: 'daily' },
    { loc: '/articles', priority: '0.8', changefreq: 'daily' },
    { loc: '/tutorials', priority: '0.8', changefreq: 'weekly' },
    { loc: '/courses', priority: '0.8', changefreq: 'weekly' },
    { loc: '/practice', priority: '0.8', changefreq: 'weekly' },
    { loc: '/problems', priority: '0.8', changefreq: 'daily' },
    { loc: '/quizzes', priority: '0.7', changefreq: 'weekly' },
  ];
  const add = (path: string, e: Entry, priority: string, changefreq = 'weekly') => urls.push({ loc: path, lastmod: e.updatedAt ? new Date(e.updatedAt).toISOString().slice(0, 10) : undefined, priority, changefreq });

  if (data) {
    data.articles.forEach((a) => add(`/articles/${a.slug}`, a, '0.7'));
    data.tutorials.forEach((t) => add(`/tutorials/${t.slug}`, t, '0.7'));
    data.lessons.forEach((l) => add(`/tutorials/${l.tutorialSlug}/${l.slug}`, l, '0.6'));
    data.courses.forEach((c) => add(`/courses/${c.slug}`, c, '0.7'));
    data.problems.forEach((p) => add(`/problems/${p.slug}`, p, '0.6'));
    data.quizzes.forEach((q) => add(`/quizzes/${q.slug}`, q, '0.6'));
    data.categories.forEach((c) => add(`/categories/${c.slug}`, c, '0.6'));
    data.tags.forEach((t) => add(`/tags/${t.slug}`, t, '0.3', 'monthly'));
  }

  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${esc(site + u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join('\n') +
    `\n</urlset>\n`;

  setHeader(event, 'content-type', 'application/xml; charset=utf-8');
  setHeader(event, 'cache-control', 'public, max-age=3600');
  return xml;
});
