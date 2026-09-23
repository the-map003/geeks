interface ContentSeoInput {
  title: string;
  description: string;
  path: string;
  type?: 'website' | 'article';
  image?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  authorName?: string;
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | null;
}

/** Sets title, description, canonical, OpenGraph, Twitter and optional JSON-LD for a public page. */
export function useContentSeo(input: ContentSeoInput | (() => ContentSeoInput)) {
  const config = useRuntimeConfig();
  const resolve = () => (typeof input === 'function' ? input() : input);

  useSeoMeta({
    title: () => resolve().title,
    description: () => resolve().description,
    ogTitle: () => resolve().title,
    ogDescription: () => resolve().description,
    ogType: () => resolve().type ?? 'website',
    ogUrl: () => `${config.public.siteUrl}${resolve().path}`,
    ogImage: () => resolve().image ?? `${config.public.siteUrl}/og-default.svg`,
    ogSiteName: config.public.siteName,
    twitterCard: 'summary_large_image',
    twitterTitle: () => resolve().title,
    twitterDescription: () => resolve().description,
    articlePublishedTime: () => resolve().publishedAt ?? undefined,
    articleModifiedTime: () => resolve().updatedAt ?? undefined,
    articleAuthor: () => {
      const name = resolve().authorName;
      return name ? [name] : undefined;
    },
    robots: () => (resolve().noindex ? 'noindex, nofollow' : 'index, follow'),
  });

  useHead(() => {
    const r = resolve();
    return {
      link: [{ rel: 'canonical', href: `${config.public.siteUrl}${r.path}` }],
      script: r.jsonLd
        ? [{ type: 'application/ld+json', key: 'content-jsonld', innerHTML: JSON.stringify({ '@context': 'https://schema.org', ...r.jsonLd }) }]
        : [],
    };
  });
}
