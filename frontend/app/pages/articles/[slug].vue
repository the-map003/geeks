<script setup lang="ts">
import { Bookmark, BookmarkCheck, MessageCircle, MoreVertical, Pencil, Share2, ThumbsUp } from 'lucide-vue-next';
import type { Article, ArticleSummary } from '~/types/api';
import type { TocItem } from '~/utils/markdown';
import { formatDate } from '~/utils/format';

const route = useRoute();
const api = useApi();
const auth = useAuthStore();
const ui = useUiStore();
const slug = computed(() => route.params.slug as string);

const { data, status, error } = await useAsyncData(
  () => `article:${slug.value}`,
  () => api.get<{ article: Article }>(`/articles/${slug.value}`),
  { watch: [slug] },
);

if (status.value === 'error' && error.value) {
  const e = error.value as unknown as { status?: number; message?: string };
  throw createError({ statusCode: e.status === 404 ? 404 : 500, statusMessage: e.status === 404 ? 'Article not found' : 'Failed to load article', fatal: true });
}

const article = computed(() => data.value?.article ?? null);

const { data: related } = useAsyncData(
  () => `article-related:${slug.value}`,
  () => api.get<{ articles: ArticleSummary[] }>(`/articles/${slug.value}/related`, undefined, { auth: false }),
  { watch: [slug], lazy: true, server: false },
);

const toc = ref<TocItem[]>([]);
const bodyRef = ref<HTMLElement | null>(null);

// Like / bookmark / share handled inline so the action row can use the reference's icon style.
const liked = ref(false);
const likeCount = ref(0);
const bookmarked = ref(false);
watch(article, (a) => { if (a) { liked.value = !!a.liked; likeCount.value = a.likeCount; bookmarked.value = !!a.bookmarked; } }, { immediate: true });
function requireLogin() {
  if (auth.isAuthenticated) return true;
  ui.info('Sign in to continue');
  navigateTo({ path: '/login', query: { redirect: route.fullPath } });
  return false;
}
async function toggleLike() {
  if (!article.value || !requireLogin()) return;
  try {
    const res = await api.post<{ liked: boolean; likeCount: number }>(`/articles/${article.value.slug}/like`);
    liked.value = res.liked;
    likeCount.value = res.likeCount;
  } catch (err) {
    ui.error('Could not update like', isApiError(err) ? err.message : undefined);
  }
}
async function toggleBookmark() {
  if (!article.value || !requireLogin()) return;
  const next = !bookmarked.value;
  bookmarked.value = next;
  try {
    if (next) await api.post('/bookmarks', { type: 'ARTICLE', targetId: article.value.id });
    else await api.del('/bookmarks', { type: 'ARTICLE', targetId: article.value.id });
    ui.success(next ? 'Saved to bookmarks' : 'Removed from bookmarks');
  } catch (err) {
    bookmarked.value = !next;
    ui.error('Could not update bookmark', isApiError(err) ? err.message : undefined);
  }
}
async function share() {
  const url = `${useRuntimeConfig().public.siteUrl}${route.path}`;
  try {
    if (navigator.share) await navigator.share({ title: article.value?.title, url });
    else {
      await navigator.clipboard.writeText(url);
      ui.success('Link copied');
    }
  } catch {
    /* cancelled */
  }
}

const crumbs = computed(() => [
  { label: 'Articles', to: '/articles' },
  ...(article.value?.category ? [{ label: article.value.category.name, to: `/categories/${article.value.category.slug}` }] : []),
  { label: article.value?.title ?? '' },
]);

const config = useRuntimeConfig();
useContentSeo(() => ({
  title: article.value?.title ?? 'Article',
  description: article.value?.excerpt ?? '',
  path: `/articles/${slug.value}`,
  type: 'article',
  image: article.value?.coverImageUrl ?? null,
  publishedAt: article.value?.publishedAt ?? null,
  updatedAt: article.value?.updatedAt ?? null,
  authorName: article.value?.author.displayName,
  noindex: article.value?.status !== 'PUBLISHED',
  jsonLd: article.value
    ? {
        '@type': 'TechArticle',
        headline: article.value.title,
        description: article.value.excerpt,
        datePublished: article.value.publishedAt,
        dateModified: article.value.updatedAt,
        author: { '@type': 'Person', name: article.value.author.displayName },
        publisher: { '@type': 'Organization', name: config.public.siteName },
        mainEntityOfPage: `${config.public.siteUrl}/articles/${slug.value}`,
      }
    : null,
}));
</script>

