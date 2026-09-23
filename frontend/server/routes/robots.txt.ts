export default defineEventHandler((event) => {
  const config = useRuntimeConfig();
  const site = config.public.siteUrl.replace(/\/$/, '');
  setHeader(event, 'content-type', 'text/plain; charset=utf-8');
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /dashboard',
    'Disallow: /settings',
    'Disallow: /profile',
    'Disallow: /bookmarks',
    'Disallow: /submissions',
    'Disallow: /search',
    'Disallow: /api/',
    '',
    `Sitemap: ${site}/sitemap.xml`,
    '',
  ].join('\n');
});