<template>
  <div class="mx-auto w-full max-w-[760px] px-4 py-6 sm:px-5">
    <ClientOnly><ReadingProgress :target="bodyRef" /></ClientOnly>

    <div v-if="status === 'pending' && !article" class="space-y-4">
      <UiSkeleton variant="text" class="w-1/3" />
      <UiSkeleton variant="title" class="w-full" />
      <UiSkeleton variant="text" :lines="2" />
      <UiSkeleton variant="rect" class="h-64" />
      <UiSkeleton variant="text" :lines="8" />
    </div>

    <template v-else-if="article">
      <UiBreadcrumbs :items="crumbs" class="mb-4 text-[13px]" />
      <UiAlert v-if="article.status !== 'PUBLISHED'" tone="warning" class="mb-5" title="Preview">
        This article is <strong>{{ article.status.toLowerCase() }}</strong> and only visible to editors.
      </UiAlert>

      <article class="min-w-0">
        <header>
          <h1 class="font-heading text-[26px] font-semibold leading-tight text-ink-heading sm:text-[30px]">{{ article.title }}</h1>
          <div class="mt-3 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
            <p class="text-[15px] text-ink-muted">
              Last Updated : <span class="ml-1 text-ink">{{ formatDate(article.updatedAt) }}</span>
              <span class="mx-2 hidden text-gray-300 sm:inline">|</span>
              <NuxtLink :to="`/u/${article.author.username}`" class="hidden hover:text-brand-600 sm:inline">By {{ article.author.displayName }}</NuxtLink>
              <span class="mx-2 hidden text-gray-300 sm:inline">|</span>
              <span class="hidden sm:inline">{{ article.readingTimeMin }} min read</span>
            </p>
            <div class="flex items-center gap-1 text-ink-heading">
              <a href="#comments" class="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-strong" :title="`${article.commentCount} comments`" aria-label="Comments"><MessageCircle class="h-5 w-5" /></a>
              <ClientOnly>
                <button type="button" class="inline-flex h-9 items-center gap-1 rounded-full px-2.5 text-sm hover:bg-surface-strong" :class="liked ? 'text-brand-600' : ''" :aria-pressed="liked" title="Like" @click="toggleLike"><ThumbsUp class="h-5 w-5" :class="liked ? 'fill-current' : ''" /> {{ likeCount }}</button>
                <button type="button" class="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-strong" :class="bookmarked ? 'text-brand-600' : ''" :aria-pressed="bookmarked" :title="bookmarked ? 'Remove bookmark' : 'Save'" :aria-label="bookmarked ? 'Remove bookmark' : 'Save bookmark'" @click="toggleBookmark"><BookmarkCheck v-if="bookmarked" class="h-5 w-5" /><Bookmark v-else class="h-5 w-5" /></button>
                <NuxtLink v-if="auth.isEditor" :to="`/admin/articles/${article.id}`" class="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-strong" title="Improve article" aria-label="Improve article"><Pencil class="h-5 w-5" /></NuxtLink>
              </ClientOnly>
              <UiDropdown align="right" width="w-44">
                <template #trigger><button type="button" class="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-strong" aria-label="More options"><MoreVertical class="h-5 w-5" /></button></template>
                <UiMenuItem @click="share"><Share2 class="h-4 w-4 text-ink-muted" /> Share</UiMenuItem>
                <UiMenuItem v-for="t in article.tags.slice(0, 3)" :key="t.id" :to="`/tags/${t.slug}`">#{{ t.name }}</UiMenuItem>
              </UiDropdown>
            </div>
          </div>
        </header>

        <div class="mt-5">
          <p class="text-[18px] leading-[1.6] text-ink">{{ article.excerpt }}</p>
        </div>

        <div class="mt-5"><TableOfContents :items="toc" collapsible /></div>

        <div ref="bodyRef" class="mt-4">
          <MarkdownContent :source="article.content" @toc="toc = $event" />
        </div>

        <footer class="mt-10 space-y-8">
          <div v-if="article.tags.length" class="flex flex-wrap items-center gap-2">
            <NuxtLink v-for="t in article.tags" :key="t.id" :to="`/tags/${t.slug}`" class="rounded-full bg-surface-muted px-3 py-1 text-[13px] text-ink-heading hover:bg-surface-strong">{{ t.name }}</NuxtLink>
          </div>

          <div class="flex items-center gap-3 rounded-lg border border-line p-4">
            <UiAvatar :name="article.author.displayName" :src="article.author.avatarUrl" size="md" />
            <div class="min-w-0">
              <NuxtLink :to="`/u/${article.author.username}`" class="font-heading text-[16px] font-semibold text-ink-heading hover:text-brand-600">{{ article.author.displayName }}</NuxtLink>
              <p class="text-[13px] text-ink-muted">@{{ article.author.username }} · Contributor</p>
            </div>
          </div>

          <section v-if="related?.articles.length" aria-labelledby="similar-heading">
            <h2 id="similar-heading" class="mb-3 font-heading text-[22px] font-semibold text-ink-heading">Similar Reads</h2>
            <ul class="divide-y divide-line rounded-lg border border-line">
              <li v-for="a in related.articles" :key="a.id">
                <NuxtLink :to="`/articles/${a.slug}`" class="flex items-start justify-between gap-4 px-4 py-3 transition hover:bg-surface-muted">
                  <span class="min-w-0">
                    <span class="block font-heading text-[16px] font-semibold text-ink-heading">{{ a.title }}</span>
                    <span class="mt-0.5 line-clamp-2 block text-[14px] text-ink-muted">{{ a.excerpt }}</span>
                  </span>
                  <span class="shrink-0 text-[12px] text-ink-muted">{{ a.readingTimeMin }} min read</span>
                </NuxtLink>
              </li>
            </ul>
          </section>

          <section id="comments" class="scroll-mt-24">
            <CommentThread target-type="ARTICLE" :target-id="article.id" :initial-count="article.commentCount" />
          </section>
        </footer>
      </article>
    </template>
  </div>
</template>
